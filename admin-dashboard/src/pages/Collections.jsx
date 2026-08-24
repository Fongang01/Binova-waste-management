import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getCollectionTasks } from '../api/collectionTasksApi'

export default function Collections(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = ()=>{ setLoading(true); getCollectionTasks().then(r=>{ setItems(r.data); setError(null) }).catch(()=>setError('Unable to load')).finally(()=>setLoading(false)) }

  useEffect(()=>{ load() }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Collections" />
        <div className="content">
          {loading && <div>Loading...</div>}
          {error && <div className="error">{error}</div>}
          {!loading && items.length===0 && <div>No collection tasks.</div>}
          {items.length>0 && (
            <table className="data-table">
              <thead><tr><th>ID</th><th>Bin</th><th>Driver</th><th>Truck</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {items.map(it=> (
                  <tr key={it.id}><td>{it.id}</td><td>{it.bin?.code}</td><td>{it.driver?.name}</td><td>{it.truck?.registration}</td><td>{it.priority}</td><td>{it.status}</td><td>{it.date}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
