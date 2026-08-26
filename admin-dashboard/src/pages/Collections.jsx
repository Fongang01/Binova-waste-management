import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getCollectionTasks, createCollectionTask } from '../api/collectionTasksApi'
import { getBins } from '../api/binsApi'
import { getDrivers } from '../api/driversApi'
import { getTrucks } from '../api/trucksApi'
import {
  Plus,
  RefreshCcw,
  CheckCircle2,
  Search,
  X,
  ClipboardList,
  AlertCircle,
  Truck as TruckIcon,
  User,
  Trash2
} from 'lucide-react'

const INITIAL_FORM = {
  binId: '',
  driverId: '',
  truckId: '',
  priority: 'NORMAL',
  status: 'ASSIGNED',
  notes: '',
}

function normalizeList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export default function Collections(){
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [bins, setBins] = useState([])
  const [drivers, setDrivers] = useState([])
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const initialStatus = searchParams.get('status')?.toUpperCase() || 'ALL'
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  // Form State
  const [form, setForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [reviewTask, setReviewTask] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Sync URL query params
  useEffect(() => {
    const s = searchParams.get('status')?.toUpperCase()
    if (s && ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ALL'].includes(s)) {
      setStatusFilter(s)
    }
  }, [searchParams])

  const load = async () => {
    setLoading(true)
    try {
      const [tasksResponse, binsResponse, driversResponse, trucksResponse] = await Promise.all([
        getCollectionTasks(),
        getBins(),
        getDrivers(),
        getTrucks(),
      ])

      setItems(normalizeList(tasksResponse))
      setBins(normalizeList(binsResponse))
      setDrivers(normalizeList(driversResponse).filter((driver) => driver.status === 'ACTIVE'))
      setTrucks(normalizeList(trucksResponse).filter((truck) => truck.status === 'AVAILABLE' || truck.status === 'IN_USE'))
      setError(null)
    } catch (e) {
      setError(e?.response?.data?.message || 'Unable to load collection data')
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

  // Filter & Search Logic
  const filteredTasks = useMemo(() => {
    return items.filter((task) => {
      // Status Filter
      if (statusFilter !== 'ALL' && task.status !== statusFilter) {
        return false
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const binCode = (task.bin?.binCode || task.bin?.code || '').toLowerCase()
        const binAddress = (task.bin?.address || '').toLowerCase()
        const driverName = task.driver ? `${task.driver.firstName} ${task.driver.lastName}`.toLowerCase() : ''
        const truckReg = (task.truck?.registrationNumber || task.truck?.registration || '').toLowerCase()
        const idStr = String(task.id || '').toLowerCase()
        const notesStr = (task.notes || '').toLowerCase()

        return (
          binCode.includes(q) ||
          binAddress.includes(q) ||
          driverName.includes(q) ||
          truckReg.includes(q) ||
          idStr.includes(q) ||
          notesStr.includes(q)
        )
      }

      return true
    })
  }, [items, statusFilter, priorityFilter, searchQuery])

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status)
    if (status === 'ALL') {
      searchParams.delete('status')
    } else {
      searchParams.set('status', status)
    }
    setSearchParams(searchParams)
  }

  const selectedBin = bins.find((bin) => String(bin.id) === String(form.binId))
  const selectedDriver = drivers.find((driver) => String(driver.id) === String(form.driverId))
  const selectedTruck = trucks.find((truck) => String(truck.id) === String(form.truckId))

  const reviewAssignment = () => {
    if (!form.binId) {
      setFormError('Please select a bin.')
      return
    }
    if (!form.driverId) {
      setFormError('Please select an active driver.')
      return
    }

    setFormError('')
    setReviewTask({
      bin: selectedBin,
      driver: selectedDriver,
      truck: selectedTruck,
      priority: form.priority,
      notes: form.notes,
      status: form.status,
      source: 'MANUAL',
    })
  }

  const handleSubmit = async () => {
    if (!reviewTask) {
      setFormError('Review the assignment before confirming.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      await createCollectionTask({
        binId: Number(reviewTask.bin.id),
        driverId: Number(reviewTask.driver.id),
        truckId: reviewTask.truck ? Number(reviewTask.truck.id) : null,
        priority: reviewTask.priority,
        status: reviewTask.status,
        source: 'MANUAL',
        notes: reviewTask.notes || null,
      })

      setSuccess('Collection task assigned successfully.')
      setReviewTask(null)
      setForm(INITIAL_FORM)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.message || 'Unable to create collection task.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderEmptyState = () => {
    if (loading) return null
    if (items.length === 0) {
      return <div className="page-empty">No collection tasks assigned yet.</div>
    }
    if (filteredTasks.length === 0) {
      if (searchQuery.trim()) {
        return (
          <div className="page-empty">
            <p>No collection tasks matching &ldquo;{searchQuery}&rdquo; found.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        )
      }
      return (
        <div className="page-empty">
          <p>No {statusFilter.toLowerCase()} collection tasks found.</p>
          <button type="button" className="btn btn-secondary" onClick={() => handleStatusFilterChange('ALL')}>
            Show All Tasks
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
        <Topbar title="Collections" />
        <div className="content">
          <div className="page-header">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Collection Management & Dispatch</h2>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
                <RefreshCcw size={16} className={loading ? 'spinning' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* TASK ASSIGNMENT CARD */}
          <div className="card">
            <div className="section-heading">
              <div>
                <h3>Assign Collection Task</h3>
                <p className="text-muted text-xs">Dispatch an active driver to empty a target waste bin.</p>
              </div>
              <span className="muted-badge">Manual Dispatch</span>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="task-bin">Target Bin *</label>
                <select id="task-bin" name="binId" value={form.binId} onChange={handleChange}>
                  <option value="">Select a bin to empty</option>
                  {bins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.binCode || bin.code} — {bin.currentFillLevel}% Full ({bin.address || 'No address'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="task-driver">Assign Driver *</label>
                <select id="task-driver" name="driverId" value={form.driverId} onChange={handleChange}>
                  <option value="">Select an active driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName} {driver.truck ? `(Truck: ${driver.truck.registrationNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="task-truck">Truck (optional)</label>
                <select id="task-truck" name="truckId" value={form.truckId} onChange={handleChange}>
                  <option value="">Auto-assign or driver&apos;s truck</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.registrationNumber || truck.registration} ({truck.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="task-priority">Priority Level</label>
                <select id="task-priority" name="priority" value={form.priority} onChange={handleChange}>
                  <option value="LOW">LOW</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="field-group field-span-2">
                <label htmlFor="task-notes">Operational Notes</label>
                <textarea
                  id="task-notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Special instructions, gate access codes, or collection notes..."
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setForm(INITIAL_FORM); setReviewTask(null); setFormError('') }}>
                Clear
              </button>
              <button type="button" className="btn btn-primary" onClick={reviewAssignment}>
                <Plus size={16} /> Review Assignment
              </button>
            </div>

            {formError && <div className="error-box">{formError}</div>}
            {success && <div className="success-box">{success}</div>}

            {reviewTask && (
              <div className="task-review">
                <h4>Assignment Summary</h4>
                <p><strong>Bin:</strong> {reviewTask.bin ? `${reviewTask.bin.binCode || reviewTask.bin.code} (${reviewTask.bin.currentFillLevel}% Full) • ${reviewTask.bin.address || 'No address'}` : '—'}</p>
                <p><strong>Driver:</strong> {reviewTask.driver ? `${reviewTask.driver.firstName} ${reviewTask.driver.lastName}` : '—'}</p>
                <p><strong>Truck:</strong> {reviewTask.truck ? reviewTask.truck.registrationNumber || reviewTask.truck.registration : 'Driver Default'}</p>
                <p><strong>Priority:</strong> <span className={`status-badge status-${reviewTask.priority.toLowerCase()}`}>{reviewTask.priority}</span></p>
                <p><strong>Notes:</strong> {reviewTask.notes || 'None'}</p>
                <div style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                    <CheckCircle2 size={16} /> {submitting ? 'Confirming...' : 'Confirm & Dispatch Task'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SEARCH & FILTERS TOOLBAR */}
          <div className="toolbar-card">
            <div className="search-field">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search tasks by bin code, driver, truck, or notes..."
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
                onClick={() => handleStatusFilterChange('ALL')}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'ASSIGNED' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('ASSIGNED')}
              >
                Pending / Assigned ({items.filter(t => t.status === 'ASSIGNED').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('IN_PROGRESS')}
              >
                In Progress ({items.filter(t => t.status === 'IN_PROGRESS').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('COMPLETED')}
              >
                Completed ({items.filter(t => t.status === 'COMPLETED').length})
              </button>
            </div>

            <select
              className="select-field"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ maxWidth: 160 }}
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low Priority</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="CRITICAL">Critical Priority</option>
            </select>
          </div>

          {error && <div className="error-box">{error}</div>}

          {loading && (
            <div className="page-empty">
              <div className="skeleton" />
              <div className="skeleton short" />
            </div>
          )}

          {renderEmptyState()}

          {!loading && filteredTasks.length > 0 && (
            <div className="table-card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task ID</th>
                      <th>Bin Details</th>
                      <th>Assigned Driver</th>
                      <th>Vehicle</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <span className="font-semibold text-dark font-mono text-xs">#{task.id}</span>
                        </td>
                        <td>
                          <div>
                            <div className="font-semibold text-dark">{task.bin ? (task.bin.binCode || task.bin.code) : '—'}</div>
                            <div className="text-muted text-xs">{task.bin?.address || 'No address recorded'}</div>
                          </div>
                        </td>
                        <td>
                          {task.driver ? (
                            <div className="flex-align-center gap-6">
                              <User size={14} className="text-muted" />
                              <span>{task.driver.firstName} {task.driver.lastName}</span>
                            </div>
                          ) : (
                            <span className="text-muted text-xs">Unassigned</span>
                          )}
                        </td>
                        <td>
                          {task.truck ? (
                            <div className="flex-align-center gap-6">
                              <TruckIcon size={14} className="text-muted" />
                              <span>{task.truck.registrationNumber || task.truck.registration}</span>
                            </div>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge status-${(task.priority || 'NORMAL').toLowerCase()}`}>
                            {task.priority || 'NORMAL'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${(task.status || 'ASSIGNED').toLowerCase()}`}>
                            {task.status || 'ASSIGNED'}
                          </span>
                        </td>
                        <td>{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

