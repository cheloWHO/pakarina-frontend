import { useEffect, useState } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Card, Btn, Input, Select, Badge, Spinner, Alert, Empty } from '../../components/ui'
import { fmtMoney } from '../../utils'

const UBICACIONES = ['bodega', 'villaflora', 'florida']
const UBICACION_LABEL = { bodega:'Bodega central', villaflora:'Villaflora', florida:'Florida' }

export default function InventarioPage() {
  const { user }    = useAuth()
  const [stock,     setStock]     = useState([])
  const [productos, setProductos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [msg,       setMsg]       = useState(null)
  const [showMov,   setShowMov]   = useState(false)
  const [saving,    setSaving]    = useState(false)

  const [mov, setMov] = useState({
    producto_id: '', tipo: 'entrada_proveedor',
    cantidad: '', local_origen_id: '', local_destino_id: '', nota: '',
  })

  async function load() {
    try {
      const [sRes, pRes] = await Promise.all([
        api.get('/api/inventario/stock'),
        api.get('/api/inventario/productos'),
      ])
      setStock(sRes.data)
      setProductos(pRes.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleMov(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await api.post('/api/inventario/movimientos', {
        ...mov,
        usuario_id:       user.id,
        producto_id:      parseInt(mov.producto_id),
        cantidad:         parseInt(mov.cantidad),
        local_origen_id:  mov.local_origen_id  ? parseInt(mov.local_origen_id)  : null,
        local_destino_id: mov.local_destino_id ? parseInt(mov.local_destino_id) : null,
      })
      setMsg({ type:'ok', text:'Movimiento registrado correctamente' })
      setShowMov(false)
      setMov({ producto_id:'', tipo:'entrada_proveedor', cantidad:'', local_origen_id:'', local_destino_id:'', nota:'' })
      load()
    } catch(e) {
      setMsg({ type:'error', text: e.response?.data?.error || 'Error al registrar movimiento' })
    } finally { setSaving(false) }
  }

  // Agrupar stock por producto
  const stockPorProducto = productos.map(p => ({
    ...p,
    ubicaciones: UBICACIONES.map(u => {
      const s = stock.find(s => s.producto_id === p.id && s.ubicacion === u)
      return { ubicacion: u, cantidad: s?.cantidad ?? 0 }
    }),
  }))

  if (loading) return <Spinner />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'900px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:'20px', fontWeight:600 }}>Inventario</h2>
          <p style={{ color:'var(--gray-400)', fontSize:'13px' }}>Flujo: Proveedor → Bodega → Villaflora / Florida</p>
        </div>
        <Btn onClick={() => setShowMov(s => !s)}>+ Movimiento</Btn>
      </div>

      {msg && <Alert type={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</Alert>}

      {/* Formulario movimiento */}
      {showMov && (
        <Card>
          <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'14px' }}>Registrar movimiento</div>
          <form onSubmit={handleMov} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <Select label="Producto" required value={mov.producto_id}
                onChange={e => setMov(m => ({...m, producto_id: e.target.value}))}>
                <option value="">Seleccionar…</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
              <Select label="Tipo de movimiento" value={mov.tipo}
                onChange={e => setMov(m => ({...m, tipo: e.target.value}))}>
                <option value="entrada_proveedor">Entrada de proveedor → Bodega</option>
                <option value="transferencia">Transferencia Bodega → Local</option>
                <option value="ajuste">Ajuste de stock</option>
              </Select>
              <Input label="Cantidad" type="number" min="1" required
                value={mov.cantidad} onChange={e => setMov(m => ({...m, cantidad: e.target.value}))} />
              {mov.tipo === 'transferencia' && (
                <Select label="Destino" value={mov.local_destino_id}
                  onChange={e => setMov(m => ({...m, local_destino_id: e.target.value}))}>
                  <option value="">Seleccionar local…</option>
                  <option value="1">Villaflora</option>
                  <option value="2">Florida</option>
                </Select>
              )}
              <div style={{ gridColumn:'1/-1' }}>
                <Input label="Nota (opcional)" value={mov.nota}
                  onChange={e => setMov(m => ({...m, nota: e.target.value}))} placeholder="Ej. Compra mensual flotadores" />
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <Btn type="button" variant="ghost" onClick={() => setShowMov(false)}>Cancelar</Btn>
              <Btn type="submit" loading={saving}>Registrar</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Tabla de stock */}
      <Card>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--gray-100)' }}>
                <th style={{ textAlign:'left', padding:'8px 0', fontWeight:600, color:'var(--gray-600)' }}>Producto</th>
                <th style={{ textAlign:'center', padding:'8px', fontWeight:600, color:'var(--gray-600)' }}>Precio</th>
                {UBICACIONES.map(u => (
                  <th key={u} style={{ textAlign:'center', padding:'8px', fontWeight:600, color:'var(--gray-600)' }}>
                    {UBICACION_LABEL[u]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stockPorProducto.length === 0
                ? <tr><td colSpan="6" style={{ textAlign:'center', padding:'2rem', color:'var(--gray-400)' }}>Sin productos</td></tr>
                : stockPorProducto.map(p => (
                  <tr key={p.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                    <td style={{ padding:'10px 0', fontWeight:500 }}>{p.nombre}</td>
                    <td style={{ textAlign:'center', color:'var(--gray-400)' }}>{fmtMoney(p.precio_venta)}</td>
                    {p.ubicaciones.map(u => {
                      const bajo = u.cantidad <= p.stock_minimo
                      return (
                        <td key={u.ubicacion} style={{ textAlign:'center', padding:'10px 8px' }}>
                          <Badge color={bajo ? 'red' : u.cantidad === 0 ? 'gray' : 'green'}>
                            {u.cantidad}
                          </Badge>
                          {bajo && <div style={{ fontSize:'10px', color:'var(--danger)', marginTop:'2px' }}>mín. {p.stock_minimo}</div>}
                        </td>
                      )
                    })}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
