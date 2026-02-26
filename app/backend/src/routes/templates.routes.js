
const express = require('express')
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')

const router = express.Router()

const agentOnly = (req, res, next) => {
  if (!['AGENT', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only agents and admins can manage templates' })
  }
  next()
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const { category } = req.query

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const where = {
      OR: [
        { isPublic: true },
        { createdById: req.user.id }
      ]
    }

    if (category && category !== 'null') {
      const upperCategory = category.toUpperCase()
      where.AND = [
        {
          OR: [
            { category: upperCategory },
            { category: null }
          ]
        }
      ]
    } else if (category === 'null') {
      where.AND = [{ category: null }]
    }

    const templates = await prisma.responseTemplate.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        isPublic: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error.message, error.stack)
    res.status(500).json({ error: 'Failed to fetch templates', details: error.message })
  }
})

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const template = await prisma.responseTemplate.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!template) return res.status(404).json({ error: 'Template not found' })

    if (!template.isPublic && template.createdById !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot access this template' })
    }

    res.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    res.status(500).json({ error: 'Failed to fetch template' })
  }
})

router.post('/', verifyToken, agentOnly, async (req, res) => {
  try {
    const { title, content, category, isPublic } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' })
    }

    const template = await prisma.responseTemplate.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category: category ? category.toUpperCase() : null,
        isPublic: isPublic !== false,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        }
      }
    })

    res.status(201).json(template)
  } catch (error) {
    console.error('Error creating template:', error)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

router.put('/:id', verifyToken, agentOnly, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id)
    const { title, content, category, isPublic } = req.body

    const template = await prisma.responseTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) return res.status(404).json({ error: 'Template not found' })

    if (template.createdById !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify this template' })
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' })
    }

    const updated = await prisma.responseTemplate.update({
      where: { id: templateId },
      data: {
        title: title.trim(),
        content: content.trim(),
        category: category ? category.toUpperCase() : null,
        isPublic: isPublic !== false
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        }
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating template:', error)
    res.status(500).json({ error: 'Failed to update template' })
  }
})

router.delete('/:id', verifyToken, agentOnly, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id)

    const template = await prisma.responseTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) return res.status(404).json({ error: 'Template not found' })

    if (template.createdById !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot delete this template' })
    }

    await prisma.responseTemplate.delete({
      where: { id: templateId }
    })

    res.json({ success: true, id: templateId })
  } catch (error) {
    console.error('Error deleting template:', error)
    res.status(500).json({ error: 'Failed to delete template' })
  }
})


router.get('/suggest', verifyToken, async (req, res) => {
  if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' })
  }
  try {
    const { category, keywords, limit = 5 } = req.query
    const maxResults = Math.min(parseInt(limit, 10) || 5, 10)

    const templates = await prisma.responseTemplate.findMany({
      where: {
        OR: [{ isPublic: true }, { createdById: req.user.id }]
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        isPublic: true,
        createdBy: { select: { id: true, name: true } }
      }
    })

    const kwords = (keywords || '').toLowerCase().split(/[\s,+]+/).filter(k => k.length >= 2)
    const cat    = (category || '').toUpperCase()

    const scored = templates.map(t => {
      let score = 0

      if (cat && t.category === cat)   score += 3
      if (cat && t.category === null)  score += 1

      const searchable = `${t.title} ${t.content}`.toLowerCase()
      let kwHits = 0
      kwords.forEach(kw => {
        if (searchable.includes(kw)) kwHits++
      })
      score += Math.min(kwHits, 4)

      return { ...t, _score: score }
    })

    const results = scored
      .filter(t => t._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, maxResults)
      .map(({ _score, ...t }) => t)

    res.json(results)
  } catch (error) {
    console.error('Error fetching template suggestions:', error)
    res.status(500).json({ error: 'Failed to fetch template suggestions' })
  }
})

module.exports = router
