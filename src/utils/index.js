// Formatea fecha ISO a español: "13 de abril de 2025"
export function fmtFecha(iso) {
  if (!iso) return '—'
  const solo = String(iso).substring(0, 10) // tomar solo "YYYY-MM-DD"
  const d = new Date(solo + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}
// Formatea moneda: 90 → "$90.00"
export function fmtMoney(n) {
  if (n == null) return '—'
  return '$' + parseFloat(n).toFixed(2)
}
// Edad en meses desde fecha de nacimiento
export function edadMeses(fechaNac) {
  if (!fechaNac) return null
  const nac = new Date(fechaNac)
  const hoy = new Date()
  return (hoy.getFullYear() - nac.getFullYear()) * 12 +
         (hoy.getMonth() - nac.getMonth())
}
// Días para vencer (puede ser negativo si ya venció)
export function diasParaVencer(fechaVenc) {
  if (!fechaVenc) return null
  const solo = String(fechaVenc).substring(0, 10)
  const diff = new Date(solo + 'T12:00:00') - new Date()
  return Math.ceil(diff / 86400000)
}
// Clase CSS de alerta según días restantes
export function colorVencimiento(dias) {
  if (dias === null) return ''
  if (dias < 0)  return 'badge--danger'
  if (dias <= 5) return 'badge--warn'
  return 'badge--ok'
}
// Nombre legible del método de pago
export const METODO_LABEL = {
  efectivo:           'Efectivo',
  transferencia_prod: 'Transferencia Produbanco',
  transferencia_pich: 'Transferencia Pichincha',
  interbancaria:      'Interbancaria',
  tarjeta:            'Tarjeta Payphone',
}
export const TIPO_CLASE_LABEL = {
  piso:        'Piso',
  hidroterapia:'Hidroterapia',
  post_vacuna: 'Post Vacuna',
  evaluacion:  'Evaluación',
  baby_spa:    'Baby Spa',
  no_asistio:  'No asistió',
}
