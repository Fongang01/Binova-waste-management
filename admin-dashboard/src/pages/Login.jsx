import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin } from '../api/authApi'
import { saveSession, getSession } from '../utils/auth'
import { ShieldCheck, MapPin, Recycle } from 'lucide-react'

export default function Login(){
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [remember, setRemember] = useState(true)

  useEffect(()=>{
    const s = getSession()
    if (s.token) nav('/dashboard')
  }, [])

  const handleSubmit = async (e) =>{
    e.preventDefault()
    setError(null)
    setLoading(true)
    try{
      const data = await apiLogin(email, password)
      // backend expected to return { token, user }
      saveSession(data.token, data.user)
      nav('/dashboard')
    }catch(err){
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else if (typeof err.response?.data === 'string' && err.response.data.length < 200) {
        setError(err.response.data)
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <ShieldCheck size={16} />
            BINOVA secure access
          </div>
          <h1>BINOVA</h1>
          <p className="hero-title">Intelligent Municipal<br />Waste Collection</p>
          <p className="hero-copy">Smarter collection. Cleaner cities.</p>

          <div className="hero-features">
            <div className="feature-pill"><MapPin size={16} /> Smart routes</div>
            <div className="feature-pill"><MapPin size={16} /> Live monitoring</div>
            <div className="feature-pill"><Recycle size={16} /> Sustainable operations</div>
          </div>
        </div>

        {/* Animated ambient hero background with floating orbs and rings */}
        <div className="hero-animation-container" aria-hidden="true">
          <div className="hero-gradient-overlay" />
          
          {/* Large soft translucent orbs */}
          <div className="hero-orb orb-large-1" />
          <div className="hero-orb orb-large-2" />
          <div className="hero-orb orb-large-3" />

          {/* Medium floating orbs */}
          <div className="hero-orb orb-medium-1" />
          <div className="hero-orb orb-medium-2" />
          <div className="hero-orb orb-medium-3" />

          {/* Small accent orbs */}
          <div className="hero-orb orb-small-1" />
          <div className="hero-orb orb-small-2" />
          <div className="hero-orb orb-small-3" />

          {/* Thin geometric circular orbit rings */}
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-orbit orbit-three" />
          <div className="hero-orbit orbit-four" />

          {/* Subtle floating smart-city telemetry particles */}
          <div className="hero-particle particle-1" />
          <div className="hero-particle particle-2" />
          <div className="hero-particle particle-3" />
          <div className="hero-particle particle-4" />
          <div className="hero-particle particle-5" />
          <div className="hero-particle particle-6" />
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-header">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your dashboard</h2>
            <p>Access BINOVA administrator controls and municipal operations.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@binova.cm" required />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required />
            </div>

            <div className="form-row between">
              <label className="checkbox-label">
                <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
                <span>Keep me signed in</span>
              </label>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
