const cron = require('node-cron')
const fs = require('fs')
const PDFDocument = require('pdfkit')
const prisma = require('../db')

let imapJob = null

let recurringAlertsJob = null

const FONT_PATHS = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
]
const FONT_BOLD_PATHS = [
  'C:/Windows/Fonts/arialbd.ttf',
  'C:/Windows/Fonts/Arialbd.ttf',
  '/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
]
function findFontPath (paths) {
  for (const p of paths) { if (fs.existsSync(p)) return p }
  return null
}
const ARIAL_PATH      = findFontPath(FONT_PATHS)
const ARIAL_BOLD_PATH = findFontPath(FONT_BOLD_PATHS)

function getStatusLabel (s) {
  return { OPEN: 'Nowe', IN_PROGRESS: 'W trakcie', RESOLVED: 'Rozwiązane', CLOSED: 'Zamknięte', PENDING: 'Oczekuje' }[s] || s
}
function getPriorityLabel (p) {
  return { LOW: 'Niski', MEDIUM: 'Średni', HIGH: 'Wysoki', CRITICAL: 'Krytyczny', ESCALATED: 'Eskalowany' }[p] || p
}
function getCategoryLabel (c) {
  return { HARDWARE: 'Sprzęt', SOFTWARE: 'Oprogramowanie', NETWORK: 'Sieć', ACCESS: 'Dostęp', ACCOUNT: 'Konto', EMAIL: 'Email', PRINTER: 'Drukarka', INFRASTRUCTURE: 'Infrastruktura', OTHER: 'Inne' }[c] || c
}

async function getScheduleSettings () {
  const rows = await prisma.systemSettings.findMany({
    where: { category: 'scheduled_reports' }
  })
  const map = {}
  rows.forEach(r => { map[r.key] = r.value })
  return {
    enabled:    map['sr_enabled']    === 'true',
    frequency:  map['sr_frequency']  || 'monthly',
    recipients: map['sr_recipients'] || '',
    hour:       parseInt(map['sr_hour'] || '7', 10)
  }
}

function buildStats (tickets) {
  const stats = { total: tickets.length, byStatus: {}, byPriority: {}, byCategory: {}, avgResolutionTime: 0, resolvedCount: 0 }
  let totalRes = 0, resCount = 0
  tickets.forEach(t => {
    stats.byStatus[t.status]     = (stats.byStatus[t.status]     || 0) + 1
    stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1
    stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1
    if ((t.status === 'RESOLVED' || t.status === 'CLOSED') && t.resolvedAt) {
      totalRes += new Date(t.resolvedAt) - new Date(t.createdAt)
      resCount++
    }
  })
  if (resCount > 0) stats.avgResolutionTime = Math.round(totalRes / resCount / 3_600_000)
  stats.resolvedCount = resCount
  return stats
}

function generatePdfBuffer (tickets, stats, periodLabel) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true, autoFirstPage: true })
    if (ARIAL_PATH)      { doc.registerFont('Polish', ARIAL_PATH); doc.font('Polish') }
    if (ARIAL_BOLD_PATH) { doc.registerFont('Polish-Bold', ARIAL_BOLD_PATH) }

    const chunks = []
    doc.on('data',  c => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const primaryColor   = '#3B82F6'
    const secondaryColor = '#6B7280'
    const successColor   = '#10B981'

    doc.rect(0, 0, doc.page.width, 120).fill(primaryColor)
    doc.fontSize(22).fillColor('#FFFFFF').text('Raport Zgłoszeń AlmaDesk', 50, 35, { align: 'center' })
    doc.fontSize(11).fillColor('#E5E7EB').text(periodLabel, 50, 70, { align: 'center' })
    doc.fontSize(9).fillColor('#CBD5E1').text(
      `Wygenerowano automatycznie: ${new Date().toLocaleString('pl-PL')}`,
      50, 90, { align: 'center' }
    )

    doc.fillColor('#000000')
    let yPos = 145

    const boxes = [
      { label: 'Łączna liczba', value: stats.total.toString(),       color: primaryColor },
      { label: 'Rozwiązane',    value: stats.resolvedCount.toString(), color: successColor },
      { label: 'Średni czas',   value: stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}h` : 'N/A', color: secondaryColor },
      { label: 'Wskaźnik',      value: stats.total > 0 ? `${Math.round(stats.resolvedCount / stats.total * 100)}%` : '0%', color: '#F59E0B' }
    ]
    const bw = 113, bh = 70, gap = 12
    boxes.forEach((b, i) => {
      const x = 50 + i * (bw + gap)
      doc.rect(x, yPos, bw, bh).fillAndStroke(b.color, b.color)
      doc.fontSize(24).fillColor('#FFFFFF').text(b.value, x, yPos + 13, { width: bw, align: 'center' })
      doc.fontSize(9).fillColor('#E5E7EB').text(b.label, x, yPos + 47, { width: bw, align: 'center' })
    })
    yPos += bh + 25

    doc.fontSize(12).fillColor(primaryColor).text('Podział według statusu:', 50, yPos)
    doc.fontSize(12).fillColor(primaryColor).text('Podział według priorytetu:', 300, yPos)
    yPos += 20
    let syPos = yPos, pyPos = yPos
    doc.fontSize(9).fillColor('#000000')
    Object.entries(stats.byStatus).forEach(([s, c]) => { doc.text(`${getStatusLabel(s)}: ${c}`, 50, syPos); syPos += 16 })
    Object.entries(stats.byPriority).forEach(([p, c]) => { doc.text(`${getPriorityLabel(p)}: ${c}`, 300, pyPos); pyPos += 16 })
    yPos = Math.max(syPos, pyPos) + 15

    doc.fontSize(12).fillColor(primaryColor).text('Podział według kategorii:', 50, yPos)
    yPos += 20
    doc.fontSize(9).fillColor('#000000')
    Object.entries(stats.byCategory).forEach(([cat, c]) => { doc.text(`${getCategoryLabel(cat)}: ${c}`, 50, yPos); yPos += 16 })
    yPos += 10

    if (tickets.length > 0) {
      doc.addPage()
      doc.fontSize(16).fillColor(primaryColor).text('Lista zgłoszeń', 50, 50)
      doc.fontSize(9).fillColor(secondaryColor).text(`Pokazano ${Math.min(tickets.length, 40)} z ${tickets.length}`, 50, 72)

      let tY = 95
      const headers = ['ID', 'Tytuł', 'Status', 'Priorytet', 'Data']
      const colW    = [35, 185, 95, 90, 75]
      const rh      = 18

      const drawHeader = (y) => {
        doc.rect(50, y, 495, 22).fillAndStroke('#F3F4F6', '#E5E7EB')
        let x = 50
        doc.fontSize(9).fillColor('#000000')
        headers.forEach((h, i) => { doc.text(h, x + 5, y + 6, { width: colW[i] - 10 }); x += colW[i] })
        return y + 22
      }

      tY = drawHeader(tY)

      tickets.slice(0, 40).forEach((ticket, idx) => {
        if (tY > 750) { doc.addPage(); tY = drawHeader(50) }
        if (idx % 2 === 0) doc.rect(50, tY, 495, rh).fill('#FAFAFA')
        let x = 50
        doc.fontSize(8).fillColor('#000000')
        const row = [
          `#${ticket.id}`,
          ticket.title.length > 42 ? ticket.title.substring(0, 39) + '…' : ticket.title,
          getStatusLabel(ticket.status),
          getPriorityLabel(ticket.priority),
          new Date(ticket.createdAt).toLocaleDateString('pl-PL')
        ]
        row.forEach((cell, i) => {
          doc.text(cell, x + 5, tY + 5, { width: colW[i] - 10, lineBreak: false, ellipsis: true })
          x += colW[i]
        })
        tY += rh
      })

      if (tickets.length > 40) {
        doc.fontSize(9).fillColor(secondaryColor)
          .text(`… i ${tickets.length - 40} więcej zgłoszeń (pobierz Excel aby zobaczyć wszystkie)`, 50, tY + 10, { align: 'center', width: 495 })
      }
    }

    const count = doc.bufferedPageRange().count
    for (let i = 0; i < count; i++) {
      doc.switchToPage(i)
      doc.fontSize(8).fillColor(secondaryColor)
        .text(`AlmaDesk – Strona ${i + 1} z ${count}`, 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 })
    }

    doc.end()
  })
}


async function sendScheduledReport (frequency, recipientsOverride = null) {
  console.log(`[Scheduler] Generating ${frequency} report...`)

  const now = new Date()
  let startDate, endDate, periodLabel

  if (frequency === 'quarterly') {
    const q = Math.floor((now.getMonth()) / 3)
    const prevQ = q === 0 ? 3 : q - 1
    const year  = q === 0 ? now.getFullYear() - 1 : now.getFullYear()
    startDate   = new Date(year, prevQ * 3, 1)
    endDate     = new Date(year, prevQ * 3 + 3, 0, 23, 59, 59)
    periodLabel = `Raport kwartalny Q${prevQ + 1} ${year}`
  } else {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    startDate   = new Date(y, m, 1)
    endDate     = new Date(y, m + 1, 0, 23, 59, 59)
    const monthNames = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień']
    periodLabel = `Raport miesięczny – ${monthNames[m]} ${y}`
  }

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: startDate, lte: endDate }, isArchived: { not: true } },
    include: {
      createdBy:  { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, login: true } },
      tags:       { include: { tag: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const stats = buildStats(tickets)
  console.log(`[Scheduler] Found ${tickets.length} tickets for period: ${periodLabel}`)

  const pdfBuffer = await generatePdfBuffer(tickets, stats, periodLabel)

  let rawRecipients
  if (recipientsOverride !== null && recipientsOverride !== undefined) {
    rawRecipients = recipientsOverride
  } else {
    const settings = await getScheduleSettings()
    rawRecipients = settings.recipients
  }
  const recipientList = (rawRecipients || '').split(',').map(e => e.trim()).filter(Boolean)

  if (recipientList.length === 0) {
    throw new Error('Brak odbiorców – podaj co najmniej jeden adres e-mail')
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #3B82F6; color: white; padding: 20px 30px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${periodLabel}</h2>
      </div>
      <div style="background: #f9fafb; padding: 20px 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p>System AlmaDesk wygenerował automatyczny raport dla okresu: <strong>${periodLabel}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #EFF6FF;">
            <td style="padding: 10px; border: 1px solid #BFDBFE;">Łączna liczba zgłoszeń</td>
            <td style="padding: 10px; border: 1px solid #BFDBFE; font-weight: bold;">${stats.total}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Rozwiązane zgłoszenia</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${stats.resolvedCount}</td>
          </tr>
          <tr style="background: #EFF6FF;">
            <td style="padding: 10px; border: 1px solid #BFDBFE;">Wskaźnik rozwiązania</td>
            <td style="padding: 10px; border: 1px solid #BFDBFE; font-weight: bold;">
              ${stats.total > 0 ? Math.round(stats.resolvedCount / stats.total * 100) : 0}%
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Średni czas rozwiązania</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">
              ${stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}h` : 'N/A'}
            </td>
          </tr>
        </table>
        <p style="color: #6B7280; font-size: 13px;">Szczegółowy raport PDF w załączniku.</p>
      </div>
      <div style="background: #F3F4F6; padding: 12px 30px; border-radius: 0 0 8px 8px; font-size: 12px; color: #9CA3AF;">
        AlmaDesk – automatyczny raport | ${new Date().toLocaleDateString('pl-PL')}
      </div>
    </div>
  `

  const { sendEmail: _send } = require('./email.service')
  const errors = []
  for (const recipient of recipientList) {
    const result = await _send({
      to: recipient,
      subject: `[AlmaDesk] ${periodLabel}`,
      html: htmlBody,
      attachments: [{
        filename: `raport-${new Date().toISOString().split('T')[0]}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    })
    if (result.success) {
      console.log(`[Scheduler] Report sent to: ${recipient}`)
    } else {
      console.error(`[Scheduler] Error sending to ${recipient}:`, result.error)
      errors.push({ recipient, error: result.error })
    }
  }

  if (errors.length === recipientList.length) {
    throw new Error(`Wysyłka nieudana dla wszystkich odbiorców. Pierwszy błąd: ${errors[0].error}`)
  }

  return { sent: recipientList.length - errors.length, failed: errors }
}

let monthlyJob     = null
let quarterlyJob   = null
let schedulerReady = false


async function startScheduler () {
  if (monthlyJob)   { monthlyJob.stop();   monthlyJob   = null }
  if (quarterlyJob) { quarterlyJob.stop(); quarterlyJob = null }

  const settings = await getScheduleSettings()

  if (!settings.enabled) {
    console.log('[Scheduler] Report scheduling disabled')
    schedulerReady = true
    return
  }

  const h = settings.hour

  if (settings.frequency === 'monthly' || settings.frequency === 'both') {
    monthlyJob = cron.schedule(`0 ${h} 1 * *`, async () => {
      try { await sendScheduledReport('monthly') }
      catch (err) { console.error('[Scheduler] Monthly report error:', err) }
    }, { timezone: 'Europe/Warsaw' })
    console.log(`[Scheduler] Monthly report scheduled for 1st day of month at ${h}:00`)
  }

  if (settings.frequency === 'quarterly' || settings.frequency === 'both') {
    quarterlyJob = cron.schedule(`0 ${h} 1 1,4,7,10 *`, async () => {
      try { await sendScheduledReport('quarterly') }
      catch (err) { console.error('[Scheduler] Quarterly report error:', err) }
    }, { timezone: 'Europe/Warsaw' })
    console.log(`[Scheduler] Quarterly report scheduled for 1st day of quarter at ${h}:00`)
  }

  await restartImapPolling()

  startRecurringAlertsAnalysis()

  schedulerReady = true
}


async function triggerNow (frequency, recipients = null) {
  return sendScheduledReport(frequency || 'monthly', recipients)
}


async function restartImapPolling () {
  try {
    if (imapJob) { imapJob.stop(); imapJob = null }

    const rows = await prisma.systemSettings.findMany({
      where: { key: { in: ['imap_enabled', 'imap_poll_interval'] } }
    })
    const s = {}
    for (const { key, value } of rows) s[key] = value

    if (s.imap_enabled !== 'true') return

    const interval = Math.max(1, parseInt(s.imap_poll_interval || '5'))
    const cronExpr = `*/${interval} * * * *`

    const { pollInbox } = require('./imap.service')
    imapJob = cron.schedule(cronExpr, async () => {
      try { await pollInbox() }
      catch (err) { console.error('[IMAP] Polling error:', err.message) }
    })
    console.log(`[IMAP] Polling inbox every ${interval} min.`)
  } catch (err) {
    console.error('[IMAP] Błąd inicjalizacji pollingu:', err.message)
  }
}


function startRecurringAlertsAnalysis() {
  try {
    if (recurringAlertsJob) {
      recurringAlertsJob.stop()
      recurringAlertsJob = null
    }

    const { runAnalysis } = require('./recurring-alerts.service')

    recurringAlertsJob = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('[Scheduler] Starting recurring alerts analysis...')
        const alerts = await runAnalysis()
        console.log(`[Scheduler] Recurring alerts analysis complete: ${alerts.length} alerts`)
      } catch (err) {
        console.error('[Scheduler] Recurring alerts analysis error:', err)
      }
    }, { timezone: 'Europe/Warsaw' })

    console.log('[Scheduler] Recurring alerts analysis scheduled daily at 2:00 AM')

    setTimeout(async () => {
      try {
        console.log('[Scheduler] Running initial recurring alerts analysis...')
        const alerts = await runAnalysis()
        console.log(`[Scheduler] Initial analysis complete: ${alerts.length} alerts`)
      } catch (err) {
        console.error('[Scheduler] Initial analysis error:', err)
      }
    }, 30000)

  } catch (err) {
    console.error('[Scheduler] Error initializing recurring alerts:', err.message)
  }
}

module.exports = { startScheduler, triggerNow, getScheduleSettings, restartImapPolling, startRecurringAlertsAnalysis }
