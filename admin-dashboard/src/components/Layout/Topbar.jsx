import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Settings } from 'lucide-react'
import { clearSession } from '../../utils/auth'

export default function Topbar({title}){
  const nav = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('binova_user') || 'null')

  function logout(){
    clearSession()
    nav('/login')
  }

  return (
    <header className="topbar">
      <div className="page-title-block">
        <div className="page-kicker">Operations</div>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <div className="user-menu">
          <div className="user-avatar">{(user?.name || 'Admin').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div className="user-meta">
            <div className="user-name">{user?.name || 'Administrator'}</div>
            <div className="user-role">Waste Management Officer</div>
          </div>
          <button type="button" className="menu-trigger" aria-label="User menu">
            <ChevronDown size={16} />
          </button>
        </div>

        <button type="button" className="settings-link" onClick={() => nav('/settings')}>
          <Settings size={16} />
        </button>

        <button type="button" className="logout-inline" onClick={logout}>Logout</button>
      </div>
    </header>
  )
}
