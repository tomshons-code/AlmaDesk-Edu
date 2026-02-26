
const express = require('express')
const router = express.Router()
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')
const keycloak = require('../../config/keycloak')
const { logAudit, reqMeta } = require('../services/audit.service')

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
  }
  next()
}

router.get('/agents', verifyToken, async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: {
        role: {
          in: ['AGENT', 'ADMIN', 'SUPER_ADMIN']
        }
      },
      select: {
        id: true,
        login: true,
        name: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    res.json(agents)
  } catch (error) {
    console.error('Error fetching agents:', error)
    res.status(500).json({ error: 'Failed to fetch agents' })
  }
})

router.get('/', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        department: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.put('/:id', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { role, name, email, phone, department } = req.body

    const updateData = {}

    if (role && ['KLIENT', 'AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      updateData.role = role
    }

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (department !== undefined) updateData.department = department

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        login: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        department: true
      }
    })

    if (role) {
      await keycloak.syncUserRole(updatedUser.login, role)
    }

    logAudit({ action: role ? 'UPDATE_ROLE' : 'UPDATE_USER', entityType: 'User', entityId: updatedUser.id, userId: req.user.id, ...reqMeta(req), changes: { role, name, email, department } }).catch(() => {})

    res.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

router.delete('/:id', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    logAudit({ action: 'DELETE_USER', entityType: 'User', entityId: parseInt(id), userId: req.user.id, ...reqMeta(req) }).catch(() => {})

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

router.get('/check-email', verifyToken, async (req, res) => {
  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({ error: 'Email parameter required' })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    res.json({ exists: !!user, user: user || null })
  } catch (error) {
    console.error('Error checking email:', error)
    res.status(500).json({ error: 'Failed to check email' })
  }
})

router.post('/quick-create', verifyToken, async (req, res) => {
  try {
    if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions. Only agents can create users.' })
    }

    const { email, firstName, lastName, department, ticketId } = req.body

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, first name, and last name are required' })
    }

    const trimmedEmail = email.toLowerCase().trim()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const fullName = `${trimmedFirstName} ${trimmedLastName}`

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail }
    })

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        user: existingUser
      })
    }

    const login = trimmedEmail.split('@')[0]

    let finalLogin = login
    let counter = 1
    while (await prisma.user.findUnique({ where: { login: finalLogin } })) {
      finalLogin = `${login}${counter}`
      counter++
    }

    const bcrypt = require('bcryptjs')
    const generatedPassword = await bcrypt.hash(`${finalLogin}-${Date.now()}`, 10)

    const user = await prisma.user.create({
      data: {
        login: finalLogin,
        email: trimmedEmail,
        name: fullName,
        password: generatedPassword,
        role: 'KLIENT',
        department: department?.trim() || null
      }
    })

    if (ticketId) {
      try {
        await prisma.ticket.update({
          where: { id: parseInt(ticketId) },
          data: { createdById: user.id }
        })
      } catch (ticketError) {
        console.warn('Failed to link user to ticket:', ticketError)
      }
    }

    try {
      await keycloak.ensureUserFromLocal(user)
    } catch (keycloakError) {
      console.warn('Keycloak sync failed (non-critical):', keycloakError.message)
    }

    logAudit({ action: 'CREATE_USER', entityType: 'User', entityId: user.id, userId: req.user.id, ...reqMeta(req), changes: { login: user.login, email: user.email, role: user.role } }).catch(() => {})

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      }
    })
  } catch (error) {
    console.error('Quick create user error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})


router.get('/agent-ratings', verifyToken, async (req, res) => {
  try {
    if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const agents = await prisma.user.findMany({
      where: {
        role: {
          in: ['AGENT', 'ADMIN', 'SUPER_ADMIN']
        }
      },
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const agentRatings = await Promise.all(
      agents.map(async (agent) => {
        const assignedTickets = await prisma.ticket.count({
          where: {
            assignedToId: agent.id
          }
        })

        const resolvedTickets = await prisma.ticket.count({
          where: {
            assignedToId: agent.id,
            status: 'CLOSED'
          }
        })

        const ratedTickets = await prisma.ticket.findMany({
          where: {
            assignedToId: agent.id,
            status: 'CLOSED',
            rating: {
              not: null
            }
          },
          select: {
            rating: true,
            ratingComment: true,
            closedAt: true
          }
        })

        const totalRatings = ratedTickets.length
        const averageRating = totalRatings > 0
          ? ratedTickets.reduce((sum, ticket) => sum + ticket.rating, 0) / totalRatings
          : null

        const ratingDistribution = {
          1: ratedTickets.filter(t => t.rating === 1).length,
          2: ratedTickets.filter(t => t.rating === 2).length,
          3: ratedTickets.filter(t => t.rating === 3).length,
          4: ratedTickets.filter(t => t.rating === 4).length,
          5: ratedTickets.filter(t => t.rating === 5).length
        }

        const recentComments = ratedTickets
          .filter(t => t.ratingComment)
          .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
          .slice(0, 3)
          .map(t => ({
            rating: t.rating,
            comment: t.ratingComment,
            date: t.closedAt
          }))

        return {
          agent: {
            id: agent.id,
            name: agent.name,
            login: agent.login,
            role: agent.role,
            email: agent.email
          },
          stats: {
            assignedTickets,
            resolvedTickets,
            totalRatings,
            averageRating: averageRating ? Math.round(averageRating * 100) / 100 : null,
            ratingDistribution,
            recentComments
          }
        }
      })
    )

    const sortedRatings = agentRatings.sort((a, b) => {
      if (a.stats.averageRating === null && b.stats.averageRating !== null) return 1
      if (a.stats.averageRating !== null && b.stats.averageRating === null) return -1
      if (a.stats.averageRating === null && b.stats.averageRating === null) return 0

      if (b.stats.averageRating !== a.stats.averageRating) {
        return b.stats.averageRating - a.stats.averageRating
      }

      return b.stats.totalRatings - a.stats.totalRatings
    })

    res.json({ agents: sortedRatings })
  } catch (error) {
    console.error('Error fetching agent ratings:', error)
    res.status(500).json({ error: 'Failed to fetch agent ratings' })
  }
})

module.exports = router
