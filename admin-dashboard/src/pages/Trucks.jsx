import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getTrucks, deleteTruck } from '../api/trucksApi'

export default function Trucks(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = ()=>{ setLoading(true); getTrucks().then(r=>{ setItems(r.data); setError(null); }).catch(()=>setError('Unable to load trucks')).finally(()=>setLoading(false)) }

  useEffect(()=>{ load() }, [])

  const handleDelete = async (id)=>{
    if (!confirm('Delete truck?')) return
    try{ await deleteTruck(id); load() }catch(e){ alert('Delete failed') }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Trucks" />
        <div className="content">
          <div className="toolbar"><button onClick={load}>Refresh</button></div>
          {loading && <div>Loading trucks...</div>}
          {error && <div className="error">{error}</div>}
          {!loading && items.length===0 && <div>No trucks found.</div>}
          {items.length>0 && (
            <table className="data-table">
              <thead><tr><th>Registration</th><th>Capacity</th><th>Status</th><th>Driver</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(t=> (
                  <tr key={t.id}><td>{t.registration}</td><td>{t.capacity}</td><td>{t.status}</td><td>{t.driver?.name || '-'}</td><td><button onClick={()=>handleDelete(t.id)}>Delete</button></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
