import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const client = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' }
})

client.interceptors.request.use(config => {
  const token = sessionStorage.getItem('binova_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  r => r,
  err => {
    if (err.response && err.response.status === 401) {
      sessionStorage.removeItem('binova_token')
      sessionStorage.removeItem('binova_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
