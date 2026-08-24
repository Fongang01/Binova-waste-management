import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getBins, deleteBin } from '../api/binsApi'
import { Link } from 'react-router-dom'
import { Search, Plus, RefreshCcw, Eye, Trash2 } from 'lucide-react'

export default function Bins(){
  const [bins, setBins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = ()=>{
    setLoading(true)
    getBins().then(r=>{ setBins(r.data); setError(null) }).catch(()=>setError('Unable to load bins')).finally(()=>setLoading(false))
  }

  useEffect(()=>{ load() }, [])

  const handleDelete = async (id)=>{
    if (!confirm('Delete bin?')) return
    try{ await deleteBin(id); load() }catch(e){ alert('Delete failed') }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Bins" />
        <div className="content">
          <div className="page-header">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Bin management</h2>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-secondary" onClick={load}><RefreshCcw size={16} /> Refresh</button>
              <Link to="/bins/new" className="btn btn-primary"><Plus size={16} /> Add Bin</Link>
            </div>
          </div>

          <div className="toolbar-card">
            <div className="search-field">
              <Search size={16} />
              <input type="text" placeholder="Search bins..." />
            </div>
            <select className="select-field" defaultValue="all">
              <option value="all">All statuses</option>
              <option value="normal">Normal</option>
              <option value="moderate">Moderate</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {loading && <div className="page-empty"><div className="skeleton" /><div className="skeleton short" /></div>}
          {error && <div className="error-box">{error}</div>}
          {!loading && bins.length===0 && <div className="page-empty">No bins found.<button type="button" className="btn btn-secondary">Clear filters</button></div>}
          {bins.length>0 && (
            <div className="table-card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Code</th><th>Address</th><th>Fill Level</th><th>Status</th><th>Last Update</th><th>Actions</th></tr></thead>
                  <tbody>
                    {bins.map(b=> (
                      <tr key={b.id}>
                        <td>{b.code}</td>
                        <td>{b.address}</td>
                        <td>
                          <div className="progress-cell">
                            <div className="progress-track"><span style={{ width: `${Math.min(Math.max(b.fillLevel || 0, 0), 100)}%` }} /></div>
                            <span>{b.fillLevel}%</span>
                          </div>
                        </td>
                        <td><span className={`status-badge status-${(b.status || 'normal').toLowerCase()}`}>{b.status || 'Normal'}</span></td>
                        <td>{b.updatedAt}</td>
                        <td>
                          <div className="row-actions">
                            <Link to={`/bins/${b.id}`} className="table-action view"><Eye size={15} /> View</Link>
                            <button type="button" className="table-action danger" onClick={()=>handleDelete(b.id)}><Trash2 size={15} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
