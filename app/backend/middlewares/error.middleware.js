module.exports = (err, req, res, next) => {
  console.error('Error:', err)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Wewnętrzny błąd serwera'

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
