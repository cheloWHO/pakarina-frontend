import { useEffect, useState } from 'react'
import { bebesAPI, planesAPI, gruposAPI, clasesAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Card, Btn, Input, Select, Badge, Spinner, Alert, Empty } from '../../components/ui'
import { fmtFecha, edadMeses, METODO_LABEL, TIPO_CLASE_LABEL } from '../../utils'

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
  const [clases,      setClases]      = useState([])
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [clasesExtra, setClasesExtra] = useState('')
  const [planIdExtra, setPlanIdExtra] = useState(null)
  const [savingExtra, setSavingExtra] = useState(false)
  const [planIdFecha, setPlanIdFecha] = useState(null)
  const [nuevaFecha,  setNuevaFecha]  = useState('')
  const [savingFecha, setSavingFecha] = useState(false)
  const [editandoNota, setEditandoNota] = useState(null)
  const [textoNota,    setTextoNota]    = useState('')
  const [savingNota,   setSavingNota]   = useState(false)

  useEffect(() => {
    planesAPI.listar({ bebe_id: bebeInicial.id })
      .then(r => setPlanes(r.data))
      .catch(console.error)
    clasesAPI.listar({ bebe_id: bebeInicial.id })
      .then(r => setClases(r.data))
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
        local_id:               bebe.local_id,
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

  async function handleGuardarNota(claseId) {
    setSavingNota(true)
    setMsg(null)
    try {
      await clasesAPI.editarNota(claseId, textoNota)
      const fresh = await clasesAPI.listar({ bebe_id: bebeInicial.id })
      setClases(fresh.data)
      setEditandoNota(null)
      setTextoNota('')
      setMsg({ type: 'ok', text: 'Nota guardada correctamente' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al guardar nota' })
    } finally {
      setSavingNota(false)
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
                <span>Restantes: <strong style={{ color:'var(--brand-dark)' }}>{p.clases_restantes}</strong></span>
              </div>
              {p.estado === 'activo' && (
                planIdExtra === p.id ? (
                  <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
                    <div style={{ flex:1 }}>
                      <Input label="Clases extra a agregar" type="number" min="1"
                        value={clasesExtra}
                        onChange={e => setClasesExtra(e.target.value)}
                        placeholder="Ej. 1" />
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
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    <textarea
                      value={textoNota}
                      onChange={e => setTextoNota(e.target.value)}
                      rows={3}
                      style={{
                        width:'100%', padding:'6px 8px', fontSize:'12px',
                        border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)',
                        resize:'vertical', fontFamily:'inherit', outline:'none',
                        background:'#fff', color:'var(--gray-900)', boxSizing:'border-box',
                      }}
                    />
                    <div style={{ display:'flex', gap:'6px' }}>
                      <Btn size="sm" onClick={() => handleGuardarNota(c.id)} loading={savingNota}>Guardar</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => { setEditandoNota(null); setTextoNota('') }}>Cancelar</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                    <span style={{ fontSize:'12px', color: c.observaciones ? 'var(--gray-900)' : 'var(--gray-400)', flex:1, lineHeight:'1.5' }}>
                      {c.observaciones || 'Sin nota'}
                    </span>
                    <Btn size="sm" variant="ghost"
                      onClick={() => { setEditandoNota(c.id); setTextoNota(c.observaciones || '') }}
                      style={{ fontSize:'11px', padding:'2px 6px', whiteSpace:'nowrap', flexShrink:0 }}>
                      ✏️
                    </Btn>
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

// ─────────────────────────────────────────
// Página principal de Bebés
// ─────────────────────────────────────────
export default function BebesPage() {
  const { user }   = useAuth()
  const esGlobal   = !user?.local_id
  const localId    = user?.local_id

  const [bebes,       setBebes]       = useState([])
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
  }

  useEffect(() => { loadBebes() }, [localId])

  const srv      = SERVICIOS.find(s => s.id === srvId)
  const comision = metodo === 'tarjeta' && srv ? parseFloat((srv.precio * 0.06).toFixed(2)) : 0
  const neto     = srv ? parseFloat((srv.precio - comision).toFixed(2)) : 0
  const localIdFinal = esGlobal ? parseInt(bebe.local_id_form) : localId

  async function handleRegistrar() {
    setSaving(true)
    setFormErr('')
    try {
      const bRes = await bebesAPI.crear({
        ...bebe,
        local_id: localIdFinal,
        grupo_id: bebe.grupo_id || null,
      })
      const bebeId = bRes.data.bebe_id
      await planesAPI.registrarPago({
        local_id:      localIdFinal,
        bebe_id:       bebeId,
        servicio_id:   srvId,
        metodo_pago:   metodo,
        banco_destino: BANCO_POR_METODO[metodo],
        referencia:    ref || null,
        fecha_inicio:  fechaInicio || null,
      })
      setSuccess({
        email:    bRes.data.credenciales.email,
        password: bRes.data.credenciales.password,
        nombre:   bebe.nombre_completo,
        servicio: srv.nombre,
      })
      loadBebes()
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setBebe({ nombre_completo:'', fecha_nacimiento:'', grupo_id:'', email_representante:'', whatsapp_representante:'', nombre_tutor:'', local_id_form: localId || '' })
    setSrvId(null); setMetodo('efectivo'); setRef(''); setFechaInicio(''); setPaso(0)
    setSuccess(null); setFormErr(''); setShowForm(false)
  }

  const paso0Valido = bebe.nombre_completo && bebe.fecha_nacimiento &&
    bebe.nombre_tutor && bebe.whatsapp_representante && bebe.email_representante &&
    (!esGlobal || bebe.local_id_form)

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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:'20px', fontWeight:600 }}>Bebés</h2>
          <p style={{ color:'var(--gray-400)', fontSize:'13px' }}>{bebes.length} registrados</p>
        </div>
        <Btn onClick={() => { setShowForm(true); setSuccess(null) }}>+ Registrar bebé</Btn>
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
                    <Input label="Fecha de nacimiento" type="date" value={bebe.fecha_nacimiento}
                      onChange={e => setBebe(b => ({...b, fecha_nacimiento: e.target.value}))} required />
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'12px', color:'var(--gray-600)', fontWeight:500 }}>Edad</label>
                      <div style={{ height:'38px', display:'flex', alignItems:'center' }}>
                        {bebe.fecha_nacimiento ? <Badge color="green">{edadMeses(bebe.fecha_nacimiento)} meses</Badge> : <span style={{ color:'var(--gray-400)', fontSize:'13px' }}>— meses</span>}
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
                      <div key={s.id} onClick={() => setSrvId(s.id)}
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
                  <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'3px 0', color:'var(--gray-600)' }}>
                      <span>Monto cobrado al cliente</span><span>${srv?.precio.toFixed(2)}</span>
                    </div>
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
                      ['Cobrado',     '$' + srv?.precio.toFixed(2)],
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

      <Card>
        {bebes.length === 0 ? <Empty message="Sin bebés registrados" /> : (
          bebes.map(b => (
            <div key={b.id} onClick={() => setBebeDetalle(b)}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--gray-100)', cursor:'pointer' }}>
              <div>
                <div style={{ fontWeight:500, fontSize:'13px' }}>{b.nombre_completo}</div>
                <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>
                  {b.edad_meses} meses · {b.nombre_tutor} · {b.whatsapp_representante} · {b.local_id === 1 ? 'Villaflora' : 'Florida'}
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
