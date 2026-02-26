

const axios = require('axios')
const prisma = require('../db')

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin'
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'almadesk'


async function getAdminToken() {
  try {
    const response = await axios.post(
      `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: KEYCLOAK_ADMIN_USER,
        password: KEYCLOAK_ADMIN_PASSWORD
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    )
    return response.data.access_token
  } catch (error) {
    console.error('Failed to get Keycloak admin token:', error.message)
    throw new Error('Keycloak authentication failed')
  }
}


async function getSSOSettings() {
  const settings = await prisma.systemSettings.findMany({
    where: {
      key: {
        startsWith: 'sso_'
      }
    }
  })

  const config = {}
  settings.forEach(setting => {
    config[setting.key] = setting.value
  })

  return config
}


async function syncAzureAD(adminToken, config) {
  const enabled = config.sso_azure_enabled === 'true'

  if (!enabled) {
    console.log('Azure AD SSO disabled in settings, skipping sync')
    return { success: true, message: 'Azure AD disabled' }
  }

  const tenantId = config.sso_azure_tenant_id
  const clientId = config.sso_azure_client_id
  const clientSecret = config.sso_azure_client_secret
  const displayName = config.sso_azure_display_name || 'Sign in with Microsoft'

  if (!tenantId || !clientId || !clientSecret) {
    return {
      success: false,
      message: 'Azure AD configuration incomplete (missing tenant_id, client_id, or client_secret)'
    }
  }

  const idpConfig = {
    alias: 'azure-ad',
    displayName: displayName,
    providerId: 'oidc',
    enabled: true,
    updateProfileFirstLoginMode: 'on',
    trustEmail: true,
    storeToken: false,
    addReadTokenRoleOnCreate: false,
    authenticateByDefault: false,
    linkOnly: false,
    config: {
      clientId: clientId,
      tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      logoutUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
      jwksUrl: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      clientAuthMethod: 'client_secret_post',
      syncMode: 'IMPORT',
      clientSecret: clientSecret,
      defaultScope: 'openid profile email',
      useJwksUrl: 'true',
      validateSignature: 'true',
      backchannelSupported: 'true'
    }
  }

  try {
    try {
      await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances/azure-ad`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      )

      await axios.put(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances/azure-ad`,
        idpConfig,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return { success: true, message: 'Azure AD Identity Provider updated in Keycloak' }
    } catch (error) {
      if (error.response?.status === 404) {
        await axios.post(
          `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances`,
          idpConfig,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        return { success: true, message: 'Azure AD Identity Provider created in Keycloak' }
      }
      throw error
    }
  } catch (error) {
    console.error('Azure AD sync error:', error.response?.data || error.message)
    return {
      success: false,
      message: `Failed to sync Azure AD: ${error.response?.data?.errorMessage || error.message}`
    }
  }
}


async function syncGoogle(adminToken, config) {
  const enabled = config.sso_google_enabled === 'true'

  if (!enabled) {
    console.log('Google SSO disabled in settings, skipping sync')
    return { success: true, message: 'Google disabled' }
  }

  const clientId = config.sso_google_client_id
  const clientSecret = config.sso_google_client_secret
  const displayName = config.sso_google_display_name || 'Sign in with Google'

  if (!clientId || !clientSecret) {
    return {
      success: false,
      message: 'Google configuration incomplete (missing client_id or client_secret)'
    }
  }

  const idpConfig = {
    alias: 'google',
    displayName: displayName,
    providerId: 'google',
    enabled: true,
    updateProfileFirstLoginMode: 'on',
    trustEmail: true,
    storeToken: false,
    addReadTokenRoleOnCreate: false,
    authenticateByDefault: false,
    linkOnly: false,
    config: {
      clientId: clientId,
      clientSecret: clientSecret,
      defaultScope: 'openid profile email',
      hostedDomain: ''
    }
  }

  try {
    try {
      await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances/google`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      )

      await axios.put(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances/google`,
        idpConfig,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return { success: true, message: 'Google Identity Provider updated in Keycloak' }
    } catch (error) {
      if (error.response?.status === 404) {
        await axios.post(
          `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances`,
          idpConfig,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        return { success: true, message: 'Google Identity Provider created in Keycloak' }
      }
      throw error
    }
  } catch (error) {
    console.error('Google sync error:', error.response?.data || error.message)
    return {
      success: false,
      message: `Failed to sync Google: ${error.response?.data?.errorMessage || error.message}`
    }
  }
}


async function syncGitHub(adminToken, config) {
  const enabled = config.sso_github_enabled === 'true'

  if (!enabled) {
    console.log('GitHub SSO disabled in settings, skipping sync')
    return { success: true, message: 'GitHub disabled' }
  }

  const clientId = config.sso_github_client_id
  const clientSecret = config.sso_github_client_secret
  const displayName = config.sso_github_display_name || 'Sign in with GitHub'

  if (!clientId || !clientSecret) {
    return {
      success: false,
      message: 'GitHub configuration incomplete (missing client_id or client_secret)'
    }
  }

  const idpConfig = {
    alias: 'github',
    displayName: displayName,
    providerId: 'github',
    enabled: true,
    updateProfileFirstLoginMode: 'on',
    trustEmail: false,
    storeToken: false,
    addReadTokenRoleOnCreate: false,
    authenticateByDefault: false,
    linkOnly: false,
    config: {
      clientId: clientId,
      clientSecret: clientSecret,
      defaultScope: 'user:email'
    }
  }

  try {
    try {
      await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances/github`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      )

      await axios.put(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances/github`,
        idpConfig,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return { success: true, message: 'GitHub Identity Provider updated in Keycloak' }
    } catch (error) {
      if (error.response?.status === 404) {
        await axios.post(
          `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances`,
          idpConfig,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        return { success: true, message: 'GitHub Identity Provider created in Keycloak' }
      }
      throw error
    }
  } catch (error) {
    console.error('GitHub sync error:', error.response?.data || error.message)
    return {
      success: false,
      message: `Failed to sync GitHub: ${error.response?.data?.errorMessage || error.message}`
    }
  }
}


async function syncAllProviders() {
  try {
    console.log('[Keycloak] Starting SSO providers synchronization...')

    const adminToken = await getAdminToken()

    const config = await getSSOSettings()

    const results = []

    if (config.sso_enabled === 'true' && config.sso_azure_enabled === 'true') {
      const azureResult = await syncAzureAD(adminToken, config)
      results.push({ provider: 'Azure AD', ...azureResult })
    }

    if (config.sso_enabled === 'true' && config.sso_google_enabled === 'true') {
      const googleResult = await syncGoogle(adminToken, config)
      results.push({ provider: 'Google', ...googleResult })
    }

    if (config.sso_enabled === 'true' && config.sso_github_enabled === 'true') {
      const githubResult = await syncGitHub(adminToken, config)
      results.push({ provider: 'GitHub', ...githubResult })
    }

    console.log('[Keycloak] SSO synchronization completed')

    return {
      success: true,
      results: results
    }
  } catch (error) {
    console.error('[Keycloak] SSO synchronization failed:', error.message)
    return {
      success: false,
      error: error.message,
      results: []
    }
  }
}

module.exports = {
  syncAllProviders,
  syncAzureAD,
  syncGoogle,
  syncGitHub,
  getAdminToken,
  getSSOSettings
}
