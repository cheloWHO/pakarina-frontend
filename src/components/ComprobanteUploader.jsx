import { useRef, useState } from 'react'
import { finanzasAPI } from '../api'
import { parseAmountFromText, parseDateFromText, guessFromText } from '../utils/ocr'
import { Btn, Input, Alert } from './ui'

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB por imagen, igual que el servidor
const MAX_FOTOS = 10 // igual que el servidor

// Subida de comprobantes de depósito, con lectura automática (OCR) en el
// navegador. Acepta VARIAS fotos: un pago puede tener dos o más
// comprobantes (dos tarjetas, dos transferencias). Flujo: elegir una o
// varias imágenes → el lector intenta detectar monto, fecha, referencia y
// remitente de la PRIMERA foto → el usuario corrige lo que haga falta →
// se envían todas las fotos con los datos a POST /api/finanzas/comprobantes.
// Si el OCR no puede leer la captura, el formulario se completa a mano.
// Si el servidor aún no tiene el endpoint (backend sin fusionar), muestra
// un aviso claro en vez de fallar en silencio.
export default function ComprobanteUploader({ pagoId, ventaId, onSubido }) {
  const [archivos, setArchivos] = useState([]) // [{ key, file, preview }]
  const [ocr, setOcr] = useState('idle') // idle | leyendo | listo | error
  const [progreso, setProgreso] = useState(0)
  const [ocrKey, setOcrKey] = useState(null) // key de la foto ya leída
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState('')
  const [referencia, setReferencia] = useState('')
  const [nombre, setNombre] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [msg, setMsg] = useState(null)
  const [subido, setSubido] = useState(false)
  const inputRef = useRef(null)
  const keySeq = useRef(0)
  // Campos que el usuario ya escribió a mano: el OCR no los sobrescribe
  // cuando termina tarde. Importa con las fotos de efectivo: el lector
  // puede tardar y sugerir un número de un billete después de que el
  // usuario ya escribió el monto real.
  const tocado = useRef({})

  function elegirArchivos(fileList) {
    const elegidos = Array.from(fileList || [])
    if (!elegidos.length) return
    const eraVacia = archivos.length === 0
    const nuevos = []
    for (const file of elegidos) {
      if (!TIPOS_ACEPTADOS.includes(file.type)) {
        setMsg({ type: 'error', text: `"${file.name}" no es una imagen. Sube capturas en JPG, PNG o WebP.` })
        continue
      }
      if (file.size > MAX_BYTES) {
        setMsg({ type: 'error', text: `"${file.name}" supera los 5 MB permitidos.` })
        continue
      }
      nuevos.push(file)
    }
    if (!nuevos.length) return
    setMsg(null)
    setSubido(false)
    if (eraVacia) tocado.current = {}
    const juntos = [...archivos]
    for (const file of nuevos) {
      if (juntos.length >= MAX_FOTOS) {
        setMsg({ type: 'error', text: `Se pueden subir hasta ${MAX_FOTOS} fotos a la vez.` })
        break
      }
      juntos.push({ key: ++keySeq.current, file, preview: URL.createObjectURL(file) })
    }
    setArchivos(juntos)
    // El OCR lee solo la primera foto, y solo si todavía no se leyó.
    const primero = juntos[0]
    if (primero && ocrKey !== primero.key && ocr !== 'leyendo') {
      setOcrKey(primero.key)
      leerCaptura(primero.file)
    }
  }

  function quitarArchivo(key) {
    const resto = archivos.filter(a => {
      if (a.key === key) URL.revokeObjectURL(a.preview)
      return a.key !== key
    })
    setArchivos(resto)
    // Si quedó otra foto primera sin leer, leerla (solo rellena los
    // campos que el usuario no escribió a mano).
    const primero = resto[0]
    if (primero && ocrKey !== primero.key && ocr !== 'leyendo') {
      setOcrKey(primero.key)
      leerCaptura(primero.file)
    }
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
      // Solo se rellenan los campos que el usuario no escribió a mano.
      // En una foto de efectivo el OCR no encuentra monto/fecha/referencia
      // y los campos quedan vacíos para escribirlos; si encuentra algo,
      // igual se puede corregir antes de guardar.
      if (amount !== null && !tocado.current.monto) setMonto(String(amount))
      if (date && !tocado.current.fecha) setFecha(date)
      if (guess.ref && !tocado.current.referencia) setReferencia(guess.ref)
      if (guess.name && !tocado.current.nombre) setNombre(guess.name)
      setOcr('listo')
    } catch (e) {
      console.error('OCR falló:', e)
      setOcr('error')
    }
  }

  async function handleSubir() {
    if (!archivos.length) return
    setSubiendo(true); setMsg(null)
    try {
      const fd = new FormData()
      archivos.forEach(a => fd.append('imagen', a.file))
      if (pagoId) fd.append('pago_id', String(pagoId))
      if (ventaId) fd.append('venta_id', String(ventaId))
      if (monto !== '') fd.append('monto_detectado', String(monto))
      if (fecha) fd.append('fecha_detectada', fecha)
      if (referencia) fd.append('referencia_detectada', referencia)
      if (nombre) fd.append('nombre_detectado', nombre)
      const res = await finanzasAPI.subirComprobante(fd)
      const n = res.data?.comprobantes?.length || archivos.length
      setSubido(true)
      setMsg({ type: 'ok', text: n === 1 ? 'Comprobante guardado correctamente' : `${n} comprobantes guardados correctamente` })
      if (onSubido) onSubido(res.data)
    } catch (e) {
      const status = e.response?.status
      if (status === 404) {
        setMsg({ type: 'error', text: 'El servidor aún no tiene activa la subida de comprobantes (falta publicar la parte del servidor). Las imágenes quedaron listas aquí; inténtalo de nuevo cuando esté publicada.' })
      } else {
        setMsg({ type: 'error', text: e.response?.data?.error || 'Error al subir el comprobante' })
      }
    } finally {
      setSubiendo(false)
    }
  }

  function limpiar() {
    archivos.forEach(a => URL.revokeObjectURL(a.preview))
    setArchivos([]); setOcr('idle'); setProgreso(0); setOcrKey(null)
    setMonto(''); setFecha(''); setReferencia(''); setNombre('')
    setMsg(null); setSubido(false)
    tocado.current = {}
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '12px' }}>
      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Comprobante del depósito</div>
      <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '12px' }}>
        Sube la captura que te llegó por WhatsApp. Pueden ser varias fotos
        (por ejemplo, dos tarjetas o dos transferencias): la app intenta
        leer el monto y la fecha de la primera sola; tú confirmas los datos
        antes de guardar.
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
            multiple
            style={{ display: 'none' }}
            onChange={e => { elegirArchivos(e.target.files); e.target.value = '' }}
          />
          {archivos.length === 0 && (
            <Btn variant="secondary" onClick={() => inputRef.current && inputRef.current.click()}>
              📎 Elegir captura(s) (JPG, PNG o WebP, máx. 5 MB por foto)
            </Btn>
          )}

          {archivos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {archivos.map((a, i) => (
                  <div key={a.key} style={{ position: 'relative', width: '104px' }}>
                    <img src={a.preview} alt={`Captura ${i + 1}`}
                      style={{ width: '104px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)', display: 'block' }} />
                    <button type="button" onClick={() => quitarArchivo(a.key)} title="Quitar esta foto"
                      style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.65)', color: '#fff', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                    <div style={{ fontSize: '11px', color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px' }}>{a.file.name}</div>
                  </div>
                ))}
              </div>

              <div>
                {ocr === 'leyendo' && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Leyendo la primera captura… {progreso}%</div>
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input label="Monto detectado ($)" type="text" inputMode="decimal" placeholder="0.00"
                  value={monto} onChange={e => { tocado.current.monto = true; setMonto(e.target.value.replace(',', '.')) }} />
                <Input label="Fecha detectada" type="date"
                  value={fecha} onChange={e => { tocado.current.fecha = true; setFecha(e.target.value) }} />
                <Input label="Referencia" placeholder="N.º de operación"
                  value={referencia} onChange={e => { tocado.current.referencia = true; setReferencia(e.target.value) }} />
                <Input label="Remitente" placeholder="Nombre de quien depositó"
                  value={nombre} onChange={e => { tocado.current.nombre = true; setNombre(e.target.value) }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Btn size="sm" variant="ghost" onClick={() => inputRef.current && inputRef.current.click()}>
                  ＋ Agregar más fotos
                </Btn>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Btn variant="ghost" onClick={limpiar}>Cancelar</Btn>
                  <Btn onClick={handleSubir} loading={subiendo}>Guardar comprobante{archivos.length > 1 ? 's' : ''}</Btn>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
