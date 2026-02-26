'use strict'
const { ImapFlow } = require('imapflow')
const prisma = require('../db')
const { logAudit } = require('./audit.service')



async function loadImapSettings() {
  const rows = await prisma.systemSettings.findMany({
    where: { key: { startsWith: 'imap_' } }
  })
  const s = {}
  for (const { key, value } of rows) s[key] = value
  return s
}


function streamToString(readable) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readable.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    readable.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    readable.on('error', reject)
  })
}


function extractPlainText(raw) {
  const headerEnd = raw.indexOf('\r\n\r\n')
  if (headerEnd === -1) return raw.trim()

  const body = raw.slice(headerEnd + 4)

  const boundaryMatch = raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n]+)"?/i)
  if (boundaryMatch) {
    const boundary = '--' + boundaryMatch[1].trim()
    const parts = body.split(boundary)
    for (const part of parts) {
      if (/Content-Type:\s*text\/plain/i.test(part)) {
        const partBody = part.slice(part.indexOf('\r\n\r\n') + 4)
        return decodeTransferEncoding(part, partBody).trim()
      }
    }
    for (const part of parts) {
      const pb = part.slice(part.indexOf('\r\n\r\n') + 4).trim()
      if (pb && pb !== '--') return pb
    }
  }

  return decodeTransferEncoding(raw, body).trim()
}

function decodeTransferEncoding(headers, body) {
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
    return body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  }
  if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
    try { return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8') } catch { return body }
  }
  return body
}


let _pollRunning = false


async function pollInbox() {
  if (_pollRunning) return
  _pollRunning = true

  try {
    const s = await loadImapSettings()

    if (s.imap_enabled !== 'true') return
    if (!s.imap_host || !s.imap_user || !s.imap_password) {
      console.warn('[IMAP] Brak konfiguracji IMAP – pominięto polling')
      return
    }

    const systemUser = await prisma.user.findFirst({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
      orderBy: { id: 'asc' }
    })
    if (!systemUser) {
      console.warn('[IMAP] Brak użytkownika systemowego – pominięto polling')
      return
    }

    const client = new ImapFlow({
      host: s.imap_host,
      port: parseInt(s.imap_port || '993'),
      secure: s.imap_secure === 'true',
      auth: {
        user: s.imap_user,
        pass: s.imap_password
      },
      logger: false,
      connectionTimeout: 15000,
      greetingTimeout: 10000
    })

    await client.connect()
    await client.mailboxOpen(s.imap_mailbox || 'INBOX')

    const uids = []
    for await (const msg of client.fetch({ seen: false }, {
      uid: true,
      envelope: true,
      source: true
    })) {
      try {
        const subject = msg.envelope?.subject || '(brak tematu)'
        const fromAddr = msg.envelope?.from?.[0]?.address || ''
        const fromName = msg.envelope?.from?.[0]?.name || fromAddr

        const rawSource = msg.source?.toString('utf-8') || ''
        let description = extractPlainText(rawSource)
        if (!description) description = '(brak treści)'

        let sender = await prisma.user.findFirst({ where: { email: fromAddr } })

        const senderNote = sender
          ? ''
          : `**Nadawca:** ${fromName} <${fromAddr}>\n\n`

        const creatorId = sender ? sender.id : systemUser.id

        const ticket = await prisma.ticket.create({
          data: {
            title: subject.substring(0, 255),
            description: senderNote + description,
            priority: 'MEDIUM',
            category: 'OTHER',
            status: 'OPEN',
            source: 'EMAIL',
            createdById: creatorId
          }
        })

        console.log(`[IMAP] Nowe zgłoszenie #${ticket.id} z maila od ${fromAddr}: "${subject}"`)

        logAudit({
          action: 'CREATE_TICKET',
          entityType: 'Ticket',
          entityId: ticket.id,
          ticketId: ticket.id,
          userId: systemUser.id,
          changes: { title: subject, source: 'EMAIL', from: fromAddr }
        }).catch(() => {})

        uids.push(msg.uid)
      } catch (msgErr) {
        console.error('[IMAP] Błąd przetwarzania wiadomości:', msgErr.message)
      }
    }

    if (uids.length > 0) {
      await client.messageFlagsAdd({ uid: uids }, ['\\Seen'], { uid: true })
      console.log(`[IMAP] Przetworzono ${uids.length} wiadomość(i)`)
    }

    await client.logout()
  } catch (err) {
    console.error('[IMAP] Błąd pollingu:', err.message)
  } finally {
    _pollRunning = false
  }
}


async function testImapConnection(settings) {
  const client = new ImapFlow({
    host: settings.imap_host,
    port: parseInt(settings.imap_port || '993'),
    secure: settings.imap_secure === 'true',
    auth: {
      user: settings.imap_user,
      pass: settings.imap_password
    },
    logger: false,
    connectionTimeout: 8000,
    greetingTimeout: 5000
  })

  await client.connect()
  const mailbox = await client.mailboxOpen(settings.imap_mailbox || 'INBOX')
  await client.logout()
  return {
    ok: true,
    mailbox: mailbox.path,
    messages: mailbox.exists
  }
}

module.exports = { pollInbox, testImapConnection }
