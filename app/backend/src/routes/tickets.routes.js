
const express = require('express')
const prisma = require('../db')
const { verifyToken: authenticate } = require('../../middlewares/jwt.middleware')
const { cacheMiddleware, clearCache } = require('../../middlewares/cache.middleware')
const { searchTickets, indexTicket, reindexAllTickets } = require('../services/search.service')
const { sendNewTicketNotification, sendStatusChangeNotification, sendNewCommentNotification } = require('../services/email.service')
const upload = require('../../middlewares/upload.middleware')
const { uploadFile, downloadFile, deleteFile } = require('../../config/minio')
const { logAudit, reqMeta } = require('../services/audit.service')

const router = express.Router()

router.post('/reindex', authenticate, async (req, res) => {
  try {
    await reindexAllTickets()
    res.json({ message: 'Reindexing completed' })
  } catch (error) {
    console.error('Reindex error:', error)
    res.status(500).json({ error: 'Failed to reindex' })
  }
})

router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, status, priority, category, createdBy, assignedTo, tags } = req.query

    if (!q || q.trim().length < 1) {
      return res.status(400).json({ error: 'Search query must be at least 1 character' })
    }

    const filters = {}

    if (status) filters.status = status.split(',').map(s => s.toUpperCase().replace(/-/g, '_'))
    if (priority) filters.priority = priority.split(',').map(p => p.toUpperCase())
    if (category) filters.category = category.split(',').map(c => c.toUpperCase())
    if (tags) filters.tags = tags.split(',').map(t => parseInt(t)).filter(t => !isNaN(t))

    if (createdBy) {
      const creator = await prisma.user.findUnique({ where: { login: createdBy } })
      if (creator) filters.createdById = creator.id
    }

    if (assignedTo) {
      const assignee = await prisma.user.findUnique({ where: { login: assignedTo } })
      if (assignee) filters.assignedToId = assignee.id
    }

    const result = await searchTickets(q, filters)

    const formattedTickets = result.tickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: (ticket.status || '').toLowerCase().replace(/_/g, '-'),
      priority: (ticket.priority || '').toLowerCase(),
      category: (ticket.category || '').toLowerCase(),
      source: (ticket.source || 'PORTAL').toLowerCase().replace(/_/g, '-'),
      createdBy: ticket.createdBy || null,
      assignedTo: ticket.assignedTo || null,
      tags: ticket.tags || [],
      tagNames: ticket.tagNames || [],
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      relevance: ticket._score,
      highlight: ticket._highlight || null
    }))

    res.json({
      query: q,
      total: result.total,
      tickets: formattedTickets
    })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Failed to search tickets' })
  }
})

router.get('/', authenticate, cacheMiddleware(30), async (req, res) => {
  try {
    const { status, priority, category, createdBy, assignedTo, archived, tags, location, department, laboratory } = req.query

    const where = {}

    if (archived === 'true') {
      where.isArchived = true
    } else if (archived === 'false') {
      where.isArchived = false
    } else {
      where.isArchived = false
    }

    if (status) where.status = status.toUpperCase().replace('-', '_')
    if (priority) where.priority = priority.toUpperCase()
    if (category) where.category = category.toUpperCase()
    if (location) where.location = { contains: location, mode: 'insensitive' }
    if (department) where.department = { contains: department, mode: 'insensitive' }
    if (laboratory) where.laboratory = { contains: laboratory, mode: 'insensitive' }

    if (createdBy) {
      const creator = await prisma.user.findUnique({ where: { login: createdBy } })
      if (creator) where.createdById = creator.id
    }

    if (assignedTo) {
      const assignee = await prisma.user.findUnique({ where: { login: assignedTo } })
      if (assignee) where.assignedToId = assignee.id
    }

    if (tags) {
      const tagIds = tags.split(',').map(t => parseInt(t)).filter(id => !isNaN(id))
      if (tagIds.length > 0) {
        where.tags = {
          some: {
            tagId: { in: tagIds }
          }
        }
      }
    }

    if (req.user.role === 'KLIENT') {
      where.createdById = req.user.id
    } else if (req.user.role === 'AGENT' && req.user.organizationalUnitId) {
      const mappings = await prisma.categoryMapping.findMany({
        where: {
          organizationalUnitId: req.user.organizationalUnitId,
          isActive: true
        }
      })

      if (mappings.length > 0) {
        const allowedCategories = mappings.map(m => m.category)
        where.category = {
          in: allowedCategories
        }
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status.toLowerCase().replace('_', '-'),
      priority: ticket.priority.toLowerCase(),
      category: ticket.category.toLowerCase(),
      source: ticket.source?.toLowerCase().replace('_', '-') || 'portal',
      location: ticket.location || null,
      department: ticket.department || null,
      laboratory: ticket.laboratory || null,
      createdBy: ticket.createdBy.login,
      assignedTo: ticket.assignedTo?.login || null,
      tags: ticket.tags.map(tt => ({
        id: tt.tag.id,
        name: tt.tag.name,
        color: tt.tag.color
      })),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null
    }))

    res.json(formattedTickets)
  } catch (error) {
    console.error('Get tickets error:', error)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

router.get('/:id', authenticate, cacheMiddleware(60), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    res.json({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status.toLowerCase().replace('_', '-'),
      priority: ticket.priority.toLowerCase(),
      category: ticket.category.toLowerCase(),
      source: ticket.source?.toLowerCase().replace('_', '-') || 'portal',
      location: ticket.location || null,
      department: ticket.department || null,
      laboratory: ticket.laboratory || null,
      createdBy: ticket.createdBy.login,
      assignedTo: ticket.assignedTo?.login || null,
      tags: ticket.tags.map(tt => ({
        id: tt.tag.id,
        name: tt.tag.name,
        color: tt.tag.color
      })),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Get ticket error:', error)
    res.status(500).json({ error: 'Failed to fetch ticket' })
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, priority, category, source, location, department, laboratory } = req.body

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' })
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: (priority || 'MEDIUM').toUpperCase(),
        category: (category || 'OTHER').toUpperCase(),
        status: 'OPEN',
        source: (source || 'PORTAL').toUpperCase().replace('-', '_'),
        location: location || null,
        department: department || null,
        laboratory: laboratory || null,
        createdById: req.user.id
      },
      include: {
        createdBy: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache('cache:/api/tickets*')
    indexTicket(ticket.id).catch(err => console.error('Failed to index ticket:', err))

    sendNewTicketNotification(ticket).catch(err =>
      console.error('Failed to send new ticket notification:', err)
    )

    logAudit({ action: 'CREATE_TICKET', entityType: 'Ticket', entityId: ticket.id, ticketId: ticket.id, userId: req.user.id, ...reqMeta(req), changes: { title, priority, category } }).catch(() => {})

    res.status(201).json({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status.toLowerCase(),
      priority: ticket.priority.toLowerCase(),
      category: ticket.category.toLowerCase(),
      source: ticket.source?.toLowerCase().replace('_', '-') || 'portal',
      createdBy: ticket.createdBy.login,
      assignedTo: null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: null
    })
  } catch (error) {
    console.error('Create ticket error:', error)
    res.status(500).json({ error: 'Failed to create ticket' })
  }
})

router.post('/register', authenticate, async (req, res) => {
  try {
    if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only agents and admins can register tickets' })
    }

    const { clientLogin, title, description, priority, category, source } = req.body

    if (!clientLogin || !title || !description || !source) {
      return res.status(400).json({ error: 'clientLogin, title, description and source are required' })
    }

    const validSources = ['PHONE', 'CHAT', 'WALK_IN', 'EMAIL', 'TEAMS']
    const normalizedSource = source.toUpperCase().replace('-', '_')
    if (!validSources.includes(normalizedSource)) {
      return res.status(400).json({ error: `Invalid source. Allowed: ${validSources.join(', ')}` })
    }

    const client = await prisma.user.findUnique({ where: { login: clientLogin } })
    if (!client) {
      return res.status(404).json({ error: `User '${clientLogin}' not found` })
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: (priority || 'MEDIUM').toUpperCase(),
        category: (category || 'OTHER').toUpperCase(),
        status: 'OPEN',
        source: normalizedSource,
        createdById: client.id,
        assignedToId: req.user.id
      },
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache('cache:/api/tickets*')
    indexTicket(ticket.id).catch(err => console.error('Failed to index ticket:', err))
    sendNewTicketNotification(ticket).catch(err => console.error('Failed to send new ticket notification:', err))
    logAudit({ action: 'CREATE_TICKET', entityType: 'Ticket', entityId: ticket.id, ticketId: ticket.id, userId: req.user.id, ...reqMeta(req), changes: { title, priority, category, source: normalizedSource, registeredFor: clientLogin } }).catch(() => {})

    res.status(201).json({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status.toLowerCase(),
      priority: ticket.priority.toLowerCase(),
      category: ticket.category.toLowerCase(),
      source: ticket.source.toLowerCase().replace('_', '-'),
      createdBy: ticket.createdBy.login,
      assignedTo: ticket.assignedTo?.login || null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: null
    })
  } catch (error) {
    console.error('Register ticket error:', error)
    res.status(500).json({ error: 'Failed to register ticket' })
  }
})

router.put('/:id', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)
    const { title, description, priority, category } = req.body

    const data = {}
    if (title) data.title = title
    if (description) data.description = description
    if (priority) data.priority = priority.toUpperCase()
    if (category) data.category = category.toUpperCase()

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache('cache:/api/tickets*')

    indexTicket(ticket.id).catch(err => console.error('Failed to reindex ticket:', err))

    res.json({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status.toLowerCase().replace('_', '-'),
      priority: ticket.priority.toLowerCase(),
      category: ticket.category.toLowerCase(),
      source: ticket.source?.toLowerCase().replace('_', '-') || 'portal',
      createdBy: ticket.createdBy.login,
      assignedTo: ticket.assignedTo?.login || null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Update ticket error:', error)
    res.status(500).json({ error: 'Failed to update ticket' })
  }
})

router.post('/:id/assign', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)
    const { assignTo } = req.body

    let assignedToId = null

    if (assignTo) {
      const assignee = await prisma.user.findUnique({
        where: { login: assignTo }
      })

      if (!assignee) {
        return res.status(404).json({ error: 'User not found' })
      }

      assignedToId = assignee.id
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId },
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache('cache:/api/tickets*')

    indexTicket(ticket.id).catch(err => console.error('Failed to reindex ticket:', err))

    logAudit({ action: 'ASSIGN_TICKET', entityType: 'Ticket', entityId: ticketId, ticketId, userId: req.user.id, ...reqMeta(req), changes: { assignTo: assignTo || null } }).catch(() => {})

    res.json({
      message: assignTo ? 'Ticket assigned successfully' : 'Ticket unassigned',
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status.toLowerCase().replace('_', '-'),
        priority: ticket.priority.toLowerCase(),
        category: ticket.category.toLowerCase(),
        createdBy: ticket.createdBy.login,
        assignedTo: ticket.assignedTo?.login || null,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString() || null
      }
    })
  } catch (error) {
    console.error('Assign ticket error:', error)
    res.status(500).json({ error: 'Failed to assign ticket' })
  }
})

router.post('/:id/status', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true, createdById: true }
    })

    if (!existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const isUser = req.user.role === 'USER'
    if (isUser) {
      const wantsClose = status.toLowerCase() === 'closed'
      const wantsReopen = status.toLowerCase() === 'open'
      const isOwner = existingTicket.createdById === req.user.id

      if (!isOwner) {
        return res.status(403).json({ error: 'Unauthorized to update this ticket' })
      }

      if (!wantsClose && !wantsReopen) {
        return res.status(403).json({ error: 'Users can only close or reopen their tickets' })
      }

      if (wantsClose && existingTicket.status === 'CLOSED') {
        return res.status(400).json({ error: 'Ticket is already closed' })
      }

      if (wantsReopen && existingTicket.status !== 'CLOSED') {
        return res.status(400).json({ error: 'Only closed tickets can be reopened' })
      }
    }

    const data = {
      status: status.toUpperCase().replace('-', '_')
    }

    if (status === 'resolved') {
      data.resolvedAt = new Date()
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache('cache:/api/tickets*')

    indexTicket(ticket.id).catch(err => console.error('Failed to reindex ticket:', err))

    if (existingTicket.status !== data.status) {
      sendStatusChangeNotification(ticket, existingTicket.status, data.status).catch(err =>
        console.error('Failed to send status change notification:', err)
      )
    }

    logAudit({ action: 'STATUS_CHANGE', entityType: 'Ticket', entityId: ticketId, ticketId, userId: req.user.id, ...reqMeta(req), changes: { from: existingTicket.status, to: data.status } }).catch(() => {})

    res.json({
      message: 'Status updated successfully',
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status.toLowerCase().replace('_', '-'),
        priority: ticket.priority.toLowerCase(),
        category: ticket.category.toLowerCase(),
        createdBy: ticket.createdBy.login,
        assignedTo: ticket.assignedTo?.login || null,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString() || null
      }
    })
  } catch (error) {
    console.error('Update status error:', error)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

router.get('/:id/comments', authenticate, cacheMiddleware(30), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)

    const comments = await prisma.comment.findMany({
      where: { ticketId },
      include: {
        author: { select: { id: true, login: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    const filteredComments = comments.filter(comment => {
      if (comment.isInternal && req.user.role === 'USER') {
        return false
      }
      return true
    })

    const formattedComments = filteredComments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.author.login,
      isInternal: comment.isInternal,
      isEdited: comment.isEdited,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString()
    }))

    res.json(formattedComments)
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)
    const { content, isInternal } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const allowInternalComment = req.user.role === 'AGENT' || req.user.role === 'SUPER_ADMIN'
    const commentIsInternal = allowInternalComment && isInternal === true

    let finalContent = content
    if (allowInternalComment && !commentIsInternal) {
      const agent = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { agentSignature: true }
      })

      if (agent?.agentSignature) {
        finalContent = `${content}\n\n---\n${agent.agentSignature}`
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: finalContent,
        ticketId,
        authorId: req.user.id,
        isInternal: commentIsInternal
      },
      include: {
        author: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache(`cache:/api/tickets/${ticketId}/comments*`)

    logAudit({ action: commentIsInternal ? 'CREATE_INTERNAL_COMMENT' : 'CREATE_COMMENT', entityType: 'Comment', entityId: comment.id, ticketId, userId: req.user.id, ...reqMeta(req) }).catch(() => {})

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } }
      }
    })

    if (ticket) {
      sendNewCommentNotification(comment, ticket).catch(err =>
        console.error('Failed to send comment notification:', err)
      )
    }

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      author: comment.author.login,
      isInternal: comment.isInternal,
      isEdited: comment.isEdited,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Add comment error:', error)
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

router.put('/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)
    const commentId = parseInt(req.params.commentId)
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: { select: { id: true, login: true, name: true } },
        ticket: { select: { id: true } }
      }
    })

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    if (comment.ticket.id !== ticketId) {
      return res.status(400).json({ error: 'Comment does not belong to this ticket' })
    }

    const isAuthor = comment.authorId === req.user.id
    const isAgent = req.user.role === 'AGENT' || req.user.role === 'SUPER_ADMIN'

    if (!isAuthor && !isAgent) {
      return res.status(403).json({ error: 'Unauthorized to edit this comment' })
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true
      },
      include: {
        author: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache(`cache:/api/tickets/${ticketId}/comments*`)

    res.json({
      id: updatedComment.id,
      content: updatedComment.content,
      author: updatedComment.author.login,
      isInternal: updatedComment.isInternal,
      isEdited: updatedComment.isEdited,
      createdAt: updatedComment.createdAt.toISOString(),
      updatedAt: updatedComment.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Edit comment error:', error)
    res.status(500).json({ error: 'Failed to edit comment' })
  }
})

router.put('/:id/rating', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)
    const { rating, comment } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, createdById: true, status: true, rating: true }
    })

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    if (ticket.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Only ticket creator can rate' })
    }

    if (ticket.status !== 'CLOSED') {
      return res.status(400).json({ error: 'Only closed tickets can be rated' })
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        rating: parseInt(rating),
        ratingComment: comment || null,
        ratedAt: new Date()
      },
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache(`cache:/api/tickets/${ticketId}*`)

    res.json({
      id: updatedTicket.id,
      rating: updatedTicket.rating,
      ratingComment: updatedTicket.ratingComment,
      ratedAt: updatedTicket.ratedAt?.toISOString()
    })
  } catch (error) {
    console.error('Rate ticket error:', error)
    res.status(500).json({ error: 'Failed to rate ticket' })
  }
})

router.put('/:id/archive', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)
    const { archive } = req.body

    if (req.user.role !== 'AGENT' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only agents and admins can archive tickets' })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, isArchived: true, status: true }
    })

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    if (archive && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
      return res.status(400).json({ error: 'Only closed or resolved tickets can be archived' })
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isArchived: archive === true,
        archivedAt: archive === true ? new Date() : null
      },
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } }
      }
    })

    await clearCache(`cache:/api/tickets*`)

    logAudit({ action: archive ? 'ARCHIVE_TICKET' : 'RESTORE_TICKET', entityType: 'Ticket', entityId: ticketId, ticketId, userId: req.user.id, ...reqMeta(req) }).catch(() => {})

    res.json({
      id: updatedTicket.id,
      isArchived: updatedTicket.isArchived,
      archivedAt: updatedTicket.archivedAt?.toISOString(),
      message: archive ? 'Ticket archived successfully' : 'Ticket restored from archive'
    })
  } catch (error) {
    console.error('Archive ticket error:', error)
    res.status(500).json({ error: 'Failed to archive ticket' })
  }
})

router.post('/:id/attachments', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const attachments = []

    for (const file of req.files) {
      const uploadResult = await uploadFile(file, {
        ticketId: ticketId.toString(),
        uploadedBy: req.user.login
      })

      const attachment = await prisma.attachment.create({
        data: {
          filename: uploadResult.filename,
          originalName: uploadResult.originalName,
          mimeType: uploadResult.mimeType,
          size: uploadResult.size,
          minioKey: uploadResult.minioKey,
          minioBucket: uploadResult.minioBucket,
          ticketId
        }
      })

      attachments.push({
        id: attachment.id,
        filename: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        uploadedAt: attachment.uploadedAt.toISOString()
      })
    }

    res.status(201).json({ attachments })
  } catch (error) {
    console.error('Upload attachment error:', error)
    res.status(500).json({ error: 'Failed to upload attachments' })
  }
})

router.get('/:id/attachments', authenticate, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id)

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { uploadedAt: 'desc' }
    })

    const formattedAttachments = attachments.map(att => ({
      id: att.id,
      filename: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedAt: att.uploadedAt.toISOString()
    }))

    res.json(formattedAttachments)
  } catch (error) {
    console.error('Get attachments error:', error)
    res.status(500).json({ error: 'Failed to fetch attachments' })
  }
})

router.get('/attachments/:id/download', authenticate, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.id)

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' })
    }

    const fileStream = await downloadFile(attachment.minioKey)

    res.setHeader('Content-Type', attachment.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`)

    fileStream.pipe(res)
  } catch (error) {
    console.error('Download attachment error:', error)
    res.status(500).json({ error: 'Failed to download attachment' })
  }
})

router.delete('/attachments/:id', authenticate, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.id)

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: { select: { createdById: true } }
      }
    })

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' })
    }

    const isCreator = attachment.ticket?.createdById === req.user.id
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'AGENT'

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this attachment' })
    }

    await deleteFile(attachment.minioKey)

    await prisma.attachment.delete({
      where: { id: attachmentId }
    })

    res.json({ message: 'Attachment deleted successfully' })
  } catch (error) {
    console.error('Delete attachment error:', error)
    res.status(500).json({ error: 'Failed to delete attachment' })
  }
})

module.exports = router
