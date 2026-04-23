import { useEffect, useState } from 'react'
import { bebesAPI, planesAPI, gruposAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Card, Btn, Input, Select, Badge, Spinner, Alert, Empty } from '../../components/ui'
import { fmtFecha, edadMeses, METODO_LABEL } from '../../utils'

const SERVICIOS = [
  { id:1, nombre:'Clase Post Vacuna',  precio:10,  clases:1,  vigencia:0 },
  { id:2, nombre:'Evaluación',         precio:10,  clases:1,  vigencia:0 },
  { id:3, nombre:'Baby Spa',           precio:15,  clases:1,  vigencia:0 },
  { id:4, nombre:'Plan Mensual #1',    precio:54,  clases:4,  vigencia:30 },
  { id:5, nombre:'Plan Mensual #2',    precio:90,  clases:8,  vigencia:30 },
  { id:6, nombre:'Plan Mensual #3',    precio:130, clases:12, vigencia:30 },
  { id:7, nombre:'Plan Trimestral #4', precio:150, clases:12, vigencia:90 },
  { id:8, nombre:'Plan Trimestral #5', precio:260, clases:24, vigencia:90 },
  { id:9, nombre:'Plan Trimestral #6', precio:355, clases:36, vigencia:90 },
]

const BANCO_POR_METODO = {
  efectivo:           'efectivo',
  transferencia_prod: 'produbanco',
  transferencia_pich: 'pichincha',
  interbancaria:      'produbanco',
  tarjeta:            'payphone',
}

const PASO_LABELS = ['Bebé', 'Servicio', 'Pago', 'Confirmar']

const LOCALES = [
  { id: 1, nombre: 'Villaflora (Sur)' },
  { id: 2, nombre: 'Florida (Norte)' },
]

// ─────────────────────────────────────────
// Pantalla de detalle de un bebé
// ─────────────────────────────────────────
function BebeDetalle({ bebe: bebeInicial, grupos, onBack, onSaved }) {
  const [bebe,        setBebe]        = useState({ ...bebeInicial })
  const [planes,      setPlanes]      = useState([])
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [clasesExtra, setClasesExtra] = useState('')
  const [planIdExtra, setPlanIdExtra] = useState(null)
  const [savingExtra, setSavingExtra] = useState(false)
  const [planIdFecha, setPlanIdFecha] = useState(null)
  const [nuevaFecha,  setNuevaFecha]  = useState('')
  const [savingFecha, setSavingFecha] = useState(false)

  useEffect(() => {
    planesAPI.listar({ bebe_id: bebeInicial.id })
      .then(r => setPlanes(r.data))
      .catch(console.error)
  }, [bebeInicial.id])

  async function handleGuardar() {
    setSaving(true)
    setMsg(null)
    try {
      await bebesAPI.actualizar(bebe.id, {
        nombre_completo:        bebe.nombre_completo,
        fecha_nacimiento:       bebe.fecha_nacimiento,
        nombre_tutor:           bebe.nombre_tutor,
        whatsapp_representante: bebe.whatsapp_representante,
        email_representante:    bebe.email_representante,
        grupo_id:               bebe.grupo_id || null,
      })
      setMsg({ type: 'ok', text: 'Datos actualizados correctamente' })
      onSaved()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  async function handleEditarFecha(planId) {
    if (!nuevaFecha) return
    setSavingFecha(true)
    setMsg(null)
    try {
      await planesAPI.editarFecha(planId, nuevaFecha)
      const fresh = await planesAPI.listar({ bebe_id: bebeInicial.id })
      setPlanes(fresh.data)
      setNuevaFecha('')
      setPlanIdFecha(null)
      setMsg({ type: 'ok', text: 'Fecha de inicio actualizada correctamente' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al actualizar fecha' })
    } finally {
      setSavingFecha(false)
    }
  }

  async function handleAgregarClases(planId) {
    if (!clasesExtra || parseInt(clasesExtra) < 1) return
    setSavingExtra(true)
    setMsg(null)
    try {
      await planesAPI.agregarClases(planId, parseInt(clasesExtra))
      const fresh = await planesAPI.listar({ bebe_id: bebeInicial.id })
      setPlanes(fresh.data)
      setClasesExtra('')
      setPlanIdExtra(null)
      setMsg({ type: 'ok', text: `${clasesExtra} clases agregadas correctamente` })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al agregar clases' })
    } finally {
      setSavingExtra(false)
    }
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
              <Badge color="green">{edadMeses(bebe.fecha_nacimiento)} meses</Badge>
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
        <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'1rem' }}>Planes</div>
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

                  {/* Editar fecha de inicio */}
                  {p.estado === 'activo' && (
                    planIdFecha === p.id ? (
                      <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', marginTop:'8px' }}>
                        <div style={{ flex:1 }}>
                          <Input label="Nueva fecha de inicio" type="date"
                            value={nuevaFecha}
                            onChange={e => setNuevaFecha(e.target.value)} />
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
                <span>Restantes: <strong style={{ color:'var(--brand-dark)' }}>{p.clases_restantes}
