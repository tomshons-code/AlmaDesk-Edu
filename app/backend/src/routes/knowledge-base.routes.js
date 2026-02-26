
const express = require('express')
const prisma = require('../db')
const { verifyToken } = require('../../middlewares/jwt.middleware')
const upload = require('../../middlewares/upload.middleware')
const { uploadFile, downloadFile, deleteFile } = require('../../config/minio')

const router = express.Router()

const agentOnly = (req, res, next) => {
  if (!['AGENT', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only agents and admins can manage knowledge base' })
  }
  next()
}

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug },
      select: { id: true }
    })

    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const { category, status, search, parentId } = req.query
    const isAgent = ['AGENT', 'SUPER_ADMIN'].includes(req.user.role)

    const where = {}

    if (!isAgent) {
      where.status = 'PUBLISHED'
    } else if (status) {
      where.status = status.toUpperCase()
    }

    if (category) {
      where.category = category.toUpperCase()
    }

    if (parentId !== undefined) {
      where.parentId = parentId === 'null' || parentId === '' ? null : parseInt(parentId)
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ]
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        status: true,
        isFolder: true,
        parentId: true,
        viewCount: true,
        helpfulCount: true,
        notHelpfulCount: true,
        tags: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            children: true
          }
        }
      },
      orderBy: [
        { isFolder: 'desc' },
        { status: 'asc' },
        { updatedAt: 'desc' }
      ]
    })

    res.json(articles)
  } catch (error) {
    console.error('Error fetching knowledge base articles:', error)
    res.status(500).json({ error: 'Failed to fetch articles' })
  }
})


router.get('/stats/categories', verifyToken, async (req, res) => {
  try {
    const isAgent = ['AGENT', 'SUPER_ADMIN'].includes(req.user.role)
    const where = isAgent ? {} : { status: 'PUBLISHED' }

    const articles = await prisma.knowledgeBaseArticle.groupBy({
      by: ['category'],
      where,
      _count: true
    })

    res.json(articles)
  } catch (error) {
    console.error('Error fetching category stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

router.get('/attachments/:attachmentId/download', verifyToken, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId)

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) return res.status(404).json({ error: 'Attachment not found' })

    const fileStream = await downloadFile(attachment.minioKey)

    res.setHeader('Content-Type', attachment.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`)
    fileStream.pipe(res)
  } catch (error) {
    console.error('KB download attachment error:', error)
    res.status(500).json({ error: 'Failed to download attachment' })
  }
})

router.delete('/attachments/:attachmentId', verifyToken, agentOnly, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId)

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) return res.status(404).json({ error: 'Attachment not found' })

    await deleteFile(attachment.minioKey)
    await prisma.attachment.delete({ where: { id: attachmentId } })

    res.json({ message: 'Attachment deleted' })
  } catch (error) {
    console.error('KB delete attachment error:', error)
    res.status(500).json({ error: 'Failed to delete attachment' })
  }
})


router.get('/:slug', verifyToken, async (req, res) => {
  try {
    const { slug } = req.params
    const isAgent = ['AGENT', 'SUPER_ADMIN'].includes(req.user.role)

    const where = { slug }

    if (!isAgent) {
      where.status = 'PUBLISHED'
    }

    const article = await prisma.knowledgeBaseArticle.findFirst({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!article) {
      return res.status(404).json({ error: 'Article not found' })
    }

    await prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } }
    })

    res.json(article)
  } catch (error) {
    console.error('Error fetching article:', error)
    res.status(500).json({ error: 'Failed to fetch article' })
  }
})

router.post('/', verifyToken, agentOnly, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      category,
      status,
      isFolder,
      parentId,
      tags,
      relatedTicketCategories,
      metaDescription,
      keywords
    } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    if (!isFolder && !content) {
      return res.status(400).json({ error: 'Content is required for articles' })
    }

    const baseSlug = generateSlug(title)
    const slug = await ensureUniqueSlug(baseSlug)

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        title,
        slug,
        content: content || '',
        excerpt: excerpt || null,
        category: category?.toUpperCase() || 'OTHER',
        status: status?.toUpperCase() || 'DRAFT',
        isFolder: isFolder || false,
        parentId: parentId ? parseInt(parentId) : null,
        tags: tags || [],
        relatedTicketCategories: relatedTicketCategories || [],
        metaDescription: metaDescription || null,
        keywords: keywords || [],
        authorId: req.user.id,
        publishedAt: status?.toUpperCase() === 'PUBLISHED' ? new Date() : null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.status(201).json(article)
  } catch (error) {
    console.error('Error creating article:', error)
    res.status(500).json({ error: 'Failed to create article' })
  }
})

router.put('/:id', verifyToken, agentOnly, async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      content,
      excerpt,
      category,
      status,
      tags,
      relatedTicketCategories,
      metaDescription,
      keywords
    } = req.body

    const articleId = parseInt(id)

    const existing = await prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Article not found' })
    }

    const updateData = {}

    if (title !== undefined) {
      updateData.title = title
      if (title !== existing.title) {
        const baseSlug = generateSlug(title)
        updateData.slug = await ensureUniqueSlug(baseSlug, articleId)
      }
    if (req.body.isFolder !== undefined) updateData.isFolder = req.body.isFolder
    if (req.body.parentId !== undefined) updateData.parentId = req.body.parentId ? parseInt(req.body.parentId) : null
    }

    if (content !== undefined) updateData.content = content
    if (excerpt !== undefined) updateData.excerpt = excerpt
    if (category !== undefined) updateData.category = category.toUpperCase()
    if (tags !== undefined) updateData.tags = tags
    if (relatedTicketCategories !== undefined) updateData.relatedTicketCategories = relatedTicketCategories
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription
    if (keywords !== undefined) updateData.keywords = keywords

    if (status !== undefined) {
      updateData.status = status.toUpperCase()
      if (updateData.status === 'PUBLISHED' && !existing.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }

    const article = await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    res.status(500).json({ error: 'Failed to update article' })
  }
})

router.delete('/:id', verifyToken, agentOnly, async (req, res) => {
  try {
    const { id } = req.params
    const articleId = parseInt(id)

    await prisma.knowledgeBaseArticle.delete({
      where: { id: articleId }
    })

    res.json({ message: 'Article deleted successfully' })
  } catch (error) {
    console.error('Error deleting article:', error)
    res.status(500).json({ error: 'Failed to delete article' })
  }
})

router.post('/:id/feedback', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { helpful } = req.body

    const articleId = parseInt(id)

    const updateData = helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } }

    const article = await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: updateData,
      select: {
        id: true,
        helpfulCount: true,
        notHelpfulCount: true
      }
    })

    res.json(article)
  } catch (error) {
    console.error('Error submitting feedback:', error)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})


router.post('/:id/attachments', verifyToken, agentOnly, upload.array('files', 5), async (req, res) => {
  try {
    const articleId = parseInt(req.params.id)

    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
      select: { id: true }
    })
    if (!article) return res.status(404).json({ error: 'Article not found' })

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const attachments = []

    for (const file of req.files) {
      const uploadResult = await uploadFile(file, {
        knowledgeBaseArticleId: articleId.toString(),
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
          knowledgeBaseArticleId: articleId
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
    console.error('KB upload attachment error:', error)
    res.status(500).json({ error: 'Failed to upload attachments' })
  }
})

router.get('/:id/attachments', verifyToken, async (req, res) => {
  try {
    const articleId = parseInt(req.params.id)

    const attachments = await prisma.attachment.findMany({
      where: { knowledgeBaseArticleId: articleId },
      orderBy: { uploadedAt: 'desc' }
    })

    res.json(attachments.map(att => ({
      id: att.id,
      filename: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedAt: att.uploadedAt.toISOString()
    })))
  } catch (error) {
    console.error('KB get attachments error:', error)
    res.status(500).json({ error: 'Failed to fetch attachments' })
  }
})

module.exports = router
