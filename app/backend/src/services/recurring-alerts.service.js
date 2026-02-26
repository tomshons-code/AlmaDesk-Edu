'use strict'

const prisma = require('../db')
const { sendEmail } = require('./email.service')




const CONFIG = {
  MIN_OCCURRENCES: 3,

  ANALYSIS_WINDOW_DAYS: 30,

  TITLE_SIMILARITY_THRESHOLD: 0.7,

  RECURRING_KEYWORDS: [
    'znowu', 'ponownie', 'again', 'still', 'ciągle', 'wciąż',
    'nie działa', 'not working', 'problem', 'błąd', 'error'
  ]
}



function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1.0
  if (s1.length < 3 || s2.length < 3) return 0.0

  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return union.size > 0 ? intersection.size / union.size : 0.0
}


function extractKeywords(text) {
  if (!text) return []

  const normalized = text.toLowerCase()
  const words = normalized.match(/\b\w{4,}\b/g) || []

  const stopWords = new Set(['jest', 'nie', 'czy', 'dla', 'that', 'this', 'with', 'from', 'have'])

  return [...new Set(words.filter(w => !stopWords.has(w)))]
}


function calculateSeverity(occurrences, affectedUsers, durationDays) {
  if (occurrences >= 10 || affectedUsers >= 5) return 'CRITICAL'
  if (occurrences >= 6 || affectedUsers >= 3) return 'HIGH'
  if (occurrences >= 4 || affectedUsers >= 2) return 'MEDIUM'
  return 'LOW'
}


function generateSuggestedAction(category, keywords, occurrences) {
  const actions = []

  if (occurrences >= 5) {
    actions.push('Rozważ stworzenie artykułu FAQ lub procedury')
  }

  if (category === 'HARDWARE' && occurrences >= 3) {
    actions.push('Sprawdź sprzęt - możliwa wymiana/naprawa')
  }

  if (category === 'SOFTWARE' && occurrences >= 4) {
    actions.push('Aktualizacja oprogramowania lub reorganizacja licencji')
  }

  if (category === 'NETWORK' && occurrences >= 3) {
    actions.push('Diagnoza infrastruktury sieciowej')
  }

  if (keywords.some(k => ['login', 'hasło', 'password', 'dostęp'].includes(k))) {
    actions.push('Rozważ szkolenie użytkowników lub reset haseł masowych')
  }

  return actions.length > 0 ? actions.join('; ') : 'Analiza przyczyny źródłowej'
}



async function analyzeRecurringIssues() {
  console.log('[RecurringAlerts] Starting analysis...')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - CONFIG.ANALYSIS_WINDOW_DAYS)

  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: { gte: startDate },
      status: { notIn: ['CLOSED'] }
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`[RecurringAlerts] Analyzing ${tickets.length} tickets`)

  const categorizedTickets = tickets.reduce((acc, ticket) => {
    if (!acc[ticket.category]) acc[ticket.category] = []
    acc[ticket.category].push(ticket)
    return acc
  }, {})

  const detectedPatterns = []

  for (const [category, categoryTickets] of Object.entries(categorizedTickets)) {
    if (categoryTickets.length < CONFIG.MIN_OCCURRENCES) continue

    const groups = []

    for (const ticket of categoryTickets) {
      let foundGroup = false

      for (const group of groups) {
        const representative = group[0]
        const similarity = calculateSimilarity(ticket.title, representative.title)

        if (similarity >= CONFIG.TITLE_SIMILARITY_THRESHOLD) {
          group.push(ticket)
          foundGroup = true
          break
        }
      }

      if (!foundGroup) {
        groups.push([ticket])
      }
    }

    for (const group of groups) {
      if (group.length >= CONFIG.MIN_OCCURRENCES) {
        const firstTicket = group[0]
        const allKeywords = new Set()
        const uniqueUsers = new Set()

        group.forEach(t => {
          extractKeywords(t.title + ' ' + t.description).forEach(k => allKeywords.add(k))
          uniqueUsers.add(t.createdById)
        })

        const pattern = {
          title: firstTicket.title,
          pattern: firstTicket.title,
          category,
          tickets: group,
          occurrenceCount: group.length,
          affectedUsers: uniqueUsers.size,
          firstOccurrence: group[group.length - 1].createdAt,
          lastOccurrence: group[0].createdAt,
          keywords: Array.from(allKeywords).slice(0, 10),
          severity: calculateSeverity(
            group.length,
            uniqueUsers.size,
            Math.ceil((group[0].createdAt - group[group.length - 1].createdAt) / (1000 * 60 * 60 * 24))
          )
        }

        pattern.suggestedAction = generateSuggestedAction(
          category,
          pattern.keywords,
          pattern.occurrenceCount
        )

        detectedPatterns.push(pattern)
      }
    }
  }

  console.log(`[RecurringAlerts] Detected ${detectedPatterns.length} recurring patterns`)

  return detectedPatterns
}


async function createOrUpdateAlert(pattern) {
  const { tickets, ...alertData } = pattern

  const existingAlert = await prisma.recurringAlert.findFirst({
    where: {
      pattern: alertData.pattern,
      category: alertData.category,
      status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
    }
  })

  if (existingAlert) {
    const alert = await prisma.recurringAlert.update({
      where: { id: existingAlert.id },
      data: {
        occurrenceCount: alertData.occurrenceCount,
        affectedUsers: alertData.affectedUsers,
        lastOccurrence: alertData.lastOccurrence,
        severity: alertData.severity,
        keywords: alertData.keywords,
        suggestedAction: alertData.suggestedAction
      }
    })

    for (const ticket of tickets) {
      await prisma.recurringAlertTicket.upsert({
        where: {
          alertId_ticketId: {
            alertId: alert.id,
            ticketId: ticket.id
          }
        },
        create: {
          alertId: alert.id,
          ticketId: ticket.id,
          confidence: 0.9
        },
        update: {}
      })
    }

    console.log(`[RecurringAlerts] Updated alert #${alert.id}: "${alert.title}"`)
    return alert
  } else {
    const alert = await prisma.recurringAlert.create({
      data: {
        ...alertData,
        tickets: {
          create: tickets.map(t => ({
            ticketId: t.id,
            confidence: 0.9
          }))
        }
      }
    })

    console.log(`[RecurringAlerts] Utworzono alert #${alert.id}: "${alert.title}"`)
    return alert
  }
}


async function runAnalysis() {
  try {
    const patterns = await analyzeRecurringIssues()

    const alerts = []
    for (const pattern of patterns) {
      const alert = await createOrUpdateAlert(pattern)
      alerts.push(alert)
    }

    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledgedAt)
    if (criticalAlerts.length > 0) {
      await notifyAdmins(criticalAlerts)
    }

    return alerts
  } catch (error) {
    console.error('[RecurringAlerts] Analysis failed:', error)
    throw error
  }
}


async function notifyAdmins(alerts) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { email: true, name: true }
    })

    if (admins.length === 0) {
      console.warn('[RecurringAlerts] No admins to notify')
      return
    }

    for (const admin of admins) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #d32f2f;">🚨 Krytyczne alerty - nawracające problemy</h2>
          <p>Witaj ${admin.name},</p>
          <p>Wykryto <strong>${alerts.length}</strong> krytycznych problemów wymagających uwagi:</p>

          ${alerts.map((alert, i) => `
            <div style="background: #fff3e0; padding: 15px; margin: 10px 0; border-left: 4px solid #ff9800; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; color: #e65100;">${i + 1}. ${alert.title}</h3>
              <p style="margin: 5px 0;"><strong>Kategoria:</strong> ${alert.category}</p>
              <p style="margin: 5px 0;"><strong>Wystąpienia:</strong> ${alert.occurrenceCount} razy</p>
              <p style="margin: 5px 0;"><strong>Dotknięci użytkownicy:</strong> ${alert.affectedUsers} osób</p>
              <p style="margin: 5px 0;"><strong>Sugerowane działanie:</strong> ${alert.suggestedAction}</p>
            </div>
          `).join('')}

          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/recurring-alerts"
               style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Zobacz szczegóły w panelu
            </a>
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #757575; font-size: 12px;">
            AlmaDesk-Edu - System automatycznego monitoringu zgłoszeń<br>
            ${new Date().toLocaleString('pl-PL')}
          </p>
        </div>
      `

      await sendEmail({
        to: admin.email,
        subject: `AlmaDesk: ${alerts.length} critical alerts`,
        html
      })
    }

    console.log(`[RecurringAlerts] Notifications sent to ${admins.length} admins`)
  } catch (error) {
    console.error('[RecurringAlerts] Failed to notify admins:', error)
  }
}


async function getActiveAlerts(filters = {}) {
  const where = {
    status: filters.status || { in: ['ACTIVE', 'ACKNOWLEDGED'] }
  }

  if (filters.severity) where.severity = filters.severity
  if (filters.category) where.category = filters.category

  return await prisma.recurringAlert.findMany({
    where,
    include: {
      acknowledgedBy: {
        select: { id: true, name: true, email: true }
      },
      tickets: {
        include: {
          ticket: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              createdAt: true,
              createdBy: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { addedAt: 'desc' }
      }
    },
    orderBy: [
      { severity: 'desc' },
      { lastOccurrence: 'desc' }
    ]
  })
}


async function acknowledgeAlert(alertId, userId, notes) {
  return await prisma.recurringAlert.update({
    where: { id: alertId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedById: userId,
      acknowledgedAt: new Date(),
      notes
    }
  })
}


async function resolveAlert(alertId, notes) {
  return await prisma.recurringAlert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      notes
    }
  })
}


async function dismissAlert(alertId, notes) {
  return await prisma.recurringAlert.update({
    where: { id: alertId },
    data: {
      status: 'DISMISSED',
      notes
    }
  })
}


async function getAlertStats() {
  const [total, active, acknowledged, resolved, byCategory, bySeverity] = await Promise.all([
    prisma.recurringAlert.count(),
    prisma.recurringAlert.count({ where: { status: 'ACTIVE' } }),
    prisma.recurringAlert.count({ where: { status: 'ACKNOWLEDGED' } }),
    prisma.recurringAlert.count({ where: { status: 'RESOLVED' } }),
    prisma.recurringAlert.groupBy({
      by: ['category'],
      _count: true,
      where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } }
    }),
    prisma.recurringAlert.groupBy({
      by: ['severity'],
      _count: true,
      where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } }
    })
  ])

  return {
    total,
    active,
    acknowledged,
    resolved,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count
      return acc
    }, {}),
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item.severity] = item._count
      return acc
    }, {})
  }
}

module.exports = {
  runAnalysis,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  getAlertStats,
  analyzeRecurringIssues,
  CONFIG
}
