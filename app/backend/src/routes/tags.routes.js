
const express = require('express')
const router = express.Router()
const prisma = require('../db')
const { verifyToken: authenticate } = require('../../middlewares/jwt.middleware')

router.get('/', authenticate, async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    })

    res.json(tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      ticketCount: tag._count.tickets,
      createdAt: tag.createdAt
    })))
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const { role } = req.user

    if (role !== 'AGENT' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only agents can create tags' })
    }

    const { name, color } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name is required' })
    }

    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim() }
    })

    if (existingTag) {
      return res.status(409).json({ error: 'Tag already exists' })
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || '#6B7280'
      }
    })

    res.status(201).json(tag)
  } catch (error) {
    console.error('Failed to create tag:', error)
    res.status(500).json({ error: 'Failed to create tag' })
  }
})

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { role } = req.user

    if (role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete tags' })
    }

    const tagId = parseInt(req.params.id)

    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    await prisma.tag.delete({
      where: { id: tagId }
    })

    res.json({ message: 'Tag deleted successfully' })
  } catch (error) {
    console.error('Failed to delete tag:', error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
})

router.post('/:ticketId/assign', authenticate, async (req, res) => {
  try {
    const { role } = req.user

    if (role !== 'AGENT' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only agents can assign tags' })
    }

    const ticketId = parseInt(req.params.ticketId)
    const { tagId } = req.body

    if (!tagId) {
      return res.status(400).json({ error: 'Tag ID is required' })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    })

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    const existingRelation = await prisma.ticketTag.findUnique({
      where: {
        ticketId_tagId: {
          ticketId,
          tagId
        }
      }
    })

    if (existingRelation) {
      return res.status(409).json({ error: 'Tag already assigned to ticket' })
    }

    await prisma.ticketTag.create({
      data: {
        ticketId,
        tagId
      }
    })

    res.status(201).json({ message: 'Tag assigned successfully' })
  } catch (error) {
    console.error('Failed to assign tag:', error)
    res.status(500).json({ error: 'Failed to assign tag' })
  }
})

router.delete('/:ticketId/remove/:tagId', authenticate, async (req, res) => {
  try {
    const { role } = req.user

    if (role !== 'AGENT' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only agents can remove tags' })
    }

    const ticketId = parseInt(req.params.ticketId)
    const tagId = parseInt(req.params.tagId)

    const relation = await prisma.ticketTag.findUnique({
      where: {
        ticketId_tagId: {
          ticketId,
          tagId
        }
      }
    })

    if (!relation) {
      return res.status(404).json({ error: 'Tag not assigned to ticket' })
    }

    await prisma.ticketTag.delete({
      where: {
        ticketId_tagId: {
          ticketId,
          tagId
        }
      }
    })

    res.json({ message: 'Tag removed successfully' })
  } catch (error) {
    console.error('Failed to remove tag:', error)
    res.status(500).json({ error: 'Failed to remove tag' })
  }
})

module.exports = router
