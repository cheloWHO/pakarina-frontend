import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import LoginPage      from './pages/LoginPage'
import AdminLayout    from './components/layout/AdminLayout'
import DashboardPage  from './pages/admin/DashboardPage'
import BebesPage      from './pages/admin/BebesPage'
import ClasesPage     from './pages/admin/ClasesPage'
import FinanzasPage   from './pages/admin/FinanzasPage'
import InventarioPage from './pages/admin/InventarioPage'
import PortalLayout   from './pages/parent/PortalLayout'
import PortalPage     from './pages/parent/PortalPage'
import { Spinner }    from './components/ui'

// Ruta protegida — redirige al login si no hay sesión
function Private({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.rol !== role) {
    return <Navigate to={user.rol === 'admin' ? '/admin' : '/portal'} replace />
  }
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />

  return (
    <Routes>
      {/* Raíz → redirigir según rol */}
      <Route path="/" element={
        user
          ? <Navigate to={user.rol === 'admin' ? '/admin' : '/portal'} replace />
          : <Navigate to="/login" replace />
      } />

      {/* Login */}
      <Route path="/login" element={
        user
          ? <Navigate to={user.rol === 'admin' ? '/admin' : '/portal'} replace />
          : <LoginPage />
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <Private role="admin"><AdminLayout /></Private>
      }>
        <Route index        element={<DashboardPage />} />
        <Route path="bebes"      element={<BebesPage />} />
        <Route path="clases"     element={<ClasesPage />} />
        <Route path="finanzas"   element={<FinanzasPage />} />
        <Route path="inventario" element={<InventarioPage />} />
      </Route>

      {/* Portal papás */}
      <Route path="/portal" element={
        <Private role="parent"><PortalLayout /></Private>
      }>
        <Route index element={<PortalPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
