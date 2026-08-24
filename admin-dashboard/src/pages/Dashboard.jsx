import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getSummary } from '../api/dashboardApi'
import { Activity, AlertTriangle, Truck, Users, Trash2, CheckCircle2 } from 'lucide-react'

function StatCard({title, value, icon: Icon, tone = 'default'}){
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-icon-wrap">
        <Icon size={18} />
      </div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-meta">Live system data</div>
    </div>
  )
}

export default function Dashboard(){
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{
    setLoading(true)
    getSummary().then(r=>{ setSummary(r.data); setError(null) }).catch(e=>{ setError('Unable to load summary') }).finally(()=>setLoading(false))
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Dashboard" />
        <div className="content">
          <section className="welcome-card">
            <div>
              <p className="eyebrow">Good afternoon, Administrator</p>
              <h2>Here&apos;s what&apos;s happening with BINOVA today.</h2>
            </div>
            <div className="welcome-metric">
              <span className="metric-label">Network health</span>
              <strong>94.2%</strong>
            </div>
          </section>

          {loading && <div className="page-empty"><div className="skeleton" /><div className="skeleton short" /></div>}
          {error && <div className="error-box">{error}</div>}
          {summary && (
            <div className="stats-grid">
              <StatCard title="Total Bins" value={summary.totalBins} icon={Trash2} tone="primary" />
              <StatCard title="Critical Bins" value={summary.criticalBins} icon={AlertTriangle} tone="warning" />
              <StatCard title="Active Drivers" value={summary.activeDrivers} icon={Users} tone="info" />
              <StatCard title="Available Trucks" value={summary.availableTrucks} icon={Truck} tone="success" />
              <StatCard title="Pending Collections" value={summary.pendingCollections} icon={Activity} tone="neutral" />
              <StatCard title="In Progress" value={summary.inProgressCollections} icon={Activity} tone="neutral" />
              <StatCard title="Completed" value={summary.completedCollections} icon={CheckCircle2} tone="success" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
