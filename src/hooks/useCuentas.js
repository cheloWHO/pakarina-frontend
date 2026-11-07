import { useEffect, useState } from 'react'
import { finanzasAPI } from '../api'

// Cuentas bancarias del negocio (GET /api/finanzas/cuentas).
// La API solo devuelve números enmascarados (...6258, ...7706); el número
// completo nunca sale del servidor. Se cachea en memoria para no pedirlas
// en cada formulario. Si el endpoint aún no existe (backend sin fusionar),
// devuelve error y el formulario sigue con su comportamiento actual.
let cache = null
let inflight = null

export function useCuentas() {
  const [cuentas, setCuentas] = useState(cache || [])
  const [cargando, setCargando] = useState(!cache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cache) { setCuentas(cache); setCargando(false); return }
    if (!inflight) {
      inflight = finanzasAPI.listarCuentas()
        .then(r => {
          cache = (r.data || []).filter(c => c.activa !== false)
          return cache
        })
        .catch(e => { inflight = null; throw e })
    }
    inflight
      .then(c => { setCuentas(c); setCargando(false) })
      .catch(() => { setError(true); setCargando(false) })
  }, [])

  return { cuentas, cargando, error }
}
