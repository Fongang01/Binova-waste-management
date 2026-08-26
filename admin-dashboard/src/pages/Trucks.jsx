import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getTrucks, createTruck, updateTruck, deleteTruck, patchTruckStatus } from '../api/trucksApi'
import { getDrivers } from '../api/driversApi'
import {
  Plus,
  RefreshCcw,
  Trash2,
  X,
  Truck as TruckIcon,
  Search,
  Edit2,
  User,
  ShieldAlert
} from 'lucide-react'

const INITIAL_FORM = {
  registrationNumber: '',
  capacity: '',
  status: 'AVAILABLE',
  driverId: '',
}

function normalizeList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export default function Trucks(){
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status')?.toUpperCase() || 'ALL')

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTruck, setSelectedTruck] = useState(null)

  // Forms
  const [form, setForm] = useState(INITIAL_FORM)
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sync URL query param
  useEffect(() => {
    const s = searchParams.get('status')?.toUpperCase()
    if (s && ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE', 'ALL'].includes(s)) {
      setStatusFilter(s)
    }
  }, [searchParams])

  const load = async () => {
    setLoading(true)
    try {
      const [trucksResponse, driversResponse] = await Promise.all([
        getTrucks(),
        getDrivers()
      ])
      setItems(normalizeList(trucksResponse))
      setDrivers(normalizeList(driversResponse))
      setError(null)
    } catch (e) {
      setError(e?.response?.data?.message || 'Unable to load trucks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(null), 4000)
    return () => clearTimeout(timer)
  }, [success])

  // Filter and Search logic
  const filteredTrucks = useMemo(() => {
    return items.filter((truck) => {
      // Status Filter
      if (statusFilter !== 'ALL' && truck.status !== statusFilter) {
        return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const reg = (truck.registrationNumber || truck.registration || '').toLowerCase()
        const driverName = truck.driver ? `${truck.driver.firstName} ${truck.driver.lastName}`.toLowerCase() : ''
        const idStr = String(truck.id || '').toLowerCase()
        return reg.includes(q) || driverName.includes(q) || idStr.includes(q)
      }

      return true
    })
  }, [items, statusFilter, searchQuery])

  const handleFilterChange = (status) => {
    setStatusFilter(status)
    if (status === 'ALL') {
      searchParams.delete('status')
    } else {
      searchParams.set('status', status)
    }
    setSearchParams(searchParams)
  }

  const validateForm = (formData) => {
    if (!formData.registrationNumber.trim()) return 'Registration number is required.'
    if (!formData.capacity || Number(formData.capacity) <= 0) return 'Capacity must be greater than zero.'
    if (!['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE'].includes(formData.status)) return 'Please select a valid status.'
    return ''
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    const validationMessage = validateForm(form)
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      await createTruck({
        registrationNumber: form.registrationNumber.trim(),
        capacity: Number(form.capacity),
        status: form.status,
        driverId: form.driverId ? Number(form.driverId) : undefined,
      })

      setSuccess('Truck created successfully.')
      setCreateModalOpen(false)
      setForm(INITIAL_FORM)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.message || 'Unable to create truck.')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (truck) => {
    setSelectedTruck(truck)
    setEditForm({
      registrationNumber: truck.registrationNumber || truck.registration || '',
      capacity: String(truck.capacity || ''),
      status: truck.status || 'AVAILABLE',
      driverId: truck.driverId ? String(truck.driverId) : (truck.driver?.id ? String(truck.driver.id) : ''),
    })
    setFormError('')
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!selectedTruck) return
    const validationMessage = validateForm(editForm)
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      await updateTruck(selectedTruck.id, {
        registrationNumber: editForm.registrationNumber.trim(),
        capacity: Number(editForm.capacity),
        status: editForm.status,
        driverId: editForm.driverId ? Number(editForm.driverId) : null,
      })

      setSuccess(`Truck "${editForm.registrationNumber}" updated successfully.`)
      setEditModalOpen(false)
      setSelectedTruck(null)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.message || 'Unable to update truck.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, reg, event) => {
    event?.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete truck "${reg}"?`)) return
    try {
      await deleteTruck(id)
      setSuccess('Truck deleted successfully.')
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Delete failed')
    }
  }

  const renderEmptyState = () => {
    if (loading) return null
    if (items.length === 0) {
      return (
        <div className="page-empty">
          <p>No trucks in fleet yet.</p>
          <button type="button" className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <TruckIcon size={16} /> Add Your First Truck
          </button>
        </div>
      )
    }
    if (filteredTrucks.length === 0) {
      if (searchQuery.trim()) {
        return (
          <div className="page-empty">
            <p>No trucks matching &ldquo;{searchQuery}&rdquo; found.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        )
      }
      return (
        <div className="page-empty">
          <p>No {statusFilter.toLowerCase()} trucks found.</p>
          <button type="button" className="btn btn-secondary" onClick={() => handleFilterChange('ALL')}>
            Show All Trucks
          </button>
        </div>
      )
    }
    return null
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Trucks" />
        <div className="content">
          <div className="page-header">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Truck Fleet Management</h2>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
                <RefreshCcw size={16} className={loading ? 'spinning' : ''} /> Refresh
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { setFormError(''); setForm(INITIAL_FORM); setCreateModalOpen(true) }}>
                <TruckIcon size={16} /> Add Truck
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="toolbar-card">
            <div className="search-field">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by registration number, driver, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => handleFilterChange('ALL')}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'AVAILABLE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('AVAILABLE')}
              >
                Available ({items.filter(t => t.status === 'AVAILABLE').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'IN_USE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('IN_USE')}
              >
                In Use ({items.filter(t => t.status === 'IN_USE').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'MAINTENANCE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('MAINTENANCE')}
              >
                Maintenance ({items.filter(t => t.status === 'MAINTENANCE').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('INACTIVE')}
              >
                Inactive ({items.filter(t => t.status === 'INACTIVE').length})
              </button>
            </div>
          </div>

          {success && <div className="success-box">{success}</div>}
          {error && <div className="error-box">{error}</div>}

          {loading && (
            <div className="page-empty">
              <div className="skeleton" />
              <div className="skeleton short" />
            </div>
          )}

          {renderEmptyState()}

          {!loading && filteredTrucks.length > 0 && (
            <div className="table-card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Registration</th>
                      <th>Capacity (Tons)</th>
                      <th>Status</th>
                      <th>Assigned Driver</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrucks.map((truck) => (
                      <tr
                        key={truck.id}
                        className="clickable-row"
                        onClick={() => openEditModal(truck)}
                        title="Click to edit truck"
                      >
                        <td>
                          <div className="font-semibold text-dark flex-align-center gap-6">
                            <TruckIcon size={16} className="text-muted" />
                            <span>{truck.registrationNumber || truck.registration}</span>
                          </div>
                        </td>
                        <td>{truck.capacity} Tons</td>
                        <td>
                          <span className={`status-badge status-${(truck.status || 'AVAILABLE').toLowerCase()}`}>
                            {truck.status || 'AVAILABLE'}
                          </span>
                        </td>
                        <td>
                          {truck.driver ? (
                            <div className="flex-align-center gap-6">
                              <User size={14} className="text-muted" />
                              <span className="font-medium">{truck.driver.firstName} {truck.driver.lastName}</span>
                            </div>
                          ) : (
                            <span className="text-muted text-xs">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="table-action view"
                              onClick={() => openEditModal(truck)}
                              title="Edit truck"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              className="table-action danger"
                              onClick={(e) => handleDelete(truck.id, truck.registrationNumber || truck.registration, e)}
                              title="Delete truck"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE TRUCK MODAL */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Fleet Management</p>
                <h3>Add New Truck</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-grid">
                <div className="field-group">
                  <label htmlFor="create-truck-registration">Registration Number *</label>
                  <input
                    id="create-truck-registration"
                    name="registrationNumber"
                    value={form.registrationNumber}
                    onChange={(e) => setForm(p => ({ ...p, registrationNumber: e.target.value }))}
                    placeholder="e.g. LT-1234-AB"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="create-truck-capacity">Capacity (Tons) *</label>
                  <input
                    id="create-truck-capacity"
                    name="capacity"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.capacity}
                    onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))}
                    placeholder="e.g. 12"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="create-truck-status">Status</label>
                  <select
                    id="create-truck-status"
                    name="status"
                    value={form.status}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="IN_USE">IN_USE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="create-truck-driver">Driver Assignment</label>
                  <select
                    id="create-truck-driver"
                    name="driverId"
                    value={form.driverId}
                    onChange={(e) => setForm(p => ({ ...p, driverId: e.target.value }))}
                  >
                    <option value="">No driver assigned</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && <div className="error-box">{formError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRUCK MODAL */}
      {editModalOpen && selectedTruck && (
        <div className="modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Fleet Management</p>
                <h3>Edit Truck: {selectedTruck.registrationNumber || selectedTruck.registration}</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="field-group">
                  <label htmlFor="edit-truck-registration">Registration Number *</label>
                  <input
                    id="edit-truck-registration"
                    name="registrationNumber"
                    value={editForm.registrationNumber}
                    onChange={(e) => setEditForm(p => ({ ...p, registrationNumber: e.target.value }))}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="edit-truck-capacity">Capacity (Tons) *</label>
                  <input
                    id="edit-truck-capacity"
                    name="capacity"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm(p => ({ ...p, capacity: e.target.value }))}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="edit-truck-status">Status</label>
                  <select
                    id="edit-truck-status"
                    name="status"
                    value={editForm.status}
                    onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="IN_USE">IN_USE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="edit-truck-driver">Driver Assignment</label>
                  <select
                    id="edit-truck-driver"
                    name="driverId"
                    value={editForm.driverId}
                    onChange={(e) => setEditForm(p => ({ ...p, driverId: e.target.value }))}
                  >
                    <option value="">No driver assigned</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && <div className="error-box">{formError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

