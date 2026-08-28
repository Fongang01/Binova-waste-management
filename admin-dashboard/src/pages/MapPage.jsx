import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getBins } from '../api/binsApi'
import {
  MapPin,
  RefreshCw,
  Maximize2,
  AlertTriangle,
  Layers,
  Trash2,
  Navigation,
  Info
} from 'lucide-react'
import './MapPage.css'

// Initial coordinate center: Yaoundé, Cameroon [lng, lat]
const YAOUNDE_CENTER = [11.5021, 3.8480]
const DEFAULT_ZOOM = 12.5

// Helper to determine fill level category
function getFillTone(fillLevel) {
  const level = Number(fillLevel) || 0
  if (level >= 80) return 'critical'
  if (level >= 50) return 'moderate'
  return 'normal'
}

function normalizeBins(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export default function MapPage() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const [bins, setBins] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)
  const [tokenError, setTokenError] = useState(false)
  const [filterTone, setFilterTone] = useState('ALL') // 'ALL', 'normal', 'moderate', 'critical'

  const mapboxToken = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim()

  // Fetch bins from API
  const loadBins = async () => {
    setLoading(true)
    setApiError(null)
    try {
      const res = await getBins()
      const data = normalizeBins(res)
      setBins(data)
    } catch (err) {
      console.error('Failed to load bins for map:', err)
      setApiError('Unable to load bins from server. Please check your backend connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBins()
  }, [])

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapboxToken) {
      setTokenError(true)
      return
    }

    if (!mapContainerRef.current) return

    try {
      mapboxgl.accessToken = mapboxToken

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: YAOUNDE_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: true
      })

      // Add navigation and full screen controls
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
      map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right')

      // Prepare future AI Route layer support once map style loads
      map.on('load', () => {
        /*
          =======================================================
          FUTURE AI ROUTE ARCHITECTURE SUPPORT
          The map is configured with a dedicated GeoJSON source
          and line layer for future AI-optimized collection routes.
          AI Engine -> Backend -> Mapbox Route Visualization
          =======================================================
        */
        if (!map.getSource('ai-collection-route')) {
          map.addSource('ai-collection-route', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          })

          map.addLayer({
            id: 'ai-collection-route-line',
            type: 'line',
            source: 'ai-collection-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#16a34a',
              'line-width': 4,
              'line-opacity': 0.85
            }
          })
        }
      })

      mapRef.current = map

      return () => {
        // Clean up markers and map instance on unmount
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []
        map.remove()
        mapRef.current = null
      }
    } catch (err) {
      console.error('Mapbox initialization error:', err)
      setTokenError(true)
    }
  }, [mapboxToken])

  // Filter and plot bin markers whenever bins or filter changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear previous markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Filter valid coordinates
    const geoBins = bins.filter(b => {
      const lat = Number(b.latitude)
      const lng = Number(b.longitude)
      return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0)
      )
    })

    const visibleBins = filterTone === 'ALL'
      ? geoBins
      : geoBins.filter(b => getFillTone(b.currentFillLevel) === filterTone)

    visibleBins.forEach(bin => {
      const lat = Number(bin.latitude)
      const lng = Number(bin.longitude)
      const fill = Math.round(Number(bin.currentFillLevel) || 0)
      const tone = getFillTone(fill)
      const status = (bin.status || 'ACTIVE').toLowerCase()
      const address = bin.address ? bin.address : 'Yaoundé, Cameroon'
      const capacity = bin.capacity ? `${bin.capacity} L` : 'N/A'

      // Create custom DOM Marker
      const el = document.createElement('div')
      el.className = `bin-marker-pin ${tone}`
      el.title = `${bin.binCode} (${fill}% Full)`

      const iconWrap = document.createElement('div')
      iconWrap.className = 'bin-marker-icon'
      iconWrap.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `
      el.appendChild(iconWrap)

      // Create Custom Popup Content
      const popupHtml = `
        <div class="bin-popup-card">
          <div class="bin-popup-header">
            <span class="bin-popup-code">${bin.binCode}</span>
            <span class="bin-popup-status ${status}">${bin.status || 'ACTIVE'}</span>
          </div>
          <div class="bin-popup-body">
            <div class="bin-popup-row">
              <span class="bin-popup-label">Fill Level</span>
              <span class="bin-popup-value">${fill}%</span>
            </div>
            <div class="bin-popup-fill-track">
              <div class="bin-popup-fill-bar ${tone}" style="width: ${Math.min(fill, 100)}%;"></div>
            </div>
            <div class="bin-popup-row" style="margin-top: 4px;">
              <span class="bin-popup-label">Capacity</span>
              <span class="bin-popup-value">${capacity}</span>
            </div>
            <div class="bin-popup-address">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${address}</span>
            </div>
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">
              Coords: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
            </div>
          </div>
        </div>
      `

      const popup = new mapboxgl.Popup({
        offset: 20,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '280px'
      }).setHTML(popupHtml)

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [bins, filterTone])

  // Recenter map to Yaoundé
  const handleRecenter = () => {
    if (!mapRef.current) return
    mapRef.current.flyTo({
      center: YAOUNDE_CENTER,
      zoom: DEFAULT_ZOOM,
      essential: true
    })
  }

  // Fit bounds to show all mapped bins
  const handleFitAllBins = () => {
    if (!mapRef.current) return
    const geoBins = bins.filter(b => {
      const lat = Number(b.latitude)
      const lng = Number(b.longitude)
      return !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)
    })

    if (geoBins.length === 0) {
      handleRecenter()
      return
    }

    const bounds = new mapboxgl.LngLatBounds()
    geoBins.forEach(b => bounds.extend([Number(b.longitude), Number(b.latitude)]))
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 1000 })
  }

  // Statistics calculation
  const totalBinsCount = bins.length
  const geoBinsCount = bins.filter(b => {
    const lat = Number(b.latitude)
    const lng = Number(b.longitude)
    return !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)
  }).length

  const criticalBinsCount = bins.filter(b => (Number(b.currentFillLevel) || 0) >= 80).length
  const moderateBinsCount = bins.filter(b => {
    const l = Number(b.currentFillLevel) || 0
    return l >= 50 && l < 80
  }).length
  const normalBinsCount = bins.filter(b => (Number(b.currentFillLevel) || 0) < 50).length

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Map" />
        <div className="content">
          <div className="map-page-container">
            {/* Header Control Card */}
            <div className="map-header-card">
              <div className="map-header-title">
                <h3>Geographic Waste Monitoring</h3>
                <p>Live Mapbox tracking of smart waste bins and collection routes across Yaoundé.</p>
              </div>

              <div className="map-header-actions">
                <div className="map-stat-badge">
                  <span className="map-stat-dot" />
                  <span>Mapped Bins: <strong>{geoBinsCount} / {totalBinsCount}</strong></span>
                </div>

                {criticalBinsCount > 0 && (
                  <div className="map-stat-badge critical">
                    <span className="map-stat-dot critical" />
                    <span>Critical (≥80%): <strong>{criticalBinsCount}</strong></span>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-map-action"
                  onClick={handleRecenter}
                  title="Recenter view on Yaoundé"
                >
                  <Navigation size={15} />
                  <span>Yaoundé</span>
                </button>

                <button
                  type="button"
                  className="btn-map-action"
                  onClick={handleFitAllBins}
                  title="Fit all bin markers into view"
                >
                  <Maximize2 size={15} />
                  <span>Fit Bins</span>
                </button>

                <button
                  type="button"
                  className="btn-map-action"
                  onClick={loadBins}
                  disabled={loading}
                  title="Refresh bin data from server"
                >
                  <RefreshCw size={15} className={loading ? 'spinning' : ''} />
                  <span>{loading ? 'Updating...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* API Warning if fetch fails */}
            {apiError && (
              <div className="error-box">
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: 8 }} />
                {apiError}
              </div>
            )}

            {/* Token Missing Warning State */}
            {tokenError ? (
              <div className="map-fallback-card">
                <div className="map-fallback-icon">
                  <AlertTriangle size={28} />
                </div>
                <h3>Mapbox Configuration Required</h3>
                <p>
                  A valid Mapbox public access token is required to initialize the interactive map.
                  Please ensure your environment variable is set in the admin dashboard:
                </p>
                <div className="map-token-guide">
                  VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Once added to <code>admin-dashboard/.env</code>, reload the page to start exploring the live map.
                </p>
              </div>
            ) : (
              /* Real Mapbox Viewport */
              <div className="map-canvas-wrapper">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                {/* Floating Map Legend Overlay */}
                <div className="map-legend-overlay">
                  <div className="map-legend-title">Bin Fill Status</div>
                  <div className="map-legend-items">
                    <div
                      className="map-legend-item"
                      style={{ cursor: 'pointer', opacity: filterTone === 'ALL' || filterTone === 'normal' ? 1 : 0.4 }}
                      onClick={() => setFilterTone(prev => (prev === 'normal' ? 'ALL' : 'normal'))}
                      title="Click to toggle filter for Normal bins"
                    >
                      <span className="map-legend-color normal" />
                      <span>Normal</span>
                      <span className="map-legend-range">&lt; 50% ({normalBinsCount})</span>
                    </div>

                    <div
                      className="map-legend-item"
                      style={{ cursor: 'pointer', opacity: filterTone === 'ALL' || filterTone === 'moderate' ? 1 : 0.4 }}
                      onClick={() => setFilterTone(prev => (prev === 'moderate' ? 'ALL' : 'moderate'))}
                      title="Click to toggle filter for Moderate bins"
                    >
                      <span className="map-legend-color moderate" />
                      <span>Moderate</span>
                      <span className="map-legend-range">50–79% ({moderateBinsCount})</span>
                    </div>

                    <div
                      className="map-legend-item"
                      style={{ cursor: 'pointer', opacity: filterTone === 'ALL' || filterTone === 'critical' ? 1 : 0.4 }}
                      onClick={() => setFilterTone(prev => (prev === 'critical' ? 'ALL' : 'critical'))}
                      title="Click to toggle filter for Critical bins"
                    >
                      <span className="map-legend-color critical" />
                      <span>Critical</span>
                      <span className="map-legend-range">≥ 80% ({criticalBinsCount})</span>
                    </div>
                  </div>

                  {filterTone !== 'ALL' && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        className="btn-map-action"
                        style={{ width: '100%', fontSize: '0.72rem', padding: '4px 8px', justifyContent: 'center' }}
                        onClick={() => setFilterTone('ALL')}
                      >
                        Show All Bins
                      </button>
                    </div>
                  )}

                  {geoBinsCount === 0 && !loading && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Info size={12} />
                      <span>No bins with valid GPS coordinates.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
