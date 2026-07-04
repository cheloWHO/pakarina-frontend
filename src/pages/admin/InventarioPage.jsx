import { useEffect, useState } from 'react'
import api from '../../api/client'
import { bebesAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Card, Btn, Input, Select, Badge, Spinner, Alert, Empty } from '../../components/ui'
import { fmtMoney, fmtFecha, METODO_LABEL } from '../../utils'

const UBICACIONES = ['bodega', 'villaflora', 'florida']
const UBICACION_LABEL = { bodega:'Bodega central', villaflora:'Villaflora', florida:'Florida' }

const VENTA_INICIAL = {
  producto_id:'', cantidad:'1', metodo_pago:'efectivo',
  local_id:'', tipo_cliente:'bebe',
  bebe_id:'',
  cliente_nombre:'', cliente_telefono:'', cliente_email:'', cliente_cedula:'',
  descuento:'0',
}

const PRODUCTO_INICIAL = {
  nombre:'', precio_venta:'', stock_minimo:'2',
  sku:'', descripcion:'', color:'', foto_url:'', precio_unitario:'',
}

export default function InventarioPage() {
  const { user }     = useAuth()
  const esGlobal     = !user?.local_id
  const localId      = user?.local_id

  const [stock,      setStock]      = useState([])
  const [productos,  setProductos]  = useState([])
  const [bebes,      setBebes]      = useState([])
  const [ventas,     setVentas]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [msg,        setMsg]        = useState(null)
  const [saving,     setSaving]     = useState(false)

  const [vista,      setVista]      = useState('stock')
  const [showMov,    setShowMov]    = useState(false)
  const [showVenta,  setShowVenta]  = useState(false)
  const [showProd,   setShowProd]   = useState(false)
  const [editProd,   setEditProd]   = useState(null)

  const [mov, setMov] = useState({
    producto_id:'', tipo:'entrada_proveedor',
    cantidad:'', local_destino_id:'', nota:'',
  })
  const [venta,     setVenta]     = useState(VENTA_INICIAL)
  const [nuevoProd, setNuevoProd] = useState(PRODUCTO_INICIAL)

  async function load() {
    try {
      const [sRes, pRes, bRes, vRes] = await Promise.all([
        api.get('/api/inventario/stock'),
        api.get('/api/inventario/productos'),
        bebesAPI.listar(localId),
        api.get('/api/inventario/ventas', { params: { local_id: localId } }),
      ])
      setStock(sRes.data)
      setProductos(pRes.data)
      setBebes(bRes.data)
      setVentas(vRes.data)
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
        producto_id:      parseInt(mov.producto_id),
        cantidad:         parseInt(mov.cantidad),
        local_destino_id: mov.local_destino_id ? parseInt(mov.local_destino_id) : null,
      })
      setMsg({ type:'ok', text:'Movimiento registrado correctamente' })
      setShowMov(false)
      setMov({ producto_id:'', tipo:'entrada_proveedor', cantidad:'', local_destino_id:'', nota:'' })
      load()
    } catch(e) {
      setMsg({ type:'error', text: e.response?.data?.error || 'Error al registrar movimiento' })
    } finally { setSaving(false) }
  }

  async function handleVenta(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      const local_id_final = esGlobal ? parseInt(venta.local_id) : localId
      await api.post('/api/inventario/ventas', {
        local_id:         local_id_final,
        producto_id:      parseInt(venta.producto_id),
        cantidad:         parseInt(venta.cantidad),
        metodo_pago:      venta.metodo_pago,
        descuento:        parseFloat(venta.descuento || 0),
        bebe_id:          venta.tipo_cliente === 'bebe' && venta.bebe_id ? parseInt(venta.bebe_id) : null,
        cliente_nombre:   venta.tipo_cliente === 'externo' ? venta.cliente_nombre   : null,
        cliente_telefono: venta.tipo_cliente === 'externo' ? venta.cliente_telefono : null,
        cliente_email:    venta.tipo_cliente === 'externo' ? venta.cliente_email    : null,
        cliente_cedula:   venta.tipo_cliente === 'externo' ? venta.cliente_cedula   : null,
      })
      setMsg({ type:'ok', text:'Venta registrada correctamente' })
      setShowVenta(false)
      setVenta(VENTA_INICIAL)
      load()
    } catch(e) {
      setMsg({ type:'error', text: e.response?.data?.error || 'Error al registrar venta' })
    } finally { setSaving(false) }
  }

  async function handleCrearProducto(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await api.post('/api/inventario/productos', {
        nombre:          nuevoProd.nombre,
        precio_venta:    parseFloat(nuevoProd.precio_venta),
        stock_minimo:    parseInt(nuevoProd.stock_minimo),
        sku:             nuevoProd.sku || null,
        descripcion:     nuevoProd.descripcion || null,
        color:           nuevoProd.color || null,
        foto_url:        nuevoProd.foto_url || null,
        precio_unitario: nuevoProd.precio_unitario ? parseFloat(nuevoProd.precio_unitario) : null,
      })
      setMsg({ type:'ok', text:'Producto creado correctamente' })
      setShowProd(false)
      setNuevoProd(PRODUCTO_INICIAL)
      load()
    } catch(e) {
      setMsg({ type:'error', text: e.response?.data?.error || 'Error al crear producto' })
    } finally { setSaving(false) }
  }

  async function handleEditarProducto(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await api.patch(`/api/inventario/productos/${editProd.id}`, {
        nombre:          editProd.nombre,
        precio_venta:    parseFloat(editProd.precio_venta),
        stock_minimo:    parseInt(editProd.stock_minimo),
        sku:             editProd.sku || null,
        descripcion:     editProd.descripcion || null,
        color:           editProd.color || null,
        foto_url:        editProd.foto_url || null,
        precio_unitario: editProd.precio_unitario ? parseFloat(editProd.precio_unitario) : null,
      })
      setMsg({ type:'ok', text:'Producto actualizado correctamente' })
      setEditProd(null)
      load()
    } catch(e) {
      setMsg({ type:'error', text: e.response?.data?.error || 'Error al actualizar producto' })
    } finally { setSaving(false) }
  }

  const stockPorProducto = productos.map(p => ({
    ...p,
    ubicaciones: UBICACIONES.map(u => {
      const s = stock.find(s => s.producto_id === p.id && s.ubicacion === u)
      return { ubicacion: u, cantidad: s?.cantidad ?? 0 }
    }),
  }))

  const prodSel           = productos.find(p => p.id === parseInt(venta.producto_id))
  const descuentoMonto    = parseFloat(venta.descuento || 0)
  const descuentoPct      = prodSel && prodSel.precio_venta > 0 ? parseFloat(((descuentoMonto / prodSel.precio_venta) * 100).toFixed(2)) : 0
  const precioConDesc     = prodSel ? parseFloat((prodSel.precio_venta - descuentoMonto).toFixed(2)) : 0
  const ventaTotal        = prodSel ? parseFloat((precioConDesc * parseInt(venta.cantidad || 1)).toFixed(2)) : 0
  const ventaComision     = venta.metodo_pago === 'tarjeta' ? parseFloat((ventaTotal * 0.06).toFixed(2)) : 0
  const ventaNeto         = parseFloat((ventaTotal - ventaComision).toFixed(2))

  if (loading) return <Spinner />

  function CamposProducto({ data, setData }) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
        <div style={{ gridColumn:'1/-1' }}>
          <Input label="Nombre del producto" required value={data.nombre}
            onChange={e => setData(p => ({...p, nombre: e.target.value}))}
            placeholder="Ej. Air Free Neck Baby Float" />
        </div>
        <Input label="SKU / Item No." value={data.sku || ''}
          onChange={e => setData(p => ({...p, sku: e.target.value}))}
          placeholder="Ej. B510" />
        <Input label="Color" value={data.color || ''}
          onChange={e => setData(p => ({...p, color: e.target.value}))}
          placeholder="Ej. pink" />
        <Input label="Precio unitario USD (costo)" type="number" min="0" step="0.01"
          value={data.precio_unitario || ''}
          onChange={e => setData(p => ({...p, precio_unitario: e.target.value}))}
          placeholder="Ej. 10.00" />
        <Input label="Precio de venta ($)" type="number" min="0" step="0.01" required
          value={data.precio_venta}
          onChange={e => setData(p => ({...p, precio_venta: e.target.value}))} />
        <Input label="Stock mínimo" type="number" min="0"
          value={data.stock_minimo}
          onChange={e => setData(p => ({...p, stock_minimo: e.target.value}))} />
        <div style={{ gridColumn:'1/-1' }}>
          <Input label="URL de foto" value={data.foto_url || ''}
            onChange={e => setData(p => ({...p, foto_url: e.target.value}))}
            placeholder="https://..." />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <Input label="Descripción" value={data.descripcion || ''}
            onChange={e => setData(p => ({...p, descripcion: e.target.value}))}
            placeholder="Ej. Donut neck float M size" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:'900px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:'20px', fontWeight:600 }}>Inventario</h2>
          <p style={{ color:'var(--gray-400)', fontSize:'13px' }}>Flujo: Proveedor → Bodega → Villaflora / Florida</p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <Btn variant="ghost" onClick={() => { setShowProd(s => !s); setShowMov(false); setShowVenta(false); setEditProd(null) }}>+ Producto</Btn>
          <Btn variant="secondary" onClick={() => { setShowMov(s => !s); setShowProd(false); setShowVenta(false); setEditProd(null) }}>+ Movimiento</Btn>
          <Btn onClick={() => { setShowVenta(s => !s); setShowProd(false); setShowMov(false); setEditProd(null) }}>+ Venta</Btn>
        </div>
      </div>

      {msg && <Alert type={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</Alert>}

      {/* Formulario nuevo producto */}
      {showProd && (
        <Card>
          <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'14px' }}>Nuevo producto</div>
          <form onSubmit={handleCrearProducto} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <CamposProducto data={nuevoProd} setData={setNuevoProd} />
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <Btn type="button" variant="ghost" onClick={() => setShowProd(false)}>Cancelar</Btn>
              <Btn type="submit" loading={saving}>Crear producto</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Formulario editar producto */}
      {editProd && (
        <Card>
          <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'14px', display:'flex', justifyContent:'space-between' }}>
            <span>Editar producto</span>
            <span style={{ fontSize:'12px', color:'var(--gray-400)', fontWeight:400 }}>ID #{editProd.id}</span>
          </div>
          <form onSubmit={handleEditarProducto} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <CamposProducto data={editProd} setData={setEditProd} />
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <Btn type="button" variant="ghost" onClick={() => setEditProd(null)}>Cancelar</Btn>
              <Btn type="submit" loading={saving}>Guardar cambios</Btn>
            </div>
          </form>
        </Card>
      )}

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
                <option value="ajuste">Ajuste de stock (Bodega)</option>
                <option value="ajuste_villaflora">Ajuste de stock (Villaflora)</option>
                <option value="ajuste_florida">Ajuste de stock (Florida)</option>
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
                  onChange={e => setMov(m => ({...m, nota: e.target.value}))}
                  placeholder="Ej. Compra mensual flotadores" />
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <Btn type="button" variant="ghost" onClick={() => setShowMov(false)}>Cancelar</Btn>
              <Btn type="submit" loading={saving}>Registrar</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Formulario venta */}
      {showVenta && (
        <Card>
          <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'14px' }}>Registrar venta</div>
          <form onSubmit={handleVenta} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <Select label="Producto" required value={venta.producto_id}
                onChange={e => setVenta(v => ({...v, producto_id: e.target.value}))}>
                <option value="">Seleccionar…</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {fmtMoney(p.precio_venta)}</option>)}
              </Select>
              <Input label="Cantidad" type="number" min="1" required
                value={venta.cantidad}
                onChange={e => setVenta(v => ({...v, cantidad: e.target.value}))} />
              <Input label="Descuento ($)" type="number" min="0" step="0.01"
                value={venta.descuento}
                onChange={e => setVenta(v => ({...v, descuento: e.target.value}))}
                placeholder="0.00" />
              <Select label="Método de pago" value={venta.metodo_pago}
                onChange={e => setVenta(v => ({...v, metodo_pago: e.target.value}))}>
                {Object.entries(METODO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
              {esGlobal && (
                <Select label="Vender desde" required value={venta.local_id}
                  onChange={e => setVenta(v => ({...v, local_id: e.target.value}))}>
                  <option value="">Seleccionar…</option>
                  <option value="1">Villaflora</option>
                  <option value="2">Florida</option>
                  <option value="0">Bodega</option>
                </Select>
              )}

              {prodSel && (
                <div style={{ gridColumn:'1/-1', background:'var(--gray-100)', borderRadius:'var(--radius-sm)', padding:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'3px 0' }}>
                    <span style={{ color:'var(--gray-600)' }}>Precio unitario</span>
                    <span>{fmtMoney(prodSel.precio_venta)}</span>
                  </div>
                  {descuentoPct > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'4px 8px', marginTop:'4px', background:'var(--brand-light)', borderRadius:'var(--radius-sm)', color:'var(--brand-dark)' }}>
                      <span>Descuento ({descuentoPct}%)</span>
                      <span>-{fmtMoney(descuentoMonto)}</span>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'3px 0', fontWeight:600 }}>
                    <span style={{ color:'var(--gray-600)' }}>Total</span>
                    <span>${ventaTotal.toFixed(2)}</span>
                  </div>
                  {venta.metodo_pago === 'tarjeta' && <>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'4px 8px', marginTop:'4px', background:'var(--warn-light)', borderRadius:'var(--radius-sm)', color:'var(--warn)' }}>
                      <span>Comisión Payphone 6%</span><span>-${ventaComision.toFixed(2)}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'4px 8px', marginTop:'4px', background:'var(--brand-light)', borderRadius:'var(--radius-sm)', color:'var(--brand-dark)' }}>
                      <span>Neto</span><span>${ventaNeto.toFixed(2)}</span>
                    </div>
                  </>}
                </div>
              )}

              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:'12px', color:'var(--gray-600)', fontWeight:500, marginBottom:'8px' }}>Cliente</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[['bebe', 'Bebé registrado'], ['externo', 'Cliente externo']].map(([k, l]) => (
                    <div key={k} onClick={() => setVenta(v => ({...v, tipo_cliente: k}))}
                      style={{
                        padding:'6px 14px', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'12px',
                        border: venta.tipo_cliente === k ? '2px solid var(--accent)' : '1px solid var(--gray-200)',
                        background: venta.tipo_cliente === k ? 'var(--accent-light)' : '#fff',
                        fontWeight: venta.tipo_cliente === k ? 600 : 400,
                        color: venta.tipo_cliente === k ? 'var(--accent)' : 'var(--gray-600)',
                      }}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {venta.tipo_cliente === 'bebe' && (
                <div style={{ gridColumn:'1/-1' }}>
                  <Select label="Bebé" value={venta.bebe_id}
                    onChange={e => setVenta(v => ({...v, bebe_id: e.target.value}))}>
                    <option value="">Seleccionar bebé (opcional)…</option>
                    {bebes.map(b => <option key={b.id} value={b.id}>{b.nombre_completo} — {b.nombre_tutor}</option>)}
                  </Select>
                </div>
              )}

              {venta.tipo_cliente === 'externo' && <>
                <Input label="Nombre" value={venta.cliente_nombre}
                  onChange={e => setVenta(v => ({...v, cliente_nombre: e.target.value}))}
                  placeholder="Juan Pérez" />
                <Input label="Teléfono" value={venta.cliente_telefono}
                  onChange={e => setVenta(v => ({...v, cliente_telefono: e.target.value}))}
                  placeholder="+593 9..." />
                <Input label="Email" value={venta.cliente_email}
                  onChange={e => setVenta(v => ({...v, cliente_email: e.target.value}))}
                  placeholder="juan@email.com" />
                <Input label="Cédula / RUC" value={venta.cliente_cedula}
                  onChange={e => setVenta(v => ({...v, cliente_cedula: e.target.value}))}
                  placeholder="1712345678" />
              </>}
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <Btn type="button" variant="ghost" onClick={() => setShowVenta(false)}>Cancelar</Btn>
              <Btn type="submit" loading={saving}>Registrar venta</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0', borderBottom:'2px solid var(--gray-100)' }}>
        {[['stock','Stock'], ['ventas','Historial de ventas']].map(([k, l]) => (
          <div key={k} onClick={() => setVista(k)}
            style={{
              padding:'8px 20px', cursor:'pointer', fontSize:'13px', fontWeight: vista === k ? 600 : 400,
              color: vista === k ? 'var(--brand-dark)' : 'var(--gray-400)',
              borderBottom: vista === k ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom:'-2px',
            }}>
            {l}
          </div>
        ))}
      </div>

      {/* Tabla de stock */}
      {vista === 'stock' && (
        <Card>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid var(--gray-100)' }}>
                  <th style={{ textAlign:'left', padding:'8px 0', fontWeight:600, color:'var(--gray-600)' }}>Producto</th>
                  <th style={{ textAlign:'left', padding:'8px', fontWeight:600, color:'var(--gray-600)' }}>SKU</th>
                  <th style={{ textAlign:'left', padding:'8px', fontWeight:600, color:'var(--gray-600)' }}>Color</th>
                  <th style={{ textAlign:'center', padding:'8px', fontWeight:600, color:'var(--gray-600)' }}>Precio venta</th>
                  <th style={{ textAlign:'center', padding:'8px', fontWeight:600, color:'var(--gray-600)' }}>Costo USD</th>
                  {UBICACIONES.map(u => (
                    <th key={u} style={{ textAlign:'center', padding:'8px', fontWeight:600, color:'var(--gray-600)' }}>
                      {UBICACION_LABEL[u]}
                    </th>
                  ))}
                  <th style={{ padding:'8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {stockPorProducto.length === 0
                  ? <tr><td colSpan="9" style={{ textAlign:'center', padding:'2rem', color:'var(--gray-400)' }}>Sin productos</td></tr>
                  : stockPorProducto.map(p => (
                    <tr key={p.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                      <td style={{ padding:'10px 0', fontWeight:500 }}>
                        {p.foto_url && <img src={p.foto_url} alt={p.nombre} style={{ width:'32px', height:'32px', objectFit:'cover', borderRadius:'4px', marginRight:'8px', verticalAlign:'middle' }} />}
                        {p.nombre}
                        {p.descripcion && <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' }}>{p.descripcion}</div>}
                      </td>
                      <td style={{ padding:'8px', color:'var(--gray-500)', fontSize:'12px' }}>{p.sku || '—'}</td>
                      <td style={{ padding:'8px', color:'var(--gray-500)', fontSize:'12px' }}>{p.color || '—'}</td>
                      <td style={{ textAlign:'center', color:'var(--gray-400)' }}>{fmtMoney(p.precio_venta)}</td>
                      <td style={{ textAlign:'center', color:'var(--gray-400)', fontSize:'12px' }}>{p.precio_unitario ? `$${parseFloat(p.precio_unitario).toFixed(2)}` : '—'}</td>
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
                      <td style={{ textAlign:'center', padding:'8px' }}>
                        <Btn variant="ghost" onClick={() => {
                          setEditProd({ ...p })
                          setShowProd(false); setShowMov(false); setShowVenta(false)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}>✏️</Btn>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Historial de ventas */}
      {vista === 'ventas' && (
        <Card>
          {ventas.length === 0 ? <Empty message="Sin ventas registradas" /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid var(--gray-100)' }}>
                    <th style={{ textAlign:'left', padding:'6px 8px', fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>Fecha</th>
                    <th style={{ textAlign:'left', padding:'6px 8px', fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>Producto</th>
                    <th style={{ textAlign:'center', padding:'6px 8px', fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>Cant.</th>
                    <th style={{ textAlign:'left', padding:'6px 8px', fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>Cliente</th>
                    <th style={{ textAlign:'left', padding:'6px 8px', fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>Método</th>
                    <th style={{ textAlign:'center', padding:'6px 8px', fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>Desc.</th>
                    <th style={{ textAlign:'right', padding:'6px 8px', fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                      <td style={{ padding:'8px' }}>{fmtFecha(v.fecha)}</td>
                      <td style={{ padding:'8px', fontWeight:500 }}>{v.producto}</td>
                      <td style={{ padding:'8px', textAlign:'center' }}>{v.cantidad}</td>
                      <td style={{ padding:'8px', color:'var(--gray-600)' }}>
                        {v.bebe_nombre || v.cliente_nombre || <span style={{ color:'var(--gray-300)' }}>—</span>}
                      </td>
                      <td style={{ padding:'8px' }}>
                        <Badge color="gray">{METODO_LABEL[v.metodo_pago] || v.metodo_pago}</Badge>
                      </td>
                      <td style={{ padding:'8px', textAlign:'center', fontSize:'12px', color:'var(--brand-dark)' }}>
                        {v.descuento > 0 ? `${v.descuento}%` : '—'}
                      </td>
                      <td style={{ padding:'8px', textAlign:'right', fontWeight:600 }}>{fmtMoney(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
