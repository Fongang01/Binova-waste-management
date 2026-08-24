import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Trash2,
  Users,
  Truck,
  ClipboardList,
  Map,
  Settings,
  LogOut,
  ShieldCheck
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bins', label: 'Bins', icon: Trash2 },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/trucks', label: 'Trucks', icon: Truck },
  { to: '/collections', label: 'Collections', icon: ClipboardList },
  { to: '/map', label: 'Map', icon: Map }
]

export default function Sidebar(){
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
          <div className="avatar">AO</div>
          <div>
            <div className="mini-name">Administrator</div>
            <div className="mini-role">Waste Officer</div>
          </div>
        </div>
        <button type="button" className="logout-button">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
