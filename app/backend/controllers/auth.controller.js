const jwt = require('jsonwebtoken')
const config = require('../config/env')

const MOCK_USERS = [
  {
    id: 1,
    login: 'admin',
    password: 'admin123!',
    name: 'Administrator',
    email: 'admin@university.edu',
    role: 'SUPER_ADMIN'
  },
  {
    id: 2,
    login: 'agent',
    password: 'agent123',
    name: 'Jan Kowalski',
    email: 'jan.kowalski@university.edu',
    role: 'AGENT'
  },
  {
    id: 3,
    login: 'user',
    password: 'user123',
    name: 'Anna Nowak',
    email: 'anna.nowak@student.university.edu',
    role: 'USER'
  }
]

exports.login = async (req, res) => {
  try {
    const { login, password } = req.body

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        error: 'Login i hasło są wymagane'
      })
    }

    const user = MOCK_USERS.find(u => u.login === login && u.password === password)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Nieprawidłowy login lub hasło'
      })
    }

    const token = jwt.sign(
      {
        id: user.id,
        login: user.login,
        role: user.role
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    )

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas logowania'
    })
  }
}

exports.verify = (req, res) => {
  const user = MOCK_USERS.find(u => u.id === req.user.id)

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Użytkownik nie znaleziony'
    })
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      role: user.role
    }
  })
}

exports.ssoCallback = (req, res) => {
  res.status(501).json({
    success: false,
    error: 'SSO nie jest jeszcze zaimplementowane'
  })
}
