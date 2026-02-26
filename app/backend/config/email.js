const nodemailer = require('nodemailer')
const config = require('./env')



let transporter = null
let smtpConfig = null


async function loadSmtpConfigFromDb() {
  try {
    const prisma = require('../src/db')

    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_secure', 'smtp_from_email', 'smtp_from_name']
        }
      }
    })

    if (settings.length === 0) {
      return null
    }

    const dbConfig = {}
    settings.forEach(setting => {
      dbConfig[setting.key] = setting.value
    })

    if (dbConfig.smtp_host && dbConfig.smtp_port) {
      return {
        host: dbConfig.smtp_host,
        port: parseInt(dbConfig.smtp_port),
        user: dbConfig.smtp_user,
        password: dbConfig.smtp_password,
        secure: dbConfig.smtp_secure === 'true',
        fromEmail: dbConfig.smtp_from_email || 'noreply@almadesk.edu',
        fromName: dbConfig.smtp_from_name || 'AlmaDesk Support'
      }
    }

    return null
  } catch (error) {
    console.error('[Email] Failed to load SMTP config from database:', error.message)
    return null
  }
}


async function initializeTransporter() {
  try {
    const dbConfig = await loadSmtpConfigFromDb()

    if (dbConfig) {
      smtpConfig = dbConfig
      console.log('[Email] Using SMTP configuration from database')
    } else if (config.SMTP_HOST && config.SMTP_PORT) {
      smtpConfig = {
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT),
        user: config.SMTP_USER,
        password: config.SMTP_PASSWORD,
        secure: config.SMTP_SECURE === 'true',
        fromEmail: config.SMTP_FROM_EMAIL || 'noreply@almadesk.edu',
        fromName: config.SMTP_FROM_NAME || 'AlmaDesk Support'
      }
      console.log('[Email] Using SMTP configuration from environment variables')
    } else {
      console.warn('[Email] SMTP configuration missing - email notifications disabled')
      return null
    }

    const transportConfig = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password
      }
    }

    transporter = nodemailer.createTransport(transportConfig)

    transporter.verify((error, success) => {
      if (error) {
        console.error('[Email] SMTP connection error:', error.message)
      } else {
        console.log('[Email] SMTP server ready to send emails')
      }
    })

    return transporter
  } catch (error) {
    console.error('[Email] Failed to initialize email transporter:', error.message)
    return null
  }
}


async function getTransporter() {
  if (!transporter) {
    transporter = await initializeTransporter()
  }
  return transporter
}


function getSmtpConfig() {
  return smtpConfig
}


async function reloadTransporter() {
  transporter = null
  smtpConfig = null
  return await initializeTransporter()
}

module.exports = {
  initializeTransporter,
  getTransporter,
  getSmtpConfig,
  reloadTransporter
}
