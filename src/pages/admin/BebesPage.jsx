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

export default function BebesPage() {
  const { user }   = useAuth()
  const esGlobal   = !user?.local_id
  const localId    = user?.local_id

  const [bebes,    setBebes]    = useState([])
  const [grupos,   setGrupos]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [paso,     setPaso]     = useState(0)
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(null)
  const [formErr,  setFormErr]  = useState('')

  const [bebe, setBebe] = useState({
    nombre_completo:'', fecha_nacimiento:'', grupo_id:'',
    email_representante:'', whatsapp_representante:'', nombre_tutor:'',
    local_id_form: localId || '',
  })
  const [srvId,   setSrvId]   = useState(null)
  const [metodo,  setMetodo]  = useState('efectivo')
  const [ref,     setRef]     = useState('')

  useEffect(() => {
    async function load() {
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
    load()
  }, [localId])

  const srv = SERVICIOS.find(s => s.id === srvId)
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
      })

      setSuccess({
        email:    bRes.data.credenciales.email,
        password: bRes.data.credenciales.password,
        nombre:   bebe.nombre_completo,
        servicio: srv.nombre,
      })

      const fresh = await bebesAPI.listar(localId)
      setBebes(fresh.data)
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setBebe({
      nombre_completo:'', fecha_nacimiento:'', grupo_id:'',
      email_representante:'', whatsapp_representante:'', nombre_tutor:'',
      local_id_form: localId || '',
    })
    setSrvId(null); setMetodo('efectivo'); setRef(''); setPaso(0)
    setSuccess(null); setFormErr(''); setShowForm(false)
  }

  const paso0Valido = bebe.nombre_completo && bebe.fecha_nacimiento &&
    bebe.nombre_tutor && bebe.whatsapp_representante && bebe.email_representante &&
    (!esGlobal || bebe.local_id_form)

  if (loading) return <Spinner />

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
              <div style={{ fontWeight:600, color:'var(--brand-dark)', marginBottom:'4px' }}>
                {success.nombre} registrado
              </div>
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
                    <div style={{
                      width:'26px', height:'26px', borderRadius:'50%', margin:'0 auto 4px',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', fontWeight:600,
                      background: i < paso ? 'var(--brand)' : i === paso ? 'var(--accent)' : 'var(--gray-100)',
                      color: i <= paso ? '#fff' : 'var(--gray-400)',
                    }}>{i < paso ? '✓' : i + 1}</div>
                    <div style={{ fontSize:'11px', color: i === paso ? 'var(--gray-900)' : 'var(--gray-400)', fontWeight: i === paso ? 500 : 400 }}>{l}</div>
                  </div>
                ))}
              </div>

              {paso === 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <Input label="Nombre completo del bebé" value={bebe.nombre_completo}
                        onChange={e => setBebe(b => ({...b, nombre_completo: e.target.value}))}
                        placeholder="Valentina Juárez" required />
                    </div>
                    <Input label="Fecha de nacimiento" type="date" value={bebe.fecha_nacimiento}
                      onChange={e => setBebe(b => ({...b, fecha_nacimiento: e.target.value}))} required />
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'12px', color:'var(--gray-600)', fontWeight:500 }}>Edad</label>
                      <div style={{ height:'38px', display:'flex', alignItems:'center' }}>
                        {bebe.fecha_nacimiento
                          ? <Badge color="green">{edadMeses(bebe.fecha_nacimiento)} meses</Badge>
                          : <span style={{ color:'var(--gray-400)', fontSize:'13px' }}>— meses</span>}
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
                      <Select label="Grupo (opcional)"
                        value={bebe.grupo_id} onChange={e => setBebe(b => ({...b, grupo_id: e.target.value}))}>
                        <option value="">Sin asignar</option>
                        {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                      </Select>
                    </div>
                  </div>
                  <hr style={{ border:'none', borderTop:'1px solid var(--gray-100)' }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    <Input label="Nombre del tutor/a" value={bebe.nombre_tutor}
                      onChange={e => setBebe(b => ({...b, nombre_tutor: e.target.value}))}
                      placeholder="María Gómez" required />
                    <Input label="WhatsApp" value={bebe.whatsapp_representante}
                      onChange={e => setBebe(b => ({...b, whatsapp_representante: e.target.value}))}
                      placeholder="+593 9..." required />
                    <div style={{ gridColumn:'1/-1' }}>
                      <Input label="Email" type="email" value={bebe.email_representante}
                        onChange={e => setBebe(b => ({...b, email_representante: e.target.value}))}
                        placeholder="mama@email.com" required />
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
                        style={{
                          border: srvId === s.id ? '2px solid var(--accent)' : '1px solid var(--gray-200)',
                          background: srvId === s.id ? 'var(--accent-light)' : '#fff',
                          borderRadius:'var(--radius-md)', padding:'10px 8px', cursor:'pointer',
                        }}>
                        <div style={{ fontSize:'12px', fontWeight:600 }}>{s.nombre}</div>
                        <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' }}>
                          {s.clases} clase{s.clases>1?'s':''} · {s.vigencia ? s.vigencia+' días' : 'sin vigencia'}
                        </div>
                        <div style={{ fontSize:'14px', fontWeight:600, color:'var(--accent)', marginTop:'4px' }}>
                          ${s.precio.toFixed(2)}
                        </div>
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
                        style={{
                          border: metodo === key ? '2px solid var(--accent)' : '1px solid var(--gray-200)',
                          background: metodo === key ? 'var(--accent-light)' : '#fff',
                          borderRadius:'var(--radius-sm)', padding:'7px 14px',
                          fontSize:'12px', cursor:'pointer', fontWeight: metodo === key ? 600 : 400,
                          color: metodo === key ? 'var(--accent)' : 'var(--gray-600)',
                        }}>
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
                  <Input label="Referencia (opcional)" placeholder="TRF-001" value={ref} onChange={e => setRef(e.target.value)} />
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
                      ['Bebé',      bebe.nombre_completo],
                      ['Tutor/a',   bebe.nombre_tutor],
                      ['WhatsApp',  bebe.whatsapp_representante],
                      ['Sucursal',  esGlobal ? LOCALES.find(l => l.id === parseInt(bebe.local_id_form))?.nombre : (localId === 1 ? 'Villaflora' : 'Florida')],
                      ['Servicio',  srv?.nombre],
                      ['Clases',    srv?.clases + ' clases'],
                      ['Vigencia',  srv?.vigencia ? srv.vigencia + ' días' : 'Sin vigencia'],
                      ['Método',    METODO_LABEL[metodo]],
                      ['Cobrado',   '$' + srv?.precio.toFixed(2)],
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
            <div key={b.id} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'10px 0', borderBottom:'1px solid var(--gray-100)',
            }}>
              <div>
                <div style={{ fontWeight:500, fontSize:'13px' }}>{b.nombre_completo}</div>
                <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>
                  {b.edad_meses} meses · {b.nombre_tutor} · {b.whatsapp_representante}
                </div>
              </div>
              {b.grupo_nombre
                ? <Badge color="purple">{b.grupo_nombre}</Badge>
                : <Badge color="gray">Sin grupo</Badge>}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
