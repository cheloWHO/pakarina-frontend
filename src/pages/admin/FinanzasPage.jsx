import { useEffect, useState } from 'react'
import { finanzasAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Card, StatCard, Btn, Input, Select, Alert, Spinner } from '../../components/ui'
import { fmtMoney, fmtFecha, METODO_LABEL } from '../../utils'

const CATEGORIAS = ['nomina','arriendo','servicios','insumos','comision_bancaria','proveedor','marketing','otro']
const BANCOS = ['produbanco','pichincha','efectivo','payphone']
const BANCO_LABEL = { produbanco:'Produbanco', pichincha:'Pichincha', efectivo:'Efectivo', payphone:'Payphone' }
const LOCALES = [{ id:'', nombre:'Todos (Global)' }, { id:'1', nombre:'Villaflora' }, { id:'2', nombre:'Florida' }]

export default function FinanzasPage() {
  const { user }   = useAuth()
  const esGlobal   = !user?.local_id
  const localId    = user?.local_id
  const mesActual  = new Date().toISOString().slice(0, 7)

  const [vistaFecha, setVistaFecha] = useState('mes')
  const [mes,        setMes]        = useState(mesActual)
  const [anio,       setAnio]       = useState(new Date().getFullYear().toString())
  const [filtroLocal, setFiltroLocal] = useState(localId || '')
  const [resumen,   setResumen]  = useState(null)
  const [gastos,    setGastos]   = useState([])
  const [loading,   setLoading]  = useState(true)
  const [showForm,  setShowForm] = useState(false)
  const [saving,    setSaving]   = useState(false)
  const [formMsg,   setFormMsg]  = useState(null)

  const [gasto, setGasto] = useState({
    monto:'', categoria:'arriendo', descripcion:'',
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago_salida: 'produbanco',
    local_id_form: localId || '',
  })

  async function load() {
    setLoading(true)
    try {
      const filtroMes  = vistaFecha === 'mes'  ? mes  : undefined
      const filtroAnio = vistaFecha === 'anio' ? anio : undefined
      const [rRes, gRes] = await Promise.all([
        finanzasAPI.resumen({ local_id: filtroLocal || undefined, mes: filtroMes, anio: filtroAnio }),
        finanzasAPI.listarGastos({ local_id: filtroLocal || undefined, mes: filtroMes, anio: filtroAnio }),
      ])
      setResumen(rRes.data)
      setGastos(gRes.data)
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filtroLocal, mes, anio, vistaFecha])

  async function handleGasto(e) {
    e.preventDefault()
    setSaving(true); setFormMsg(null)
    const local_id_final = esGlobal
      ? (gasto.local_id_form === 'global' ? null : parseInt(gasto.local_id_form))
      : localId
    if (esGlobal && !gasto.local_id_form) {
      setFormMsg({ type:'error', text:'Debes seleccionar una sucursal' })
      setSaving(false)
    return
    }
    try {
      await finanzasAPI.registrarGasto({ ...gasto, local_id: local_id_final })
      setFormMsg({ type:'ok', text:'Gasto registrado correctamente' })
      setShowForm(false)
      setGasto({ monto:'', categoria:'arriendo', descripcion:'', fecha: new Date().toISOString().split('T')[0], metodo_pago_salida:'produbanco', local_id_form: localId || '' })
      load()
    } catch(e) {
      setFormMsg({ type:'error', text: e.response?.data?.error || 'Error al guardar' })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'900px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'10px' }}>
      <div>
        <h2 style={{ fontSize:'20px', fontWeight:600 }}>Finanzas</h2>
      </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>          {esGlobal && (
            <select value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)}
              style={{ height:'36px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'0 10px', fontSize:'13px' }}>
              {LOCALES.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          )}
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
  <div style={{ display:'flex', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', overflow:'hidden' }}>
    {[['mes','Mes'],['anio','Año']].map(([k,l]) => (
      <div key={k} onClick={() => setVistaFecha(k)}
        style={{ padding:'0 12px', height:'36px', display:'flex', alignItems:'center', cursor:'pointer', fontSize:'12px', fontWeight: vistaFecha===k ? 600 : 400, background: vistaFecha===k ? 'var(--brand)' : '#fff', color: vistaFecha===k ? '#fff' : 'var(--gray-600)' }}>
        {l}
      </div>
    ))}
  </div>
  {vistaFecha === 'mes'
    ? <input type="month" value={mes} onChange={e => setMes(e.target.value)}
        style={{ height:'36px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'0 10px', fontSize:'13px' }} />
    : <input type="number" value={anio} min="2024" max="2030"
        onChange={e => setAnio(e.target.value)}
        style={{ height:'36px', width:'80px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', padding:'0 10px', fontSize:'13px' }} />
  }
</div>
          <Btn onClick={() => setShowForm(s => !s)}>+ Gasto</Btn>
        </div>
      </div>

      {formMsg && <Alert type={formMsg.type === 'ok' ? 'ok' : 'error'}>{formMsg.text}</Alert>}

      {showForm && (
        <Card>
          <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'14px' }}>Registrar gasto</div>
          <form onSubmit={handleGasto} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
             <Input label="Monto ($)" type="text" inputMode="decimal" required
                value={gasto.monto} placeholder="0.00"
                 onChange={e => setGasto(g => ({...g, monto: e.target.value.replace(',', '.')}))} />
              <Input label="Fecha" type="date" value={gasto.fecha}
                onChange={e => setGasto(g => ({...g, fecha: e.target.value}))} />
              <Select label="Categoría" value={gasto.categoria}
                onChange={e => setGasto(g => ({...g, categoria: e.target.value}))}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
              </Select>
              <Select label="Banco de salida" value={gasto.metodo_pago_salida}
                onChange={e => setGasto(g => ({...g, metodo_pago_salida: e.target.value}))}>
                {BANCOS.map(b => <option key={b} value={b}>{BANCO_LABEL[b]}</option>)}
              </Select>
              {esGlobal && (
                <Select label="Sucursal *" required value={gasto.local_id_form}
                  onChange={e => setGasto(g => ({...g, local_id_form: e.target.value}))}>
                  <option value="">Seleccionar sucursal…</option>
                  <option value="1">Villaflora</option>
                  <option value="2">Florida</option>
                  <option value="global">Global (ambas sucursales)</option>
                  </Select>
              )}
              <div style={{ gridColumn:'1/-1' }}>
                <Input label="Descripción" value={gasto.descripcion}
                  onChange={e => setGasto(g => ({...g, descripcion: e.target.value}))}
                  placeholder="Ej. Arriendo mayo Villaflora" />
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <Btn type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Btn>
              <Btn type="submit" loading={saving}>Guardar gasto</Btn>
            </div>
          </form>
        </Card>
      )}

      {loading ? <Spinner /> : (
        <>
          {/* Label de vista actual */}
          {esGlobal && (
            <div style={{ fontSize:'12px', color:'var(--gray-400)' }}>
              Mostrando: <strong>{LOCALES.find(l => l.id === filtroLocal)?.nombre || 'Todos'}</strong> · {mes}
            </div>
          )}

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px' }}>
            <StatCard label="Ingresos netos" value={fmtMoney(resumen?.total_ingresos)} color="green" />
            <StatCard label="Gastos" value={fmtMoney(resumen?.total_gastos)} color="red" />
            <StatCard label="Balance" value={fmtMoney(resumen?.balance)} color={resumen?.balance >= 0 ? 'green' : 'red'} />
          </div>

        {/* Ingresos por planes */}
{resumen?.detalle_planes?.length > 0 && (
  <Card>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
      <div style={{ fontWeight:600, fontSize:'14px' }}>Ingresos por planes</div>
      <div style={{ fontWeight:600, fontSize:'13px', color:'var(--brand-dark)' }}>{fmtMoney(resumen.total_planes)}</div>
    </div>
    {resumen.detalle_planes.map((r, i) => (
      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'13px' }}>
        <div>
          <div style={{ fontWeight:500 }}>{BANCO_LABEL[r.banco_destino] || r.banco_destino}</div>
          <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>{r.num_cobros} cobros · {r.metodo_pago}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontWeight:600, color:'var(--brand-dark)' }}>{fmtMoney(r.total_neto)}</div>
          {parseFloat(r.total_comisiones) > 0 &&
            <div style={{ fontSize:'11px', color:'var(--warn)' }}>-{fmtMoney(r.total_comisiones)} com.</div>}
        </div>
      </div>
    ))}
  </Card>
)}

{/* Ingresos por productos */}
{resumen?.detalle_productos?.length > 0 && (
  <Card>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
      <div style={{ fontWeight:600, fontSize:'14px' }}>Ingresos por productos</div>
      <div style={{ fontWeight:600, fontSize:'13px', color:'var(--brand-dark)' }}>{fmtMoney(resumen.total_productos)}</div>
    </div>
    {resumen.detalle_productos.map((r, i) => (
      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'13px' }}>
        <div>
          <div style={{ fontWeight:500 }}>{METODO_LABEL[r.metodo_pago] || r.metodo_pago}</div>
          <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>{r.num_ventas} ventas</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontWeight:600, color:'var(--brand-dark)' }}>{fmtMoney(r.total_neto)}</div>
          {parseFloat(r.total_comisiones) > 0 &&
            <div style={{ fontSize:'11px', color:'var(--warn)' }}>-{fmtMoney(r.total_comisiones)} com.</div>}
        </div>
      </div>
    ))}
  </Card>
)}
          {/* Gastos */}
          <Card>
            <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'14px' }}>Gastos del mes</div>
            {gastos.length === 0
              ? <div style={{ color:'var(--gray-400)', fontSize:'13px' }}>Sin gastos registrados</div>
              : gastos.map(g => (
                <div key={g.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'13px' }}>
                  <div>
                    <div style={{ fontWeight:500 }}>{g.descripcion || g.categoria}</div>
                    <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>
                      {fmtFecha(g.fecha)} · {g.categoria} · {BANCO_LABEL[g.metodo_pago_salida] || '—'}
                      {esGlobal && g.local ? ` · ${g.local}` : ''}
                      {g.es_automatico ? ' · automático' : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight:600, color:'var(--danger)' }}>{fmtMoney(g.monto)}</div>
                </div>
              ))
            }
          </Card>
        </>
      )}
    </div>
  )
}
