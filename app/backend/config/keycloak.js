const axios = require('axios')
const config = require('./env')

class KeycloakService {
  constructor() {
    this.baseUrl = config.KEYCLOAK_URL
    this.realm = config.KEYCLOAK_REALM
    this.clientId = config.KEYCLOAK_CLIENT_ID
    this.clientSecret = config.KEYCLOAK_CLIENT_SECRET
    this.publicClientId = config.KEYCLOAK_PUBLIC_CLIENT_ID
    this.adminToken = null
    this.adminTokenExpiry = null
  }

  async getAdminToken() {
    try {
      if (this.adminToken && this.adminTokenExpiry && Date.now() < this.adminTokenExpiry) {
        return this.adminToken
      }

      const response = await axios.post(
        `${this.baseUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      )

      this.adminToken = response.data.access_token
      this.adminTokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000

      return this.adminToken
    } catch (error) {
      console.error('[Keycloak] Error getting admin token:', error.response?.data || error.message)
      throw error
    }
  }

  async verifyToken(token) {
    try {
      const params = new URLSearchParams({
        token,
        client_id: this.clientId
      })

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret)
      }

      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      )

      return response.data
    } catch (error) {
      console.error('[Keycloak] Error verifying token:', error.response?.data || error.message)
      throw error
    }
  }

  async getUserInfo(token) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      return response.data
    } catch (error) {
      console.error('[Keycloak] Error getting user info:', error.response?.data || error.message)
      throw error
    }
  }

  async createUser(userData) {
    try {
      const adminToken = await this.getAdminToken()

      const response = await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('[Keycloak] Error creating user in Keycloak:', error.response?.data || error.message)
      throw error
    }
  }

  async exchangeCode(code, redirectUri) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.publicClientId
      })


      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      )

      return response.data
    } catch (error) {
      console.error('[Keycloak] Error exchanging code for token:', error.response?.data || error.message)
      throw error
    }
  }

  getLoginUrl(redirectUri, state = '', idpHint = null) {
    const params = new URLSearchParams({
      client_id: this.publicClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    })

    if (idpHint) {
      params.append('kc_idp_hint', idpHint)
    }

    return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/auth?${params.toString()}`
  }

  getLogoutUrl(redirectUri) {
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
    })

    return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/logout?${params.toString()}`
  }

  async findUserByUsername(username) {
    const adminToken = await this.getAdminToken()

    const response = await axios.get(
      `${this.baseUrl}/admin/realms/${this.realm}/users`,
      {
        params: { username },
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    )

    return response.data?.[0] || null
  }

  async updateUser(userId, userData) {
    const adminToken = await this.getAdminToken()

    await axios.put(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  async getRealmRole(roleName) {
    const adminToken = await this.getAdminToken()

    const response = await axios.get(
      `${this.baseUrl}/admin/realms/${this.realm}/roles/${roleName}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    )

    return response.data
  }

  async assignRealmRole(userId, roleName) {
    const role = await this.getRealmRole(roleName)

    await axios.post(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
      [role],
      {
        headers: {
          Authorization: `Bearer ${await this.getAdminToken()}`,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  async removeRealmRole(userId, roleName) {
    try {
      const role = await this.getRealmRole(roleName)

      await axios.delete(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          headers: {
            Authorization: `Bearer ${await this.getAdminToken()}`,
            'Content-Type': 'application/json'
          },
          data: [role]
        }
      )
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error
      }
    }
  }

  async syncUserRole(username, newRole) {
    try {
      const existingUser = await this.findUserByUsername(username)

      if (!existingUser) {
        console.warn(`[Keycloak] User ${username} not found in Keycloak`)
        return false
      }

      const almadeskRoles = ['KLIENT', 'AGENT', 'ADMIN', 'SUPER_ADMIN']

      for (const role of almadeskRoles) {
        try {
          await this.removeRealmRole(existingUser.id, role)
        } catch (error) {
        }
      }

      if (almadeskRoles.includes(newRole)) {
        await this.assignRealmRole(existingUser.id, newRole)
        console.log(`[Keycloak] Synced role ${newRole} to Keycloak for user ${username}`)
      }

      return true
    } catch (error) {
      console.error(`[Keycloak] Error syncing role to Keycloak:`, error.response?.data || error.message)
      return false
    }
  }

  async ensureUserFromLocal(user) {
    try {
      const username = user.login
      const displayName = user.name || user.login
      const nameParts = displayName.split(' ')
      const firstName = nameParts[0] || displayName
      const lastName = nameParts.slice(1).join(' ') || ''

      let existingUser = await this.findUserByUsername(username)

      if (!existingUser) {
        const adminToken = await this.getAdminToken()
        const createResponse = await axios.post(
          `${this.baseUrl}/admin/realms/${this.realm}/users`,
          {
            username,
            email: user.email,
            firstName,
            lastName,
            enabled: true,
            attributes: {
              almadeskRole: user.role
            }
          },
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        const location = createResponse.headers?.location || ''
        const createdId = location.split('/').pop()
        existingUser = createdId ? { id: createdId } : await this.findUserByUsername(username)
      } else {
        await this.updateUser(existingUser.id, {
          email: user.email,
          firstName,
          lastName,
          enabled: true,
          attributes: {
            almadeskRole: user.role
          }
        })
      }

      if (existingUser?.id && user.role) {
        await this.assignRealmRole(existingUser.id, user.role)
      }

      return existingUser
    } catch (error) {
      console.error('[Keycloak] Error ensuring Keycloak user:', error.response?.data || error.message)
      return null
    }
  }
}

module.exports = new KeycloakService()
