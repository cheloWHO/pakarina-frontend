import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const token = localStorage.getItem('pakarina_token')
  if (token) {
    authAPI.me()
      .then(({ data }) => {
        localStorage.setItem('pakarina_user', JSON.stringify(data))
        setUser(data)
      })
      .catch(() => {
        localStorage.removeItem('pakarina_token')
        localStorage.removeItem('pakarina_user')
      })
      .finally(() => setLoading(false))
  } else {
    setLoading(false)
  }
}, [])

  async function login(email, password) {
    const { data } = await authAPI.login(email, password)
    localStorage.setItem('pakarina_token', data.token)
    localStorage.setItem('pakarina_user',  JSON.stringify(data.usuario))
    setUser(data.usuario)
    return data.usuario
  }

  function logout() {
    localStorage.removeItem('pakarina_token')
    localStorage.removeItem('pakarina_user')
    setUser(null)
  }

  const isAdmin  = user?.rol === 'admin'
  const isParent = user?.rol === 'parent'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isParent }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
