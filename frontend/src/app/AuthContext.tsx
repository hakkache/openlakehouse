import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { keycloak } from '../services/keycloak'

interface AuthContextValue {
  initialized: boolean
  authenticated: boolean
  username: string | null
  roles: string[]
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
      })
      .then((auth) => {
        setAuthenticated(auth)
        setInitialized(true)
      })
      .catch(() => {
        setInitialized(true)
      })

    keycloak.onAuthLogout = () => setAuthenticated(false)
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => setAuthenticated(false))
    }
  }, [])

  const value: AuthContextValue = {
    initialized,
    authenticated,
    username: keycloak.tokenParsed?.preferred_username ?? null,
    roles: keycloak.tokenParsed?.realm_access?.roles ?? [],
    login: () => keycloak.login(),
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
