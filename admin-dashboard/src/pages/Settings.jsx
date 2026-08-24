import React from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'

export default function Settings(){
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Settings" />
        <div className="content">
          <div className="card">
            <h3>Settings</h3>
            <p>Administrator settings and preferences.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
