import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getCollectionTasks, createCollectionTask, deleteCollectionTask } from '../api/collectionTasksApi'
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
  Trash2,
  History,
  Archive,
  AlertTriangle,
  Sparkles
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
  const nav = useNavigate()
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

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Sync URL query params
  useEffect(() => {
    const s = searchParams.get('status')?.toUpperCase()
    if (s && ['PENDING', 'ASSIGNED', 'PENDING_ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELETED', 'ALL'].includes(s)) {
      if (s === 'DELETED') {
        setStatusFilter('CANCELLED')
      } else if (s === 'PENDING') {
        setStatusFilter('ASSIGNED')
      } else {
        setStatusFilter(s)
      }
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
      if (statusFilter === 'ALL') {
        if (task.status === 'CANCELLED') return false
      } else if (statusFilter === 'ASSIGNED' || statusFilter === 'PENDING' || statusFilter === 'PENDING_ASSIGNED') {
        if (task.status !== 'PENDING' && task.status !== 'ASSIGNED') return false
      } else if (statusFilter === 'IN_PROGRESS') {
        if (task.status !== 'IN_PROGRESS') return false
      } else if (statusFilter === 'COMPLETED') {
        if (task.status !== 'COMPLETED') return false
      } else if (statusFilter === 'CANCELLED' || statusFilter === 'DELETED') {
        if (task.status !== 'CANCELLED') return false
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const rawQ = q.replace(/^#/, '')

        const idStr = String(task.id || '').toLowerCase()
        const binCode = (task.bin?.binCode || task.bin?.code || '').toLowerCase()
        const binAddress = (task.bin?.address || '').toLowerCase()
        const driverFirst = (task.driver?.firstName || '').toLowerCase()
        const driverLast = (task.driver?.lastName || '').toLowerCase()
        const driverFull = `${driverFirst} ${driverLast}`.trim()
        const driverEmail = (task.driver?.email || '').toLowerCase()
        const truckReg = (task.truck?.registrationNumber || task.truck?.registration || '').toLowerCase()
        const truckModel = (task.truck?.model || '').toLowerCase()
        const notesStr = (task.notes || '').toLowerCase()
        const priorityStr = (task.priority || '').toLowerCase()

        const matchId = idStr === rawQ || idStr.includes(rawQ) || `task-${idStr}`.includes(rawQ)
        const matchBin = binCode.includes(q) || binAddress.includes(q)
        const matchDriver = driverFull.includes(q) || driverFirst.includes(q) || driverLast.includes(q) || driverEmail.includes(q)
        const matchTruck = truckReg.includes(q) || truckModel.includes(q)
        const matchOther = notesStr.includes(q) || priorityStr.includes(q)

        return matchId || matchBin || matchDriver || matchTruck || matchOther
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

  const openDeleteModal = (task, event) => {
    event?.stopPropagation()
    setTaskToDelete(task)
    setDeleteError('')
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteCollectionTask(taskToDelete.id)
      setSuccess(`Collection task #${taskToDelete.id} deleted and recorded in history.`)
      setDeleteModalOpen(false)
      setTaskToDelete(null)
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))
      await load()
    } catch (e) {
      setDeleteError(e?.response?.data?.message || 'Unable to delete collection task.')
    } finally {
      setDeleting(false)
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
      if (statusFilter === 'CANCELLED' || statusFilter === 'DELETED') {
        return (
          <div className="page-empty">
            <p>No deleted collection tasks in history.</p>
            <button type="button" className="btn btn-secondary" onClick={() => handleStatusFilterChange('ALL')}>
              Show Active Tasks
            </button>
          </div>
        )
      }
      return (
        <div className="page-empty">
          <p>No {statusFilter.toLowerCase()} collection tasks found.</p>
          <button type="button" className="btn btn-secondary" onClick={() => handleStatusFilterChange('ALL')}>
            Show All Active Tasks
          </button>
        </div>
      )
    }
    return null
  }

  const activeCount = items.filter(t => t.status !== 'CANCELLED').length
  const pendingAssignedCount = items.filter(t => t.status === 'PENDING' || t.status === 'ASSIGNED').length
  const inProgressCount = items.filter(t => t.status === 'IN_PROGRESS').length
  const completedCount = items.filter(t => t.status === 'COMPLETED').length
  const deletedCount = items.filter(t => t.status === 'CANCELLED').length

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
              <button type="button" className="btn btn-primary" onClick={() => nav('/ai-planning')}>
                <Sparkles size={16} /> AI Route Planning
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
          <div className="collections-toolbar-card">
            {/* Status Tabs Row: Required Order 1. All Active, 2. Pending / Assigned, 3. In Progress, 4. Completed, 5. Deleted History */}
            <div className="collections-tabs-row" role="tablist" aria-label="Task Status Tabs">
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'ALL'}
                className={`collections-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('ALL')}
              >
                <span>All Active</span>
                <span className="collections-tab-count">{activeCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'ASSIGNED' || statusFilter === 'PENDING' || statusFilter === 'PENDING_ASSIGNED'}
                className={`collections-tab-btn ${(statusFilter === 'ASSIGNED' || statusFilter === 'PENDING' || statusFilter === 'PENDING_ASSIGNED') ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('ASSIGNED')}
              >
                <span>Pending / Assigned</span>
                <span className="collections-tab-count">{pendingAssignedCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'IN_PROGRESS'}
                className={`collections-tab-btn ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('IN_PROGRESS')}
              >
                <span>In Progress</span>
                <span className="collections-tab-count">{inProgressCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'COMPLETED'}
                className={`collections-tab-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('COMPLETED')}
              >
                <span>Completed</span>
                <span className="collections-tab-count">{completedCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'CANCELLED'}
                className={`collections-tab-btn tab-deleted ${statusFilter === 'CANCELLED' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('CANCELLED')}
              >
                <Archive size={14} />
                <span>Deleted History</span>
                <span className="collections-tab-count">{deletedCount}</span>
              </button>
            </div>

            {/* Search & Priority Controls Row: Side-by-side on desktop, cleanly wrapping on smaller screens */}
            <div className="collections-search-filter-row">
              <div className="collections-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search tasks by ID, bin code, address, driver, vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search collection tasks"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="collections-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                className="collections-priority-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Filter by priority"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="NORMAL">Normal Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
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
                <table className="data-table collections-table">
                  <thead>
                    <tr>
                      <th style={{ width: '85px' }}>Task ID</th>
                      <th style={{ minWidth: '180px' }}>Bin Details</th>
                      <th style={{ minWidth: '160px' }}>Assigned Driver</th>
                      <th style={{ minWidth: '130px' }}>Vehicle</th>
                      <th style={{ width: '110px' }}>Priority</th>
                      <th style={{ width: '130px' }}>Status</th>
                      <th style={{ width: '120px' }}>Created</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => {
                      const isDeleted = task.status === 'CANCELLED'
                      return (
                        <tr key={task.id} style={{ opacity: isDeleted ? 0.88 : 1 }}>
                          <td>
                            <span className="font-semibold text-dark font-mono text-xs">#{task.id}</span>
                          </td>
                          <td>
                            <div className="bin-cell">
                              <div className="font-semibold text-dark">{task.bin ? (task.bin.binCode || task.bin.code) : `Bin #${task.binId}`}</div>
                              <div className="text-muted text-xs bin-address">{task.bin?.address || 'No address recorded'}</div>
                            </div>
                          </td>
                          <td>
                            {task.driver ? (
                              <div className="flex-align-center gap-6">
                                <User size={14} className="text-muted" style={{ flexShrink: 0 }} />
                                <span className="text-dark font-medium">{task.driver.firstName} {task.driver.lastName}</span>
                              </div>
                            ) : (
                              <span className="text-muted text-xs">Unassigned</span>
                            )}
                          </td>
                          <td>
                            {task.truck ? (
                              <div className="flex-align-center gap-6">
                                <TruckIcon size={14} className="text-muted" style={{ flexShrink: 0 }} />
                                <span className="font-mono text-xs font-semibold">{task.truck.registrationNumber || task.truck.registration}</span>
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
                            {isDeleted ? (
                              <span className="status-badge status-cancelled" title={task.notes || 'Deleted by Administrator'}>
                                DELETED
                              </span>
                            ) : (
                              <span className={`status-badge status-${(task.status || 'ASSIGNED').toLowerCase()}`}>
                                {task.status || 'ASSIGNED'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="text-xs">
                              <div className="text-dark">{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}</div>
                              {isDeleted && (
                                <div className="text-muted font-mono" style={{ color: '#ef4444', fontSize: '0.68rem' }}>
                                  Archived
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isDeleted ? (
                              <span className="muted-badge text-xs" title={task.notes || 'Recorded in History'}>
                                Archived
                              </span>
                            ) : (
                              <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="table-action danger"
                                  onClick={(e) => openDeleteModal(task, e)}
                                  title="Delete collection task"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && taskToDelete && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ color: '#ef4444' }}>Confirm Task Deletion</p>
                <h3>Delete Collection Task #{taskToDelete.id}?</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => !deleting && setDeleteModalOpen(false)}
                aria-label="Close modal"
                disabled={deleting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="details-card-body">
              <div className="alert-banner" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: 16 }}>
                <AlertTriangle size={20} color="#dc2626" />
                <div>
                  <strong>Attention Required</strong>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    This task will be removed from active collection operations. The deletion will be recorded in the collection history.
                  </p>
                </div>
              </div>

              <div className="details-grid" style={{ marginBottom: 16 }}>
                <div className="detail-item">
                  <span className="detail-label">Task ID</span>
                  <span className="detail-value font-mono font-bold">#{taskToDelete.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Target Bin</span>
                  <span className="detail-value font-bold">
                    {taskToDelete.bin?.binCode || taskToDelete.bin?.code || `Bin #${taskToDelete.binId}`}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Assigned Driver</span>
                  <span className="detail-value">
                    {taskToDelete.driver ? `${taskToDelete.driver.firstName} ${taskToDelete.driver.lastName}` : 'Unassigned'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle</span>
                  <span className="detail-value">
                    {taskToDelete.truck ? (taskToDelete.truck.registrationNumber || taskToDelete.truck.registration) : 'None'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Original Status</span>
                  <span className={`status-badge status-${(taskToDelete.status || 'ASSIGNED').toLowerCase()}`}>
                    {taskToDelete.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Priority</span>
                  <span className={`status-badge status-${(taskToDelete.priority || 'NORMAL').toLowerCase()}`}>
                    {taskToDelete.priority}
                  </span>
                </div>
              </div>

              {deleteError && <div className="error-box" style={{ marginBottom: 14 }}>{deleteError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  <Trash2 size={16} /> {deleting ? 'Deleting Task...' : 'Delete Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

