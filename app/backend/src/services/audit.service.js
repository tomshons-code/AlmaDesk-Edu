const prisma = require('../db')


async function logAudit ({ action, entityType, entityId, userId, ticketId, ipAddress, userAgent, changes }) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId:  entityId  || null,
        userId:    userId    || null,
        ticketId:  ticketId  || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        changes:   changes   || undefined
      }
    })
  } catch (err) {
    console.error('[AuditLog] Błąd zapisu:', err.message)
  }
}


function reqMeta (req) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = req.ip || (forwarded ? forwarded.split(',')[0].trim() : null)
  return {
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || null
  }
}

module.exports = { logAudit, reqMeta }
