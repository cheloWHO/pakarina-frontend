import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/admin',           label: 'Inicio',     icon: '◈' },
  { to: '/admin/bebes',     label: 'Bebés',      icon: '◉' },
  { to: '/admin/clases',    label: 'Clases',     icon: '◎' },
  { to: '/admin/finanzas',  label: 'Finanzas',   icon: '◇' },
  { to: '/admin/inventario',label: 'Inventario', icon: '◫' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: '#fff', borderRight: '1px solid var(--gray-100)',
        display: 'flex', flexDirection: 'column',
        padding: '1.5rem 0',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--brand-dark)' }}>
            Pakarina Center
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
            {user?.local_id ? (user.local_id === 1 ? 'Villaflora' : 'Florida') : 'Global'}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                marginBottom: '2px', fontSize: '13px', fontWeight: 500,
                color: isActive ? 'var(--brand-dark)' : 'var(--gray-600)',
                background: isActive ? 'var(--brand-light)' : 'transparent',
                transition: 'all .15s',
              })}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--gray-100)' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>{user?.nombre}</div>
          <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '8px' }}>Administrador</div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '6px', fontSize: '12px',
              background: 'var(--gray-100)', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              color: 'var(--gray-600)',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
