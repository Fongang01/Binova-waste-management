import React from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'

export default function MapPage(){
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Map" />
        <div className="content">
          <div className="card">
            <h3>Map integration ready</h3>
            <p>Google Maps integration can be enabled with an API key. Current state: placeholder.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
