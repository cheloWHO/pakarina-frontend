import { useEffect, useRef, useState } from 'react'
import { bebesAPI, planesAPI, gruposAPI, clasesAPI, finanzasAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import CuentaDestinoSelect from '../../components/CuentaDestinoSelect'
import ComprobanteUploader from '../../components/ComprobanteUploader'
import { Card, Btn, Input, Select, Badge, Spinner, Alert, Empty } from '../../components/ui'
import { fmtFecha, edadMeses, METODO_LABEL, TIPO_CLASE_LABEL } from '../../utils'

const SERVICIOS = [
  { id:1, nombre:'Clase Post Vacuna',  precio:12,  clases:1,  vigencia:0 },
  { id:2, nombre:'Evaluación',         precio:12,  clases:1,  vigencia:0 },
  { id:3, nombre:'Baby Spa',           precio:15,  clases:1,  vigencia:0 },
  { id:4, nombre:'Plan 1', precio:60,  clases:4,  vigencia:30 },
  { id:5, nombre:'Plan 2', precio:100, clases:8,  vigencia:30 },
  { id:7, nombre:'Plan 3', precio:165, clases:12, vigencia:90 },
  { id:8, nombre:'Plan 4', precio:270, clases:24, vigencia:90 },
]

const BANCO_POR_METODO = {
  efectivo:           'efectivo',
  transferencia_prod: 'produbanco',
  interbancaria:      'produbanco',
  tarjeta:            'payphone',
}

const PASO_LABELS = ['Bebé', 'Servicio', 'Pago', 'Confirmar']

const LOCALES = [
  { id: 1, nombre: 'Villaflora (Sur)' },
  { id: 2, nombre: 'Florida (Norte)' },
]

// Métodos que llegan a una cuenta bancaria (los demás son efectivo o tarjeta)
const METODO_CON_CUENTA = ['transferencia_prod', 'interbancaria']

// Servicios que se pagan en dos partes: mitad al reservar, mitad el día
// de la clase. Los planes se pagan completos como siempre.
const SERVICIOS_PARCIALES = [1, 2] // 1 Clase Post Vacuna, 2 Evaluación

// Fecha de hoy en formato local YYYY-MM-DD (para el pago restante).
const hoyLocal = () => new Date().toLocaleDateString('en-CA')

// Verificación SOLO LECTURA: compara los precios que muestra esta pantalla
// con los reales del backend (tabla servicios, GET /api/finanzas/servicios).
// Solo avisa en la consola del navegador si hay diferencia; NUNCA cambia
// un precio. Si el backend aún no tiene el endpoint (rama sin fusionar),
// falla en silencio y se verifica cuando se publique.
async function verificarPrecios() {
  try {
    const { data } = await finanzasAPI.listarServicios()
    const reales = new Map((data || []).map(s => [s.id, s]))
    SERVICIOS.forEach(local => {
      const real = reales.get(local.id)
      if (!real) {
        console.warn(`[Precios] El backend no trae el servicio id ${local.id} (${local.nombre})`)
        return
      }
      if (parseFloat(real.precio) !== local.precio || real.num_clases !== local.clases || real.vigencia_dias !== local.vigencia) {
        console.warn(`[Precios] Diferencia en "${local.nombre}": pantalla $${local.precio} / ${local.clases} clases / ${local.vigencia} días — backend $${real.precio} / ${real.num_clases} clases / ${real.vigencia_dias} días`)
      }
    })
  } catch (e) { /* endpoint aún no publicado */ }
}

function BebeDetalle({ bebe: bebeInicial, grupos, onBack, onSaved }) {
  const [bebe,        setBebe]        = useState({ ...bebeInicial })
  const [planes,      setPlanes]      = useState([])
  const [clases,      setClases]      = useState([])
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [clasesExtra, setClasesExtra] = useState('')
  const [planIdExtra, setPlanIdExtra] = useState(null)
  const [savingExtra, setSavingExtra] = useState(false)
  const [planIdFecha, setPlanIdFecha] = useState(null)
  const [nuevaFecha,  setNuevaFecha]  = useState('')
  const [savingFecha, setSavingFecha] = useState(false)
  const [editandoNota,  setEditandoNota]  = useState(null)
  const [editandoTipo,  setEditandoTipo]  = useState('')
  const [editandoFecha, setEditandoFecha] = useState('')
  const [textoNota,     setTextoNota]     = useState('')
  const [savingNota,    setSavingNota]    = useState(false)
  const [showNuevoPlan,   setShowNuevoPlan]   = useState(false)
  const [nuevoPlanSrvId,  setNuevoPlanSrvId]  = useState(null)
  const [nuevoPlanMetodo, setNuevoPlanMetodo] = useState('efectivo')
  const [nuevoPlanRef,    setNuevoPlanRef]    = useState('')
  const [nuevoPlanFecha,  setNuevoPlanFecha]  = useState('')
  const [nuevoPlanMonto,  setNuevoPlanMonto]  = useState('')
  const [nuevoPlanCuentaId, setNuevoPlanCuentaId] = useState(null)
  const [ultimoPagoId, setUltimoPagoId] = useState(null)
  const [comprobanteSubido, setComprobanteSubido] = useState(false)
  // Pago restante (segunda mitad de Evaluación / Post Vacuna)
  const [planIdAbono, setPlanIdAbono] = useState(null)
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoMetodo, setAbonoMetodo] = useState('efectivo')
  const [abonoRef, setAbonoRef] = useState('')
  const [abonoFecha, setAbonoFecha] = useState('')
  const [abonoCuentaId, setAbonoCuentaId] = useState(null)
  const [savingAbono, setSavingAbono] = useState(false)

  useEffect(() => {
    planesAPI.listar({ bebe_id: bebeInicial.id })
      .then(r => setPlanes(r.data))
      .catch(console.error)
    clasesAPI.listar({ bebe_id: bebeInicial.id })
      .then(r => setClases(r.data))
      .catch(console.error)
  }, [bebeInicial.id])

  async function handleGuardar() {
    setSaving(true); setMsg(null)
    try {
      await bebesAPI.actualizar(bebe.id, {
        nombre_completo:        bebe.nombre_completo,
        fecha_nacimiento:       bebe.fecha_nacimiento,
        nombre_tutor:           bebe.nombre_tutor,
        whatsapp_representante: bebe.whatsapp_representante,
        email_representante:    bebe.email_representante,
        grupo_id:               bebe.grupo_id || null,
        local_id:               bebe.local_id,
      })
      setMsg({ type: 'ok', text: 'Datos actualizados correctamente' })
      onSaved()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al guardar' })
    } finally { setSaving(false) }
  }

  async function handleEditarFecha(planId) {
    if (!nuevaFecha) return
    setSavingFecha(true); setMsg(null)
    try {
      await planesAPI.editarFecha(planId, nuevaFecha)
      const fresh = await planesAPI.listar({ bebe_id: bebeInicial.id })
      setPlanes(fresh.data)
      setNuevaFecha(''); setPlanIdFecha(null)
      setMsg({ type: 'ok', text: 'Fecha de inicio actualizada correctamente' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al actualizar fecha' })
    } finally { setSavingFecha(false) }
  }

  async function handleAgregarClases(planId) {
    if (!clasesExtra || parseInt(clasesExtra) < 1) return
    setSavingExtra(true); setMsg(null)
    try {
      await planesAPI.agregarClases(planId, parseInt(clasesExtra))
      const fresh = await planesAPI.listar({ bebe_id: bebeInicial.id })
      setPlanes(fresh.data)
      setClasesExtra(''); setPlanIdExtra(null)
      setMsg({ type: 'ok', text: `${clasesExtra} clases agregadas correctamente` })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al agregar clases' })
    } finally { setSavingExtra(false) }
  }

  async function handleGuardarClase(claseId) {
    setSavingNota(true); setMsg(null)
    try {
      await clasesAPI.editarClase(claseId, {
        observaciones: textoNota,
        tipo_clase:    editandoTipo,
        fecha:         editandoFecha,
      })
      const fresh = await clasesAPI.listar({ bebe_id: bebeInicial.id })
      setClases(fresh.data)
      setEditandoNota(null); setTextoNota(''); setEditandoTipo(''); setEditandoFecha('')
      setMsg({ type: 'ok', text: 'Clase actualizada correctamente' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al guardar clase' })
    } finally { setSavingNota(false) }
  }

  async function handleEliminarClase(claseId) {
    if (!window.confirm('¿Seguro que quieres eliminar esta clase? Se devolverá al plan.')) return
    setMsg(null)
    try {
      await clasesAPI.eliminar(claseId)
      const fresh = await clasesAPI.listar({ bebe_id: bebeInicial.id })
      setClases(fresh.data)
      const freshPlanes = await planesAPI.listar({ bebe_id: bebeInicial.id })
      setPlanes(freshPlanes.data)
      setMsg({ type: 'ok', text: 'Clase eliminada y devuelta al plan' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al eliminar clase' })
    }
  }

  // Servicio elegido en el formulario Nuevo plan y su pago parcial.
  const srvNuevo = SERVICIOS.find(s => s.id === nuevoPlanSrvId)
  const esParcialNuevo = !!(srvNuevo && SERVICIOS_PARCIALES.includes(srvNuevo.id))
  const montoNuevoNum = parseFloat(nuevoPlanMonto)
  const saldoNuevo = esParcialNuevo
    ? Math.max(0, parseFloat((srvNuevo.precio - (Number.isNaN(montoNuevoNum) ? 0 : montoNuevoNum)).toFixed(2)))
    : null

  function elegirServicioNuevoPlan(s) {
    setNuevoPlanSrvId(s.id)
    // Para Evaluación y Post Vacuna el pago inicial es la mitad por defecto.
    setNuevoPlanMonto(SERVICIOS_PARCIALES.includes(s.id) ? (s.precio / 2).toFixed(2) : '')
  }

  function abrirAbono(p) {
    setPlanIdAbono(p.id)
    setAbonoMonto(Number(p.saldo_pendiente).toFixed(2))
    setAbonoMetodo('efectivo')
    setAbonoRef('')
    setAbonoFecha(hoyLocal())
    setAbonoCuentaId(null)
    setMsg(null)
  }

  function cancelarAbono() {
    setPlanIdAbono(null); setAbonoMonto(''); setAbonoRef(''); setAbonoCuentaId(null)
  }

  async function handleRegistrarAbono(p) {
    const monto = parseFloat(abonoMonto)
    if (Number.isNaN(monto) || monto <= 0 || monto > Number(p.saldo_pendiente)) {
      setMsg({ type: 'error', text: `El monto debe ser mayor a $0 y no mayor al saldo pendiente ($${Number(p.saldo_pendiente).toFixed(2)})` })
      return
    }
    setSavingAbono(true); setMsg(null)
    try {
      const res = await planesAPI.registrarAbono(p.id, {
        monto,
        metodo_pago: abonoMetodo,
        banco_destino: BANCO_POR_METODO[abonoMetodo],
        cuenta_id: abonoCuentaId || undefined,
        referencia: abonoRef || null,
        fecha: abonoFecha || null,
      })
      const fresh = await planesAPI.listar({ bebe_id: bebeInicial.id })
      setPlanes(fresh.data)
      setPlanIdAbono(null); setAbonoMonto(''); setAbonoRef(''); setAbonoCuentaId(null)
      setUltimoPagoId(res.data?.pago_id || null)
      setComprobanteSubido(false)
      const restante = res.data?.saldo_pendiente || 0
      setMsg({ type: 'ok', text: `Pago de $${monto.toFixed(2)} registrado. ${restante > 0 ? `Quedan pendientes $${restante.toFixed(2)}.` : 'Plan pagado por completo.'}` })
    } catch (e) {
      const status = e.response?.status
      setMsg({ type: 'error', text: status === 404
        ? 'El servidor aún no tiene activa esta función (falta publicar la parte del servidor).'
        : (e.response?.data?.error || 'Error al registrar el pago') })
    } finally { setSavingAbono(false) }
  }

  async function handleNuevoPlan() {
    if (!nuevoPlanSrvId) return
    if (esParcialNuevo) {
      const m = parseFloat(nuevoPlanMonto)
      if (Number.isNaN(m) || m <= 0 || m > srvNuevo.precio) {
        setMsg({ type: 'error', text: `El monto a pagar ahora debe ser mayor a $0 y no mayor a $${srvNuevo.precio.toFixed(2)}` })
        return
      }
    }
    setSavingNuevoPlan(true); setMsg(null)
    try {
      const res = await planesAPI.registrarPago({
        local_id:      bebe.local_id,
        bebe_id:       bebeInicial.id,
        servicio_id:   nuevoPlanSrvId,
        metodo_pago:   nuevoPlanMetodo,
        banco_destino: BANCO_POR_METODO[nuevoPlanMetodo],
        cuenta_id:     nuevoPlanCuentaId || undefined,
        referencia:    nuevoPlanRef || null,
        fecha_inicio:  nuevoPlanFecha || null,
        monto_inicial: esParcialNuevo && nuevoPlanMonto !== '' ? parseFloat(nuevoPlanMonto) : undefined,
      })
      const fresh = await planesAPI.listar({ bebe_id: bebeInicial.id })
      setPlanes(fresh.data)
      setShowNuevoPlan(false)
      setNuevoPlanSrvId(null); setNuevoPlanMetodo('efectivo')
      setNuevoPlanRef(''); setNuevoPlanFecha(''); setNuevoPlanCuentaId(null)
      setNuevoPlanMonto('')
      setUltimoPagoId(res.data?.pago_id || null)
      setComprobanteSubido(false)
      setMsg({ type: 'ok', text: 'Plan registrado correctamente' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al registrar plan' })
    } finally { setSavingNuevoPlan(false) }
  }

  function cancelarEdicionClase() {
    setEditandoNota(null); setTextoNota(''); setEditandoTipo(''); setEditandoFecha('')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'900px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <Btn variant="ghost" onClick={onBack}>← Volver</Btn>
        <h2 style={{ fontSize:'20px', fontWeight:600 }}>{bebeInicial.nombre_completo}</h2>
      </div>

      {msg && <Alert type={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</Alert>}

      {/* Datos del bebé */}
      <Card>
        <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'1rem' }}>Datos del bebé</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div style={{ gridColumn:'1/-1' }}>
            <Input label="Nombre completo" value={bebe.nombre_completo}
              onChange={e => setBebe(b => ({...b, nombre_completo: e.target.value}))} />
          </div>
          <Input label="Fecha de nacimiento" type="date"
            value={bebe.fecha_nacimiento ? bebe.fecha_nacimiento.split('T')[0] : ''}
            onChange={e => setBebe(b => ({...b, fecha_nacimiento: e.target.value}))} />
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            <label style={{ fontSize:'12px', color:'var(--gray-600)', fontWeight:500 }}>Edad</label>
            <div style={{ height:'38px', display:'flex', alignItems:'center' }}>
              <Badge color="green">{edadMeses(bebe.fecha_nacimiento)}</Badge>
            </div>
          </div>
          <Input label="Nombre del tutor/a" value={bebe.nombre_tutor}
            onChange={e => setBebe(b => ({...b, nombre_tutor: e.target.value}))} />
          <Input label="WhatsApp" value={bebe.whatsapp_representante}
            onChange={e => setBebe(b => ({...b, whatsapp_representante: e.target.value}))} />
          <div style={{ gridColumn:'1/-1' }}>
            <Input label="Email" type="email" value={bebe.email_representante}
              onChange={e => setBebe(b => ({...b, email_representante: e.target.value}))} />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <Select label="Sucursal" value={bebe.local_id || ''}
              onChange={e => setBebe(b => ({...b, local_id: e.target.value}))}>
              {LOCALES.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </Select>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <Select label="Grupo" value={bebe.grupo_id || ''}
              onChange={e => setBebe(b => ({...b, grupo_id: e.target.value}))}>
              <option value="">Sin asignar</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </Select>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1rem' }}>
          <Btn onClick={handleGuardar} loading={saving}>Guardar cambios</Btn>
        </div>
      </Card>

      {/* Planes */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div style={{ fontWeight:600, fontSize:'14px' }}>Planes</div>
          <Btn size="sm" onClick={() => setShowNuevoPlan(s => !s)}>+ Nuevo plan</Btn>
        </div>

        {showNuevoPlan && (
          <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'12px', marginBottom:'1rem' }}>
            <div style={{ fontWeight:600, fontSize:'13px', marginBottom:'12px' }}>Registrar nuevo plan</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px' }}>
              {SERVICIOS.map(s => (
                <div key={s.id} onClick={() => elegirServicioNuevoPlan(s)}
                  style={{ border: nuevoPlanSrvId === s.id ? '2px solid var(--accent)' : '1px solid var(--gray-200)', background: nuevoPlanSrvId === s.id ? 'var(--accent-light)' : '#fff', borderRadius:'var(--radius-md)', padding:'8px', cursor:'pointer' }}>
                  <div style={{ fontSize:'11px', fontWeight:600 }}>{s.nombre}</div>
                  <div style={{ fontSize:'10px', color:'var(--gray-400)' }}>{s.clases} clase{s.clases>1?'s':''} · {s.vigencia ? s.vigencia+' días' : 'sin vigencia'}</div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'var(--accent)' }}>${s.precio.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'12px' }}>
              {Object.entries(METODO_LABEL).map(([key, label]) => (
                <div key={key} onClick={() => setNuevoPlanMetodo(key)}
                  style={{ border: nuevoPlanMetodo === key ? '2px solid var(--accent)' : '1px solid var(--gray-200)', background: nuevoPlanMetodo === key ? 'var(--accent-light)' : '#fff', borderRadius:'var(--radius-sm)', padding:'5px 10px', fontSize:'11px', cursor:'pointer', fontWeight: nuevoPlanMetodo === key ? 600 : 400, color: nuevoPlanMetodo === key ? 'var(--accent)' : 'var(--gray-600)' }}>
                  {label}
                </div>
              ))}
            </div>
            {esParcialNuevo && (
              <div style={{ background:'#fff', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'10px', marginBottom:'12px' }}>
                <Input label="Monto a pagar ahora ($)" type="text" inputMode="decimal"
                  value={nuevoPlanMonto}
                  onChange={e => setNuevoPlanMonto(e.target.value.replace(',', '.'))} />
                <div style={{ fontSize:'12px', color:'var(--gray-600)', marginTop:'6px' }}>
                  Total ${srvNuevo.precio.toFixed(2)} · Pagas ahora ${Number.isNaN(montoNuevoNum) ? '0.00' : montoNuevoNum.toFixed(2)} · Queda pendiente ${saldoNuevo !== null ? saldoNuevo.toFixed(2) : '0.00'}
                </div>
                <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' }}>
                  Evaluación y Post Vacuna se pagan en dos partes: la otra mitad se paga el día de la clase.
                </div>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
              <Input label="Fecha de inicio (opcional)" type="date" value={nuevoPlanFecha}
                onChange={e => setNuevoPlanFecha(e.target.value)} />
              <Input label="Referencia (opcional)" value={nuevoPlanRef}
                onChange={e => setNuevoPlanRef(e.target.value)} placeholder="TRF-001" />
            </div>
            {METODO_CON_CUENTA.includes(nuevoPlanMetodo) && (
              <div style={{ marginBottom:'12px' }}>
                <CuentaDestinoSelect value={nuevoPlanCuentaId} onChange={setNuevoPlanCuentaId} />
              </div>
            )}
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowNuevoPlan(false)}>Cancelar</Btn>
              <Btn onClick={handleNuevoPlan} loading={savingNuevoPlan} disabled={!nuevoPlanSrvId}>Registrar plan</Btn>
            </div>
          </div>
        )}

        {ultimoPagoId && !comprobanteSubido && (
          <ComprobanteUploader pagoId={ultimoPagoId} onSubido={() => setComprobanteSubido(true)} />
        )}

        {planes.length === 0 ? (
          <Empty message="Sin planes registrados" />
        ) : (
          planes.map(p => (
            <div key={p.id} style={{ borderBottom:'1px solid var(--gray-100)', paddingBottom:'1rem', marginBottom:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'13px' }}>{p.servicio}</div>
                  <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' }}>
                    Inicio: {fmtFecha(p.fecha_inicio)} · Vence: {p.fecha_vencimiento ? fmtFecha(p.fecha_vencimiento) : 'Sin vigencia'}
                  </div>
                  {p.estado === 'activo' && (
                    planIdFecha === p.id ? (
                      <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', marginTop:'8px' }}>
                        <div style={{ flex:1 }}>
                          <Input label="Nueva fecha de inicio" type="date"
                            value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} />
                        </div>
                        <Btn onClick={() => handleEditarFecha(p.id)} loading={savingFecha}>Guardar</Btn>
                        <Btn variant="ghost" onClick={() => { setPlanIdFecha(null); setNuevaFecha('') }}>Cancelar</Btn>
                      </div>
                    ) : (
                      <Btn size="sm" variant="ghost" onClick={() => setPlanIdFecha(p.id)}
                        style={{ marginTop:'4px', fontSize:'11px', padding:'2px 6px' }}>
                        ✏️ Editar fecha de inicio
                      </Btn>
                    )
                  )}
                </div>
                <Badge color={p.estado === 'activo' ? 'green' : 'gray'}>{p.estado}</Badge>
              </div>
              <div style={{ display:'flex', gap:'12px', fontSize:'13px', marginBottom:'10px' }}>
                <span>Total: <strong>{p.clases_total}</strong></span>
                <span>Usadas: <strong>{p.clases_usadas}</strong></span>
                <span>Restantes: <strong style={{ color:'var(--brand-dark)' }}>{p.clases_restantes}</strong></span>
              </div>
              {p.saldo_pendiente > 0 && (
                <div style={{ display:'flex', gap:'12px', fontSize:'13px', marginBottom:'10px' }}>
                  <span>Pagado: <strong>${Number(p.total_pagado || 0).toFixed(2)}</strong></span>
                  <span>Pendiente: <strong style={{ color:'var(--warn)' }}>${Number(p.saldo_pendiente).toFixed(2)}</strong></span>
                </div>
              )}
              {p.estado === 'activo' && (
                planIdExtra === p.id ? (
                  <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
                    <div style={{ flex:1 }}>
                      <Input label="Clases extra a agregar" type="number" min="1"
                        value={clasesExtra} onChange={e => setClasesExtra(e.target.value)} placeholder="Ej. 1" />
                    </div>
                    <Btn onClick={() => handleAgregarClases(p.id)} loading={savingExtra}>Agregar</Btn>
                    <Btn variant="ghost" onClick={() => { setPlanIdExtra(null); setClasesExtra('') }}>Cancelar</Btn>
                  </div>
                ) : (
                  <Btn size="sm" variant="ghost" onClick={() => setPlanIdExtra(p.id)}>
                    + Agregar clases extra
                  </Btn>
                )
              )}
              {p.saldo_pendiente > 0 && (
                planIdAbono === p.id ? (
                  <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'12px', marginTop:'10px' }}>
                    <div style={{ fontWeight:600, fontSize:'13px', marginBottom:'10px' }}>Registrar pago restante</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
                      <Input label="Monto ($)" type="text" inputMode="decimal"
                        value={abonoMonto} onChange={e => setAbonoMonto(e.target.value.replace(',', '.'))} />
                      <Input label="Fecha del pago" type="date"
                        value={abonoFecha} onChange={e => setAbonoFecha(e.target.value)} />
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'10px' }}>
                      {Object.entries(METODO_LABEL).map(([key, label]) => (
                        <div key={key} onClick={() => setAbonoMetodo(key)}
                          style={{ border: abonoMetodo === key ? '2px solid var(--accent)' : '1px solid var(--gray-200)', background: abonoMetodo === key ? 'var(--accent-light)' : '#fff', borderRadius:'var(--radius-sm)', padding:'5px 10px', fontSize:'11px', cursor:'pointer', fontWeight: abonoMetodo === key ? 600 : 400, color: abonoMetodo === key ? 'var(--accent)' : 'var(--gray-600)' }}>
                          {label}
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
                      <Input label="Referencia (opcional)" value={abonoRef}
                        onChange={e => setAbonoRef(e.target.value)} placeholder="TRF-001" />
                      <div />
                    </div>
                    {METODO_CON_CUENTA.includes(abonoMetodo) && (
                      <div style={{ marginBottom:'10px' }}>
                        <CuentaDestinoSelect value={abonoCuentaId} onChange={setAbonoCuentaId} />
                      </div>
                    )}
                    <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                      <Btn variant="ghost" onClick={cancelarAbono}>Cancelar</Btn>
                      <Btn onClick={() => handleRegistrarAbono(p)} loading={savingAbono}>Guardar pago</Btn>
                    </div>
                  </div>
                ) : (
                  <Btn size="sm" onClick={() => abrirAbono(p)} style={{ marginTop:'8px' }}>
                    Registrar pago restante
                  </Btn>
                )
              )}
            </div>
          ))
        )}
      </Card>

      {/* Historial de clases */}
      <Card>
        <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'1rem' }}>
          Historial de clases
          <span style={{ fontWeight:400, fontSize:'12px', color:'var(--gray-400)', marginLeft:'8px' }}>
            solo visible para admins
          </span>
        </div>
        {clases.length === 0 ? (
          <Empty message="Sin clases registradas" />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {clases.map(c => (
              <div key={c.id} style={{ border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', padding:'12px' }}>
                <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginBottom:'8px' }}>
                  <span style={{ fontSize:'12px', color:'var(--gray-600)', whiteSpace:'nowrap' }}>{fmtFecha(c.fecha)}</span>
                  <Badge color={c.tipo_clase === 'no_asistio' ? 'gray' : 'green'}>
                    {TIPO_CLASE_LABEL[c.tipo_clase] || c.tipo_clase}
                  </Badge>
                  <span style={{ fontSize:'11px', color:'var(--gray-400)' }}>{c.registrado_por}</span>
                </div>
                {editandoNota === c.id ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      <Input label="Fecha de la clase" type="date" value={editandoFecha}
                        onChange={e => setEditandoFecha(e.target.value)} />
                      <Select label="Tipo de clase" value={editandoTipo}
                        onChange={e => setEditandoTipo(e.target.value)}>
                        {Object.entries(TIPO_CLASE_LABEL).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </Select>
                    </div>
                    <textarea value={textoNota} onChange={e => setTextoNota(e.target.value)}
                      rows={3} placeholder="Nota (opcional)"
                      style={{ width:'100%', padding:'6px 8px', fontSize:'12px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', resize:'vertical', fontFamily:'inherit', outline:'none', background:'#fff', color:'var(--gray-900)', boxSizing:'border-box' }} />
                    <div style={{ display:'flex', gap:'6px' }}>
                      <Btn size="sm" onClick={() => handleGuardarClase(c.id)} loading={savingNota}>Guardar</Btn>
                      <Btn size="sm" variant="ghost" onClick={cancelarEdicionClase}>Cancelar</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                    <span style={{ fontSize:'12px', color: c.observaciones ? 'var(--gray-900)' : 'var(--gray-400)', flex:1, lineHeight:'1.5' }}>
                      {c.observaciones || 'Sin nota'}
                    </span>
                    <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                      <Btn size="sm" variant="ghost"
                        onClick={() => { setEditandoNota(c.id); setTextoNota(c.observaciones || ''); setEditandoTipo(c.tipo_clase || ''); setEditandoFecha(c.fecha ? c.fecha.split('T')[0] : '') }}
                        style={{ fontSize:'11px', padding:'2px 6px', whiteSpace:'nowrap' }}>
                        ✏️
                      </Btn>
                      <Btn size="sm" variant="ghost"
                        onClick={() => handleEliminarClase(c.id)}
                        style={{ fontSize:'11px', padding:'2px 6px', whiteSpace:'nowrap', color:'var(--danger)' }}>
                        🗑️
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function BebesPage() {
  const { user }   = useAuth()
  const esGlobal   = !user?.local_id
  const localId    = user?.local_id

  const [bebes,       setBebes]       = useState([])
  const [filtroLocal, setFiltroLocal] = useState('')
  const [grupos,      setGrupos]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [bebeDetalle, setBebeDetalle] = useState(null)
  const [paso,        setPaso]        = useState(0)
  const [saving,      setSaving]      = useState(false)
  const [success,     setSuccess]     = useState(null)
  const [formErr,     setFormErr]     = useState('')

  const [bebe, setBebe] = useState({
    nombre_completo:'', fecha_nacimiento:'', grupo_id:'',
    email_representante:'', whatsapp_representante:'', nombre_tutor:'',
    local_id_form: localId || '',
  })
  const [srvId,       setSrvId]       = useState(null)
  const [metodo,      setMetodo]      = useState('efectivo')
  const [ref,         setRef]         = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [cuentaId,    setCuentaId]    = useState(null)
  const [montoInicial, setMontoInicial] = useState('')
  const [pagoIdCreado, setPagoIdCreado] = useState(null)
  const [comprobanteSubido, setComprobanteSubido] = useState(false)
  // Aviso de duplicados al registrar (nombre normalizado, todas las sedes).
  const [dupAviso, setDupAviso] = useState(null)
  const [dupVerificando, setDupVerificando] = useState(false)
  const [forzarDuplicado, setForzarDuplicado] = useState(false)
  const [gruposDuplicados, setGruposDuplicados] = useState([])
  const dupSeq = useRef(0)

  async function loadBebes() {
    try {
      const [bRes, gRes] = await Promise.all([
        bebesAPI.listar(localId),
        gruposAPI.listar(),
      ])
      setBebes(bRes.data)
      setGrupos(gRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
    // Grupos de posibles duplicados (revisión del admin). Si el servidor
    // aún no tiene el endpoint, se ignora y se muestra cuando se publique.
    try {
      const dRes = await bebesAPI.listarDuplicados()
      setGruposDuplicados(dRes.data?.grupos || [])
    } catch (e) { /* endpoint aún no publicado */ }
  }

  // Abre el detalle de un bebé existente (desde un aviso de duplicado).
  async function abrirBebe(id) {
    try {
      const { data } = await bebesAPI.obtener(id)
      setDupAviso(null)
      setShowForm(false)
      setBebeDetalle(data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadBebes(); verificarPrecios() }, [localId])

  // Aviso de duplicados mientras se escribe el nombre (pausa de 500 ms).
  // Se consulta al servidor porque el listado de esta pantalla solo trae
  // la sucursal del usuario y el duplicado puede estar en la otra sede.
  useEffect(() => {
    if (!showForm || success || paso !== 0) return
    const nombre = (bebe.nombre_completo || '').trim()
    if (nombre.length < 3 || forzarDuplicado) { setDupAviso(null); return }
    setDupVerificando(true)
    const seq = ++dupSeq.current
    const t = setTimeout(async () => {
      try {
        const { data } = await bebesAPI.verificarDuplicados(nombre, bebe.fecha_nacimiento || undefined)
        if (seq !== dupSeq.current) return
        setDupAviso((data?.duplicados || []).length ? data.duplicados : null)
      } catch (e) { /* el servidor aún no tiene el endpoint: sin aviso */ }
      finally { if (seq === dupSeq.current) setDupVerificando(false) }
    }, 500)
    return () => clearTimeout(t)
  }, [bebe.nombre_completo, bebe.fecha_nacimiento, showForm, paso, success, forzarDuplicado])

  const srv      = SERVICIOS.find(s => s.id === srvId)
  // Pago en dos partes (solo Evaluación y Post Vacuna): el monto a cobrar
  // ahora es la mitad por defecto y el resto queda pendiente del plan.
  const esParcialWizard = !!(srv && SERVICIOS_PARCIALES.includes(srv.id))
  const montoInicialNum = parseFloat(montoInicial)
  const montoACobrar = esParcialWizard ? (Number.isNaN(montoInicialNum) ? 0 : montoInicialNum) : (srv ? srv.precio : 0)
  const saldoWizard = esParcialWizard && srv ? Math.max(0, parseFloat((srv.precio - montoACobrar).toFixed(2))) : 0
  const comision = metodo === 'tarjeta' && srv ? parseFloat((montoACobrar * 0.06).toFixed(2)) : 0
  const neto     = srv ? parseFloat((montoACobrar - comision).toFixed(2)) : 0
  const localIdFinal = esGlobal ? parseInt(bebe.local_id_form) : localId

  function elegirServicioWizard(s) {
    setSrvId(s.id)
    setMontoInicial(SERVICIOS_PARCIALES.includes(s.id) ? (s.precio / 2).toFixed(2) : '')
  }

  async function handleRegistrar() {
    if (esParcialWizard) {
      const m = parseFloat(montoInicial)
      if (Number.isNaN(m) || m <= 0 || m > srv.precio) {
        setFormErr(`El monto a pagar ahora debe ser mayor a $0 y no mayor a $${srv.precio.toFixed(2)}`)
        return
      }
    }
    setSaving(true); setFormErr('')
    try {
      const bRes = await bebesAPI.crear({
        ...bebe, local_id: localIdFinal, grupo_id: bebe.grupo_id || null,
        forzar: forzarDuplicado || undefined,
      })
      const bebeId = bRes.data.bebe_id
      const pRes = await planesAPI.registrarPago({
        local_id: localIdFinal, bebe_id: bebeId, servicio_id: srvId,
        metodo_pago: metodo, banco_destino: BANCO_POR_METODO[metodo],
        cuenta_id: cuentaId || undefined,
        referencia: ref || null, fecha_inicio: fechaInicio || null,
        monto_inicial: esParcialWizard && montoInicial !== '' ? parseFloat(montoInicial) : undefined,
      })
      setPagoIdCreado(pRes.data?.pago_id || null)
      setComprobanteSubido(false)
      setSuccess({
        email: bRes.data.credenciales.email, password: bRes.data.credenciales.password,
        nombre: bebe.nombre_completo, servicio: srv.nombre,
      })
      loadBebes()
    } catch (e) {
      const dups = e.response?.data?.duplicados
      if (e.response?.status === 409 && dups?.length) {
        // El servidor detectó un posible duplicado: volver al paso del
        // bebé y mostrar el aviso con la opción de registrar de todos modos.
        setDupAviso(dups)
        setForzarDuplicado(false)
        setPaso(0)
      } else {
        setFormErr(e.response?.data?.error || 'Error al registrar')
      }
    } finally { setSaving(false) }
  }

  function resetForm() {
    setBebe({ nombre_completo:'', fecha_nacimiento:'', grupo_id:'', email_representante:'', whatsapp_representante:'', nombre_tutor:'', local_id_form: localId || '' })
    setSrvId(null); setMetodo('efectivo'); setRef(''); setFechaInicio(''); setPaso(0)
    setCuentaId(null); setMontoInicial(''); setPagoIdCreado(null); setComprobanteSubido(false)
    setSuccess(null); setFormErr(''); setShowForm(false)
    setDupAviso(null); setForzarDuplicado(false)
  }

  const paso0Valido = bebe.nombre_completo && bebe.fecha_nacimiento &&
    bebe.nombre_tutor && bebe.whatsapp_representante && bebe.email_representante &&
    (!esGlobal || bebe.local_id_form)

  const bebesFiltrados = filtroLocal
    ? bebes.filter(b => b.local_id === parseInt(filtroLocal))
    : bebes

  if (loading) return <Spinner />

  if (bebeDetalle) {
    return (
      <BebeDetalle
        bebe={bebeDetalle}
        grupos={grupos}
        onBack={() => setBebeDetalle(null)}
        onSaved={() => { loadBebes(); setBebeDetalle(null) }}
      />
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'900px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <h2 style={{ fontSize:'20px', fontWeight:600 }}>Bebés</h2>
          <p style={{ color:'var(--gray-400)', fontSize:'13px' }}>{bebesFiltrados.length} registrados</p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {esGlobal && (
            <select value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)}
              style={{ height:'36px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'0 10px', fontSize:'13px' }}>
              <option value="">Todos</option>
              <option value="1">Villaflora</option>
              <option value="2">Florida</option>
            </select>
          )}
          <Btn onClick={() => { setShowForm(true); setSuccess(null) }}>+ Registrar bebé</Btn>
        </div>
      </div>

      {showForm && (
        <Card>
          {success ? (
            <div style={{ textAlign:'center', padding:'1rem' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>✓</div>
              <div style={{ fontWeight:600, color:'var(--brand-dark)', marginBottom:'4px' }}>{success.nombre} registrado</div>
              <div style={{ fontSize:'13px', color:'var(--gray-400)', marginBottom:'1rem' }}>{success.servicio}</div>
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'12px', textAlign:'left', marginBottom:'1rem' }}>
                <div style={{ fontSize:'12px', fontWeight:600, marginBottom:'6px', color:'var(--gray-600)' }}>Acceso portal papás</div>
                <div style={{ fontSize:'13px' }}>Usuario: <strong>{success.email}</strong></div>
                <div style={{ fontSize:'13px' }}>Contraseña: <strong>{success.password}</strong></div>
              </div>
              {pagoIdCreado && !comprobanteSubido && (
                <div style={{ textAlign:'left', marginBottom:'1rem' }}>
                  <ComprobanteUploader pagoId={pagoIdCreado} onSubido={() => setComprobanteSubido(true)} />
                </div>
              )}
              <Btn onClick={resetForm} variant="secondary">Registrar otro</Btn>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', gap:'0', marginBottom:'1.5rem' }}>
                {PASO_LABELS.map((l, i) => (
                  <div key={i} style={{ flex:1, textAlign:'center' }}>
                    <div style={{ width:'26px', height:'26px', borderRadius:'50%', margin:'0 auto 4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:600, background: i < paso ? 'var(--brand)' : i === paso ? 'var(--accent)' : 'var(--gray-100)', color: i <= paso ? '#fff' : 'var(--gray-400)' }}>{i < paso ? '✓' : i + 1}</div>
                    <div style={{ fontSize:'11px', color: i === paso ? 'var(--gray-900)' : 'var(--gray-400)', fontWeight: i === paso ? 500 : 400 }}>{l}</div>
                  </div>
                ))}
              </div>

              {paso === 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <Input label="Nombre completo del bebé" value={bebe.nombre_completo}
                        onChange={e => setBebe(b => ({...b, nombre_completo: e.target.value}))} placeholder="Valentina Juárez" required />
                    </div>
                    {dupVerificando && (
                      <div style={{ gridColumn:'1/-1', fontSize:'12px', color:'var(--gray-400)' }}>
                        Buscando bebés con un nombre parecido…
                      </div>
                    )}
                    {dupAviso && (
                      <div style={{ gridColumn:'1/-1', background:'var(--warn-light)', border:'1px solid var(--warn)', borderRadius:'var(--radius-sm)', padding:'12px' }}>
                        <div style={{ fontWeight:600, fontSize:'13px', color:'var(--warn)', marginBottom:'6px' }}>
                          ⚠️ Ya existe un bebé parecido
                        </div>
                        <div style={{ fontSize:'12px', color:'var(--gray-600)', marginBottom:'8px' }}>
                          Revisa si es el mismo bebé antes de registrarlo de nuevo:
                        </div>
                        {dupAviso.map(d => (
                          <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', background:'#fff', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'8px 10px', marginBottom:'6px' }}>
                            <div style={{ fontSize:'12px' }}>
                              <strong>{d.nombre_completo}</strong>
                              <span style={{ color:'var(--gray-400)' }}> · Nacido: {fmtFecha(d.fecha_nacimiento)} · {d.local_id === 1 ? 'Villaflora' : 'Florida'}</span>
                              {d.misma_fecha && <span style={{ color:'var(--warn)', fontWeight:600 }}> · Misma fecha de nacimiento</span>}
                            </div>
                            <Btn size="sm" variant="ghost" onClick={() => abrirBebe(d.id)}>Ver bebé</Btn>
                          </div>
                        ))}
                        <div style={{ fontSize:'12px', color:'var(--gray-600)', marginBottom:'8px' }}>
                          Si es otro bebé con el mismo nombre, puedes registrarlo de todos modos.
                        </div>
                        <Btn size="sm" variant="secondary" onClick={() => { setForzarDuplicado(true); setDupAviso(null) }}>
                          Registrar de todos modos
                        </Btn>
                      </div>
                    )}
                    <Input label="Fecha de nacimiento" type="date" value={bebe.fecha_nacimiento}
                      onChange={e => setBebe(b => ({...b, fecha_nacimiento: e.target.value}))} required />
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'12px', color:'var(--gray-600)', fontWeight:500 }}>Edad</label>
                      <div style={{ height:'38px', display:'flex', alignItems:'center' }}>
                        <Badge color="green">{edadMeses(bebe.fecha_nacimiento)}</Badge> : <span style={{ color:'var(--gray-400)', fontSize:'13px' }}>— meses</span>
                      </div>
                    </div>
                    {esGlobal && (
                      <div style={{ gridColumn:'1/-1' }}>
                        <Select label="Sucursal *" value={bebe.local_id_form}
                          onChange={e => setBebe(b => ({...b, local_id_form: e.target.value}))} required>
                          <option value="">Seleccionar sucursal...</option>
                          {LOCALES.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                        </Select>
                      </div>
                    )}
                    <div style={{ gridColumn:'1/-1' }}>
                      <Select label="Grupo (opcional)" value={bebe.grupo_id}
                        onChange={e => setBebe(b => ({...b, grupo_id: e.target.value}))}>
                        <option value="">Sin asignar</option>
                        {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                      </Select>
                    </div>
                  </div>
                  <hr style={{ border:'none', borderTop:'1px solid var(--gray-100)' }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    <Input label="Nombre del tutor/a" value={bebe.nombre_tutor}
                      onChange={e => setBebe(b => ({...b, nombre_tutor: e.target.value}))} placeholder="María Gómez" required />
                    <Input label="WhatsApp" value={bebe.whatsapp_representante}
                      onChange={e => setBebe(b => ({...b, whatsapp_representante: e.target.value}))} placeholder="+593 9..." required />
                    <div style={{ gridColumn:'1/-1' }}>
                      <Input label="Email" type="email" value={bebe.email_representante}
                        onChange={e => setBebe(b => ({...b, email_representante: e.target.value}))} placeholder="mama@email.com" required />
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <Btn onClick={() => setPaso(1)} disabled={!paso0Valido}>Siguiente →</Btn>
                  </div>
                </div>
              )}

              {paso === 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                    {SERVICIOS.map(s => (
                      <div key={s.id} onClick={() => elegirServicioWizard(s)}
                        style={{ border: srvId === s.id ? '2px solid var(--accent)' : '1px solid var(--gray-200)', background: srvId === s.id ? 'var(--accent-light)' : '#fff', borderRadius:'var(--radius-md)', padding:'10px 8px', cursor:'pointer' }}>
                        <div style={{ fontSize:'12px', fontWeight:600 }}>{s.nombre}</div>
                        <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' }}>{s.clases} clase{s.clases>1?'s':''} · {s.vigencia ? s.vigencia+' días' : 'sin vigencia'}</div>
                        <div style={{ fontSize:'14px', fontWeight:600, color:'var(--accent)', marginTop:'4px' }}>${s.precio.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <Btn variant="ghost" onClick={() => setPaso(0)}>← Atrás</Btn>
                    <Btn onClick={() => setPaso(2)} disabled={!srvId}>Siguiente →</Btn>
                  </div>
                </div>
              )}

              {paso === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                    {Object.entries(METODO_LABEL).map(([key, label]) => (
                      <div key={key} onClick={() => setMetodo(key)}
                        style={{ border: metodo === key ? '2px solid var(--accent)' : '1px solid var(--gray-200)', background: metodo === key ? 'var(--accent-light)' : '#fff', borderRadius:'var(--radius-sm)', padding:'7px 14px', fontSize:'12px', cursor:'pointer', fontWeight: metodo === key ? 600 : 400, color: metodo === key ? 'var(--accent)' : 'var(--gray-600)' }}>
                        {label}
                      </div>
                    ))}
                  </div>
                  {esParcialWizard && (
                    <div style={{ background:'#fff', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'10px' }}>
                      <Input label="Monto a pagar ahora ($)" type="text" inputMode="decimal"
                        value={montoInicial}
                        onChange={e => setMontoInicial(e.target.value.replace(',', '.'))} />
                      <div style={{ fontSize:'12px', color:'var(--gray-600)', marginTop:'6px' }}>
                        Total ${srv?.precio.toFixed(2)} · Pagas ahora ${montoACobrar.toFixed(2)} · Queda pendiente ${saldoWizard.toFixed(2)}
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' }}>
                        Evaluación y Post Vacuna se pagan en dos partes: la otra mitad se paga el día de la clase.
                      </div>
                    </div>
                  )}
                  <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'3px 0', color:'var(--gray-600)' }}>
                      <span>Monto cobrado al cliente</span><span>${montoACobrar.toFixed(2)}</span>
                    </div>
                    {esParcialWizard && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'3px 0', color:'var(--gray-600)' }}>
                        <span>Queda pendiente</span><span>${saldoWizard.toFixed(2)}</span>
                      </div>
                    )}
                    {metodo === 'tarjeta' && <>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'6px 8px', marginTop:'6px', background:'var(--brand-light)', borderRadius:'var(--radius-sm)', color:'var(--brand-dark)' }}>
                        <span>Ingreso neto (después de comisión Payphone)</span><span>${neto.toFixed(2)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'6px 8px', marginTop:'4px', background:'var(--warn-light)', borderRadius:'var(--radius-sm)', color:'var(--warn)' }}>
                        <span>Comisión Payphone 6% → gasto automático</span><span>-${comision.toFixed(2)}</span>
                      </div>
                    </>}
                  </div>
                  <Input label="Fecha de inicio del plan (opcional — por defecto hoy)" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                  <Input label="Referencia de pago (opcional)" placeholder="TRF-001" value={ref} onChange={e => setRef(e.target.value)} />
                  {METODO_CON_CUENTA.includes(metodo) && (
                    <CuentaDestinoSelect value={cuentaId} onChange={setCuentaId} />
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <Btn variant="ghost" onClick={() => setPaso(1)}>← Atrás</Btn>
                    <Btn onClick={() => setPaso(3)}>Revisar →</Btn>
                  </div>
                </div>
              )}

              {paso === 3 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
                    {[
                      ['Bebé',        bebe.nombre_completo],
                      ['Tutor/a',     bebe.nombre_tutor],
                      ['WhatsApp',    bebe.whatsapp_representante],
                      ['Sucursal',    esGlobal ? LOCALES.find(l => l.id === parseInt(bebe.local_id_form))?.nombre : (localId === 1 ? 'Villaflora' : 'Florida')],
                      ['Servicio',    srv?.nombre],
                      ['Clases',      srv?.clases + ' clases'],
                      ['Vigencia',    srv?.vigencia ? srv.vigencia + ' días' : 'Sin vigencia'],
                      ['Inicio plan', fechaInicio || 'Hoy'],
                      ['Método',      METODO_LABEL[metodo]],
                      ['Cobrado',     '$' + montoACobrar.toFixed(2)],
                      ...(esParcialWizard ? [['Pendiente', '$' + saldoWizard.toFixed(2)]] : []),
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                        <span style={{ color:'var(--gray-400)' }}>{k}</span>
                        <span style={{ fontWeight:500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {formErr && <Alert type="error">{formErr}</Alert>}
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <Btn variant="ghost" onClick={() => setPaso(2)}>← Atrás</Btn>
                    <Btn onClick={handleRegistrar} loading={saving}>Registrar y generar plan</Btn>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {gruposDuplicados.length > 0 && (
        <Card>
          <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'4px' }}>
            ⚠️ Posibles bebés duplicados
          </div>
          <div style={{ fontSize:'12px', color:'var(--gray-400)', marginBottom:'12px' }}>
            Estos bebés comparten el mismo nombre en el sistema. Toca uno para revisar si es el mismo bebé registrado dos veces.
          </div>
          {gruposDuplicados.map(g => (
            <div key={g.nombre} style={{ borderTop:'1px solid var(--gray-100)', padding:'10px 0' }}>
              <div style={{ fontWeight:600, fontSize:'13px', marginBottom:'6px' }}>
                {g.nombre} · {g.cantidad} registros
              </div>
              {g.bebes.map(b => (
                <div key={b.id} onClick={() => abrirBebe(b.id)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', cursor:'pointer' }}>
                  <div style={{ fontSize:'12px' }}>
                    Nacido: {fmtFecha(b.fecha_nacimiento)} · {b.local_id === 1 ? 'Villaflora' : 'Florida'} · {b.nombre_tutor}
                  </div>
                  <span style={{ fontSize:'12px', color:'var(--gray-400)' }}>→</span>
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}

      <Card>
        {bebes.length === 0 ? <Empty message="Sin bebés registrados" /> : (
          bebesFiltrados.map(b => (
            <div key={b.id} onClick={() => setBebeDetalle(b)}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--gray-100)', cursor:'pointer' }}>
              <div>
                <div style={{ fontWeight:500, fontSize:'13px' }}>{b.nombre_completo}</div>
                <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>
                  {b.edad_meses < 24 ? `${b.edad_meses} meses` : `${Math.floor(b.edad_meses/12)} años${b.edad_meses%12 > 0 ? ` ${b.edad_meses%12} meses` : ''}`} · {b.nombre_tutor} · {b.whatsapp_representante} · {b.local_id === 1 ? 'Villaflora' : 'Florida'}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {b.grupo_nombre ? <Badge color="purple">{b.grupo_nombre}</Badge> : <Badge color="gray">Sin grupo</Badge>}
                <span style={{ fontSize:'12px', color:'var(--gray-400)' }}>→</span>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
