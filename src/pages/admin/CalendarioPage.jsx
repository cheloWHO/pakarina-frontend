import { useEffect, useState } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Card, Badge, Spinner } from '../../components/ui'
import { TIPO_CLASE_LABEL } from '../../utils'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function CalendarioPage() {
  const { user } = useAuth()
  const esGlobal = !user?.local_id
  const localId  = user?.local_id

  const hoy = new Date()
  const [mes,         setMes]         = useState(hoy.getMonth())
  const [anio,        setAnio]        = useState(hoy.getFullYear())
  const [filtroLocal, setFiltroLocal] = useState(localId || '')
  const [clases,      setClases]      = useState({})
  const [loading,     setLoading]     = useState(true)
  const [diaSelec,    setDiaSelec]    = useState(null)

  const mesStr = `${anio}-${String(mes + 1).padStart(2, '0')}`

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ mes: mesStr })
    if (filtroLocal) params.append('local_id', filtroLocal)
    api.get(`/api/calendario?${params}`)
      .then(r => setClases(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mesStr, filtroLocal])

  function navMes(dir) {
    setDiaSelec(null)
    if (dir === -1 && mes === 0) { setMes(11); setAnio(a => a - 1) }
    else if (dir === 1 && mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + dir)
  }

  // Construir grilla del mes
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  const clasesDelDia = diaSelec
    ? clases[`${anio}-${String(mes+1).padStart(2,'0')}-${String(diaSelec).padStart(2,'0')}`] || []
    : []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'900px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <h2 style={{ fontSize:'20px', fontWeight:600 }}>Calendario</h2>
          <p style={{ color:'var(--gray-400)', fontSize:'13px' }}>Clases registradas por día</p>
        </div>
        {esGlobal && (
          <select value={filtroLocal} onChange={e => { setFiltroLocal(e.target.value); setDiaSelec(null) }}
            style={{ height:'36px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'0 10px', fontSize:'13px' }}>
            <option value="">Todos</option>
            <option value="1">Villaflora</option>
            <option value="2">Florida</option>
          </select>
        )}
      </div>

      {/* Navegación mes */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <button onClick={() => navMes(-1)}
            style={{ background:'none', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'4px 12px', cursor:'pointer', fontSize:'16px' }}>
            ←
          </button>
          <div style={{ fontWeight:600, fontSize:'16px' }}>
            {MESES[mes]} {anio}
          </div>
          <button onClick={() => navMes(1)}
            style={{ background:'none', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'4px 12px', cursor:'pointer', fontSize:'16px' }}>
            →
          </button>
        </div>

        {/* Días de la semana */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginBottom:'4px' }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ textAlign:'center', fontSize:'11px', fontWeight:600, color:'var(--gray-400)', padding:'4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grilla */}
        {loading ? <Spinner /> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
            {celdas.map((dia, i) => {
              if (!dia) return <div key={`e-${i}`} />
              const fechaKey = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
              const clasesHoy = clases[fechaKey] || []
              const esHoy = dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear()
              const seleccionado = dia === diaSelec

              return (
                <div key={dia} onClick={() => setDiaSelec(dia === diaSelec ? null : dia)}
                  style={{
                    minHeight:'52px', borderRadius:'var(--radius-sm)', padding:'4px',
                    cursor:'pointer', textAlign:'center',
                    border: seleccionado ? '2px solid var(--brand)' : esHoy ? '2px solid var(--accent)' : '1px solid var(--gray-100)',
                    background: seleccionado ? 'var(--brand-light)' : esHoy ? 'var(--accent-light)' : clasesHoy.length > 0 ? '#fff' : 'var(--gray-50)',
                    transition:'all .15s',
                  }}>
                  <div style={{ fontSize:'12px', fontWeight: esHoy ? 700 : 500, color: esHoy ? 'var(--accent)' : 'var(--gray-900)', marginBottom:'2px' }}>
                    {dia}
                  </div>
                  {clasesHoy.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'2px', justifyContent:'center' }}>
                      <div style={{ background:'var(--brand)', borderRadius:'99px', padding:'1px 6px', fontSize:'10px', color:'#fff', fontWeight:600 }}>
                        {clasesHoy.length}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Detalle del día seleccionado */}
      {diaSelec && (
        <Card>
          <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'1rem' }}>
            {diaSelec} de {MESES[mes]} de {anio}
            <span style={{ fontWeight:400, fontSize:'12px', color:'var(--gray-400)', marginLeft:'8px' }}>
              {clasesDelDia.length} clase{clasesDelDia.length !== 1 ? 's' : ''}
            </span>
          </div>
          {clasesDelDia.length === 0 ? (
            <p style={{ color:'var(--gray-400)', fontSize:'13px' }}>Sin clases registradas este día</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {clasesDelDia.map(c => (
                <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontWeight:500, fontSize:'13px' }}>{c.bebe_nombre}</div>
                    <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' }}>
                      {TIPO_CLASE_LABEL[c.tipo_clase] || c.tipo_clase}
                      {c.local_id === 1 ? ' · Villaflora' : ' · Florida'}
                    </div>
                    {c.nota && (
                      <div style={{ fontSize:'11px', color:'var(--gray-600)', marginTop:'4px', fontStyle:'italic' }}>
                        {c.nota}
                      </div>
                    )}
                  </div>
                  <Badge color={c.estado === 'no_asistio' ? 'gray' : 'green'}>
                    {c.estado === 'no_asistio' ? 'No asistió' : 'Tomada'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
