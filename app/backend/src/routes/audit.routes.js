
const express = require('express')
const router = express.Router()
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')

function superAdminOnly (req, res, next) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Dostęp tylko dla SUPER_ADMIN' })
  }
  next()
}


router.get('/', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1', 10))
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)))
    const skip   = (page - 1) * limit

    const where = {}

    if (req.query.action) {
      where.action = req.query.action
    }
    if (req.query.entity) {
      where.entityType = req.query.entity
    }
    if (req.query.userId) {
      where.userId = parseInt(req.query.userId, 10)
    }
    if (req.query.from || req.query.to) {
      where.timestamp = {}
      if (req.query.from) where.timestamp.gte = new Date(req.query.from)
      if (req.query.to)   where.timestamp.lte = new Date(req.query.to)
    }
    if (req.query.search) {
      where.OR = [
        { action:     { contains: req.query.search, mode: 'insensitive' } },
        { entityType: { contains: req.query.search, mode: 'insensitive' } }
      ]
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, login: true, name: true } }
        }
      })
    ])

    res.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      logs: logs.map(l => ({
        id:         l.id,
        action:     l.action,
        entityType: l.entityType,
        entityId:   l.entityId,
        ticketId:   l.ticketId,
        user:       l.user ? { id: l.user.id, login: l.user.login, name: l.user.name } : null,
        changes:    l.changes,
        ipAddress:  l.ipAddress,
        userAgent:  l.userAgent,
        timestamp:  l.timestamp
      }))
    })
  } catch (err) {
    console.error('Audit log fetch error:', err)
    res.status(500).json({ error: 'Nie udało się pobrać logów audytu' })
  }
})


router.get('/actions', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' }
    })
    res.json(rows.map(r => r.action))
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się pobrać akcji' })
  }
})

module.exports = router
