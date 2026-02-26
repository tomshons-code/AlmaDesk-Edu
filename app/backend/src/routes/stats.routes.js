const express = require('express')
const router = express.Router()
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')


router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    let stats = {}

    if (userRole === 'KLIENT' || userRole === 'USER') {
      const [total, open, inProgress, resolved, closed, byPriority, byCategoryData, recent] = await Promise.all([
        prisma.ticket.count({
          where: { createdById: userId }
        }),
        prisma.ticket.count({
          where: { createdById: userId, status: 'OPEN' }
        }),
        prisma.ticket.count({
          where: { createdById: userId, status: 'IN_PROGRESS' }
        }),
        prisma.ticket.count({
          where: { createdById: userId, status: 'RESOLVED' }
        }),
        prisma.ticket.count({
          where: { createdById: userId, status: 'CLOSED' }
        }),
        prisma.ticket.groupBy({
          by: ['priority'],
          where: { createdById: userId },
          _count: true
        }),
        prisma.ticket.groupBy({
          by: ['category'],
          where: { createdById: userId },
          _count: true
        }),
        prisma.ticket.count({
          where: {
            createdById: userId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ])

      const byPriorityMap = {}
      byPriority.forEach(item => {
        byPriorityMap[item.priority] = item._count
      })

      const byCategoryMap = {}
      byCategoryData.forEach(item => {
        byCategoryMap[item.category] = item._count
      })

      stats = {
        role: userRole,
        totalTickets: total,
        openTickets: open,
        inProgressTickets: inProgress,
        resolvedTickets: resolved,
        closedTickets: closed,
        recentTickets: recent,
        byPriority: {
          low: byPriorityMap.LOW || 0,
          medium: byPriorityMap.MEDIUM || 0,
          high: byPriorityMap.HIGH || 0,
          critical: byPriorityMap.CRITICAL || 0
        },
        byCategory: byCategoryMap
      }

    } else if (userRole === 'AGENT' || userRole === 'SUPER_ADMIN') {
      const whereClause = userRole === 'AGENT' && req.user.organizationalUnitId
        ? await getAgentTicketFilter(req.user.organizationalUnitId)
        : {}

      const [
        total,
        open,
        inProgress,
        pending,
        resolved,
        closed,
        assignedToMe,
        unassigned,
        byPriority,
        byCategoryData,
        recent,
        avgResolutionTime,
        todayCreated,
        todayResolved
      ] = await Promise.all([
        prisma.ticket.count({ where: whereClause }),
        prisma.ticket.count({
          where: { ...whereClause, status: 'OPEN' }
        }),
        prisma.ticket.count({
          where: { ...whereClause, status: 'IN_PROGRESS' }
        }),
        prisma.ticket.count({
          where: { ...whereClause, status: 'PENDING' }
        }),
        prisma.ticket.count({
          where: { ...whereClause, status: 'RESOLVED' }
        }),
        prisma.ticket.count({
          where: { ...whereClause, status: 'CLOSED' }
        }),
        prisma.ticket.count({
          where: { ...whereClause, assignedToId: userId }
        }),
        prisma.ticket.count({
          where: { ...whereClause, assignedToId: null }
        }),
        prisma.ticket.groupBy({
          by: ['priority'],
          where: whereClause,
          _count: true
        }),
        prisma.ticket.groupBy({
          by: ['category'],
          where: whereClause,
          _count: true
        }),
        prisma.ticket.count({
          where: {
            ...whereClause,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        calculateAvgResolutionTime(whereClause),
        prisma.ticket.count({
          where: {
            ...whereClause,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.ticket.count({
          where: {
            ...whereClause,
            status: 'RESOLVED',
            resolvedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ])

      const byPriorityMap = {}
      byPriority.forEach(item => {
        byPriorityMap[item.priority] = item._count
      })

      const byCategoryMap = {}
      byCategoryData.forEach(item => {
        byCategoryMap[item.category] = item._count
      })

      stats = {
        role: userRole,
        totalTickets: total,
        openTickets: open,
        inProgressTickets: inProgress,
        pendingTickets: pending,
        resolvedTickets: resolved,
        closedTickets: closed,
        assignedToMe: assignedToMe,
        unassignedTickets: unassigned,
        recentTickets: recent,
        avgResolutionTimeHours: avgResolutionTime,
        todayCreated: todayCreated,
        todayResolved: todayResolved,
        byPriority: {
          low: byPriorityMap.LOW || 0,
          medium: byPriorityMap.MEDIUM || 0,
          high: byPriorityMap.HIGH || 0,
          critical: byPriorityMap.CRITICAL || 0,
          escalated: byPriorityMap.ESCALATED || 0
        },
        byCategory: byCategoryMap
      }
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('[Stats] Error fetching dashboard stats:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać statystyk'
    })
  }
})

async function getAgentTicketFilter(organizationalUnitId) {
  const mappings = await prisma.categoryMapping.findMany({
    where: {
      organizationalUnitId,
      isActive: true
    }
  })

  if (mappings.length > 0) {
    const allowedCategories = mappings.map(m => m.category)
    return {
      category: {
        in: allowedCategories
      }
    }
  }

  return {}
}

async function calculateAvgResolutionTime(whereClause) {
  const resolvedTickets = await prisma.ticket.findMany({
    where: {
      ...whereClause,
      status: 'RESOLVED',
      resolvedAt: { not: null }
    },
    select: {
      createdAt: true,
      resolvedAt: true
    }
  })

  if (resolvedTickets.length === 0) return 0

  const totalHours = resolvedTickets.reduce((sum, ticket) => {
    const hours = (ticket.resolvedAt - ticket.createdAt) / (1000 * 60 * 60)
    return sum + hours
  }, 0)

  return Math.round(totalHours / resolvedTickets.length * 10) / 10
}


router.get('/trends', verifyToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const userRole = req.user.role
    const userId = req.user.id

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    let whereClause = { createdAt: { gte: startDate } }

    if (userRole === 'USER') {
      whereClause.createdById = userId
    } else if (userRole === 'AGENT' && req.user.organizationalUnitId) {
      const agentFilter = await getAgentTicketFilter(req.user.organizationalUnitId)
      whereClause = { ...whereClause, ...agentFilter }
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        status: true
      }
    })

    const dailyStats = {}
    tickets.forEach(ticket => {
      const date = ticket.createdAt.toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { created: 0, resolved: 0 }
      }
      dailyStats[date].created++
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        dailyStats[date].resolved++
      }
    })

    res.json({
      success: true,
      data: {
        dailyStats,
        period: days
      }
    })
  } catch (error) {
    console.error('[Stats] Error fetching trends:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać danych trendów'
    })
  }
})


router.get('/recurring-alerts', verifyToken, async (req, res) => {
  if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    const days     = parseInt(req.query.days  || '30', 10)
    const minCount = parseInt(req.query.min   || '3',  10)
    const since    = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const baseWhere = { createdAt: { gte: since }, isArchived: { not: true } }

    const total = await prisma.ticket.count({ where: baseWhere })

    const byCategory = await prisma.ticket.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } }
    })

    const byPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      where: baseWhere,
      _count: { priority: true },
      orderBy: { _count: { priority: 'desc' } }
    })

    const tagCounts = await prisma.ticketTag.groupBy({
      by: ['tagId'],
      where: { ticket: baseWhere },
      _count: { tagId: true },
      orderBy: { _count: { tagId: 'desc' } },
      take: 10
    })

    const tagIds = tagCounts.map(t => t.tagId)
    const tags   = tagIds.length ? await prisma.tag.findMany({ where: { id: { in: tagIds } } }) : []
    const tagMap = Object.fromEntries(tags.map(t => [t.id, t.name]))

    const categoryLabels = {
      HARDWARE: 'Sprzęt', SOFTWARE: 'Oprogramowanie', NETWORK: 'Sieć',
      ACCESS: 'Dostęp', ACCOUNT: 'Konto', OTHER: 'Inne'
    }
    const priorityLabels = { LOW: 'Niski', MEDIUM: 'Średni', HIGH: 'Wysoki', CRITICAL: 'Krytyczny' }

    const alerts = []

    byCategory.forEach(row => {
      const count = row._count.category
      const pct   = total > 0 ? Math.round(count / total * 100) : 0
      if (count >= minCount && pct >= 20) {
        alerts.push({
          id:       `cat-${row.category}`,
          type:     'category',
          key:      row.category,
          label:    categoryLabels[row.category] || row.category,
          count,
          percent:  pct,
          severity: pct >= 40 ? 'high' : 'medium',
          period:   days,
          suggestion: `Kategoria "${categoryLabels[row.category] || row.category}" stanowi ${pct}% wszystkich zgłoszeń. Rozważ dedykowane FAQ lub procedurę obsługi.`
        })
      }
    })

    byPriority.forEach(row => {
      if (!['HIGH', 'CRITICAL'].includes(row.priority)) return
      const count = row._count.priority
      const pct   = total > 0 ? Math.round(count / total * 100) : 0
      if (count >= minCount && pct >= 25) {
        alerts.push({
          id:       `prio-${row.priority}`,
          type:     'priority',
          key:      row.priority,
          label:    priorityLabels[row.priority] || row.priority,
          count,
          percent:  pct,
          severity: row.priority === 'CRITICAL' ? 'critical' : 'high',
          period:   days,
          suggestion: `${pct}% zgłoszeń ma priorytet ${priorityLabels[row.priority]}. Sprawdź czy wymagana jest eskalacja lub dodatkowe zasoby.`
        })
      }
    })

    tagCounts.forEach(row => {
      const name  = tagMap[row.tagId] || `Tag #${row.tagId}`
      const count = row._count.tagId
      const pct   = total > 0 ? Math.round(count / total * 100) : 0
      if (count >= minCount && pct >= 15) {
        alerts.push({
          id:       `tag-${row.tagId}`,
          type:     'tag',
          key:      String(row.tagId),
          label:    name,
          count,
          percent:  pct,
          severity: pct >= 30 ? 'high' : 'medium',
          period:   days,
          suggestion: `Tag "${name}" pojawia się w ${pct}% zgłoszeń. Rozważ dodanie artykułu w bazie wiedzy.`
        })
      }
    })

    const severityOrder = { critical: 0, high: 1, medium: 2 }
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3) || b.count - a.count)

    res.json({ total, period: days, alerts })
  } catch (error) {
    console.error('[Stats] Error fetching recurring alerts:', error)
    res.status(500).json({ error: 'Nie udało się pobrać alertów powtarzających się problemów' })
  }
})

module.exports = router
