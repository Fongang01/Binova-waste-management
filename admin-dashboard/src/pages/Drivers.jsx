import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getDrivers, deleteDriver } from '../api/driversApi'

export default function Drivers(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = ()=>{ setLoading(true); getDrivers().then(r=>{ setItems(r.data); setError(null); }).catch(()=>setError('Unable to load drivers')).finally(()=>setLoading(false)) }

  useEffect(()=>{ load() }, [])

  const handleDelete = async (id)=>{
    if (!confirm('Delete driver?')) return
    try{ await deleteDriver(id); load() }catch(e){ alert('Delete failed') }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Drivers" />
        <div className="content">
          <div className="toolbar"><button onClick={load}>Refresh</button></div>
          {loading && <div>Loading drivers...</div>}
          {error && <div className="error">{error}</div>}
          {!loading && items.length===0 && <div>No drivers found.</div>}
          {items.length>0 && (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Truck</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(d=> (
                  <tr key={d.id}><td>{d.name}</td><td>{d.email}</td><td>{d.status}</td><td>{d.truck?.registration || '-'}</td><td><button onClick={()=>handleDelete(d.id)}>Delete</button></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
