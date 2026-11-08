import { useEffect } from 'react'
import { Select } from './ui'
import { useCuentas } from '../hooks/useCuentas'

// Desplegable "Cuenta destino" para los formularios de pago.
// Muestra solo números enmascarados, como los devuelve la API:
// "Produbanco ...6258 (Clases)" y "Produbanco ...7706 (Productos)".
// Si la API falla (el backend aún no está publicado), no renderiza el
// desplegable y el pago sigue como antes, solo con banco_destino: nunca
// se deja el desplegable vacío ni se bloquea el registro. Pero el fallo
// ya no es silencioso: mientras carga se ve "Cargando cuentas…" y si
// falla se avisa con un texto discreto, para que no parezca que el campo
// no existe.
// tipoPorDefecto: qué cuenta se preselecciona ('clases' en planes,
// 'productos' en ventas de inventario).
export default function CuentaDestinoSelect({ value, onChange, tipoPorDefecto = 'clases' }) {
  const { cuentas, cargando, error } = useCuentas()

  // Preseleccionar la cuenta preferida cuando aparece por primera vez
  useEffect(() => {
    if (!value && cuentas.length) {
      const preferida = cuentas.find(c => c.tipo === tipoPorDefecto) || cuentas[0]
      onChange(preferida.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas])

  if (cargando) {
    return <div style={{ fontSize:'12px', color:'var(--gray-400)' }}>Cargando cuentas…</div>
  }
  if (error) {
    return <div style={{ fontSize:'12px', color:'var(--warn)' }}>No se pudieron cargar las cuentas del banco. El pago se registrará sin cuenta asignada.</div>
  }
  if (cuentas.length === 0) return null

  return (
    <Select
      label="Cuenta destino"
      value={value || ''}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
    >
      {cuentas.map(c => (
        <option key={c.id} value={c.id}>
          {c.banco} {c.numero_mascarado} ({c.tipo === 'clases' ? 'Clases' : 'Productos'})
        </option>
      ))}
    </Select>
  )
}
