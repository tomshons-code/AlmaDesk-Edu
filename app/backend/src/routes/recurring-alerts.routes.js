
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../../middlewares/jwt.middleware')
const recurringAlertsService = require('../services/recurring-alerts.service')
const { logAudit, reqMeta } = require('../services/audit.service')

const requireAgentOrAdmin = (req, res, next) => {
  if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Agent privileges required.' })
  }
  next()
}

router.get('/', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const { status, severity, category } = req.query

    const filters = {}
    if (status) filters.status = status
    if (severity) filters.severity = severity
    if (category) filters.category = category

    const alerts = await recurringAlertsService.getActiveAlerts(filters)

    res.json({
      success: true,
      alerts,
      count: alerts.length
    })
  } catch (error) {
    console.error('Get alerts error:', error)
    res.status(500).json({ error: 'Failed to fetch recurring alerts' })
  }
})

router.get('/stats', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const stats = await recurringAlertsService.getAlertStats()

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Get alert stats error:', error)
    res.status(500).json({ error: 'Failed to fetch alert statistics' })
  }
})

router.get('/:id', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id)

    const alert = await recurringAlertsService.getActiveAlerts({
      id: alertId
    }).then(alerts => alerts[0])

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    res.json({
      success: true,
      alert
    })
  } catch (error) {
    console.error('Get alert error:', error)
    res.status(500).json({ error: 'Failed to fetch alert' })
  }
})

router.post('/:id/acknowledge', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id)
    const { notes } = req.body

    const alert = await recurringAlertsService.acknowledgeAlert(
      alertId,
      req.user.id,
      notes
    )

    await logAudit({
      action: 'ACKNOWLEDGE_ALERT',
      entityType: 'RecurringAlert',
      entityId: alertId,
      userId: req.user.id,
      ...reqMeta(req),
      changes: { status: 'ACKNOWLEDGED', notes }
    })

    res.json({
      success: true,
      alert,
      message: 'Alert acknowledged successfully'
    })
  } catch (error) {
    console.error('Acknowledge alert error:', error)
    res.status(500).json({ error: 'Failed to acknowledge alert' })
  }
})

router.post('/:id/resolve', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id)
    const { notes } = req.body

    if (!notes) {
      return res.status(400).json({ error: 'Resolution notes are required' })
    }

    const alert = await recurringAlertsService.resolveAlert(alertId, notes)

    await logAudit({
      action: 'RESOLVE_ALERT',
      entityType: 'RecurringAlert',
      entityId: alertId,
      userId: req.user.id,
      ...reqMeta(req),
      changes: { status: 'RESOLVED', notes }
    })

    res.json({
      success: true,
      alert,
      message: 'Alert resolved successfully'
    })
  } catch (error) {
    console.error('Resolve alert error:', error)
    res.status(500).json({ error: 'Failed to resolve alert' })
  }
})

router.post('/:id/dismiss', verifyToken, requireAgentOrAdmin, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id)
    const { notes } = req.body

    const alert = await recurringAlertsService.dismissAlert(alertId, notes)

    await logAudit({
      action: 'DISMISS_ALERT',
      entityType: 'RecurringAlert',
      entityId: alertId,
      userId: req.user.id,
      ...reqMeta(req),
      changes: { status: 'DISMISSED', notes }
    })

    res.json({
      success: true,
      alert,
      message: 'Alert dismissed successfully'
    })
  } catch (error) {
    console.error('Dismiss alert error:', error)
    res.status(500).json({ error: 'Failed to dismiss alert' })
  }
})

router.post('/analyze', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin privileges required' })
    }

    recurringAlertsService.runAnalysis()
      .then(alerts => {
        console.log(`[RecurringAlerts] Manual analysis complete: ${alerts.length} alerts`)
      })
      .catch(err => {
        console.error('[RecurringAlerts] Manual analysis error:', err)
      })

    await logAudit({
      action: 'TRIGGER_ALERT_ANALYSIS',
      entityType: 'System',
      userId: req.user.id,
      ...reqMeta(req)
    })

    res.json({
      success: true,
      message: 'Analysis started in background'
    })
  } catch (error) {
    console.error('Trigger analysis error:', error)
    res.status(500).json({ error: 'Failed to trigger analysis' })
  }
})

module.exports = router
