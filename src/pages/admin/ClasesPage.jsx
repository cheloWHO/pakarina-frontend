import { useEffect, useState } from 'react'
import { planesAPI, clasesAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Card, Btn, Badge, Spinner, Alert, Empty, Input } from '../../components/ui'
import { fmtFecha, diasParaVencer, TIPO_CLASE_LABEL } from '../../utils'

const TIPOS = ['piso', 'hidroterapia', 'no_asistio']

export default function ClasesPage() {
  const { user }  = useAuth()
  const localId   = user?.local_id
  const [planes,  setPlanes]  = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(null)
  const [msg,     setMsg]     = useState(null)
  const [tipoSel,  setTipoSel]  = useState({})
  const [fechaSel, setFechaSel] = useState({})
  const [notaSel,  setNotaSel]  = useState({})
  const [showExtra, setShowExtra] = useState({})

  async function loadPlanes() {
    try {
      const res = await planesAPI.listar({ local_id: localId, estado: 'activo' })
      setPlanes(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadPlanes() }, [localId])

  async function marcar(plan) {
    const tipo  = tipoSel[plan.id]  || 'piso'
    const fecha = fechaSel[plan.id] || ''
    const nota  = notaSel[plan.id]  || ''
    setMarking(plan.id)
    setMsg(null)
    try {
      const res = await clasesAPI.marcar({
        plan_id:       plan.id,
        tipo_clase:    tipo,
        estado:        tipo === 'no_asistio' ? 'no_asistio' : 'tomada',
        fecha:         fecha || undefined,
        observaciones: nota  || undefined,
      })
      const d = res.data
      setMsg({
        type: 'ok',
        text: `Clase marcada. Quedan ${d.clases_restantes} clases.${d.estado_plan === 'completado' ? ' ¡Plan completado!' : ''}`,
      })
      setFechaSel(s => ({ ...s, [plan.id]: '' }))
      setNotaSel(s  => ({ ...s, [plan.id]: '' }))
      setShowExtra(s => ({ ...s, [plan.id]: false }))
      await loadPlanes()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al marcar clase' })
    } finally {
      setMarking(null)
    }
  }

  if (loading) return <Spinner />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'900px' }}>
      <div>
        <h2 style={{ fontSize:'20px', fontWeight:600 }}>Control de clases</h2>
        <p style={{ color:'var(--gray-400)', fontSize:'13px' }}>{planes.length} planes activos hoy</p>
      </div>

      {msg && (
        <Alert type={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</Alert>
      )}

      {planes.length === 0
        ? <Empty message="No hay planes activos en este local" />
        : planes.map(p => {
          const dias  = diasParaVencer(p.fecha_vencimiento)
          const tipo  = tipoSel[p.id]   || 'piso'
          const fecha = fechaSel[p.id]  || ''
          const nota  = notaSel[p.id]   || ''
          const extra = showExtra[p.id] || false
          const pct   = Math.round((p.clases_usadas / p.clases_total) * 100)

          return (
            <Card key={p.id}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'14px' }}>{p.bebe}</div>
                  <div style={{ fontSize:'12px', color:'var(--gray-400)', marginTop:'2px' }}>
                    {p.servicio} · {p.whatsapp}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                  {!!p.alerta_vencimiento && (
                    <Badge color={dias <= 0 ? 'red' : 'warn'}>
                      {dias <= 0 ? 'Vencido' : `${dias}d`}
                    </Badge>
                  )}
                  <Badge color="green">{p.clases_usadas} / {p.clases_total} clases</Badge>
                </div>
              </div>

              {/* Barra de progreso */}
              <div style={{ height:'6px', background:'var(--gray-100)', borderRadius:'99px', marginBottom:'12px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'var(--brand)', borderRadius:'99px', transition:'width .3s' }} />
              </div>

              {/* Selector de tipo + botón */}
              <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:'12px', color:'var(--gray-400)' }}>Tipo:</span>
                {TIPOS.map(t => (
                  <div key={t} onClick={() => setTipoSel(s => ({...s, [p.id]: t}))}
                    style={{
                      padding:'5px 12px', borderRadius:'var(--radius-sm)', cursor:'pointer',
                      fontSize:'12px', fontWeight: tipo === t ? 600 : 400,
                      border: tipo === t ? '2px solid var(--brand)' : '1px solid var(--gray-200)',
                      background: tipo === t ? 'var(--brand-light)' : '#fff',
                      color: tipo === t ? 'var(--brand-dark)' : 'var(--gray-600)',
                    }}>
                    {TIPO_CLASE_LABEL[t]}
                  </div>
                ))}
                <div style={{ marginLeft:'auto', display:'flex', gap:'8px', alignItems:'center' }}>
                  <Btn size="sm" variant="ghost"
                    onClick={() => setShowExtra(s => ({...s, [p.id]: !extra}))}>
                    {extra ? '▲ Menos' : '▼ Fecha / Nota'}
                  </Btn>
                  <Btn
                    onClick={() => marcar(p)}
                    loading={marking === p.id}
                    variant={tipo === 'no_asistio' ? 'secondary' : 'primary'}
                    disabled={dias !== null && dias < 0}
                  >
                    {tipo === 'no_asistio' ? 'Marcar inasistencia' : 'Marcar clase ✓'}
                  </Btn>
                </div>
              </div>

              {/* Fecha y nota — colapsables */}
              {extra && (
                <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'8px', padding:'12px', background:'var(--gray-100)', borderRadius:'var(--radius-sm)' }}>
                  <Input
                    label="Fecha de la clase (opcional — por defecto hoy)"
                    type="date"
                    value={fecha}
                    onChange={e => setFechaSel(s => ({...s, [p.id]: e.target.value}))}
                  />
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <label style={{ fontSize:'12px', color:'var(--gray-600)', fontWeight:500 }}>
                      Nota interna (solo admins — no visible para papás)
                    </label>
                    <textarea
                      value={nota}
                      onChange={e => setNotaSel(s => ({...s, [p.id]: e.target.value}))}
                      placeholder="Ej: Buen agarre, más relajada que la semana pasada..."
                      rows={3}
                      style={{
                        width:'100%', padding:'8px 10px', fontSize:'13px',
                        border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)',
                        resize:'vertical', fontFamily:'inherit', outline:'none',
                        background:'#fff', color:'var(--gray-900)', boxSizing:'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {dias !== null && (
                <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'8px' }}>
                  Vence: {fmtFecha(p.fecha_vencimiento)}
                </div>
              )}
            </Card>
          )
        })
      }
    </div>
  )
}
