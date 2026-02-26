const jwt = require('jsonwebtoken')
const config = require('../config/env')

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Brak tokenu autoryzacji'
    })
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token wygasł'
      })
    }
    return res.status(401).json({
      success: false,
      error: 'Nieprawidłowy token'
    })
  }
}
