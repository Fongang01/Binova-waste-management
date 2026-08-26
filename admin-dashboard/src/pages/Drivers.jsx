import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getDrivers, createDriver, updateDriver, deleteDriver, patchDriverStatus } from '../api/driversApi'
import { getTrucks } from '../api/trucksApi'
import {
  Search,
  Plus,
  RefreshCcw,
  Trash2,
  X,
  UserPlus,
  Edit2,
  Truck as TruckIcon,
} from 'lucide-react'

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  status: 'ACTIVE',
  truckId: '',
}

function normalizeList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export default function Drivers(){
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status')?.toUpperCase() || 'ALL')

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)

  // Forms
  const [createForm, setCreateForm] = useState(INITIAL_FORM)
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sync URL query param to filter if provided
  useEffect(() => {
    const statusParam = searchParams.get('status')?.toUpperCase()
    if (statusParam && ['ACTIVE', 'INACTIVE', 'ALL'].includes(statusParam)) {
      setStatusFilter(statusParam)
    }
  }, [searchParams])

  const load = async () => {
    setLoading(true)
    try {
      const [driversRes, trucksRes] = await Promise.all([
        getDrivers(),
        getTrucks()
      ])
      setItems(normalizeList(driversRes))
      setTrucks(normalizeList(trucksRes))
      setError(null)
    } catch (e) {
      setError(e?.response?.data?.message || 'Unable to load drivers. Please try again.')
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

  // Filter and Search Logic
  const filteredDrivers = useMemo(() => {
    return items.filter((driver) => {
      // Status Filter
      if (statusFilter !== 'ALL' && driver.status !== statusFilter) {
        return false
      }
      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const fullName = `${driver.firstName || ''} ${driver.lastName || ''}`.toLowerCase()
        const email = (driver.email || '').toLowerCase()
        const phone = (driver.phone || '').toLowerCase()
        const idStr = String(driver.id || '').toLowerCase()
        const truckStr = driver.truck?.registrationNumber ? driver.truck.registrationNumber.toLowerCase() : ''
        
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          idStr.includes(q) ||
          truckStr.includes(q)
        )
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

  // Open Edit Modal for a driver
  const openEditModal = (driver) => {
    setSelectedDriver(driver)
    setEditForm({
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      email: driver.email || '',
      phone: driver.phone || '',
      password: '',
      status: driver.status || 'ACTIVE',
      truckId: driver.truck?.id ? String(driver.truck.id) : '',
    })
    setFormError('')
    setEditModalOpen(true)
  }

  // Create Driver Submit
  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    if (!createForm.firstName.trim()) return setFormError('First name is required.')
    if (!createForm.lastName.trim()) return setFormError('Last name is required.')
    if (!createForm.email.trim()) return setFormError('Email is required.')
    if (!/^\S+@\S+\.\S+$/.test(createForm.email.trim())) return setFormError('Please use a valid email address.')
    if (!createForm.password) return setFormError('Password is required.')
    if (createForm.password.length < 6) return setFormError('Password must be at least 6 characters long.')

    setSubmitting(true)
    setFormError('')

    try {
      const payload = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password,
        status: createForm.status,
      }
      
      const res = await createDriver(payload)
      const newDriver = res?.data?.data || res?.data

      // If truck selected, assign truck
      if (createForm.truckId && newDriver?.id) {
        try {
          await updateDriver(newDriver.id, { truckId: Number(createForm.truckId) })
        } catch (_) {}
      }

      setSuccess('Driver created successfully.')
      setCreateModalOpen(false)
      setCreateForm(INITIAL_FORM)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.message || 'Unable to create driver.')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit Driver Submit
  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!selectedDriver) return
    if (!editForm.firstName.trim()) return setFormError('First name is required.')
    if (!editForm.lastName.trim()) return setFormError('Last name is required.')
    if (!editForm.email.trim()) return setFormError('Email is required.')
    if (!/^\S+@\S+\.\S+$/.test(editForm.email.trim())) return setFormError('Please use a valid email address.')
    if (editForm.password && editForm.password.length < 6) return setFormError('Password must be at least 6 characters long.')

    setSubmitting(true)
    setFormError('')

    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        status: editForm.status,
        truckId: editForm.truckId ? Number(editForm.truckId) : null,
      }
      if (editForm.password) {
        payload.password = editForm.password
      }

      await updateDriver(selectedDriver.id, payload)

      setSuccess(`Driver "${editForm.firstName} ${editForm.lastName}" updated successfully.`)
      setEditModalOpen(false)
      setSelectedDriver(null)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.message || 'Unable to update driver.')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick Toggle Status
  const handleToggleStatus = async (driver, event) => {
    event.stopPropagation()
    const newStatus = driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await patchDriverStatus(driver.id, newStatus)
      setSuccess(`Driver status set to ${newStatus}.`)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to change driver status.')
    }
  }

  // Delete Driver
  const handleDelete = async (id, name, event) => {
    event?.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete driver "${name}"? This action cannot be undone.`)) return
    try {
      await deleteDriver(id)
      setSuccess('Driver deleted successfully.')
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Delete failed. Driver might have active tasks.')
    }
  }

  const getFullName = (driver) => [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Unnamed driver'

  // Available trucks for assignment (trucks not assigned to someone else, or assigned to current driver)
  const getAvailableTrucks = (currentDriverId) => {
    return trucks.filter((truck) => {
      if (!truck.driverId) return true
      if (currentDriverId && truck.driverId === Number(currentDriverId)) return true
      return false
    })
  }

  // Empty state messaging
  const renderEmptyState = () => {
    if (loading) return null
    if (items.length === 0) {
      return (
        <div className="page-empty">
          <p>No drivers registered yet.</p>
          <button type="button" className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <UserPlus size={16} /> Add Your First Driver
          </button>
        </div>
      )
    }
    if (filteredDrivers.length === 0) {
      if (searchQuery.trim()) {
        return (
          <div className="page-empty">
            <p>No drivers matching &ldquo;{searchQuery}&rdquo; found.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        )
      }
      if (statusFilter === 'INACTIVE') {
        return <div className="page-empty">No inactive drivers found.</div>
      }
      if (statusFilter === 'ACTIVE') {
        return <div className="page-empty">No active drivers found.</div>
      }
      return <div className="page-empty">No drivers matching selected filter.</div>
    }
    return null
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Drivers" />
        <div className="content">
          <div className="page-header">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Driver Management</h2>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
                <RefreshCcw size={16} className={loading ? 'spinning' : ''} /> Refresh
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { setFormError(''); setCreateForm(INITIAL_FORM); setCreateModalOpen(true) }}>
                <UserPlus size={16} /> Add Driver
              </button>
            </div>
          </div>

          {/* Search and Status Toolbar */}
          <div className="toolbar-card">
            <div className="search-field">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by name, email, phone, truck, or ID..."
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
                className={`filter-pill ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('ACTIVE')}
              >
                Active ({items.filter(d => d.status === 'ACTIVE').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('INACTIVE')}
              >
                Inactive ({items.filter(d => d.status === 'INACTIVE').length})
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

          {!loading && filteredDrivers.length > 0 && (
            <div className="table-card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Driver Name</th>
                      <th>Email Address</th>
                      <th>Phone Number</th>
                      <th>Assigned Truck</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr
                        key={driver.id}
                        className="clickable-row"
                        onClick={() => openEditModal(driver)}
                        title="Click to view and edit driver details"
                      >
                        <td>
                          <div className="table-user-cell">
                            <div className="table-avatar">
                              {`${driver.firstName?.[0] || ''}${driver.lastName?.[0] || ''}`.toUpperCase() || 'D'}
                            </div>
                            <div>
                              <div className="font-semibold text-dark">{getFullName(driver)}</div>
                              <div className="text-muted text-xs">ID: DRV-{driver.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{driver.email}</td>
                        <td>{driver.phone || '—'}</td>
                        <td>
                          {driver.truck ? (
                            <span className="truck-tag">
                              <TruckIcon size={13} /> {driver.truck.registrationNumber}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">No truck</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${driver.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}
                            onClick={(e) => handleToggleStatus(driver, e)}
                            title="Click to toggle status"
                            style={{ cursor: 'pointer' }}
                          >
                            {driver.status}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="table-action view"
                              onClick={() => openEditModal(driver)}
                              title="Edit driver"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              className="table-action danger"
                              onClick={(e) => handleDelete(driver.id, getFullName(driver), e)}
                              title="Delete driver"
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

      {/* CREATE DRIVER MODAL */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Driver Registration</p>
                <h3>Add New Driver</h3>
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
                  <label htmlFor="create-driver-firstName">First name *</label>
                  <input
                    id="create-driver-firstName"
                    name="firstName"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="e.g. John"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="create-driver-lastName">Last name *</label>
                  <input
                    id="create-driver-lastName"
                    name="lastName"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="e.g. Doe"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="create-driver-email">Email address *</label>
                  <input
                    id="create-driver-email"
                    name="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="driver@binova.cm"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="create-driver-phone">Phone number</label>
                  <input
                    id="create-driver-phone"
                    name="phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="create-driver-password">Initial password *</label>
                  <input
                    id="create-driver-password"
                    name="password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="create-driver-truck">Assign Truck</label>
                  <select
                    id="create-driver-truck"
                    name="truckId"
                    value={createForm.truckId}
                    onChange={(e) => setCreateForm(p => ({ ...p, truckId: e.target.value }))}
                  >
                    <option value="">No truck assigned</option>
                    {getAvailableTrucks(null).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.registrationNumber} ({t.status}) - {t.capacity}T
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="create-driver-status">Status</label>
                  <select
                    id="create-driver-status"
                    name="status"
                    value={createForm.status}
                    onChange={(e) => setCreateForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {formError && <div className="error-box">{formError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DRIVER MODAL */}
      {editModalOpen && selectedDriver && (
        <div className="modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Driver Details & Edit</p>
                <h3>Edit {getFullName(selectedDriver)}</h3>
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
                  <label htmlFor="edit-driver-firstName">First name *</label>
                  <input
                    id="edit-driver-firstName"
                    name="firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(p => ({ ...p, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="edit-driver-lastName">Last name *</label>
                  <input
                    id="edit-driver-lastName"
                    name="lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(p => ({ ...p, lastName: e.target.value }))}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="edit-driver-email">Email address *</label>
                  <input
                    id="edit-driver-email"
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="edit-driver-phone">Phone number</label>
                  <input
                    id="edit-driver-phone"
                    name="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="edit-driver-truck">Assigned Truck</label>
                  <select
                    id="edit-driver-truck"
                    name="truckId"
                    value={editForm.truckId}
                    onChange={(e) => setEditForm(p => ({ ...p, truckId: e.target.value }))}
                  >
                    <option value="">No truck assigned</option>
                    {getAvailableTrucks(selectedDriver.id).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.registrationNumber} ({t.status}) - {t.capacity}T
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="edit-driver-status">Status</label>
                  <select
                    id="edit-driver-status"
                    name="status"
                    value={editForm.status}
                    onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div className="field-group field-span-2">
                  <label htmlFor="edit-driver-password">
                    Reset Password <span className="text-muted text-xs font-normal">(Leave blank to keep current password)</span>
                  </label>
                  <input
                    id="edit-driver-password"
                    name="password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Enter new password (optional)"
                  />
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

