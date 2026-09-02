import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getSummary } from '../api/dashboardApi'
import {
  Activity,
  AlertTriangle,
  Truck,
  Users,
  Trash2,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Clock
} from 'lucide-react'

function StatCard({ title, value, icon: Icon, tone = 'default', onClick, subtitle = 'Click to view records' }){
  return (
    <div
      className={`stat-card stat-${tone} interactive-card`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      title={`View ${title}`}
    >
      <div className="stat-card-header">
        <div className="stat-icon-wrap">
          <Icon size={18} />
        </div>
        <div className="stat-arrow-hint">
          <ArrowUpRight size={15} />
        </div>
      </div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-meta">{subtitle}</div>
    </div>
  )
}

const getSummaryValue = (summary, ...keys) => {
  for (const key of keys) {
    if (summary && summary[key] !== undefined && summary[key] !== null) return summary[key]
  }
  return 0
}

export default function Dashboard(){
  const nav = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const user = JSON.parse(sessionStorage.getItem('binova_user') || 'null')
  const adminName = user?.firstName || 'Administrator'

  const load = () => {
    setLoading(true)
    getSummary()
      .then((response) => {
        const payload = response?.data?.data ?? response?.data ?? {}
        setSummary(payload)
        setError(null)
      })
      .catch(() => {
        setError('Unable to load dashboard summary data. Please verify backend connection.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const handleRefresh = () => load()
    window.addEventListener('binova:refresh-summary', handleRefresh)
    return () => window.removeEventListener('binova:refresh-summary', handleRefresh)
  }, [])

  const totalDrivers = getSummaryValue(summary, 'totalDrivers')
  const activeDrivers = getSummaryValue(summary, 'activeDrivers')
  const totalTrucks = getSummaryValue(summary, 'totalTrucks')
  const availableTrucks = getSummaryValue(summary, 'availableTrucks')
  const totalBins = getSummaryValue(summary, 'totalBins')
  const criticalBins = getSummaryValue(summary, 'criticalBins')
  const pendingCollections = getSummaryValue(summary, 'pendingTasks', 'pendingCollections')
  const inProgressCollections = getSummaryValue(summary, 'inProgressTasks', 'inProgressCollections')
  const completedCollections = getSummaryValue(summary, 'completedTasks', 'completedCollections')

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Dashboard" />
        <div className="content">
          <section className="welcome-card">
            <div>
              <p className="eyebrow">Municipal Operations Center</p>
              <h2>Welcome back, {adminName}</h2>
              <p className="welcome-subtext">Real-time overview of waste collection fleet, bins, and field operations.</p>
            </div>
            <div className="welcome-metric" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <span className="metric-label">Network Status</span>
                <strong className="status-live-tag"><span className="live-pulsing-dot" /> Live</strong>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => nav('/ai-planning')}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <Sparkles size={15} /> AI Route Planning
              </button>
            </div>
          </section>

          {loading && (
            <div className="page-empty">
              <div className="skeleton" />
              <div className="skeleton short" />
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          {summary && (
            <div className="stats-grid">
              <StatCard
                title="Total Drivers"
                value={totalDrivers}
                icon={Users}
                tone="primary"
                onClick={() => nav('/drivers')}
                subtitle="Manage registered drivers →"
              />
              <StatCard
                title="Active Drivers"
                value={activeDrivers}
                icon={Users}
                tone="info"
                onClick={() => nav('/drivers?status=ACTIVE')}
                subtitle="Filter active drivers →"
              />
              <StatCard
                title="Total Trucks"
                value={totalTrucks}
                icon={Truck}
                tone="success"
                onClick={() => nav('/trucks')}
                subtitle="View vehicle fleet →"
              />
              <StatCard
                title="Available Trucks"
                value={availableTrucks}
                icon={Truck}
                tone="success"
                onClick={() => nav('/trucks?status=AVAILABLE')}
                subtitle="Filter available trucks →"
              />
              <StatCard
                title="Total Bins"
                value={totalBins}
                icon={Trash2}
                tone="primary"
                onClick={() => nav('/bins')}
                subtitle="View all waste bins →"
              />
              <StatCard
                title="Critical Bins"
                value={criticalBins}
                icon={AlertTriangle}
                tone="warning"
                onClick={() => nav('/bins?filter=critical')}
                subtitle="View bins ≥ 80% full →"
              />
              <StatCard
                title="Pending Collections"
                value={pendingCollections}
                icon={Clock}
                tone="neutral"
                onClick={() => nav('/collections?status=ASSIGNED')}
                subtitle="View assigned tasks →"
              />
              <StatCard
                title="In Progress"
                value={inProgressCollections}
                icon={Activity}
                tone="neutral"
                onClick={() => nav('/collections?status=IN_PROGRESS')}
                subtitle="Track active routes →"
              />
              <StatCard
                title="Completed"
                value={completedCollections}
                icon={CheckCircle2}
                tone="success"
                onClick={() => nav('/collections?status=COMPLETED')}
                subtitle="View completed tasks →"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

