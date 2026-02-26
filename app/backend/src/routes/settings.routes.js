
const express = require('express')
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')
const config = require('../../config/env')

const router = express.Router()

const superAdminOnly = async (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Super admin only.' })
  }
  next()
}


router.get('/smtp', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const smtpKeys = [
      'smtp_host',
      'smtp_port',
      'smtp_user',
      'smtp_secure',
      'smtp_from_email',
      'smtp_from_name',
      'smtp_provider'
    ]

    const settings = await prisma.systemSettings.findMany({
      where: {
        key: { in: smtpKeys }
      }
    })

    const smtpConfig = {}
    settings.forEach(setting => {
      if (setting.isSecret && setting.value) {
        smtpConfig[setting.key] = '********'
      } else {
        smtpConfig[setting.key] = setting.value
      }
    })

    smtpKeys.forEach(key => {
      if (!smtpConfig[key]) {
        smtpConfig[key] = null
      }
    })

    res.json(smtpConfig)
  } catch (error) {
    console.error('Get SMTP settings error:', error)
    res.status(500).json({ error: 'Failed to get SMTP settings' })
  }
})


router.put('/smtp', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_password,
      smtp_secure,
      smtp_from_email,
      smtp_from_name,
      smtp_provider
    } = req.body

    const updates = [
      { key: 'smtp_host', value: smtp_host, isSecret: false },
      { key: 'smtp_port', value: smtp_port?.toString(), isSecret: false },
      { key: 'smtp_user', value: smtp_user, isSecret: false },
      { key: 'smtp_secure', value: smtp_secure?.toString(), isSecret: false },
      { key: 'smtp_from_email', value: smtp_from_email, isSecret: false },
      { key: 'smtp_from_name', value: smtp_from_name, isSecret: false },
      { key: 'smtp_provider', value: smtp_provider || 'custom', isSecret: false }
    ]

    if (smtp_password && smtp_password !== '********') {
      updates.push({ key: 'smtp_password', value: smtp_password, isSecret: true })
    }

    for (const { key, value, isSecret } of updates) {
      if (value !== undefined && value !== null) {
        await prisma.systemSettings.upsert({
          where: { key },
          update: {
            value,
            isSecret,
            category: 'smtp',
            updatedBy: req.user.id
          },
          create: {
            key,
            value,
            isSecret,
            category: 'smtp',
            updatedBy: req.user.id
          }
        })
      }
    }

    const { reloadTransporter } = require('../services/email.service')
    await reloadTransporter()

    res.json({
      message: 'SMTP settings updated successfully',
      note: 'Email transporter has been reloaded with new configuration'
    })
  } catch (error) {
    console.error('Update SMTP settings error:', error)
    res.status(500).json({ error: 'Failed to update SMTP settings' })
  }
})


router.post('/smtp/test', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { testEmail } = req.body

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address is required' })
    }

    const { sendEmail } = require('../services/email.service')

    const result = await sendEmail({
      to: testEmail,
      subject: '[AlmaDesk] Test konfiguracji SMTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .success { background: #d1fae5; padding: 15px; border-radius: 6px; color: #065f46; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">✅ Test konfiguracji SMTP</h2>
            </div>
            <div class="content">
              <div class="success">
                <h3>Gratulacje!</h3>
                <p>Konfiguracja SMTP działa prawidłowo. System AlmaDesk jest gotowy do wysyłania powiadomień email.</p>
              </div>
              <p><strong>Data testu:</strong> ${new Date().toLocaleString('pl-PL')}</p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test email'
      })
    }
  } catch (error) {
    console.error('SMTP test error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email'
    })
  }
})


router.get('/smtp/presets', verifyToken, superAdminOnly, async (req, res) => {
  const presets = {
    office365: {
      name: 'Microsoft 365 / Office 365',
      smtp_host: 'smtp.office365.com',
      smtp_port: '587',
      smtp_secure: 'false',
      description: 'Konfiguracja dla kont Microsoft 365 / Office 365',
      userPlaceholder: 'twoj-email@domena.edu',
      instructions: [
        '⚠️ UWAGA: Microsoft wyłączył podstawowe uwierzytelnianie SMTP - MUSISZ użyć "Hasła aplikacji"!',
        '1. Użyj pełnego adresu email jako nazwy użytkownika',
        '2. Wygeneruj hasło aplikacji:',
        '   • Konta osobiste: https://account.microsoft.com/security',
        '   • Konta firmowe/edu: https://mysignins.microsoft.com/security-info',
        '3. Znajdź "Hasła aplikacji" / "App passwords" i wygeneruj nowe',
        '4. Skopiuj wygenerowane hasło i użyj w polu "Hasło" (NIE używaj zwykłego hasła!)',
        '5. Port 587 z TLS (STARTTLS)',
        '⚠️ Jeśli nie widzisz opcji hasła aplikacji, skontaktuj się z administratorem IT'
      ]
    },
    google: {
      name: 'Google Gmail / Workspace',
      smtp_host: 'smtp.gmail.com',
      smtp_port: '587',
      smtp_secure: 'false',
      description: 'Konfiguracja dla Gmail lub Google Workspace',
      userPlaceholder: 'twoj-email@gmail.com',
      instructions: [
        '⚠️ UWAGA: Gmail wymaga "Hasła aplikacji" - nie używaj zwykłego hasła do konta!',
        '1. Włącz weryfikację dwuetapową w swoim koncie Google',
        '2. Wejdź na: https://myaccount.google.com/apppasswords',
        '3. Wybierz aplikację "Poczta" i urządzenie',
        '4. Skopiuj wygenerowane 16-znakowe hasło i użyj go w polu "Hasło" poniżej',
        '5. Port 587 z TLS (STARTTLS)'
      ]
    },
    custom: {
      name: 'Niestandardowa konfiguracja',
      smtp_host: '',
      smtp_port: '587',
      smtp_secure: 'false',
      description: 'Własny serwer SMTP',
      userPlaceholder: 'uzytkownik@domena.pl',
      instructions: [
        'Wprowadź dane swojego serwera SMTP',
        'Port 587 dla TLS (STARTTLS), 465 dla SSL',
        'Skontaktuj się z administratorem serwera po szczegóły'
      ]
    }
  }

  res.json(presets)
})



router.get('/scheduled-reports', verifyToken, async (req, res) => {
  if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' })
  }
  try {
    const rows = await prisma.systemSettings.findMany({ where: { category: 'scheduled_reports' } })
    const map  = {}
    rows.forEach(r => { map[r.key] = r.value })
    res.json({
      enabled:    map['sr_enabled']    === 'true',
      frequency:  map['sr_frequency']  || 'monthly',
      recipients: map['sr_recipients'] || '',
      hour:       parseInt(map['sr_hour'] || '7', 10)
    })
  } catch (err) {
    console.error('Get scheduled-reports settings error:', err)
    res.status(500).json({ error: 'Failed to fetch scheduled reports settings' })
  }
})


router.put('/scheduled-reports', verifyToken, superAdminOnly, async (req, res) => {
  const { enabled, frequency, recipients, hour } = req.body
  try {
    const updates = [
      { key: 'sr_enabled',    value: String(!!enabled) },
      { key: 'sr_frequency',  value: frequency  || 'monthly' },
      { key: 'sr_recipients', value: recipients || '' },
      { key: 'sr_hour',       value: String(parseInt(hour ?? 7, 10)) }
    ]
    for (const { key, value } of updates) {
      await prisma.systemSettings.upsert({
        where: { key },
        update:  { value, category: 'scheduled_reports', updatedBy: req.user.id },
        create:  { key, value, isSecret: false, category: 'scheduled_reports', updatedBy: req.user.id }
      })
    }
    const { startScheduler } = require('../services/scheduler.service')
    await startScheduler()

    res.json({ message: 'Scheduled reports settings updated and scheduler reloaded' })
  } catch (err) {
    console.error('Update scheduled-reports settings error:', err)
    res.status(500).json({ error: 'Failed to update scheduled reports settings' })
  }
})


router.post('/scheduled-reports/trigger', verifyToken, superAdminOnly, async (req, res) => {
  const { frequency, recipients } = req.body
  if (!recipients || !recipients.trim()) {
    return res.status(400).json({ error: 'Podaj co najmniej jeden adres e-mail odbiorcy' })
  }
  try {
    const { triggerNow } = require('../services/scheduler.service')
    const result = await triggerNow(frequency || 'monthly', recipients)
    res.json({
      message: `Raport (${frequency || 'monthly'}) wysłany do ${result.sent} odbiorców`,
      sent: result.sent,
      failed: result.failed
    })
  } catch (err) {
    console.error('Trigger report error:', err)
    res.status(500).json({ error: err.message || 'Failed to trigger report' })
  }
})


const IMAP_KEYS = [
  'imap_enabled', 'imap_host', 'imap_port', 'imap_user', 'imap_password',
  'imap_secure', 'imap_mailbox', 'imap_poll_interval'
]


router.get('/imap', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const rows = await prisma.systemSettings.findMany({
      where: { key: { in: IMAP_KEYS } }
    })
    const result = {}
    for (const { key, value, isSecret } of rows) {
      result[key] = isSecret && value ? '••••••••' : (value || '')
    }
    if (!result.imap_port)          result.imap_port = '993'
    if (!result.imap_secure)        result.imap_secure = 'true'
    if (!result.imap_mailbox)       result.imap_mailbox = 'INBOX'
    if (!result.imap_poll_interval) result.imap_poll_interval = '5'
    if (!result.imap_enabled)       result.imap_enabled = 'false'
    res.json(result)
  } catch (err) {
    console.error('IMAP GET error:', err)
    res.status(500).json({ error: 'Failed to fetch IMAP settings' })
  }
})


router.put('/imap', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const secretKeys = new Set(['imap_password'])
    const allowed = IMAP_KEYS

    for (const key of allowed) {
      if (!(key in req.body)) continue
      const value = req.body[key]
      const isSecret = secretKeys.has(key)

      if (isSecret && value === '••••••••') continue

      await prisma.systemSettings.upsert({
        where: { key },
        update: { value: value?.toString() || '', isSecret, updatedBy: req.user.id },
        create: { key, value: value?.toString() || '', isSecret, category: 'imap', updatedBy: req.user.id }
      })
    }

    const { restartImapPolling } = require('../services/scheduler.service')
    if (typeof restartImapPolling === 'function') restartImapPolling()

    res.json({ message: 'Ustawienia IMAP zapisane' })
  } catch (err) {
    console.error('IMAP PUT error:', err)
    res.status(500).json({ error: 'Failed to update IMAP settings' })
  }
})


router.post('/imap/test', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { testImapConnection } = require('../services/imap.service')
    const result = await testImapConnection(req.body)
    res.json({ ok: true, message: `Połączono pomyślnie. Skrzynka: ${result.mailbox} (${result.messages} wiad.)` })
  } catch (err) {
    console.error('IMAP test error:', err)
    res.status(400).json({ ok: false, error: err.message || 'Nie udało się połączyć z serwerem IMAP' })
  }
})


router.post('/imap/poll', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { pollInbox } = require('../services/imap.service')
    await pollInbox()
    res.json({ ok: true, message: 'Polling zakończony' })
  } catch (err) {
    console.error('IMAP poll error:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})


router.get('/sso', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const ssoKeys = [
      'sso_enabled',
      'sso_azure_enabled',
      'sso_azure_tenant_id',
      'sso_azure_client_id',
      'sso_azure_client_secret',
      'sso_azure_display_name',
      'sso_google_enabled',
      'sso_google_client_id',
      'sso_google_client_secret',
      'sso_google_display_name',
      'sso_github_enabled',
      'sso_github_client_id',
      'sso_github_client_secret',
      'sso_github_display_name',
      'sso_gitlab_enabled',
      'sso_gitlab_url',
      'sso_gitlab_client_id',
      'sso_gitlab_client_secret',
      'sso_gitlab_display_name'
    ]

    const settings = await prisma.systemSettings.findMany({
      where: {
        key: { in: ssoKeys }
      }
    })

    const ssoConfig = {}
    settings.forEach(setting => {
      if (setting.isSecret && setting.value) {
        ssoConfig[setting.key] = '********'
      } else {
        ssoConfig[setting.key] = setting.value
      }
    })

    ssoKeys.forEach(key => {
      if (!ssoConfig[key]) {
        ssoConfig[key] = null
      }
    })

    res.json(ssoConfig)
  } catch (error) {
    console.error('Error fetching SSO settings:', error)
    res.status(500).json({ error: 'Failed to fetch SSO settings' })
  }
})


router.put('/sso', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const updates = req.body

    const secretKeys = [
      'sso_azure_client_secret',
      'sso_google_client_secret',
      'sso_github_client_secret',
      'sso_gitlab_client_secret'
    ]

    for (const [key, value] of Object.entries(updates)) {
      if (secretKeys.includes(key) && value === '********') {
        continue
      }

      const isSecret = secretKeys.includes(key)

      await prisma.systemSettings.upsert({
        where: { key },
        update: {
          value: value || '',
          isSecret
        },
        create: {
          key,
          value: value || '',
          isSecret
        }
      })
    }

    console.log('[Settings] Synchronizing SSO with Keycloak...')
    const keycloakSync = require('../services/keycloak-sync.service')
    const syncResult = await keycloakSync.syncAllProviders()

    if (syncResult.success) {
      console.log('[Settings] Keycloak synchronization successful:', syncResult.results)
      res.json({
        success: true,
        message: 'SSO configuration updated and synchronized with Keycloak',
        syncResults: syncResult.results
      })
    } else {
      console.warn('[Settings] Keycloak synchronization failed:', syncResult.error)
      res.json({
        success: true,
        message: 'SSO configuration updated but Keycloak sync failed: ' + syncResult.error,
        syncResults: syncResult.results
      })
    }
  } catch (error) {
    console.error('Error updating SSO settings:', error)
    res.status(500).json({ error: 'Failed to update SSO settings' })
  }
})


router.post('/sso/sync', verifyToken, superAdminOnly, async (req, res) => {
  try {
    console.log('[Settings] Manual SSO synchronization triggered...')
    const keycloakSync = require('../services/keycloak-sync.service')
    const syncResult = await keycloakSync.syncAllProviders()

    if (syncResult.success) {
      res.json({
        success: true,
        message: 'SSO providers synchronized with Keycloak successfully',
        results: syncResult.results
      })
    } else {
      res.status(500).json({
        success: false,
        error: syncResult.error,
        results: syncResult.results
      })
    }
  } catch (error) {
    console.error('Error syncing SSO with Keycloak:', error)
    res.status(500).json({ error: 'Failed to sync SSO with Keycloak' })
  }
})

module.exports = router
