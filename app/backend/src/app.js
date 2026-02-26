const express = require('express')
const routes = require('./routes')
const errorMiddleware = require('../middlewares/error.middleware')
const { initBucket } = require('../config/minio')
const { initializeTransporter } = require('../config/email')

const app = express()

initBucket().catch(err => console.error('[App] MinIO initialization failed:', err))

initializeTransporter().catch(err => console.error('[App] Email initialization failed:', err))

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json())
app.use('/api', routes)
app.use(errorMiddleware)

module.exports = app
