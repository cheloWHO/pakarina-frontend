import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { planesAPI, finanzasAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Card, StatCard, Badge, Spinner, Btn } from '../../components/ui'
import { fmtFecha, fmtMoney, diasParaVencer } from '../../utils'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [planes,   setPlanes]   = useState([])
  const [resumen,  setResumen]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  const localId = user?.local_id
  const mesActual = new Date().toISOString().slice(0, 7) // YYYY-MM

  useEffect(() => {
    async function load() {
      try {
        const [pRes, fRes] = await Promise.all([
          planesAPI.listar({ local_id: localId, estado: 'activo' }),
          finanzasAPI.resumen({ local_id: localId, mes: mesActual }),
        ])
        setPlanes(pRes.data)
        setResumen(fRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [localId])

  if (loading) return <Spinner />

  const alertas       = planes.filter(p => p.alerta_vencimiento)
  const planesActivos = planes.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Buenos días</h2>
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginTop: '2px' }}>
          {user?.local_id === 1 ? 'Villaflora' : user?.local_id === 2 ? 'Florida' : 'Todos los locales'} —{' '}
          {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alertas de vencimiento */}
      {alertas.length > 0 && (
        <Card style={{ borderLeft: '4px solid var(--warn)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 600, marginBottom: '10px', color: 'var(--warn)', fontSize: '13px' }}>
            {alertas.length} plan{alertas.length > 1 ? 'es' : ''} por vencer pronto
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alertas.map(p => {
              const dias = diasParaVencer(p.fecha_vencimiento)
              return (
                <div key={p.plan_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--gray-100)',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{p.bebe}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                      {p.servicio} · {p.clases_restantes} clases restantes
                    </div>
                  </div>
                  <Badge color={dias <= 0 ? 'red' : 'warn'}>
                    {dias <= 0 ? 'Vencido' : `${dias} día${dias !== 1 ? 's' : ''}`}
                  </Badge>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Stats del mes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard
          label="Ingresos netos (mes)"
          value={fmtMoney(resumen?.total_ingresos)}
          color="green"
        />
        <StatCard
          label="Gastos (mes)"
          value={fmtMoney(resumen?.total_gastos)}
          color="red"
        />
        <StatCard
          label="Balance del mes"
          value={fmtMoney(resumen?.balance)}
          color={resumen?.balance >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Planes activos"
          value={planesActivos}
          sub="en este local"
        />
      </div>

      {/* Planes activos recientes */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Planes activos</h3>
          <Btn size="sm" variant="ghost" onClick={() => navigate('/admin/bebes')}>
            Ver bebés →
          </Btn>
        </div>
        {planes.length === 0 ? (
          <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Sin planes activos</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {planes.slice(0, 8).map(p => {
              const dias = diasParaVencer(p.fecha_vencimiento)
              return (
                <div key={p.plan_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--gray-100)',
                  cursor: 'pointer',
                }} onClick={() => navigate('/admin/clases')}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{p.bebe}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                      {p.servicio} · vence {fmtFecha(p.fecha_vencimiento)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                      {p.clases_restantes}/{p.clases_total} clases
                    </span>
                    {p.alerta_vencimiento ? (
                      <Badge color={dias <= 0 ? 'red' : 'warn'}>
                        {dias <= 0 ? 'Vencido' : `${dias}d`}
                      </Badge>
                    ) : (
                      <Badge color="green">Activo</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
