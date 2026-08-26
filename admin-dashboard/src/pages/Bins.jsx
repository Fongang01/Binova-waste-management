import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getBins, createBin, updateBin, deleteBin, patchBinStatus } from '../api/binsApi'
import {
  Search,
  Plus,
  RefreshCcw,
  Eye,
  Trash2,
  X,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  ArrowUpRight,
  Edit2
} from 'lucide-react'

const INITIAL_FORM = {
  binCode: '',
  latitude: '',
  longitude: '',
  address: '',
  capacity: '',
  currentFillLevel: '0',
  status: 'ACTIVE',
}

function normalizeList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export default function Bins(){
  const [searchParams, setSearchParams] = useSearchParams()
  const nav = useNavigate()
  const [bins, setBins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const initialFilter = searchParams.get('filter') === 'critical'
    ? 'CRITICAL'
    : (searchParams.get('status')?.toUpperCase() || 'ALL')
  const [statusFilter, setStatusFilter] = useState(initialFilter)

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedBin, setSelectedBin] = useState(null)

  // Form State
  const [form, setForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sync URL query params
  useEffect(() => {
    if (searchParams.get('filter') === 'critical') {
      setStatusFilter('CRITICAL')
    } else {
      const s = searchParams.get('status')?.toUpperCase()
      if (s && ['ACTIVE', 'INACTIVE', 'DAMAGED', 'REMOVED', 'ALL'].includes(s)) {
        setStatusFilter(s)
      }
    }
  }, [searchParams])

  const load = async () => {
    setLoading(true)
    try {
      const response = await getBins()
      setBins(normalizeList(response))
      setError(null)
    } catch (e) {
      setError(e?.response?.data?.message || 'Unable to load bins. Please try again.')
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

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Filter and Search Logic
  const filteredBins = useMemo(() => {
    return bins.filter((bin) => {
      // Critical Filter
      if (statusFilter === 'CRITICAL') {
        if (Number(bin.currentFillLevel || 0) < 80) return false
      } else if (statusFilter !== 'ALL') {
        if (bin.status !== statusFilter) return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const code = (bin.binCode || bin.code || '').toLowerCase()
        const address = (bin.address || '').toLowerCase()
        const idStr = String(bin.id || '').toLowerCase()
        return code.includes(q) || address.includes(q) || idStr.includes(q)
      }

      return true
    })
  }, [bins, statusFilter, searchQuery])

  const handleFilterChange = (filterVal) => {
    setStatusFilter(filterVal)
    if (filterVal === 'ALL') {
      searchParams.delete('status')
      searchParams.delete('filter')
    } else if (filterVal === 'CRITICAL') {
      searchParams.delete('status')
      searchParams.set('filter', 'critical')
    } else {
      searchParams.delete('filter')
      searchParams.set('status', filterVal)
    }
    setSearchParams(searchParams)
  }

  const validateForm = () => {
    if (!form.binCode.trim()) return 'Bin code is required.'
    if (!form.latitude && form.latitude !== 0) return 'Latitude is required.'
    if (!form.longitude && form.longitude !== 0) return 'Longitude is required.'
    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) return 'Latitude must be between -90 and 90.'
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) return 'Longitude must be between -180 and 180.'
    if (!form.capacity || Number(form.capacity) <= 0) return 'Capacity must be greater than zero.'
    if (form.currentFillLevel !== '' && (Number(form.currentFillLevel) < 0 || Number(form.currentFillLevel) > 100)) return 'Current fill level must be between 0 and 100.'
    if (!['ACTIVE', 'INACTIVE', 'DAMAGED', 'REMOVED'].includes(form.status)) return 'Please select a valid bin status.'
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationMessage = validateForm()
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      await createBin({
        binCode: form.binCode.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        address: form.address.trim(),
        capacity: Number(form.capacity),
        currentFillLevel: Number(form.currentFillLevel || 0),
        status: form.status,
      })

      setSuccess('Bin created successfully.')
      setCreateModalOpen(false)
      setForm(INITIAL_FORM)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.message || 'Unable to create bin.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, code, event) => {
    event?.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete bin "${code}"?`)) return
    try {
      await deleteBin(id)
      setSuccess('Bin deleted successfully.')
      if (selectedBin?.id === id) setDetailsModalOpen(false)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Delete failed')
    }
  }

  const openDetailsModal = (bin) => {
    setSelectedBin(bin)
    setDetailsModalOpen(true)
  }

  // Quick Action: Navigate to Collections with this bin pre-selected
  const handleAssignCollection = (bin) => {
    setDetailsModalOpen(false)
    nav('/collections')
  }

  const renderEmptyState = () => {
    if (loading) return null
    if (bins.length === 0) {
      return (
        <div className="page-empty">
          <p>No bins registered in the system yet.</p>
          <button type="button" className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} /> Add Your First Bin
          </button>
        </div>
      )
    }
    if (filteredBins.length === 0) {
      if (searchQuery.trim()) {
        return (
          <div className="page-empty">
            <p>No bins matching &ldquo;{searchQuery}&rdquo; found.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        )
      }
      if (statusFilter === 'CRITICAL') {
        return (
          <div className="page-empty">
            <p>No critical bins found (all bins are operating below 80% capacity).</p>
            <button type="button" className="btn btn-secondary" onClick={() => handleFilterChange('ALL')}>
              Show All Bins
            </button>
          </div>
        )
      }
      return (
        <div className="page-empty">
          <p>No {statusFilter.toLowerCase()} bins found.</p>
          <button type="button" className="btn btn-secondary" onClick={() => handleFilterChange('ALL')}>
            Show All Bins
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
        <Topbar title="Bins" />
        <div className="content">
          <div className="page-header">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Bin Management</h2>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
                <RefreshCcw size={16} className={loading ? 'spinning' : ''} /> Refresh
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { setFormError(''); setForm(INITIAL_FORM); setCreateModalOpen(true) }}>
                <Plus size={16} /> Add Bin
              </button>
            </div>
          </div>

          {/* Search and Filter Toolbar */}
          <div className="toolbar-card">
            <div className="search-field">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by bin code, address, or ID..."
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
                All ({bins.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'CRITICAL' ? 'active' : ''}`}
                onClick={() => handleFilterChange('CRITICAL')}
              >
                <AlertTriangle size={13} /> Critical ({bins.filter(b => Number(b.currentFillLevel || 0) >= 80).length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('ACTIVE')}
              >
                Active ({bins.filter(b => b.status === 'ACTIVE').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
                onClick={() => handleFilterChange('INACTIVE')}
              >
                Inactive ({bins.filter(b => b.status === 'INACTIVE').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'DAMAGED' ? 'active' : ''}`}
                onClick={() => handleFilterChange('DAMAGED')}
              >
                Damaged ({bins.filter(b => b.status === 'DAMAGED').length})
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

          {!loading && filteredBins.length > 0 && (
            <div className="table-card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bin Code</th>
                      <th>Location / Address</th>
                      <th>Fill Level</th>
                      <th>Capacity</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBins.map((bin) => {
                      const fill = Math.min(Math.max(Number(bin.currentFillLevel ?? 0), 0), 100)
                      const isCritical = fill >= 80
                      return (
                        <tr
                          key={bin.id}
                          className="clickable-row"
                          onClick={() => openDetailsModal(bin)}
                          title="Click to view full bin details"
                        >
                          <td>
                            <div className="font-semibold text-dark flex-align-center gap-6">
                              {bin.binCode || bin.code}
                              {isCritical && (
                                <span className="badge-critical-mini" title="Critical: Fill level ≥ 80%">
                                  <AlertTriangle size={12} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex-align-center gap-6 text-dark">
                              <MapPin size={14} className="text-muted" />
                              <span>{bin.address || `${bin.latitude?.toFixed(4)}, ${bin.longitude?.toFixed(4)}`}</span>
                            </div>
                          </td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-track">
                                <span
                                  style={{
                                    width: `${fill}%`,
                                    background: isCritical
                                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                      : 'linear-gradient(90deg, #10b981, #059669)'
                                  }}
                                />
                              </div>
                              <span className={isCritical ? 'text-danger font-semibold' : 'font-medium'}>{fill}%</span>
                            </div>
                          </td>
                          <td>{bin.capacity} m³</td>
                          <td>
                            <span className={`status-badge status-${(bin.status || 'ACTIVE').toLowerCase()}`}>
                              {bin.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td>{bin.updatedAt ? new Date(bin.updatedAt).toLocaleDateString() : '—'}</td>
                          <td>
                            <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="table-action view"
                                onClick={() => openDetailsModal(bin)}
                                title="View bin details"
                              >
                                <Eye size={14} /> View
                              </button>
                              <button
                                type="button"
                                className="table-action danger"
                                onClick={(e) => handleDelete(bin.id, bin.binCode || bin.code, e)}
                                title="Delete bin"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE BIN MODAL */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Bin Deployment</p>
                <h3>Add New Smart Bin</h3>
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

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field-group">
                  <label htmlFor="bin-code">Bin Code *</label>
                  <input
                    id="bin-code"
                    name="binCode"
                    value={form.binCode}
                    onChange={handleChange}
                    placeholder="e.g. BIN-001"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="bin-capacity">Capacity (m³) *</label>
                  <input
                    id="bin-capacity"
                    name="capacity"
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={form.capacity}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="bin-latitude">Latitude *</label>
                  <input
                    id="bin-latitude"
                    name="latitude"
                    type="number"
                    step="0.000001"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder="e.g. 3.8480"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="bin-longitude">Longitude *</label>
                  <input
                    id="bin-longitude"
                    name="longitude"
                    type="number"
                    step="0.000001"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder="e.g. 11.5021"
                    required
                  />
                </div>
                <div className="field-group field-span-2">
                  <label htmlFor="bin-address">Physical Address / Location</label>
                  <input
                    id="bin-address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="e.g. Central Market, Yaoundé"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="bin-currentFillLevel">Initial Fill Level (%)</label>
                  <input
                    id="bin-currentFillLevel"
                    name="currentFillLevel"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.currentFillLevel}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="bin-status">Status</label>
                  <select id="bin-status" name="status" value={form.status} onChange={handleChange}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="REMOVED">REMOVED</option>
                  </select>
                </div>
              </div>

              {formError && <div className="error-box">{formError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Bin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BIN DETAILS MODAL */}
      {detailsModalOpen && selectedBin && (
        <div className="modal-backdrop" onClick={() => setDetailsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Smart Waste Bin</p>
                <h3>Bin Details: {selectedBin.binCode || selectedBin.code}</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDetailsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="details-card-body">
              {Number(selectedBin.currentFillLevel || 0) >= 80 && (
                <div className="alert-banner warning">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Critical Fill Alert</strong>
                    <p>This bin is currently at {selectedBin.currentFillLevel}% capacity and requires immediate collection dispatch.</p>
                  </div>
                </div>
              )}

              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Bin Code</span>
                  <span className="detail-value font-bold">{selectedBin.binCode || selectedBin.code}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`status-badge status-${(selectedBin.status || 'ACTIVE').toLowerCase()}`}>
                    {selectedBin.status || 'ACTIVE'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current Fill Level</span>
                  <div className="detail-value flex-align-center gap-8">
                    <div className="progress-track" style={{ width: 120 }}>
                      <span
                        style={{
                          width: `${Math.min(Math.max(Number(selectedBin.currentFillLevel || 0), 0), 100)}%`,
                          background: Number(selectedBin.currentFillLevel || 0) >= 80 ? '#ef4444' : '#10b981'
                        }}
                      />
                    </div>
                    <strong>{selectedBin.currentFillLevel}%</strong>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Capacity</span>
                  <span className="detail-value">{selectedBin.capacity} m³</span>
                </div>
                <div className="detail-item field-span-2">
                  <span className="detail-label">Address / Location</span>
                  <span className="detail-value">{selectedBin.address || 'No specific street address registered.'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">GPS Coordinates</span>
                  <span className="detail-value font-mono">{selectedBin.latitude?.toFixed(6)}, {selectedBin.longitude?.toFixed(6)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{selectedBin.updatedAt ? new Date(selectedBin.updatedAt).toLocaleString() : '—'}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setDetailsModalOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAssignCollection(selectedBin)}
                >
                  <ArrowUpRight size={16} /> Assign Collection Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

