import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getAiPlanRecommendation, approveAiPlan } from '../api/aiPlanningApi'
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Users,
  ShieldCheck,
  Check,
  Settings,
  X,
  ListOrdered
} from 'lucide-react'
import './AiPlanning.css'

export default function AiPlanning() {
  const nav = useNavigate()

  // Recommendation state
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Custom Override Selections
  const [selectedBinIds, setSelectedBinIds] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [selectedTruckId, setSelectedTruckId] = useState('')
  const [minFillThreshold, setMinFillThreshold] = useState(40)
  const [priorityOverride, setPriorityOverride] = useState('AUTO')
  const [adminNotes, setAdminNotes] = useState('')

  // Action state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [approving, setApproving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  // Fetch AI Recommendation Plan
  const fetchPlan = async (options = {}) => {
    setError(null)
    try {
      const payload = {
        minFillThreshold: options.minFillThreshold ?? minFillThreshold,
        binIds: options.binIds ?? (selectedBinIds.length > 0 ? selectedBinIds : undefined),
        driverIdOverride: options.driverId ?? (selectedDriverId ? Number(selectedDriverId) : undefined),
        truckIdOverride: options.truckId ?? (selectedTruckId ? Number(selectedTruckId) : undefined),
      }

      const res = await getAiPlanRecommendation(payload)
      const data = res?.data?.data || res?.data

      if (data) {
        setPlan(data)
        if (!options.isPartialUpdate) {
          const initialIds = data.orderedStops ? data.orderedStops.map((s) => s.id) : []
          setSelectedBinIds(initialIds)
          if (data.recommendedDriver) setSelectedDriverId(String(data.recommendedDriver.id))
          if (data.recommendedTruck) setSelectedTruckId(String(data.recommendedTruck.id))
        }
      }
    } catch (err) {
      console.error('Failed to generate AI plan:', err)
      setError(err?.response?.data?.message || 'Unable to generate AI collection plan.')
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchPlan({ isPartialUpdate: false }).finally(() => setLoading(false))
  }, [])

  // Toggle bin selection
  const handleToggleBin = (binId) => {
    setSelectedBinIds((prev) => {
      if (prev.includes(binId)) {
        return prev.filter((id) => id !== binId)
      } else {
        return [...prev, binId]
      }
    })
  }

  // Recalculate plan with selected bins
  const handleRecalculate = async () => {
    if (selectedBinIds.length === 0) {
      setError('Please select at least one bin to calculate route.')
      return
    }
    setRecalculating(true)
    await fetchPlan({
      isPartialUpdate: true,
      binIds: selectedBinIds,
      driverId: selectedDriverId ? Number(selectedDriverId) : undefined,
      truckId: selectedTruckId ? Number(selectedTruckId) : undefined,
    })
    setRecalculating(false)
  }

  // Approve & Dispatch Task
  const handleApprovePlan = async () => {
    if (selectedBinIds.length === 0) {
      setError('Please select at least one bin for collection.')
      return
    }
    
    setApproving(true)
    setError(null)
    setSuccessMessage('')

    try {
      const approvalPayload = {
        binIds: selectedBinIds,
        driverId: Number(selectedDriverId),
        truckId: selectedTruckId ? Number(selectedTruckId) : null,
        priority: priorityOverride,
        notes: adminNotes.trim(),
        routeData: {
          distanceKm: plan?.summary?.totalDistanceKm || null,
          durationMinutes: plan?.summary?.estimatedDurationMinutes || null,
          orderedStops: plan?.orderedStops || [],
        },
      }

      const res = await approveAiPlan(approvalPayload)
      setSuccessMessage(res?.data?.message || 'Collection tasks dispatched successfully!')
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))

      setTimeout(() => {
        nav('/collections?status=ASSIGNED')
      }, 1600)
    } catch (err) {
      console.error('Approval failed:', err)
      setError(err?.response?.data?.message || 'Failed to create collection tasks.')
    } finally {
      setApproving(false)
    }
  }

  const allBins = plan?.allCandidateBins || []
  const activeDrivers = plan?.allActiveDrivers || []
  const availableTrucks = plan?.allAvailableTrucks || []
  const summary = plan?.summary || {}

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="AI Route Planning" />
        <div className="content">
          <div className="ai-planning-container">
            {/* Header Card */}
            <div className="ai-header-card">
              <div className="ai-header-title">
                <div className="ai-sparkle-badge">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2>AI-Assisted Collection Dispatch</h2>
                  <p>Intelligent priority scoring, driver workload balancing, vehicle capacity verification, and collection order recommendation.</p>
                </div>
              </div>

              <div className="ai-header-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setLoading(true)
                    fetchPlan({ isPartialUpdate: false }).finally(() => setLoading(false))
                  }}
                  disabled={loading || recalculating}
                >
                  <RefreshCw size={15} className={loading || recalculating ? 'spinning' : ''} />
                  <span>Refresh Recommendation</span>
                </button>
              </div>
            </div>

            {/* Notification Banners */}
            {successMessage && (
              <div className="success-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="error-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Operational Warnings */}
            {summary.warnings && summary.warnings.length > 0 && (
              <div className="alert-banner warning">
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Operational Warnings</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {summary.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* KPI Metrics Ribbon */}
            <div className="ai-metrics-grid">
              <div className="ai-metric-box">
                <span className="ai-metric-label">Selected Stops</span>
                <span className="ai-metric-val">{selectedBinIds.length} / {allBins.length}</span>
                <span className="ai-metric-sub">Waste Bins</span>
              </div>

              <div className="ai-metric-box">
                <span className="ai-metric-label">Estimated Waste</span>
                <span className="ai-metric-val">{summary.totalEstimatedWasteM3 || 0} m³</span>
                <span className="ai-metric-sub">Total Collection Load</span>
              </div>

              <div className="ai-metric-box route">
                <span className="ai-metric-label">Estimated Distance</span>
                <span className="ai-metric-val" style={{ color: '#059669' }}>
                  {summary.totalDistanceKm || 0} km
                </span>
                <span className="ai-metric-sub">Estimated Total Route</span>
              </div>

              <div className="ai-metric-box">
                <span className="ai-metric-label">Est. Duration</span>
                <span className="ai-metric-val">{summary.estimatedDurationMinutes || 0} min</span>
                <span className="ai-metric-sub">Driving + Extraction</span>
              </div>
            </div>

            {/* Main AI Decision Review Layout */}
            <div className="ai-review-grid">
              {/* Left Column: Resource Matching & Dispatch Settings */}
              <div className="ai-resources-col">
                {/* Driver Recommendation */}
                <div className="ai-card-section">
                  <div className="ai-card-section-title">
                    <h3>
                      <Users size={16} className="text-primary" />
                      <span>Recommended Driver</span>
                    </h3>
                    {plan?.recommendedDriver && (
                      <span className="ai-score-badge">
                        Suitability: {plan.recommendedDriver.score}%
                      </span>
                    )}
                  </div>

                  {plan?.recommendedDriver ? (
                    <div className="ai-resource-card">
                      <div className="ai-resource-header">
                        <span className="ai-resource-name">
                          {plan.recommendedDriver.firstName} {plan.recommendedDriver.lastName} ({plan.recommendedDriver.email})
                        </span>
                      </div>
                      <div className="ai-resource-reason">{plan.recommendedDriver.reason}</div>
                      <div className="ai-select-row">
                        <label htmlFor="driver-select">Assigned Driver:</label>
                        <select
                          id="driver-select"
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                        >
                          {activeDrivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.firstName} {d.lastName} (Workload: {d.activeTasksCount} tasks, Score: {d.score}%)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted text-xs">No active drivers available.</div>
                  )}
                </div>

                {/* Truck Recommendation */}
                <div className="ai-card-section">
                  <div className="ai-card-section-title">
                    <h3>
                      <Truck size={16} className="text-primary" />
                      <span>Recommended Vehicle</span>
                    </h3>
                    {plan?.recommendedTruck && (
                      <span className="ai-score-badge">
                        Cap: {plan.recommendedTruck.capacity} m³
                      </span>
                    )}
                  </div>

                  {plan?.recommendedTruck ? (
                    <div className="ai-resource-card">
                      <div className="ai-resource-header">
                        <span className="ai-resource-name">
                          {plan.recommendedTruck.registrationNumber} ({plan.recommendedTruck.status})
                        </span>
                      </div>
                      <div className="ai-resource-reason">{plan.recommendedTruck.reason}</div>
                      {plan.recommendedTruck.warnings && plan.recommendedTruck.warnings.length > 0 && (
                        <div style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                          ⚠ {plan.recommendedTruck.warnings.join(' ')}
                        </div>
                      )}
                      <div className="ai-select-row">
                        <label htmlFor="truck-select">Assigned Vehicle:</label>
                        <select
                          id="truck-select"
                          value={selectedTruckId}
                          onChange={(e) => setSelectedTruckId(e.target.value)}
                        >
                          <option value="">-- No Dedicated Vehicle --</option>
                          {availableTrucks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.registrationNumber} (Cap: {t.capacity} m³, {t.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted text-xs">No operational trucks available.</div>
                  )}
                </div>

                {/* Dispatch Parameters */}
                <div className="ai-card-section">
                  <div className="ai-card-section-title">
                    <h3>
                      <Settings size={16} className="text-primary" />
                      <span>Dispatch Configuration</span>
                    </h3>
                  </div>

                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor="priority-override">Task Priority Setting</label>
                      <select
                        id="priority-override"
                        value={priorityOverride}
                        onChange={(e) => setPriorityOverride(e.target.value)}
                      >
                        <option value="AUTO">Automatic (Based on Fill Level & AI)</option>
                        <option value="CRITICAL">Force CRITICAL</option>
                        <option value="HIGH">Force HIGH</option>
                        <option value="NORMAL">Force NORMAL</option>
                        <option value="LOW">Force LOW</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor="min-fill">Minimum Fill Threshold</label>
                      <select
                        id="min-fill"
                        value={minFillThreshold}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setMinFillThreshold(val)
                          fetchPlan({ minFillThreshold: val, isPartialUpdate: true })
                        }}
                      >
                        <option value={30}>≥ 30% Fill (Broad Collection)</option>
                        <option value={40}>≥ 40% Fill (Recommended)</option>
                        <option value={60}>≥ 60% Fill (High Volume Only)</option>
                        <option value={80}>≥ 80% Fill (Critical Only)</option>
                      </select>
                    </div>

                    <div className="field-group field-span-2">
                      <label htmlFor="admin-notes">Notes / Instructions for Driver</label>
                      <input
                        id="admin-notes"
                        type="text"
                        placeholder="e.g. Prioritize market sector before noon; check bin sensor seal."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Ordered Collection Stops & Bins Selection */}
              <div className="ai-stops-col">
                <div className="ai-card-section full-height">
                  <div className="ai-card-section-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ListOrdered size={18} className="text-primary" />
                      <div>
                        <h3 style={{ margin: 0 }}>Recommended Collection Sequence</h3>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                          Ordered sequence recommended for driver navigation ({selectedBinIds.length} stops selected)
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-text"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setSelectedBinIds(allBins.map((b) => b.id))}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn-text"
                        style={{ fontSize: '0.75rem', color: '#64748b' }}
                        onClick={() => setSelectedBinIds([])}
                      >
                        Deselect
                      </button>
                    </div>
                  </div>

                  <div className="ai-bins-list detailed">
                    {allBins.length === 0 ? (
                      <div className="text-muted text-xs" style={{ padding: 24, textAlign: 'center' }}>
                        No candidate bins currently require collection under this threshold.
                      </div>
                    ) : (
                      allBins.map((bin) => {
                        const isSelected = selectedBinIds.includes(bin.id)
                        const pTone = (bin.priority || 'NORMAL').toLowerCase()
                        const stopIdx = plan?.orderedStops?.findIndex((s) => s.id === bin.id)
                        const stopNumber = stopIdx !== undefined && stopIdx >= 0 ? stopIdx + 1 : '—'
                        const fillPct = Number(bin.currentFillLevel) || 0

                        return (
                          <div
                            key={bin.id}
                            className={`ai-bin-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleToggleBin(bin.id)}
                          >
                            <input
                              type="checkbox"
                              className="ai-bin-checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleBin(bin.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className={`ai-bin-index-badge ${isSelected ? 'active' : ''}`}>
                              <span>#{stopNumber}</span>
                            </div>
                            <div className="ai-bin-info">
                              <div className="ai-bin-header-row">
                                <span className="ai-bin-code">{bin.binCode}</span>
                                <span className={`ai-priority-tag ${pTone}`}>{bin.priority}</span>
                                {bin.address && <span className="ai-bin-address-inline">• {bin.address}</span>}
                              </div>
                              {bin.reason && <div className="ai-bin-reason">{bin.reason}</div>}
                            </div>
                            <div className="ai-bin-fill-cell">
                              <div className="ai-fill-bar-wrapper">
                                <span className="ai-bin-fill-pct">{fillPct}%</span>
                                <div className="ai-fill-bar">
                                  <div
                                    className="ai-fill-bar-fill"
                                    style={{
                                      width: `${Math.min(fillPct, 100)}%`,
                                      background: fillPct >= 80 ? '#ef4444' : fillPct >= 50 ? '#f59e0b' : '#10b981'
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="ai-bin-load-label">{bin.estimatedLoadM3 || 0} m³</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Driver will navigate these stops in order #1 → #2 → #3... starting from their live GPS location.
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRecalculate}
                      disabled={recalculating}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      <RefreshCw size={13} className={recalculating ? 'spinning' : ''} />
                      <span>Re-sequence Selected Bins</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Action Footer */}
            <div className="ai-approval-bar">
              <div className="ai-approval-summary">
                <span className="ai-approval-title">
                  Ready to Dispatch {selectedBinIds.length} Collection {selectedBinIds.length === 1 ? 'Stop' : 'Stops'}
                </span>
                <span className="ai-approval-meta">
                  Assigned to{' '}
                  <strong>
                    {activeDrivers.find((d) => String(d.id) === String(selectedDriverId))
                      ? `${activeDrivers.find((d) => String(d.id) === String(selectedDriverId)).firstName} ${activeDrivers.find((d) => String(d.id) === String(selectedDriverId)).lastName}`
                      : 'Selected Driver'}
                  </strong>{' '}
                  • Vehicle:{' '}
                  <strong>
                    {availableTrucks.find((t) => String(t.id) === String(selectedTruckId))?.registrationNumber ||
                      plan?.recommendedTruck?.registrationNumber ||
                      'Fleet Truck'}
                  </strong>{' '}
                  • Total Est. Waste: <strong>{summary.totalEstimatedWasteM3 || 0} m³</strong>
                </span>
              </div>

              <div className="ai-approval-actions">
                <button
                  type="button"
                  className="btn-approve-dispatch"
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={approving || selectedBinIds.length === 0 || !selectedDriverId}
                >
                  <ShieldCheck size={18} />
                  <span>Approve & Dispatch AI Plan</span>
                </button>
              </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {confirmModalOpen && (
              <div className="modal-backdrop" onClick={() => setConfirmModalOpen(false)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
                  <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="ai-sparkle-badge" style={{ width: 36, height: 36 }}>
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <p className="eyebrow">Task Dispatch Confirmation</p>
                        <h3>Confirm Collection Dispatch</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setConfirmModalOpen(false)}
                      aria-label="Close modal"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="details-card-body" style={{ padding: '16px 20px' }}>
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>DRIVER:</span>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            {activeDrivers.find((d) => String(d.id) === String(selectedDriverId))
                              ? `${activeDrivers.find((d) => String(d.id) === String(selectedDriverId)).firstName} ${activeDrivers.find((d) => String(d.id) === String(selectedDriverId)).lastName}`
                              : 'Selected Driver'}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>VEHICLE:</span>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            {availableTrucks.find((t) => String(t.id) === String(selectedTruckId))?.registrationNumber ||
                              (plan?.recommendedTruck?.registrationNumber || 'Auto-assigned')}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>CONFIRMED STOPS:</span>
                          <div style={{ fontWeight: 700, color: '#10b981' }}>
                            {selectedBinIds.length} Ordered Stops
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>ESTIMATED LOAD:</span>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            {summary.totalEstimatedWasteM3 || 0} m³ (Est. {summary.estimatedDurationMinutes || 0} min)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                        Recommended Collection Sequence:
                      </span>
                      <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(plan?.orderedStops || [])
                          .filter((s) => selectedBinIds.includes(s.id))
                          .map((stop, idx) => (
                            <div
                              key={stop.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 6,
                                fontSize: '0.8rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <strong style={{ color: '#059669' }}>#{idx + 1}</strong>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{stop.binCode}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: stop.currentFillLevel >= 80 ? '#dc2626' : '#16a34a' }}>
                                  {stop.currentFillLevel}%
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setConfirmModalOpen(false)}
                        disabled={approving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-approve-dispatch"
                        onClick={() => {
                          setConfirmModalOpen(false)
                          handleApprovePlan()
                        }}
                        disabled={approving}
                      >
                        <Check size={16} />
                        <span>{approving ? 'Dispatching...' : 'Approve & Dispatch to Driver'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
