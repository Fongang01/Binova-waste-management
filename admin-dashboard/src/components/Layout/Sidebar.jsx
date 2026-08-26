import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Trash2,
  Users,
  Truck,
  ClipboardList,
  Map,
  Settings,
  LogOut,
} from 'lucide-react'
import { clearSession } from '../../utils/auth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bins', label: 'Bins', icon: Trash2 },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/trucks', label: 'Trucks', icon: Truck },
  { to: '/collections', label: 'Collections', icon: ClipboardList },
  { to: '/map', label: 'Map', icon: Map }
]

export default function Sidebar(){
  const nav = useNavigate()
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('binova_user') || 'null'))
  const [customAvatar, setCustomAvatar] = useState(() => localStorage.getItem('binova_custom_avatar') || null)

  const syncUser = () => {
    setUser(JSON.parse(sessionStorage.getItem('binova_user') || 'null'))
    setCustomAvatar(localStorage.getItem('binova_custom_avatar') || null)
  }

  useEffect(() => {
    window.addEventListener('binova:user-updated', syncUser)
    return () => window.removeEventListener('binova:user-updated', syncUser)
  }, [])

  const logout = () => {
    clearSession()
    nav('/login')
  }

  const displayName = (user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`).trim() || 'Administrator'
  const initials = displayName.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'AD'

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img src="/logo.png" alt="Binova Logo" className="brand-mark" />
        <div>
          <div className="brand-name">BINOVA</div>
          <div className="brand-subtitle">Intelligent Waste Management</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-section-label">System</div>
      <nav className="sidebar-nav secondary-nav" aria-label="System navigation">
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="mini-profile">
          {customAvatar ? (
            <img src={customAvatar} alt={displayName} className="mini-avatar-img" />
          ) : (
            <div className="avatar">{initials}</div>
          )}
          <div>
            <div className="mini-name">{displayName}</div>
            <div className="mini-role">Waste Officer</div>
          </div>
        </div>
        <button type="button" className="logout-button" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

