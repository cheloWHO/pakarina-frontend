/* ─── Button ─────────────────────────────────────────────── */
export function Btn({ children, variant = 'primary', size = 'md', loading, ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
    border: 'none', borderRadius: 'var(--radius-md)', transition: 'all .15s',
    opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto',
  }
  const sizes = { sm: { padding: '5px 12px', fontSize: '12px' },
                  md: { padding: '8px 18px', fontSize: '13px' },
                  lg: { padding: '11px 24px', fontSize: '14px' } }
  const variants = {
    primary:  { background: 'var(--brand)', color: '#fff' },
    secondary:{ background: 'var(--gray-100)', color: 'var(--gray-900)' },
    danger:   { background: 'var(--danger)', color: '#fff' },
    ghost:    { background: 'transparent', color: 'var(--gray-600)',
                border: '1px solid var(--gray-200)' },
  }
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant] }} {...props}>
      {loading ? 'Cargando…' : children}
    </button>
  )
}

/* ─── Card ────────────────────────────────────────────────── */
export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--gray-100)', padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)', ...style,
    }}>
      {children}
    </div>
  )
}

/* ─── Badge ───────────────────────────────────────────────── */
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:  { bg: 'var(--gray-100)',    text: 'var(--gray-600)' },
    green: { bg: 'var(--brand-light)', text: 'var(--brand-dark)' },
    red:   { bg: 'var(--danger-light)',text: 'var(--danger)' },
    warn:  { bg: 'var(--warn-light)',  text: 'var(--warn)' },
    purple:{ bg: 'var(--accent-light)',text: 'var(--accent)' },
  }
  const c = colors[color] || colors.gray
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: '99px',
      fontSize: '11px', fontWeight: 500,
      background: c.bg, color: c.text,
    }}>
      {children}
    </span>
  )
}

/* ─── Input / Select ─────────────────────────────────────── */
const fieldBase = {
  width: '100%', height: '38px', border: '1px solid var(--gray-200)',
  borderRadius: 'var(--radius-sm)', padding: '0 10px',
  fontSize: '13px', fontFamily: 'inherit', color: 'var(--gray-900)',
  background: '#fff', outline: 'none', transition: 'border .15s',
}

export function Input({ label, hint, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', color: 'var(--gray-600)', fontWeight: 500 }}>{label}</label>}
      <input style={fieldBase} {...props} />
      {hint && <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{hint}</span>}
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', color: 'var(--gray-600)', fontWeight: 500 }}>{label}</label>}
      <select style={{ ...fieldBase, cursor: 'pointer' }} {...props}>
        {children}
      </select>
    </div>
  )
}

/* ─── Stat Card ───────────────────────────────────────────── */
export function StatCard({ label, value, sub, color = 'gray' }) {
  const colors = { gray: 'var(--gray-900)', green: 'var(--brand-dark)',
                   red: 'var(--danger)', warn: 'var(--warn)' }
  return (
    <div style={{
      background: 'var(--gray-100)', borderRadius: 'var(--radius-md)',
      padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      <span style={{ fontSize: '24px', fontWeight: 600, color: colors[color] }}>{value}</span>
      {sub && <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{sub}</span>}
    </div>
  )
}

/* ─── Alert ───────────────────────────────────────────────── */
export function Alert({ children, type = 'info' }) {
  const styles = {
    info:  { bg: '#E6F1FB', color: '#185FA5' },
    warn:  { bg: 'var(--warn-light)',   color: 'var(--warn)' },
    error: { bg: 'var(--danger-light)', color: 'var(--danger)' },
    ok:    { bg: 'var(--brand-light)',  color: 'var(--brand-dark)' },
  }
  const s = styles[type]
  return (
    <div style={{
      background: s.bg, color: s.color, borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', fontSize: '13px',
    }}>
      {children}
    </div>
  )
}

/* ─── Spinner ─────────────────────────────────────────────── */
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        border: '3px solid var(--gray-200)',
        borderTopColor: 'var(--brand)',
        animation: 'spin .7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/* ─── Empty State ─────────────────────────────────────────── */
export function Empty({ message = 'Sin datos' }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)', fontSize: '13px' }}>
      {message}
    </div>
  )
}
