import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
})

// Inyectar token en cada request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('pakarina_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Si el token expiró → redirigir al login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pakarina_token')
      localStorage.removeItem('pakarina_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
