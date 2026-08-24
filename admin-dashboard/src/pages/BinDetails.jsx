import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getBin } from '../api/binsApi'

export default function BinDetails(){
  const { id } = useParams()
  const [bin, setBin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{
    setLoading(true)
    getBin(id).then(r=>{ setBin(r.data); setError(null)}).catch(()=>setError('Unable to load bin')).finally(()=>setLoading(false))
  }, [id])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title={`Bin ${id}`} />
        <div className="content">
          {loading && <div>Loading...</div>}
          {error && <div className="error">{error}</div>}
          {bin && (
            <div className="card">
              <h3>{bin.code}</h3>
              <p><strong>Address:</strong> {bin.address}</p>
              <p><strong>Coordinates:</strong> {bin.latitude}, {bin.longitude}</p>
              <p><strong>Capacity:</strong> {bin.capacity}</p>
              <p><strong>Fill Level:</strong> {bin.fillLevel}%</p>
              <p><strong>Status:</strong> {bin.status}</p>
              <div className="ai-panel">
                <h4>AI Recommendation</h4>
                <div>AI recommendation service coming soon.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
