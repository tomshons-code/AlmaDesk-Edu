#!/usr/bin/env node



const axios = require('axios')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function getAdminToken(keycloakUrl) {
  console.log('\n[AzureADSetup] Authenticating with Keycloak...')

  const adminUser = await question('Keycloak admin username [admin]: ') || 'admin'
  const adminPass = await question('Keycloak admin password: ')

  if (!adminPass) {
    throw new Error('Admin password is required')
  }

  const response = await axios.post(
    `${keycloakUrl}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: adminUser,
      password: adminPass
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  )

  return response.data.access_token
}

async function configureAzureAD() {
  console.log('='.repeat(60))
  console.log('   AlmaDesk-Edu - Azure AD Identity Provider Setup')
  console.log('='.repeat(60))

  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080'
  const realmName = process.env.KEYCLOAK_REALM || 'almadesk'

  console.log(`\nKeycloak URL: ${keycloakUrl}`)
  console.log(`Realm: ${realmName}`)

  try {
    const adminToken = await getAdminToken(keycloakUrl)
    console.log('[AzureADSetup] Authenticated successfully\n')

    console.log('[AzureADSetup] Azure AD Configuration')
    console.log('-'.repeat(60))

    const tenantId = process.env.AZURE_AD_TENANT_ID ||
      await question('Azure AD Tenant ID: ')

    const clientId = process.env.AZURE_AD_CLIENT_ID ||
      await question('Azure AD Client ID (Application ID): ')

    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET ||
      await question('Azure AD Client Secret: ')

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Tenant ID, Client ID, and Client Secret are required')
    }

    const idpConfig = {
      alias: 'azure-ad',
      displayName: 'Microsoft Azure AD',
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

    console.log('\n[AzureADSetup] Configuring Identity Provider in Keycloak...')

    let existingIdP = null
    try {
      const getResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realmName}/identity-provider/instances/azure-ad`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      )
      existingIdP = getResponse.data
      console.log('[AzureADSetup] Identity Provider "azure-ad" already exists. Updating...')
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error
      }
    }

    if (existingIdP) {
      await axios.put(
        `${keycloakUrl}/admin/realms/${realmName}/identity-provider/instances/azure-ad`,
        idpConfig,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      console.log('[AzureADSetup] Identity Provider updated successfully')
    } else {
      await axios.post(
        `${keycloakUrl}/admin/realms/${realmName}/identity-provider/instances`,
        idpConfig,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      console.log('[AzureADSetup] Identity Provider created successfully')
    }

    console.log('\n[AzureADSetup] Configuring attribute mappers...')

    const mappers = [
      {
        name: 'azure-ad-username-mapper',
        identityProviderAlias: 'azure-ad',
        identityProviderMapper: 'oidc-username-idp-mapper',
        config: {
          syncMode: 'INHERIT',
          template: '${CLAIM.preferred_username}'
        }
      },
      {
        name: 'azure-ad-email-mapper',
        identityProviderAlias: 'azure-ad',
        identityProviderMapper: 'oidc-user-attribute-idp-mapper',
        config: {
          syncMode: 'INHERIT',
          claim: 'email',
          'user.attribute': 'email'
        }
      },
      {
        name: 'azure-ad-firstname-mapper',
        identityProviderAlias: 'azure-ad',
        identityProviderMapper: 'oidc-user-attribute-idp-mapper',
        config: {
          syncMode: 'INHERIT',
          claim: 'given_name',
          'user.attribute': 'firstName'
        }
      },
      {
        name: 'azure-ad-lastname-mapper',
        identityProviderAlias: 'azure-ad',
        identityProviderMapper: 'oidc-user-attribute-idp-mapper',
        config: {
          syncMode: 'INHERIT',
          claim: 'family_name',
          'user.attribute': 'lastName'
        }
      }
    ]

    for (const mapper of mappers) {
      try {
        await axios.post(
          `${keycloakUrl}/admin/realms/${realmName}/identity-provider/instances/azure-ad/mappers`,
          mapper,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        console.log(`  [AzureADSetup] ${mapper.name}`)
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`  [AzureADSetup] ${mapper.name} already exists`)
        } else {
          console.error(`  [AzureADSetup] Failed to create ${mapper.name}:`, error.response?.data || error.message)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('[AzureADSetup] Azure AD Identity Provider setup complete!')
    console.log('='.repeat(60))
    console.log('\n[AzureADSetup] Next steps:')
    console.log('1. In Azure Portal, add these redirect URIs to your app:')
    console.log(`   ${keycloakUrl}/realms/${realmName}/broker/azure-ad/endpoint`)
    console.log('\n2. Configure optional claims in Azure AD (recommended):')
    console.log('   - email')
    console.log('   - given_name')
    console.log('   - family_name')
    console.log('   - preferred_username')
    console.log('\n3. Test the integration:')
    console.log('   - Go to your AlmaDesk login page')
    console.log('   - Click "Sign in with Microsoft Azure AD"')
    console.log('   - Authenticate with your Azure AD account')
    console.log('\n4. To enable Azure AD login in frontend, set:')
    console.log(`   AZURE_AD_ENABLED=true in .env`)

  } catch (error) {
    console.error('\n[AzureADSetup] Error:', error.response?.data || error.message)
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2))
    }
    process.exit(1)
  } finally {
    rl.close()
  }
}

configureAzureAD()
