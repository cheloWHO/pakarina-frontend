import { useRef, useState } from 'react'
import { finanzasAPI } from '../api'
import { parseAmountFromText, parseDateFromText, guessFromText } from '../utils/ocr'
import { Btn, Input, Alert } from './ui'

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, igual que el servidor

// Subida de comprobante de depósito, con lectura automática (OCR) en el
// navegador. Flujo: elegir imagen → el lector intenta detectar monto, fecha,
// referencia y remitente → el usuario corrige lo que haga falta → se envía
// la imagen con los datos a POST /api/finanzas/comprobantes.
// Si el OCR no puede leer la captura, el formulario se completa a mano.
// Si el servidor aún no tiene el endpoint (backend sin fusionar), muestra
// un aviso claro en vez de fallar en silencio.
export default function ComprobanteUploader({ pagoId, ventaId, onSubido }) {
  const [archivo, setArchivo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [ocr, setOcr] = useState('idle') // idle | leyendo | listo | error
  const [progreso, setProgreso] = useState(0)
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState('')
  const [referencia, setReferencia] = useState('')
  const [nombre, setNombre] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [msg, setMsg] = useState(null)
  const [subido, setSubido] = useState(false)
  const inputRef = useRef(null)

  function elegirArchivo(file) {
    if (!file) return
    if (!TIPOS_ACEPTADOS.includes(file.type)) {
      setMsg({ type: 'error', text: 'Ese archivo no es una imagen. Sube la captura en JPG, PNG o WebP.' })
      return
    }
    if (file.size > MAX_BYTES) {
      setMsg({ type: 'error', text: 'La imagen supera los 5 MB permitidos.' })
      return
    }
    setMsg(null)
    setArchivo(file)
    setPreview(URL.createObjectURL(file))
    setSubido(false)
    leerCaptura(file)
  }

  async function leerCaptura(file) {
    setOcr('leyendo'); setProgreso(0)
    try {
      // Carga perezosa: el lector OCR solo se descarga cuando se adjunta
      // una captura, para no pesar el resto de la app.
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa+eng', undefined, {
        logger: m => {
          if (m.status === 'recognizing text') setProgreso(Math.round(m.progress * 100))
        },
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      const amount = parseAmountFromText(text)
      const date = parseDateFromText(text)
      const guess = guessFromText(text)
      if (amount !== null) setMonto(String(amount))
      if (date) setFecha(date)
      if (guess.ref) setReferencia(guess.ref)
      if (guess.name) setNombre(guess.name)
      setOcr('listo')
    } catch (e) {
      console.error('OCR falló:', e)
      setOcr('error')
    }
  }

  async function handleSubir() {
    if (!archivo) return
    setSubiendo(true); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('imagen', archivo)
      if (pagoId) fd.append('pago_id', String(pagoId))
      if (ventaId) fd.append('venta_id', String(ventaId))
      if (monto !== '') fd.append('monto_detectado', String(monto))
      if (fecha) fd.append('fecha_detectada', fecha)
      if (referencia) fd.append('referencia_detectada', referencia)
      if (nombre) fd.append('nombre_detectado', nombre)
      const res = await finanzasAPI.subirComprobante(fd)
      setSubido(true)
      setMsg({ type: 'ok', text: 'Comprobante guardado correctamente' })
      if (onSubido) onSubido(res.data)
    } catch (e) {
      const status = e.response?.status
      if (status === 404) {
        setMsg({ type: 'error', text: 'El servidor aún no tiene activa la subida de comprobantes (falta publicar la parte del servidor). La imagen quedó lista aquí; inténtalo de nuevo cuando esté publicada.' })
      } else {
        setMsg({ type: 'error', text: e.response?.data?.error || 'Error al subir el comprobante' })
      }
    } finally {
      setSubiendo(false)
    }
  }

  function limpiar() {
    setArchivo(null); setPreview(null); setOcr('idle'); setProgreso(0)
    setMonto(''); setFecha(''); setReferencia(''); setNombre('')
    setMsg(null); setSubido(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '12px' }}>
      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Comprobante del depósito</div>
      <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '12px' }}>
        Sube la captura que te llegó por WhatsApp: la app intenta leer el monto y la fecha sola; tú confirmas los datos antes de guardar.
      </div>

      {msg && <div style={{ marginBottom: '12px' }}><Alert type={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</Alert></div>}

      {subido ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--brand-dark)', fontWeight: 600 }}>✓ Comprobante guardado</span>
          <Btn size="sm" variant="ghost" onClick={limpiar}>Subir otro</Btn>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={e => elegirArchivo(e.target.files && e.target.files[0])}
          />
          {!archivo && (
            <Btn variant="secondary" onClick={() => inputRef.current && inputRef.current.click()}>
              📎 Elegir captura (JPG, PNG o WebP, máx. 5 MB)
            </Btn>
          )}

          {archivo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {preview && (
                  <img src={preview} alt="Captura del depósito"
                    style={{ width: '120px', maxHeight: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)' }} />
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivo.name}</div>
                  {ocr === 'leyendo' && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Leyendo la captura… {progreso}%</div>
                      <div style={{ height: '6px', background: 'var(--gray-200)', borderRadius: '99px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(4, progreso)}%`, height: '100%', background: 'var(--brand)', transition: 'width .2s' }} />
                      </div>
                    </div>
                  )}
                  {ocr === 'listo' && (
                    <div style={{ fontSize: '12px', color: 'var(--brand-dark)' }}>Lectura terminada. Revisa los datos detectados y corrige lo que haga falta.</div>
                  )}
                  {ocr === 'error' && (
                    <div style={{ fontSize: '12px', color: 'var(--warn)' }}>No se pudo leer la captura automáticamente. Completa los datos a mano.</div>
                  )}
                  <div>
                    <Btn size="sm" variant="ghost" onClick={() => inputRef.current && inputRef.current.click()}>Cambiar imagen</Btn>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input label="Monto detectado ($)" type="text" inputMode="decimal" placeholder="0.00"
                  value={monto} onChange={e => setMonto(e.target.value.replace(',', '.'))} />
                <Input label="Fecha detectada" type="date"
                  value={fecha} onChange={e => setFecha(e.target.value)} />
                <Input label="Referencia" placeholder="N.º de operación"
                  value={referencia} onChange={e => setReferencia(e.target.value)} />
                <Input label="Remitente" placeholder="Nombre de quien depositó"
                  value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Btn variant="ghost" onClick={limpiar}>Cancelar</Btn>
                <Btn onClick={handleSubir} loading={subiendo}>Guardar comprobante</Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
