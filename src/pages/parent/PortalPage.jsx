import { useEffect, useState } from 'react'
import { planesAPI, clasesAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Card, Badge, Spinner, Empty } from '../../components/ui'
import { fmtFecha, diasParaVencer, TIPO_CLASE_LABEL } from '../../utils'

export default function PortalPage() {
  const { user }   = useAuth()
  const [planes,   setPlanes]   = useState([])
  const [historial,setHistorial]= useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [pRes, hRes] = await Promise.all([
          planesAPI.listar({ bebe_id: user?.bebe_id }),
          clasesAPI.listar({ bebe_id: user?.bebe_id }),
        ])
        setPlanes(pRes.data)
        setHistorial(hRes.data)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [user])

  if (loading) return <Spinner />

  const planActivo = planes.find(p => p.estado === 'activo')
  const dias = planActivo ? diasParaVencer(planActivo.fecha_vencimiento) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {/* Saludo */}
      <div style={{ paddingTop:'0.5rem' }}>
        <h2 style={{ fontSize:'18px', fontWeight:600 }}>Hola, {user?.nombre} 👋</h2>
        <p style={{ color:'var(--gray-400)', fontSize:'13px', marginTop:'2px' }}>
          Aquí puedes ver el progreso de tu bebé
        </p>
      </div>

      {/* Plan activo */}
      {planActivo ? (
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:'15px' }}>{planActivo.servicio}</div>
              <div style={{ fontSize:'12px', color:'var(--gray-400)', marginTop:'2px' }}>Plan activo</div>
            </div>
            {dias !== null && (
              <Badge color={dias <= 0 ? 'red' : dias <= 5 ? 'warn' : 'green'}>
                {dias <= 0 ? 'Vencido' : dias <= 5 ? `Vence en ${dias} días` : 'Vigente'}
              </Badge>
            )}
          </div>

          {/* Clases restantes — visual */}
          <div style={{ textAlign:'center', margin:'1rem 0' }}>
            <div style={{ fontSize:'48px', fontWeight:700, color:'var(--brand-dark)', lineHeight:1 }}>
              {planActivo.clases_restantes}
            </div>
            <div style={{ fontSize:'13px', color:'var(--gray-400)', marginTop:'4px' }}>
              clases restantes de {planActivo.clases_total}
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{ height:'8px', background:'var(--gray-100)', borderRadius:'99px', overflow:'hidden', marginBottom:'1rem' }}>
            <div style={{
              height:'100%', borderRadius:'99px', background:'var(--brand)',
              width:`${Math.round((planActivo.clases_usadas / planActivo.clases_total) * 100)}%`,
              transition:'width .4s',
            }} />
          </div>

          {/* Fechas */}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--gray-400)' }}>
            <span>Inicio: {fmtFecha(planActivo.fecha_inicio)}</span>
            {planActivo.fecha_vencimiento && (
              <span>Vence: {fmtFecha(planActivo.fecha_vencimiento)}</span>
            )}
          </div>

          {/* Alerta vencimiento próximo */}
          {dias !== null && dias >= 0 && dias <= 5 && (
            <div style={{
              marginTop:'12px', background:'var(--warn-light)', color:'var(--warn)',
              borderRadius:'var(--radius-sm)', padding:'10px 12px', fontSize:'13px',
            }}>
              Tu plan vence pronto. Comunícate con el centro para renovar.
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <Empty message="No tienes un plan activo en este momento" />
        </Card>
      )}

      {/* Historial de asistencia */}
      <Card>
        <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'14px' }}>Historial de asistencia</div>
        {historial.length === 0 ? (
          <Empty message="Sin clases registradas aún" />
        ) : (
          historial.slice(0, 20).map(c => (
            <div key={c.id} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'9px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'13px',
            }}>
              <div>
                <div style={{ fontWeight:500 }}>{TIPO_CLASE_LABEL[c.tipo_clase] || c.tipo_clase}</div>
                <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>{fmtFecha(c.fecha)}</div>
              </div>
              <Badge color={c.estado === 'no_asistio' ? 'red' : 'green'}>
                {c.estado === 'no_asistio' ? 'No asistió' : 'Tomada'}
              </Badge>
            </div>
          ))
        )}
      </Card>

      {/* Contacto */}
      <div style={{
        background:'var(--brand-light)', borderRadius:'var(--radius-md)',
        padding:'14px 16px', fontSize:'13px', color:'var(--brand-dark)',
      }}>
        ¿Consultas? Escríbenos al WhatsApp del centro
      </div>
    </div>
  )
}
