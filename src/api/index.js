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
  listar:        (params)           => api.get('/api/planes', { params }),
  obtener:       (id)               => api.get(`/api/planes/${id}`),
  registrarPago: (data)             => api.post('/api/planes', data),
  agregarClases: (id, clases_extra) => api.patch(`/api/planes/${id}/agregar-clases`, { clases_extra }),
  editarFecha:   (id, fecha_inicio) => api.patch(`/api/planes/${id}`, { fecha_inicio }),
}
// CLASES
export const clasesAPI = {
  listar:      (params)            => api.get('/api/clases', { params }),
  marcar:      (data)              => api.post('/api/clases', data),
  editarNota:  (id, observaciones) => api.patch(`/api/clases/${id}`, { observaciones }),
  editarClase: (id, data)          => api.patch(`/api/clases/${id}`, data),
  eliminar:    (id)                => api.delete(`/api/clases/${id}`),
}
// FINANZAS
export const finanzasAPI = {
  resumen:        (params) => api.get('/api/finanzas/resumen', { params }),
  listarGastos:   (params) => api.get('/api/finanzas/gastos',  { params }),
  registrarGasto: (data)   => api.post('/api/finanzas/gastos', data),
  // Cuentas bancarias (solo números enmascarados) y precios reales.
  // Viven en la rama fix/comprobantes-cuentas del backend: hasta que se
  // fusione, estas llamadas devuelven 404 y el frontend sigue con su
  // comportamiento actual (ver CuentaDestinoSelect y verificarPrecios).
  listarCuentas:   ()         => api.get('/api/finanzas/cuentas'),
  listarServicios: ()         => api.get('/api/finanzas/servicios'),
  subirComprobante:(formData) => api.post('/api/finanzas/comprobantes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }),
}
// SERVICIOS (catálogo)
export const serviciosAPI = {
  listar: () => api.get('/api/servicios'),
}
// GRUPOS
export const gruposAPI = {
  listar: () => api.get('/api/grupos'),
}
