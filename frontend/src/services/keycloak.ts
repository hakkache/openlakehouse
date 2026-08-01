import Keycloak from 'keycloak-js'

export const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081'
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? 'openlakehouse'
export const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'openlakehouse-web'

export const keycloak = new Keycloak({
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
})

export function getRoles(): string[] {
  return keycloak.tokenParsed?.realm_access?.roles ?? []
}

export function hasRole(...roles: string[]): boolean {
  const userRoles = getRoles()
  return roles.some((r) => userRoles.includes(r))
}
