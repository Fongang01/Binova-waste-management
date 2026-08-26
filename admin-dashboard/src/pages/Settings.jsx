import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Layout/Sidebar'
import Topbar from '../components/Layout/Topbar'
import { getProfile, updateProfile, changePassword } from '../api/authApi'
import {
  User,
  Shield,
  KeyRound,
  Bell,
  Camera,
  Check,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sliders,
  Sparkles,
  RefreshCcw,
  Upload
} from 'lucide-react'

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
]

export default function Settings(){
  const [activeTab, setActiveTab] = useState('profile')
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('binova_user') || 'null'))
  const [customAvatar, setCustomAvatar] = useState(() => localStorage.getItem('binova_custom_avatar') || '')

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // System Preferences
  const [prefs, setPrefs] = useState(() => ({
    soundAlerts: localStorage.getItem('binova_pref_sound') !== 'false',
    autoRefresh: localStorage.getItem('binova_pref_refresh') || '60',
    theme: 'emerald-light',
    region: localStorage.getItem('binova_pref_region') || 'Douala, Littoral',
  }))
  const [prefSuccess, setPrefSuccess] = useState('')

  // Fetch latest profile from backend
  useEffect(() => {
    getProfile()
      .then((res) => {
        const u = res?.data?.data || res?.data
        if (u) {
          setUser(u)
          setProfileForm({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            phone: u.phone || '',
          })
          sessionStorage.setItem('binova_user', JSON.stringify(u))
        }
      })
      .catch(() => {})
  }, [])

  // Profile update handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const res = await updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
      })

      const updatedUser = res?.data?.data || {
        ...user,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
      }

      setUser(updatedUser)
      sessionStorage.setItem('binova_user', JSON.stringify(updatedUser))
      window.dispatchEvent(new CustomEvent('binova:user-updated'))
      setProfileSuccess('Profile details saved successfully.')
    } catch (err) {
      setProfileError(err?.response?.data?.message || 'Unable to update profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  // Avatar handler
  const handleAvatarSelect = (url) => {
    setCustomAvatar(url)
    localStorage.setItem('binova_custom_avatar', url)
    window.dispatchEvent(new CustomEvent('binova:user-updated'))
    setProfileSuccess('Profile avatar updated.')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Avatar image must be smaller than 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      handleAvatarSelect(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setCustomAvatar('')
    localStorage.removeItem('binova_custom_avatar')
    window.dispatchEvent(new CustomEvent('binova:user-updated'))
    setProfileSuccess('Default monogram avatar restored.')
  }

  // Password change handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.')
      setPasswordLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      setPasswordLoading(false)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.')
      setPasswordLoading(false)
      return
    }

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordSuccess('Password changed successfully.')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'Unable to update password. Verify current password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Save Preferences
  const handleSavePrefs = (e) => {
    e.preventDefault()
    localStorage.setItem('binova_pref_sound', String(prefs.soundAlerts))
    localStorage.setItem('binova_pref_refresh', prefs.autoRefresh)
    localStorage.setItem('binova_pref_region', prefs.region)
    setPrefSuccess('System preferences saved.')
    setTimeout(() => setPrefSuccess(''), 4000)
  }

  const displayName = `${profileForm.firstName || ''} ${profileForm.lastName || ''}`.trim() || 'Administrator'
  const initials = displayName.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'AD'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar title="Settings" />
        <div className="content">
          <div className="page-header">
            <div>
              <p className="eyebrow">Administration</p>
              <h2>Settings & Preferences</h2>
            </div>
          </div>

          {/* Settings Navigation Tabs */}
          <div className="settings-nav-tabs">
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} />
              <span>Admin Profile</span>
            </button>
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <KeyRound size={16} />
              <span>Security & Password</span>
            </button>
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <Sliders size={16} />
              <span>System Preferences</span>
            </button>
          </div>

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="settings-grid">
              {/* Profile Card */}
              <div className="card">
                <div className="section-heading">
                  <div>
                    <h3>Profile Information</h3>
                    <p className="text-muted text-xs">Update your municipal officer credentials and contact info.</p>
                  </div>
                  <span className="badge badge-success flex-align-center gap-6">
                    <ShieldCheck size={14} /> Administrator Role
                  </span>
                </div>

                {profileSuccess && <div className="success-box">{profileSuccess}</div>}
                {profileError && <div className="error-box">{profileError}</div>}

                <form onSubmit={handleProfileSubmit}>
                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor="prof-first">First Name *</label>
                      <input
                        id="prof-first"
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm(p => ({ ...p, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="prof-last">Last Name *</label>
                      <input
                        id="prof-last"
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm(p => ({ ...p, lastName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="prof-email">Email Address</label>
                      <input
                        id="prof-email"
                        type="email"
                        value={profileForm.email}
                        readOnly
                        disabled
                        className="input-disabled"
                        title="Email cannot be changed directly"
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="prof-phone">Phone Number</label>
                      <input
                        id="prof-phone"
                        type="tel"
                        placeholder="+237 6XX XXX XXX"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="modal-actions" style={{ marginTop: 24 }}>
                    <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                      <Save size={16} /> {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Avatar Selector Card */}
              <div className="card">
                <div className="section-heading">
                  <div>
                    <h3>Profile Avatar</h3>
                    <p className="text-muted text-xs">Choose an avatar or upload an image.</p>
                  </div>
                </div>

                <div className="avatar-preview-block">
                  {customAvatar ? (
                    <img src={customAvatar} alt={displayName} className="large-avatar-img" />
                  ) : (
                    <div className="large-avatar-fallback">{initials}</div>
                  )}
                  <div>
                    <h4 className="font-semibold text-dark">{displayName}</h4>
                    <p className="text-muted text-xs">Municipal Waste Operations Administrator</p>
                    {customAvatar && (
                      <button type="button" className="btn-text danger text-xs" onClick={handleRemoveAvatar} style={{ marginTop: 6 }}>
                        Remove Custom Photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="avatar-picker-section">
                  <label className="field-label-sm">Preset Avatars</label>
                  <div className="preset-avatar-row">
                    {AVATAR_PRESETS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`preset-avatar-btn ${customAvatar === url ? 'selected' : ''}`}
                        onClick={() => handleAvatarSelect(url)}
                      >
                        <img src={url} alt={`Preset ${idx + 1}`} />
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <label className="btn btn-secondary upload-btn-label">
                      <Upload size={15} /> Upload Custom Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="card" style={{ maxWidth: 640 }}>
              <div className="section-heading">
                <div>
                  <h3>Change Password</h3>
                  <p className="text-muted text-xs">Ensure your administrator account uses a strong, secure password.</p>
                </div>
                <KeyRound size={20} className="text-primary" />
              </div>

              {passwordSuccess && <div className="success-box">{passwordSuccess}</div>}
              {passwordError && <div className="error-box">{passwordError}</div>}

              <form onSubmit={handlePasswordSubmit}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field-group">
                    <label htmlFor="curr-pass">Current Password *</label>
                    <input
                      id="curr-pass"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="Enter existing password"
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="new-pass">New Password *</label>
                    <input
                      id="new-pass"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Minimum 6 characters"
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="conf-pass">Confirm New Password *</label>
                    <input
                      id="conf-pass"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 24 }}>
                  <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                    <KeyRound size={16} /> {passwordLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SYSTEM PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="card" style={{ maxWidth: 640 }}>
              <div className="section-heading">
                <div>
                  <h3>Dashboard & Operations Preferences</h3>
                  <p className="text-muted text-xs">Configure alerts, map centers, and telemetry refresh frequencies.</p>
                </div>
                <Sliders size={20} className="text-primary" />
              </div>

              {prefSuccess && <div className="success-box">{prefSuccess}</div>}

              <form onSubmit={handleSavePrefs}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field-group">
                    <label htmlFor="pref-region">Default Operational Region</label>
                    <select
                      id="pref-region"
                      value={prefs.region}
                      onChange={(e) => setPrefs(p => ({ ...p, region: e.target.value }))}
                    >
                      <option value="Douala, Littoral">Douala, Littoral Region</option>
                      <option value="Yaounde, Centre">Yaoundé, Centre Region</option>
                      <option value="Bafoussam, Ouest">Bafoussam, West Region</option>
                      <option value="Garoua, Nord">Garoua, North Region</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="pref-refresh">Data Telemetry Refresh Interval</label>
                    <select
                      id="pref-refresh"
                      value={prefs.autoRefresh}
                      onChange={(e) => setPrefs(p => ({ ...p, autoRefresh: e.target.value }))}
                    >
                      <option value="15">Every 15 seconds (High Frequency)</option>
                      <option value="30">Every 30 seconds (Standard)</option>
                      <option value="60">Every 60 seconds (Conservative)</option>
                      <option value="0">Manual Refresh Only</option>
                    </select>
                  </div>

                  <div className="field-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={prefs.soundAlerts}
                        onChange={(e) => setPrefs(p => ({ ...p, soundAlerts: e.target.checked }))}
                      />
                      <span>Enable browser audio pings on new Critical Bin alerts ($\ge 80\%$)</span>
                    </label>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 24 }}>
                  <button type="submit" className="btn btn-primary">
                    <Save size={16} /> Save System Preferences
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

