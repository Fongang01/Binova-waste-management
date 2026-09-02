import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
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
  Clock,
  Milestone,
  Trash2,
  Navigation,
  Maximize2,
  ArrowRight,
  ShieldCheck,
  Check,
  Layers,
  HelpCircle,
  Settings
} from 'lucide-react'
import './AiPlanning.css'

const YAOUNDE_CENTER = [11.5021, 3.8480]

export default function AiPlanning() {
  const nav = useNavigate()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

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

  const mapboxToken = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim()

  // Fetch AI Recommendation Plan
  const fetchPlan = async (options = {}) => {
    setError(null)
    try {
      const payload = {
        minFillThreshold: options.minFillThreshold ?? minFillThreshold,
        binIds: options.binIds ?? (selectedBinIds.length > 0 ? selectedBinIds : undefined),
        driverIdOverride: options.driverId ?? (selectedDriverId ? Number(selectedDriverId) : undefined),
        truckIdOverride: options.truckId ?? (selectedTruckId ? Number(selectedTruckId) : undefined),
        mapboxToken,
      }

      const res = await getAiPlanRecommendation(payload)
      const data = res?.data?.data || res?.data

      if (data) {
        setPlan(data)
        // Sync selected state if initial load
        if (!options.isPartialUpdate) {
          const initialIds = data.orderedStops ? data.orderedStops.map((s) => s.id) : []
          setSelectedBinIds(initialIds)
          if (data.recommendedDriver) setSelectedDriverId(String(data.recommendedDriver.id))
          if (data.recommendedTruck) setSelectedTruckId(String(data.recommendedTruck.id))
        }
      }
    } catch (err) {
      console.error('Failed to generate AI plan:', err)
      setError(err?.response?.data?.message || 'Unable to generate AI collection plan. Please verify backend service.')
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchPlan({ isPartialUpdate: false }).finally(() => setLoading(false))
  }, [])

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return

    try {
      mapboxgl.accessToken = mapboxToken

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: YAOUNDE_CENTER,
        zoom: 12.5,
        attributionControl: true,
      })

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
      map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right')

      map.on('load', () => {
        // AI Route Layer
        if (!map.getSource('ai-route-source')) {
          map.addSource('ai-route-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          })

          map.addLayer({
            id: 'ai-route-line',
            type: 'line',
            source: 'ai-route-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#10b981',
              'line-width': 5,
              'line-opacity': 0.85,
            },
          })
        }
      })

      mapRef.current = map

      return () => {
        markersRef.current.forEach((m) => m.remove())
        markersRef.current = []
        map.remove()
        mapRef.current = null
      }
    } catch (err) {
      console.error('Mapbox initialization error in AI Planning:', err)
    }
  }, [mapboxToken])

  // Update Route Polyline & Markers on Map
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (!plan) return

    // 1. Update Route Line GeoJSON Source
    const updateSource = () => {
      const source = map.getSource('ai-route-source')
      if (source && plan.route?.geometry) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: plan.route.geometry,
        })
      }
    }

    if (map.isStyleLoaded()) {
      updateSource()
    } else {
      map.once('load', updateSource)
    }

    const bounds = new mapboxgl.LngLatBounds()

    // 2. Add Start Location Marker
    if (plan.startPoint && !isNaN(plan.startPoint.latitude) && !isNaN(plan.startPoint.longitude)) {
      const startEl = document.createElement('div')
      startEl.className = 'ai-stop-pin start'
      startEl.title = plan.startPoint.name || 'Start Depot'
      startEl.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `

      const startPopup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
        <div style="font-family: inherit; padding: 4px;">
          <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">Dispatch Starting Point</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">${plan.startPoint.name || 'Yaoundé Central Depot'}</div>
        </div>
      `)

      const startMarker = new mapboxgl.Marker({ element: startEl, anchor: 'center' })
        .setLngLat([plan.startPoint.longitude, plan.startPoint.latitude])
        .setPopup(startPopup)
        .addTo(map)

      markersRef.current.push(startMarker)
      bounds.extend([plan.startPoint.longitude, plan.startPoint.latitude])
    }

    // 3. Add Waypoint Markers for Ordered Stops
    const stops = plan.orderedStops || []
    stops.forEach((stop) => {
      const lat = Number(stop.latitude)
      const lng = Number(stop.longitude)
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return

      const isSelected = selectedBinIds.includes(stop.id)
      if (!isSelected) return // only show selected route stops

      const pTone = (stop.priority || 'NORMAL').toLowerCase()

      const el = document.createElement('div')
      el.className = `ai-stop-pin ${pTone}`
      el.innerText = String(stop.stopOrder || '')
      el.title = `Stop #${stop.stopOrder}: ${stop.binCode} (${stop.currentFillLevel}% Full)`

      const popupHtml = `
        <div style="font-family: inherit; padding: 6px; min-width: 180px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight: 700; color: #0f172a; font-size: 0.88rem;">Stop #${stop.stopOrder}: ${stop.binCode}</span>
            <span style="font-size: 0.65rem; font-weight:700; padding:1px 5px; border-radius:4px; text-transform:uppercase; background:${pTone === 'critical' ? '#fee2e2' : pTone === 'high' ? '#ffedd5' : '#dcfce7'}; color:${pTone === 'critical' ? '#dc2626' : pTone === 'high' ? '#ea580c' : '#16a34a'};">${stop.priority}</span>
          </div>
          <div style="font-size: 0.75rem; color: #475569; margin-bottom: 2px;">
            <strong>Fill Level:</strong> ${stop.currentFillLevel}% (${stop.estimatedLoadM3 || 0} m³)
          </div>
          <div style="font-size: 0.72rem; color: #64748b;">
            ${stop.address || 'Yaoundé'}
          </div>
          <div style="font-size: 0.7rem; color: #059669; margin-top: 4px; font-style:italic;">
            ${stop.reason || ''}
          </div>
        </div>
      `

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(popupHtml)

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([lng, lat])
    })

    // Fit camera if multiple points exist
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 800 })
    }
  }, [plan, selectedBinIds])

  // Toggle individual bin selection
  const handleToggleBin = (binId) => {
    setSelectedBinIds((prev) => {
      const next = prev.includes(binId) ? prev.filter((id) => id !== binId) : [...prev, binId]
      return next
    })
  }

  // Recalculate route with modified selections
  const handleRecalculate = async () => {
    setRecalculating(true)
    await fetchPlan({
      binIds: selectedBinIds,
      driverId: selectedDriverId,
      truckId: selectedTruckId,
      minFillThreshold,
      isPartialUpdate: true,
    })
    setRecalculating(false)
  }

  // Approve AI Plan and Dispatch Collection Tasks
  const handleApprovePlan = async () => {
    if (selectedBinIds.length === 0) {
      setError('Please select at least one bin for collection.')
      return
    }
    if (!selectedDriverId) {
      setError('Please select an active driver for task assignment.')
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
          distanceKm: plan?.route?.distanceKm || null,
          durationMinutes: plan?.route?.durationMinutes || null,
          geometry: plan?.route?.geometry || null,
          orderedStops: plan?.orderedStops || [],
        },
      }

      const res = await approveAiPlan(approvalPayload)
      setSuccessMessage(res?.data?.message || 'Collection tasks created and dispatched successfully!')
      window.dispatchEvent(new CustomEvent('binova:refresh-summary'))

      // Redirect after brief delay
      setTimeout(() => {
        nav('/collections?status=ASSIGNED')
      }, 1600)
    } catch (err) {
      console.error('Approval failed:', err)
      setError(err?.response?.data?.message || 'Failed to create collection tasks from plan.')
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
                  <p>Intelligent route optimization, priority scoring, driver workload balancing & vehicle capacity checks.</p>
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
                  <span>Refresh Plan</span>
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

            {/* Warnings list */}
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

            {/* KPI Ribbon */}
            <div className="ai-metrics-grid">
              <div className="ai-metric-box">
                <span className="ai-metric-label">Selected Stops</span>
                <span className="ai-metric-val">{selectedBinIds.length} / {allBins.length}</span>
                <span className="ai-metric-sub">Waste Bins</span>
              </div>

              <div className="ai-metric-box critical">
                <span className="ai-metric-label">Critical Priority</span>
                <span className="ai-metric-val" style={{ color: '#dc2626' }}>
                  {summary.criticalBinsCount || 0}
                </span>
                <span className="ai-metric-sub">≥ 80% Full</span>
              </div>

              <div className="ai-metric-box">
                <span className="ai-metric-label">Estimated Waste</span>
                <span className="ai-metric-val">{summary.totalEstimatedWasteM3 || 0} m³</span>
                <span className="ai-metric-sub">Total Collection Load</span>
              </div>

              <div className="ai-metric-box route">
                <span className="ai-metric-label">Total Distance</span>
                <span className="ai-metric-val" style={{ color: '#059669' }}>
                  {summary.totalDistanceKm || 0} km
                </span>
                <span className="ai-metric-sub">
                  {summary.isRealRoadRoute ? 'Road-following route' : 'Geometric estimate'}
                </span>
              </div>

              <div className="ai-metric-box">
                <span className="ai-metric-label">Est. Duration</span>
                <span className="ai-metric-val">{summary.estimatedDurationMinutes || 0} min</span>
                <span className="ai-metric-sub">Driving + Extraction</span>
              </div>
            </div>

            {/* Split View: Map + Controls */}
            <div className="ai-planning-grid">
              {/* Mapbox Route Preview */}
              <div className="ai-map-card">
                <div className="ai-map-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Milestone size={16} className="text-success" />
                    <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>Interactive Mapbox Route</strong>
                    {summary.isRealRoadRoute && (
                      <span className="badge-road-route" style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        Real Roads
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-map-action"
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.flyTo({ center: YAOUNDE_CENTER, zoom: 12.5 })
                        }
                      }}
                      title="Recenter Map"
                    >
                      <Navigation size={14} />
                    </button>
                  </div>
                </div>

                <div className="ai-map-viewport">
                  <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>

              {/* Controls and Review Panel */}
              <div className="ai-control-panel">
                {/* Driver Recommendation */}
                <div className="ai-card-section">
                  <div className="ai-card-section-title">
                    <h3>
                      <Users size={16} className="text-primary" />
                      <span>Recommended Driver</span>
                    </h3>
                    {plan?.recommendedDriver && (
                      <span className="ai-score-badge">
                        Score: {plan.recommendedDriver.score}%
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
                        <label htmlFor="driver-select">Override Driver:</label>
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
                          {plan.recommendedTruck.registrationNumber} (Status: {plan.recommendedTruck.status})
                        </span>
                      </div>
                      <div className="ai-resource-reason">{plan.recommendedTruck.reason}</div>
                      {plan.recommendedTruck.warnings && plan.recommendedTruck.warnings.length > 0 && (
                        <div style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                          ⚠ {plan.recommendedTruck.warnings.join(' ')}
                        </div>
                      )}
                      <div className="ai-select-row">
                        <label htmlFor="truck-select">Override Truck:</label>
                        <select
                          id="truck-select"
                          value={selectedTruckId}
                          onChange={(e) => setSelectedTruckId(e.target.value)}
                        >
                          <option value="">-- Auto Dispatch / No Dedicated Truck --</option>
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

                {/* Bins Selection Checklist */}
                <div className="ai-card-section">
                  <div className="ai-card-section-title">
                    <h3>
                      <Trash2 size={16} className="text-primary" />
                      <span>Collection Bins Checklist ({selectedBinIds.length} selected)</span>
                    </h3>
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

                  <div className="ai-bins-list">
                    {allBins.length === 0 ? (
                      <div className="text-muted text-xs" style={{ padding: 12 }}>
                        No candidate bins found.
                      </div>
                    ) : (
                      allBins.map((bin) => {
                        const isSelected = selectedBinIds.includes(bin.id)
                        const pTone = (bin.priority || 'NORMAL').toLowerCase()
                        const stopIdx = plan?.orderedStops?.findIndex((s) => s.id === bin.id)
                        const stopNumber = stopIdx !== undefined && stopIdx >= 0 ? stopIdx + 1 : '—'

                        return (
                          <div
                            key={bin.id}
                            className={`ai-bin-item ${isSelected ? 'selected' : ''} ${bin.priority === 'CRITICAL' ? 'critical' : ''}`}
                            onClick={() => handleToggleBin(bin.id)}
                          >
                            <input
                              type="checkbox"
                              className="ai-bin-checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleBin(bin.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="ai-bin-index">#{stopNumber}</div>
                            <div className="ai-bin-info">
                              <div className="ai-bin-header-row">
                                <span className="ai-bin-code">{bin.binCode}</span>
                                <span className={`ai-priority-tag ${pTone}`}>{bin.priority}</span>
                              </div>
                              <div className="ai-bin-address">{bin.address || 'Yaoundé'}</div>
                              <div className="ai-bin-reason">{bin.reason}</div>
                            </div>
                            <div className="ai-bin-fill-cell">
                              <span className="ai-bin-fill-pct">{bin.currentFillLevel}%</span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{bin.estimatedLoadM3 || 0} m³</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRecalculate}
                      disabled={recalculating}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      <RefreshCw size={13} className={recalculating ? 'spinning' : ''} />
                      <span>Recalculate Route for Selected Bins</span>
                    </button>
                  </div>
                </div>

                {/* Dispatch Parameters */}
                <div className="ai-card-section">
                  <div className="ai-card-section-title">
                    <h3>
                      <Settings size={16} className="text-primary" />
                      <span>Administrative Dispatch Settings</span>
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

                    <div className="field-group field-span-2">
                      <label htmlFor="admin-notes">Notes / Instructions for Driver</label>
                      <input
                        id="admin-notes"
                        type="text"
                        placeholder="e.g. Optimize for morning traffic; start from Yaoundé central market."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Action Footer */}
            <div className="ai-approval-bar">
              <div className="ai-approval-summary">
                <span className="ai-approval-title">
                  Ready to Dispatch {selectedBinIds.length} Collection {selectedBinIds.length === 1 ? 'Task' : 'Tasks'}
                </span>
                <span className="ai-approval-meta">
                  Assigned to{' '}
                  <strong>
                    {activeDrivers.find((d) => String(d.id) === String(selectedDriverId))
                      ? `${activeDrivers.find((d) => String(d.id) === String(selectedDriverId)).firstName} ${activeDrivers.find((d) => String(d.id) === String(selectedDriverId)).lastName}`
                      : 'Selected Driver'}
                  </strong>{' '}
                  • Route Distance: <strong>{summary.totalDistanceKm || 0} km</strong> • Est. Duration:{' '}
                  <strong>{summary.estimatedDurationMinutes || 0} mins</strong>
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
                  <span>Approve & Create Task</span>
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
                        <h3>Confirm Collection Route</h3>
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
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>TRUCK:</span>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            {availableTrucks.find((t) => String(t.id) === String(selectedTruckId))?.registrationNumber ||
                              (plan?.recommendedTruck?.registrationNumber || 'Auto-assigned')}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>STOPS:</span>
                          <div style={{ fontWeight: 700, color: '#10b981' }}>
                            {selectedBinIds.length} Ordered Stops
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>DISTANCE & TIME:</span>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            {summary.totalDistanceKm || 0} km • {summary.estimatedDurationMinutes || 0} min
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                        Sequence of Collection Stops:
                      </span>
                      <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({stop.address || 'Yaoundé'})</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: stop.currentFillLevel >= 80 ? '#dc2626' : '#16a34a' }}>
                                  {stop.currentFillLevel}%
                                </span>
                                <span className={`ai-priority-tag ${(stop.priority || 'NORMAL').toLowerCase()}`}>
                                  {stop.priority}
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
                        <span>{approving ? 'Creating Task...' : 'Approve & Create Task'}</span>
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
