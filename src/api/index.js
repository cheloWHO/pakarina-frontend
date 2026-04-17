import api from './client'

// AUTH
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  me:    ()               => api.get('/api/auth/me'),
}

// BEBÉS
export const bebesAPI = {
  listar:     (local_id)       => api.get('/api/bebes', { params: { local_id } }),
  obtener:    (id)             => api.get(`/api/bebes/${id}`),
  crear:      (data)           => api.post('/api/bebes', data),
  actualizar: (id, data)       => api.patch(`/api/bebes/${id}`, data),
  desactivar: (id)             => api.delete(`/api/bebes/${id}`),
}

// PLANES
export const planesAPI = {
  listar:        (params) => api.get('/api/planes', { params }),
  obtener:       (id)     => api.get(`/api/planes/${id}`),
  registrarPago: (data)   => api.post('/api/planes', data),
}

// CLASES
export const clasesAPI = {
  listar: (params) => api.get('/api/clases', { params }),
  marcar: (data)   => api.post('/api/clases', data),
}

// FINANZAS
export const finanzasAPI = {
  resumen:        (params) => api.get('/api/finanzas/resumen', { params }),
  listarGastos:   (params) => api.get('/api/finanzas/gastos',  { params }),
  registrarGasto: (data)   => api.post('/api/finanzas/gastos', data),
}

// SERVICIOS (catálogo)
export const serviciosAPI = {
  listar: () => api.get('/api/servicios'),
}

// GRUPOS
export const gruposAPI = {
  listar: () => api.get('/api/grupos'),
}
