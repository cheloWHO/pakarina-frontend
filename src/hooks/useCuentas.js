import { useEffect, useState } from 'react'
import { finanzasAPI } from '../api'

// Cuentas bancarias del negocio (GET /api/finanzas/cuentas).
// La API solo devuelve números enmascarados (...6258, ...7706); el número
// completo nunca sale del servidor. Se cachea en memoria para no pedirlas
// en cada formulario.
//
// Por qué reintenta: el servidor gratuito (Render) tarda ~20-30 s en
// despertar tras un rato sin uso y la llamada puede fallar por tiempo la
// primera vez. Antes el fallo era silencioso y definitivo: el desplegable
// de cuenta no aparecía nunca. Ahora se reintenta una vez y el error
// queda registrado en la consola para poder diagnosticarlo.
let cache = null
let inflight = null

async function cargarCuentas(reintentos = 1) {
  try {
    const r = await finanzasAPI.listarCuentas()
    return (r.data || []).filter(c => c.activa !== false)
  } catch (e) {
    if (reintentos > 0) {
      await new Promise(r => setTimeout(r, 1500))
      return cargarCuentas(reintentos - 1)
    }
    throw e
  }
}

export function useCuentas() {
  const [cuentas, setCuentas] = useState(cache || [])
  const [cargando, setCargando] = useState(!cache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cache) { setCuentas(cache); setCargando(false); return }
    if (!inflight) {
      inflight = cargarCuentas()
        .then(c => { cache = c; return cache })
        .catch(e => {
          inflight = null
          console.error('[Cuentas] No se pudieron cargar las cuentas:', e.response?.status, e.message || e)
          throw e
        })
    }
    inflight
      .then(c => { setCuentas(c); setCargando(false) })
      .catch(() => { setError(true); setCargando(false) })
  }, [])

  return { cuentas, cargando, error }
}
