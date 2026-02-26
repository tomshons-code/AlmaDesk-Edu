
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')
const keycloak = require('../../config/keycloak')
const config = require('../../config/env')
const { logAudit, reqMeta } = require('../services/audit.service')

const router = express.Router()

router.get('/sso/config', async (req, res) => {
  try {
    const ssoConfig = {
      enabled: false,
      providers: []
    }

    const ssoKeys = [
      'sso_enabled',
      'sso_azure_enabled', 'sso_azure_display_name',
      'sso_google_enabled', 'sso_google_display_name',
      'sso_github_enabled', 'sso_github_display_name',
      'sso_gitlab_enabled', 'sso_gitlab_display_name'
    ]

    const settings = await prisma.systemSettings.findMany({
      where: { key: { in: ssoKeys } }
    })

    const settingsMap = {}
    settings.forEach(s => { settingsMap[s.key] = s.value })

    const ssoEnabled = settingsMap.sso_enabled !== undefined
      ? settingsMap.sso_enabled === 'true'
      : config.ENABLE_SSO

    if (!ssoEnabled) {
      return res.json(ssoConfig)
    }

    ssoConfig.enabled = true

    const azureEnabled = settingsMap.sso_azure_enabled !== undefined
      ? settingsMap.sso_azure_enabled === 'true'
      : config.AZURE_AD_ENABLED

    if (azureEnabled) {
      ssoConfig.providers.push({
        id: 'azure-ad',
        name: settingsMap.sso_azure_display_name || config.AZURE_AD_DISPLAY_NAME || 'Sign in with Microsoft',
        type: 'oidc',
        loginUrl: '/api/auth/sso/login?provider=azure-ad'
      })
    }

    const googleEnabled = settingsMap.sso_google_enabled === 'true'
    if (googleEnabled) {
      ssoConfig.providers.push({
        id: 'google',
        name: settingsMap.sso_google_display_name || 'Sign in with Google',
        type: 'oidc',
        loginUrl: '/api/auth/sso/login?provider=google'
      })
    }

    const githubEnabled = settingsMap.sso_github_enabled === 'true'
    if (githubEnabled) {
      ssoConfig.providers.push({
        id: 'github',
        name: settingsMap.sso_github_display_name || 'Sign in with GitHub',
        type: 'oauth',
        loginUrl: '/api/auth/sso/login?provider=github'
      })
    }

    const gitlabEnabled = settingsMap.sso_gitlab_enabled === 'true'
    if (gitlabEnabled) {
      ssoConfig.providers.push({
        id: 'gitlab',
        name: settingsMap.sso_gitlab_display_name || 'Sign in with GitLab',
        type: 'oauth',
        loginUrl: '/api/auth/sso/login?provider=gitlab'
      })
    }

    res.json(ssoConfig)
  } catch (error) {
    console.error('SSO config error:', error)
    res.status(500).json({ error: 'Failed to get SSO configuration' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { login, password, mfaToken } = req.body

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' })
    }

    const user = await prisma.user.findUnique({
      where: { login }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (user.mfaEnabled) {
      if (!mfaToken) {
        return res.status(200).json({
          mfaRequired: true,
          message: 'MFA token required'
        })
      }

      const speakeasy = require('speakeasy')
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken,
        window: 2
      })

      if (!verified) {
        const isBackupCode = await verifyBackupCode(user.id, mfaToken)

        if (!isBackupCode) {
          logAudit({ action: 'LOGIN_FAILED_MFA', entityType: 'User', entityId: user.id, userId: user.id, ...reqMeta(req) }).catch(() => {})
          return res.status(401).json({ error: 'Invalid MFA token' })
        }
      }
    }

    try {
      await keycloak.ensureUserFromLocal(user)
    } catch (error) {
      console.warn('Keycloak sync skipped:', error.message)
    }

    const token = jwt.sign(
      {
        id: user.id,
        login: user.login,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    logAudit({ action: 'LOGIN', entityType: 'User', entityId: user.id, userId: user.id, ...reqMeta(req), changes: { login: user.login, role: user.role, mfaUsed: user.mfaEnabled } }).catch(() => {})

    res.json({
      token,
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        notifyEmail: user.notifyEmail,
        notifyBrowser: user.notifyBrowser,
        notifyTicketUpdates: user.notifyTicketUpdates,
        notifyAssignments: user.notifyAssignments
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/sso/login', async (req, res) => {
  try {
    const { provider } = req.query
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/sso/callback`

    const loginUrl = keycloak.getLoginUrl(redirectUri, '', provider)

    console.log(`[SSO] Login redirect to provider: ${provider || 'default'}`)
    return res.redirect(loginUrl)
  } catch (error) {
    console.error('SSO login error:', error)
    res.status(500).json({ error: 'Failed to start SSO login' })
  }
})

router.get('/sso/callback', async (req, res) => {
  try {
    const { code, error, error_description, state, session_state } = req.query

    console.log('[SSO] Callback received:', {
      hasCode: !!code,
      error,
      error_description,
      state,
      session_state
    })

    if (error) {
      console.error('[SSO] Keycloak returned error:', error, error_description)
      return res.redirect(`${config.FRONTEND_URL}?sso_error=${encodeURIComponent(error_description || error)}`)
    }

    if (!code) {
      console.error('[SSO] No authorization code in callback')
      return res.status(400).json({ error: 'Missing authorization code' })
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/sso/callback`
    console.log('[SSO] Exchanging code for token with redirect_uri:', redirectUri)

    const tokenResponse = await keycloak.exchangeCode(code, redirectUri)
    const userInfo = await keycloak.getUserInfo(tokenResponse.access_token)
    const decoded = jwt.decode(tokenResponse.access_token)
    const realmRoles = decoded?.realm_access?.roles || []

    console.log('[SSO] User info from Keycloak:', {
      username: userInfo.preferred_username,
      email: userInfo.email,
      roles: realmRoles
    })

    const resolvedRole = realmRoles.includes('SUPER_ADMIN')
      ? 'SUPER_ADMIN'
      : realmRoles.includes('ADMIN')
        ? 'ADMIN'
        : realmRoles.includes('AGENT')
          ? 'AGENT'
          : 'KLIENT'

    const login = userInfo.preferred_username || userInfo.email || userInfo.sub
    const name = userInfo.name || userInfo.preferred_username || login

    let user = await prisma.user.findUnique({ where: { login } })

    if (user) {
      user = await prisma.user.update({
        where: { login },
        data: {
          email: userInfo.email || user.email,
          name: name || user.name
        }
      })
      console.log(`[SSO] Existing user logged in with role: ${user.role}`)
    } else {
      user = await prisma.user.create({
        data: {
          login,
          email: userInfo.email || `${login}@example.local`,
          name,
          password: await bcrypt.hash(`${login}-${Date.now()}`, 10),
          role: resolvedRole
        }
      })
      console.log(`[SSO] New user created with role: ${user.role}`)
    }

    try {
      await keycloak.ensureUserFromLocal(user)
    } catch (err) {
      console.warn('[SSO] Keycloak sync skipped:', err.message)
    }

    const token = jwt.sign(
      {
        id: user.id,
        login: user.login,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    const redirectTarget = `${config.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`
    console.log('[SSO] Login successful, redirecting to:', redirectTarget)
    logAudit({ action: 'LOGIN_SSO', entityType: 'User', entityId: user.id, userId: user.id, ...reqMeta(req), changes: { login: user.login, role: user.role } }).catch(() => {})
    return res.redirect(redirectTarget)
  } catch (error) {
    console.error('[SSO] Callback error:', error.message)
    console.error('[SSO] Stack:', error.stack)
    res.status(500).json({ error: 'SSO login failed', details: error.message })
  }
})

router.post('/refresh', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, login: true, email: true, name: true, role: true,
        phone: true, department: true, agentSignature: true,
        notifyEmail: true, notifyBrowser: true,
        notifyTicketUpdates: true, notifyAssignments: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const token = jwt.sign(
      { id: user.id, login: user.login, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    )

    res.json({ token, user })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/verify', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        department: true,
        agentSignature: true,
        notifyEmail: true,
        notifyBrowser: true,
        notifyTicketUpdates: true,
        notifyAssignments: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        department: user.department,
        agentSignature: user.agentSignature,
        notifyEmail: user.notifyEmail,
        notifyBrowser: user.notifyBrowser,
        notifyTicketUpdates: user.notifyTicketUpdates,
        notifyAssignments: user.notifyAssignments
      }
    })
  } catch (error) {
    console.error('Verify token error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, department, agentSignature, notifyEmail, notifyBrowser, notifyTicketUpdates, notifyAssignments } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (department !== undefined) updateData.department = department

    if (agentSignature !== undefined && (req.user.role === 'AGENT' || req.user.role === 'SUPER_ADMIN')) {
      updateData.agentSignature = agentSignature
    }

    if (notifyEmail !== undefined) updateData.notifyEmail = Boolean(notifyEmail)
    if (notifyBrowser !== undefined) updateData.notifyBrowser = Boolean(notifyBrowser)
    if (notifyTicketUpdates !== undefined) updateData.notifyTicketUpdates = Boolean(notifyTicketUpdates)
    if (notifyAssignments !== undefined) updateData.notifyAssignments = Boolean(notifyAssignments)

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        department: true,
        agentSignature: true,
        notifyEmail: true,
        notifyBrowser: true,
        notifyTicketUpdates: true,
        notifyAssignments: true
      }
    })

    res.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})


const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const crypto = require('crypto')


function generateBackupCodes(count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  return codes
}


async function hashBackupCode(code) {
  return await bcrypt.hash(code, 10)
}


async function verifyBackupCode(userId, code) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaBackupCodes: true }
    })

    if (!user || !user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
      return false
    }

    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const isMatch = await bcrypt.compare(code.toUpperCase(), user.mfaBackupCodes[i])

      if (isMatch) {
        const updatedCodes = [...user.mfaBackupCodes]
        updatedCodes.splice(i, 1)

        await prisma.user.update({
          where: { id: userId },
          data: { mfaBackupCodes: updatedCodes }
        })

        console.log(`[MFA] Backup code used for user ${userId}. Remaining: ${updatedCodes.length}`)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Backup code verification error:', error)
    return false
  }
}

router.post('/mfa/setup', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, login: true, email: true, mfaEnabled: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA is already enabled' })
    }

    const secret = speakeasy.generateSecret({
      name: `AlmaDesk-Edu (${user.login})`,
      issuer: 'AlmaDesk-Edu'
    })

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret.base32 }
    })

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    })
  } catch (error) {
    console.error('MFA setup error:', error)
    res.status(500).json({ error: 'Failed to setup MFA' })
  }
})

router.post('/mfa/verify', verifyToken, async (req, res) => {
  try {
    const { token } = req.body

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: 'Invalid token format' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { mfaSecret: true }
    })

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not initialized. Call /mfa/setup first' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({
      success: true,
      message: 'Token verified successfully'
    })
  } catch (error) {
    console.error('MFA verify error:', error)
    res.status(500).json({ error: 'Failed to verify token' })
  }
})

router.post('/mfa/enable', verifyToken, async (req, res) => {
  try {
    const { token } = req.body

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: 'Invalid token format' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, mfaSecret: true, mfaEnabled: true }
    })

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not initialized. Call /mfa/setup first' })
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA is already enabled' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    )

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: hashedBackupCodes
      }
    })

    logAudit({
      action: 'MFA_ENABLED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      ...reqMeta(req)
    }).catch(() => {})

    res.json({
      success: true,
      message: 'MFA enabled successfully',
      backupCodes: backupCodes
    })
  } catch (error) {
    console.error('MFA enable error:', error)
    res.status(500).json({ error: 'Failed to enable MFA' })
  }
})

router.post('/mfa/disable', verifyToken, async (req, res) => {
  try {
    const { password, token } = req.body

    if (!password) {
      return res.status(400).json({ error: 'Password required' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true, mfaEnabled: true, mfaSecret: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA is not enabled' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' })
    }

    if (token) {
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2
      })

      if (!verified) {
        return res.status(401).json({ error: 'Invalid MFA token' })
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: []
      }
    })

    logAudit({
      action: 'MFA_DISABLED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      ...reqMeta(req)
    }).catch(() => {})

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    })
  } catch (error) {
    console.error('MFA disable error:', error)
    res.status(500).json({ error: 'Failed to disable MFA' })
  }
})

router.post('/mfa/regenerate-backup-codes', verifyToken, async (req, res) => {
  try {
    const { token } = req.body

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: 'MFA token required' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, mfaEnabled: true, mfaSecret: true }
    })

    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA is not enabled' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA token' })
    }

    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    )

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaBackupCodes: hashedBackupCodes }
    })

    logAudit({
      action: 'MFA_BACKUP_CODES_REGENERATED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      ...reqMeta(req)
    }).catch(() => {})

    res.json({
      success: true,
      message: 'Backup codes regenerated',
      backupCodes: backupCodes
    })
  } catch (error) {
    console.error('Regenerate backup codes error:', error)
    res.status(500).json({ error: 'Failed to regenerate backup codes' })
  }
})

router.get('/mfa/status', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        mfaEnabled: true,
        mfaBackupCodes: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      mfaEnabled: user.mfaEnabled,
      backupCodesCount: user.mfaBackupCodes ? user.mfaBackupCodes.length : 0
    })
  } catch (error) {
    console.error('MFA status error:', error)
    res.status(500).json({ error: 'Failed to get MFA status' })
  }
})

module.exports = router
