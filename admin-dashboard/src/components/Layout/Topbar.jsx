import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  Settings,
  AlertTriangle,
  Clock,
  Truck as TruckIcon,
  CheckCircle2,
  X,
  ArrowRight,
  User,
  LogOut
} from 'lucide-react'
import { clearSession } from '../../utils/auth'
import { getBins } from '../../api/binsApi'
import { getCollectionTasks } from '../../api/collectionTasksApi'
import { getTrucks } from '../../api/trucksApi'

function normalize(res) {
  const p = res?.data
  if (Array.isArray(p)) return p
  if (p && Array.isArray(p.data)) return p.data
  return []
}

export default function Topbar({ title }){
  const nav = useNavigate()
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('binova_user') || 'null'))
  const [customAvatar, setCustomAvatar] = useState(() => localStorage.getItem('binova_custom_avatar') || null)

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [notifFilter, setNotifFilter] = useState('ALL') // 'ALL' or 'UNREAD'
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const stored = localStorage.getItem('binova_read_notif_ids')
      return stored ? JSON.parse(stored) : []
    } catch (_) {
      return []
    }
  })

  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  const saveReadIds = (ids) => {
    setReadNotifIds(ids)
    try {
      localStorage.setItem('binova_read_notif_ids', JSON.stringify(ids))
    } catch (_) {}
  }

  const markAsRead = (id) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id]
      saveReadIds(updated)
    }
  }

  const markAllAsRead = () => {
    const allIds = alerts.map((a) => a.id)
    saveReadIds(allIds)
  }

  const clearReadHistory = () => {
    saveReadIds([])
  }

  const syncUser = () => {
    setUser(JSON.parse(sessionStorage.getItem('binova_user') || 'null'))
    setCustomAvatar(localStorage.getItem('binova_custom_avatar') || null)
  }

  useEffect(() => {
    window.addEventListener('binova:user-updated', syncUser)
    return () => window.removeEventListener('binova:user-updated', syncUser)
  }, [])

  // Load real system alerts
  const loadAlerts = async () => {
    setLoadingAlerts(true)
    try {
      const [binsRes, tasksRes, trucksRes] = await Promise.all([
        getBins().catch(() => ({ data: [] })),
        getCollectionTasks().catch(() => ({ data: [] })),
        getTrucks().catch(() => ({ data: [] }))
      ])

      const binsList = normalize(binsRes)
      const tasksList = normalize(tasksRes)
      const trucksList = normalize(trucksRes)

      const generatedAlerts = []

      // 1. Critical Bins (fill level >= 80%)
      binsList
        .filter(b => Number(b.currentFillLevel || 0) >= 80)
        .forEach(b => {
          generatedAlerts.push({
            id: `bin-${b.id}`,
            type: 'critical_bin',
            title: `Critical Bin ${b.binCode || b.code} (${b.currentFillLevel}% Full)`,
            subtitle: b.address || 'Needs urgent collection dispatch',
            time: 'Immediate Attention',
            icon: AlertTriangle,
            tone: 'warning',
            link: '/bins?filter=critical'
          })
        })

      // 2. Pending Collection Tasks
      tasksList
        .filter(t => t.status === 'ASSIGNED' || t.status === 'PENDING')
        .slice(0, 3)
        .forEach(t => {
          generatedAlerts.push({
            id: `task-${t.id}`,
            type: 'pending_task',
            title: `Pending Collection Task #${t.id}`,
            subtitle: `${t.bin ? (t.bin.binCode || t.bin.code) : 'Target Bin'} • Priority: ${t.priority || 'NORMAL'}`,
            time: 'Active Dispatch',
            icon: Clock,
            tone: 'info',
            link: '/collections?status=ASSIGNED'
          })
        })

      // 3. Maintenance Trucks
      trucksList
        .filter(t => t.status === 'MAINTENANCE')
        .forEach(t => {
          generatedAlerts.push({
            id: `truck-${t.id}`,
            type: 'truck_maintenance',
            title: `Vehicle in Maintenance: ${t.registrationNumber || t.registration}`,
            subtitle: 'Truck temporarily unavailable for dispatch',
            time: 'Fleet Notice',
            icon: TruckIcon,
            tone: 'neutral',
            link: '/trucks?status=MAINTENANCE'
          })
        })

      setAlerts(generatedAlerts)
    } catch (_) {
    } finally {
      setLoadingAlerts(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    const refresh = () => loadAlerts()
    window.addEventListener('binova:refresh-summary', refresh)
    return () => window.removeEventListener('binova:refresh-summary', refresh)
  }, [])

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function logout(){
    clearSession()
    nav('/login')
  }

  const displayName = (user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`).trim() || 'Administrator'
  const initials = displayName.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'AD'

  const handleAlertClick = (alert) => {
    markAsRead(alert.id)
    setNotifOpen(false)
    nav(alert.link)
  }

  const unreadAlerts = alerts.filter((a) => !readNotifIds.includes(a.id))
  const displayedAlerts = notifFilter === 'UNREAD' ? unreadAlerts : alerts
  const unreadCount = unreadAlerts.length

  return (
    <header className="topbar">
      <div className="page-title-block">
        <div className="page-kicker">Operations</div>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-actions">
        {/* NOTIFICATION BUTTON & PANEL */}
        <div className="topbar-menu-wrapper" ref={notifRef}>
          <button
            type="button"
            className={`icon-button ${notifOpen ? 'active' : ''}`}
            aria-label="Notifications"
            onClick={() => { setNotifOpen(p => !p); setUserMenuOpen(false); }}
            title="System notifications & alerts"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-badge-count">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="dropdown-panel notif-dropdown">
              <div className="dropdown-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ margin: 0 }}>Operational Alerts</h4>
                    {unreadCount > 0 && (
                      <span className="badge-unread-count">{unreadCount} unread</span>
                    )}
                  </div>
                  <p className="text-muted text-xs" style={{ marginTop: 2 }}>
                    Live status updates from field sensors and dispatch
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="btn-mark-read"
                      onClick={markAllAsRead}
                      title="Mark all notifications as read"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-button-subtle"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              {alerts.length > 0 && (
                <div className="notif-tabs">
                  <button
                    type="button"
                    className={`notif-tab ${notifFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setNotifFilter('ALL')}
                  >
                    All ({alerts.length})
                  </button>
                  <button
                    type="button"
                    className={`notif-tab ${notifFilter === 'UNREAD' ? 'active' : ''}`}
                    onClick={() => setNotifFilter('UNREAD')}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>
              )}

              <div className="dropdown-body">
                {displayedAlerts.length === 0 ? (
                  <div className="dropdown-empty">
                    <CheckCircle2 size={32} className="text-success" />
                    <p className="font-semibold text-dark">
                      {notifFilter === 'UNREAD' ? 'All Alerts Read' : 'All Systems Operational'}
                    </p>
                    <span className="text-muted text-xs">
                      {notifFilter === 'UNREAD'
                        ? 'You have viewed all operational alerts.'
                        : 'No active alerts. Bins and vehicles operating normally.'}
                    </span>
                  </div>
                ) : (
                  <div className="notif-list">
                    {displayedAlerts.map((alert) => {
                      const Icon = alert.icon
                      const isRead = readNotifIds.includes(alert.id)
                      return (
                        <div
                          key={alert.id}
                          className={`notif-item notif-${alert.tone} ${isRead ? 'notif-read' : 'notif-unread'}`}
                          onClick={() => handleAlertClick(alert)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="notif-icon-wrap">
                            <Icon size={16} />
                          </div>
                          <div className="notif-content">
                            <div className="notif-title-row">
                              <span className="notif-title">{alert.title}</span>
                              {!isRead && <span className="unread-dot" title="Unread" />}
                            </div>
                            <div className="notif-subtitle">{alert.subtitle}</div>
                            <div className="notif-meta-row">
                              <span className="notif-time">{alert.time}</span>
                              {isRead && <span className="read-tag">Read</span>}
                            </div>
                          </div>
                          <ArrowRight size={14} className="notif-arrow" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {alerts.length > 0 && (
                <div className="dropdown-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => { setNotifOpen(false); nav('/bins?filter=critical') }}
                  >
                    View Critical Bins →
                  </button>
                  {readNotifIds.length > 0 && (
                    <button
                      type="button"
                      className="btn-text-subtle"
                      onClick={clearReadHistory}
                      title="Reset read notifications state"
                      style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                    >
                      Reset Read State
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* USER MENU */}
        <div className="topbar-menu-wrapper" ref={userMenuRef}>
          <div
            className="user-menu"
            onClick={() => { setUserMenuOpen(p => !p); setNotifOpen(false); }}
            role="button"
            tabIndex={0}
          >
            {customAvatar ? (
              <img src={customAvatar} alt={displayName} className="user-avatar-img" />
            ) : (
              <div className="user-avatar">{initials}</div>
            )}
            <div className="user-meta">
              <div className="user-name">{displayName}</div>
              <div className="user-role">Waste Management Officer</div>
            </div>
            <ChevronDown size={16} className={`menu-chevron ${userMenuOpen ? 'rotated' : ''}`} />
          </div>

          {userMenuOpen && (
            <div className="dropdown-panel user-dropdown">
              <div className="user-dropdown-header">
                <strong>{displayName}</strong>
                <span className="text-muted text-xs">{user?.email || 'admin@binova.cm'}</span>
              </div>
              <div className="user-dropdown-nav">
                <button
                  type="button"
                  className="dropdown-nav-item"
                  onClick={() => { setUserMenuOpen(false); nav('/settings') }}
                >
                  <Settings size={16} />
                  <span>Profile & Settings</span>
                </button>
                <button
                  type="button"
                  className="dropdown-nav-item danger"
                  onClick={logout}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="settings-link"
          onClick={() => nav('/settings')}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>

        <button type="button" className="logout-inline" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  )
}

