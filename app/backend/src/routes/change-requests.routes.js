
const express = require('express')
const router = express.Router()
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')
const { logAudit, reqMeta } = require('../services/audit.service')

const requireAgent = (req, res, next) => {
  if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Agent privileges required.' })
  }
  next()
}

async function logChangeAction(changeRequestId, action, fromValue, toValue, comment, userId, req) {
  try {
    await prisma.changeAuditLog.create({
      data: {
        changeRequestId,
        action,
        fromValue: fromValue ? String(fromValue) : null,
        toValue: toValue ? String(toValue) : null,
        comment,
        userId,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent')
      }
    })
  } catch (error) {
    console.error('Failed to log change action:', error)
  }
}

router.get('/', verifyToken, requireAgent, async (req, res) => {
  try {
    const { status, priority, category, requestedBy, assignedTo } = req.query

    const where = {}

    if (status) where.status = status.toUpperCase()
    if (priority) where.priority = priority.toUpperCase()
    if (category) where.category = category.toUpperCase()

    if (requestedBy) {
      const requester = await prisma.user.findUnique({ where: { login: requestedBy } })
      if (requester) where.requestedById = requester.id
    }

    if (assignedTo) {
      const assignee = await prisma.user.findUnique({ where: { login: assignedTo } })
      if (assignee) where.assignedToId = assignee.id
    }

    const changeRequests = await prisma.changeRequest.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        approvedBy: { select: { id: true, login: true, name: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    res.json(changeRequests)
  } catch (error) {
    console.error('Get change requests error:', error)
    res.status(500).json({ error: 'Failed to fetch change requests' })
  }
})

router.get('/:id', verifyToken, requireAgent, async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    const changeRequest = await prisma.changeRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, login: true, name: true, email: true } },
        assignedTo: { select: { id: true, login: true, name: true, email: true } },
        approvedBy: { select: { id: true, login: true, name: true, email: true } },
        auditLogs: {
          include: {
            user: { select: { id: true, login: true, name: true } }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    if (!changeRequest) {
      return res.status(404).json({ error: 'Change request not found' })
    }

    res.json(changeRequest)
  } catch (error) {
    console.error('Get change request error:', error)
    res.status(500).json({ error: 'Failed to fetch change request' })
  }
})

router.post('/', verifyToken, requireAgent, async (req, res) => {
  try {
    const {
      title,
      description,
      justification,
      impactAnalysis,
      riskAssessment,
      rollbackPlan,
      testPlan,
      priority,
      category,
      affectedServices,
      relatedTicketIds
    } = req.body

    if (!title || !description || !justification) {
      return res.status(400).json({
        error: 'Title, description, and justification are required'
      })
    }

    const changeRequest = await prisma.changeRequest.create({
      data: {
        title,
        description,
        justification,
        impactAnalysis,
        riskAssessment,
        rollbackPlan,
        testPlan,
        priority: priority ? priority.toUpperCase() : 'MEDIUM',
        category: category ? category.toUpperCase() : 'NORMAL',
        status: 'DRAFT',
        requestedById: req.user.id,
        affectedServices: affectedServices || [],
        relatedTicketIds: relatedTicketIds || []
      },
      include: {
        requestedBy: { select: { id: true, login: true, name: true } }
      }
    })

    await logChangeAction(
      changeRequest.id,
      'CREATED',
      null,
      'DRAFT',
      'Change request created',
      req.user.id,
      req
    )

    logAudit({
      action: 'CREATE_CHANGE_REQUEST',
      entityType: 'ChangeRequest',
      entityId: changeRequest.id,
      userId: req.user.id,
      ...reqMeta(req),
      changes: { title, priority, category }
    }).catch(() => {})

    res.status(201).json(changeRequest)
  } catch (error) {
    console.error('Create change request error:', error)
    res.status(500).json({ error: 'Failed to create change request' })
  }
})

router.put('/:id', verifyToken, requireAgent, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const {
      title,
      description,
      justification,
      impactAnalysis,
      riskAssessment,
      rollbackPlan,
      testPlan,
      priority,
      category,
      affectedServices,
      relatedTicketIds
    } = req.body

    const existing = await prisma.changeRequest.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Change request not found' })
    }

    if (existing.status !== 'DRAFT' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Cannot edit change request after submission. Contact administrator.'
      })
    }

    const updateData = {}
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (justification) updateData.justification = justification
    if (impactAnalysis !== undefined) updateData.impactAnalysis = impactAnalysis
    if (riskAssessment !== undefined) updateData.riskAssessment = riskAssessment
    if (rollbackPlan !== undefined) updateData.rollbackPlan = rollbackPlan
    if (testPlan !== undefined) updateData.testPlan = testPlan
    if (priority) updateData.priority = priority.toUpperCase()
    if (category) updateData.category = category.toUpperCase()
    if (affectedServices) updateData.affectedServices = affectedServices
    if (relatedTicketIds) updateData.relatedTicketIds = relatedTicketIds

    const changeRequest = await prisma.changeRequest.update({
      where: { id },
      data: updateData,
      include: {
        requestedBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        approvedBy: { select: { id: true, login: true, name: true } }
      }
    })

    await logChangeAction(
      id,
      'UPDATED',
      null,
      null,
      'Change request updated',
      req.user.id,
      req
    )

    logAudit({
      action: 'UPDATE_CHANGE_REQUEST',
      entityType: 'ChangeRequest',
      entityId: id,
      userId: req.user.id,
      ...reqMeta(req)
    }).catch(() => {})

    res.json(changeRequest)
  } catch (error) {
    console.error('Update change request error:', error)
    res.status(500).json({ error: 'Failed to update change request' })
  }
})

router.post('/:id/status', verifyToken, requireAgent, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { status, comment } = req.body

    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    const existing = await prisma.changeRequest.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Change request not found' })
    }

    const newStatus = status.toUpperCase()
    const validTransitions = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED'],
      APPROVED: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['IMPLEMENTED', 'FAILED'],
      IMPLEMENTED: ['VERIFIED', 'FAILED'],
      VERIFIED: ['CLOSED'],
      FAILED: ['SCHEDULED'],
      REJECTED: [],
      CLOSED: [],
      CANCELLED: []
    }

    if (!validTransitions[existing.status].includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid status transition from ${existing.status} to ${newStatus}`
      })
    }

    const updateData = { status: newStatus }

    if (newStatus === 'APPROVED') {
      updateData.approvedById = req.user.id
      updateData.approvedAt = new Date()
    } else if (newStatus === 'IMPLEMENTED') {
      updateData.implementedAt = new Date()
    } else if (newStatus === 'VERIFIED') {
      updateData.verifiedAt = new Date()
    } else if (newStatus === 'CLOSED') {
      updateData.closedAt = new Date()
    }

    const changeRequest = await prisma.changeRequest.update({
      where: { id },
      data: updateData,
      include: {
        requestedBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        approvedBy: { select: { id: true, login: true, name: true } }
      }
    })

    await logChangeAction(
      id,
      'STATUS_CHANGE',
      existing.status,
      newStatus,
      comment || `Status changed from ${existing.status} to ${newStatus}`,
      req.user.id,
      req
    )

    logAudit({
      action: 'CHANGE_REQUEST_STATUS',
      entityType: 'ChangeRequest',
      entityId: id,
      userId: req.user.id,
      ...reqMeta(req),
      changes: { from: existing.status, to: newStatus }
    }).catch(() => {})

    res.json(changeRequest)
  } catch (error) {
    console.error('Update status error:', error)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

router.post('/:id/assign', verifyToken, requireAgent, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { assignTo } = req.body

    let assignedToId = null

    if (assignTo) {
      const assignee = await prisma.user.findUnique({ where: { login: assignTo } })
      if (!assignee) {
        return res.status(404).json({ error: 'User not found' })
      }
      assignedToId = assignee.id
    }

    const changeRequest = await prisma.changeRequest.update({
      where: { id },
      data: { assignedToId },
      include: {
        requestedBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        approvedBy: { select: { id: true, login: true, name: true } }
      }
    })

    await logChangeAction(
      id,
      'ASSIGNED',
      null,
      assignTo || 'unassigned',
      assignTo ? `Assigned to ${assignTo}` : 'Unassigned',
      req.user.id,
      req
    )

    logAudit({
      action: 'ASSIGN_CHANGE_REQUEST',
      entityType: 'ChangeRequest',
      entityId: id,
      userId: req.user.id,
      ...reqMeta(req),
      changes: { assignTo: assignTo || null }
    }).catch(() => {})

    res.json(changeRequest)
  } catch (error) {
    console.error('Assign change request error:', error)
    res.status(500).json({ error: 'Failed to assign change request' })
  }
})

router.post('/:id/schedule', verifyToken, requireAgent, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { scheduledStart, scheduledEnd } = req.body

    if (!scheduledStart || !scheduledEnd) {
      return res.status(400).json({ error: 'scheduledStart and scheduledEnd are required' })
    }

    const changeRequest = await prisma.changeRequest.update({
      where: { id },
      data: {
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        status: 'SCHEDULED'
      },
      include: {
        requestedBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        approvedBy: { select: { id: true, login: true, name: true } }
      }
    })

    await logChangeAction(
      id,
      'SCHEDULED',
      null,
      `${scheduledStart} - ${scheduledEnd}`,
      'Implementation scheduled',
      req.user.id,
      req
    )

    res.json(changeRequest)
  } catch (error) {
    console.error('Schedule change request error:', error)
    res.status(500).json({ error: 'Failed to schedule change request' })
  }
})

router.delete('/:id', verifyToken, requireAgent, async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    const existing = await prisma.changeRequest.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Change request not found' })
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Only DRAFT change requests can be deleted. Use cancel instead.'
      })
    }

    if (existing.requestedById !== req.user.id &&
        req.user.role !== 'ADMIN' &&
        req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }

    await prisma.changeRequest.delete({ where: { id } })

    logAudit({
      action: 'DELETE_CHANGE_REQUEST',
      entityType: 'ChangeRequest',
      entityId: id,
      userId: req.user.id,
      ...reqMeta(req)
    }).catch(() => {})

    res.json({ message: 'Change request deleted successfully' })
  } catch (error) {
    console.error('Delete change request error:', error)
    res.status(500).json({ error: 'Failed to delete change request' })
  }
})

router.get('/stats/summary', verifyToken, requireAgent, async (req, res) => {
  try {
    const total = await prisma.changeRequest.count()

    const byStatus = await prisma.changeRequest.groupBy({
      by: ['status'],
      _count: true
    })

    const byPriority = await prisma.changeRequest.groupBy({
      by: ['priority'],
      _count: true
    })

    const byCategory = await prisma.changeRequest.groupBy({
      by: ['category'],
      _count: true
    })

    const verified = await prisma.changeRequest.count({ where: { status: 'VERIFIED' } })
    const failed = await prisma.changeRequest.count({ where: { status: 'FAILED' } })
    const successRate = (verified + failed) > 0
      ? Math.round((verified / (verified + failed)) * 100)
      : 0

    res.json({
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
      byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count])),
      byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
      successRate
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

module.exports = router
