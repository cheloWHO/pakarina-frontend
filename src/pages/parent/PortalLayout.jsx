import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)' }}>
      {/* Topbar */}
      <header style={{
        background:'#fff', borderBottom:'1px solid var(--gray-100)',
        padding:'0 1.5rem', height:'56px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{
            width:'32px', height:'32px', borderRadius:'50%',
            background:'var(--brand-light)', display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:'16px',
          }}>🐣</div>
          <div>
            <div style={{ fontWeight:600, fontSize:'14px', color:'var(--brand-dark)' }}>Pakarina Center</div>
            <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>Portal de papás</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <span style={{ fontSize:'13px', color:'var(--gray-600)' }}>{user?.nombre}</span>
          <button onClick={handleLogout} style={{
            padding:'5px 12px', fontSize:'12px', cursor:'pointer',
            background:'var(--gray-100)', border:'none',
            borderRadius:'var(--radius-sm)', color:'var(--gray-600)',
          }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ padding:'1.5rem', maxWidth:'600px', margin:'0 auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
