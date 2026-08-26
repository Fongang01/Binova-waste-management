import axios from 'axios'

const rawBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000').trim().replace(/\/+$/, '')
const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`

const client = axios.create({
  baseURL,
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
    const isLoginRequest = err.config?.url?.includes('/auth/login')
    if (err.response && err.response.status === 401 && !isLoginRequest) {
      sessionStorage.removeItem('binova_token')
      sessionStorage.removeItem('binova_user')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default client
