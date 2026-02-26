
const prisma = require('../src/db')

exports.healthCheck = async (req, res) => {
  const checks = {}
  let healthy = true

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok' }
  } catch (err) {
    checks.database = { status: 'error', message: err.message }
    healthy = false
  }

  try {
    const redis = require('../config/redis')
    if (redis && redis.status === 'ready') {
      await redis.ping()
      checks.redis = { status: 'ok' }
    } else {
      checks.redis = { status: 'warning', message: 'Not connected' }
    }
  } catch (err) {
    checks.redis = { status: 'error', message: err.message }
  }

  try {
    const { esClient } = require('../config/elasticsearch')
    const pingResult = await esClient.ping()
    checks.elasticsearch = { status: 'ok' }
  } catch (err) {
    checks.elasticsearch = { status: 'warning', message: err.message || 'Not available' }
  }

  const statusCode = healthy ? 200 : 503

  res.status(statusCode).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'AlmaDesk-Edu Backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks
  })
}
