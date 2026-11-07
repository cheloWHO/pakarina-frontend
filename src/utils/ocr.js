// Extracción de datos de capturas de depósito (OCR).
// Portado de la página standalone "Cuentas Pakarina": lee monto, fecha,
// referencia (6-15 dígitos) y nombre del remitente del texto que devuelve
// Tesseract.js. Son solo sugerencias: el usuario siempre las revisa y
// corrige en el formulario antes de guardar.

function normalizeNumber(raw) {
  if (!raw) return null
  const s = String(raw).replace(/\s+/g, '')
  // 1.234,56 (formato Ecuador con miles con punto)
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  // 1234,56
  if (/^\d+,\d{1,2}$/.test(s)) return parseFloat(s.replace(',', '.'))
  // 1,234.56
  if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(s)) return parseFloat(s.replace(/,/g, ''))
  // 1234.56
  if (/^\d+\.\d{1,2}$/.test(s)) return parseFloat(s)
  // entero
  if (/^\d+$/.test(s)) return parseFloat(s)
  return null
}

export function parseAmountFromText(text) {
  const lines = text.split(/\n/)
  let best = null // { val, score }
  const re = /(US\$|\$|USD)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})|\d+[.,]\d{2}|\d+[.,]\d{1}\b|\d{2,6}\b)/g
  lines.forEach(line => {
    const low = line.toLowerCase()
    const keyword = /(monto|valor|total|importe|cantidad|transfer|dep[oó]sito|pago|abono|cr[eé]dito|d[eé]bito|saldo a|recibid|enviad)/.test(low)
    let m
    re.lastIndex = 0
    while ((m = re.exec(line)) !== null) {
      const raw = m[2]
      const val = normalizeNumber(raw)
      if (val === null || val <= 0) continue
      // Descartar cosas que parecen años, teléfonos o cuentas largas
      if (/^\d{4}$/.test(raw) && val >= 1990 && val <= 2100) continue
      if (raw.replace(/[^\d]/g, '').length > 9) continue
      let score = 0
      if (m[1]) score += 5                    // trae símbolo $
      if (keyword) score += 6                 // línea con palabra clave
      if (/[.,]\d{2}$/.test(raw)) score += 3  // trae centavos
      if (val >= 5 && val <= 100000) score += 2 // rango plausible
      if (!best || score > best.score || (score === best.score && val > best.val)) {
        best = { val, score }
      }
    }
  })
  return best ? best.val : null
}

const MONTHS_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dic: 12,
}

function pad(n) { return String(n).padStart(2, '0') }

function validDate(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null
  return y + '-' + pad(mo) + '-' + pad(d)
}

export function parseDateFromText(text) {
  const t = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' '
  let m
  // 2026-11-05, 05/11/2026
  m = t.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
  if (m) { const r = validDate(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)); if (r) return r }
  m = t.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/)
  if (m) {
    let y = parseInt(m[3], 10); if (y < 100) y += 2000
    const r2 = validDate(y, parseInt(m[2], 10), parseInt(m[1], 10)); if (r2) return r2
  }
  // 5 de noviembre de 2026
  m = t.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/)
  if (m) { const r3 = validDate(parseInt(m[3], 10), MONTHS_ES[m[2]], parseInt(m[1], 10)); if (r3) return r3 }
  // 05 nov 2026 / nov 05, 2026
  m = t.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)[a-z]*\s+(\d{4})/)
  if (m) { const r4 = validDate(parseInt(m[3], 10), MONTHS_ES[m[2]], parseInt(m[1], 10)); if (r4) return r4 }
  m = t.match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/)
  if (m) { const r5 = validDate(parseInt(m[3], 10), MONTHS_ES[m[1]], parseInt(m[2], 10)); if (r5) return r5 }
  return null
}

// Nombre del remitente (tras "De:", "Para:", "Nombre:", "Beneficiario:")
// y referencia numérica larga (6-15 dígitos).
export function guessFromText(text) {
  const guess = {}
  const nameMatch = text.match(/(?:^|\n)\s*(?:de|para|nombre|beneficiario|cliente|remitente)\s*[:\-]\s*([A-Za-zÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ .]{3,40})/i)
  if (nameMatch) guess.name = nameMatch[1].trim().replace(/\s+/g, ' ')
  const refMatch = text.match(/(?:ref(?:erencia)?|comprobante|n[°º.]?\s*de\s*operaci|autorizaci)[^\d]{0,12}(\d{6,15})/i)
  if (refMatch) guess.ref = refMatch[1]
  return guess
}
