
const express = require('express')
const router = express.Router()

router.use('/health', require('./health.routes'))
router.use('/auth', require('./auth.routes'))
router.use('/tickets', require('./tickets.routes'))
router.use('/tags', require('./tags.routes'))
router.use('/templates', require('./templates.routes'))
router.use('/settings', require('./settings.routes'))
router.use('/category-mappings', require('./category-mapping.routes'))
router.use('/stats', require('./stats.routes'))
router.use('/users', require('./users.routes'))
router.use('/reports', require('./reports.routes'))
router.use('/audit', require('./audit.routes'))
router.use('/recurring-alerts', require('./recurring-alerts.routes'))
router.use('/change-requests', require('./change-requests.routes'))
router.use('/knowledge-base', require('./knowledge-base.routes'))

module.exports = router
