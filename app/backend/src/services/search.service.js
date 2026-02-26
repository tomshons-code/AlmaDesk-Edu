const { esClient, TICKETS_INDEX } = require('../../config/elasticsearch')
const prisma = require('../db')


let esAvailable = true
esClient.ping().then(() => { esAvailable = true }).catch(() => { esAvailable = false })


async function indexTicket(ticketId) {
  if (!esAvailable) return
  try {
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
      console.error(`Ticket ${ticketId} not found for indexing`)
      return
    }

    await esClient.index({
      index: TICKETS_INDEX,
      id: ticket.id.toString(),
      document: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        source: ticket.source || 'PORTAL',
        createdById: ticket.createdById,
        createdBy: ticket.createdBy,
        assignedToId: ticket.assignedToId,
        assignedTo: ticket.assignedTo,
        tagIds: ticket.tags.map(tt => tt.tag.id),
        tagNames: ticket.tags.map(tt => tt.tag.name),
        tags: ticket.tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        isArchived: ticket.isArchived || false
      }
    })
  } catch (error) {
    console.error(`Failed to index ticket ${ticketId}:`, error.message)
    esAvailable = false
  }
}


async function deleteTicket(ticketId) {
  try {
    await esClient.delete({
      index: TICKETS_INDEX,
      id: ticketId.toString()
    })
  } catch (error) {
    if (error.meta?.statusCode !== 404) {
      console.error(`Failed to delete ticket ${ticketId}:`, error.message)
    }
  }
}


async function reindexAllTickets() {
  if (!esAvailable) {
    console.warn('[Search] Elasticsearch not available, skipping reindex')
    return
  }
  try {
    const tickets = await prisma.ticket.findMany({
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

    if (tickets.length === 0) {
      return
    }

    const body = tickets.flatMap(ticket => [
      { index: { _index: TICKETS_INDEX, _id: ticket.id.toString() } },
      {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        source: ticket.source || 'PORTAL',
        createdById: ticket.createdById,
        createdBy: ticket.createdBy,
        assignedToId: ticket.assignedToId,
        assignedTo: ticket.assignedTo,
        tagIds: ticket.tags.map(tt => tt.tag.id),
        tagNames: ticket.tags.map(tt => tt.tag.name),
        tags: ticket.tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        isArchived: ticket.isArchived || false
      }
    ])

    const result = await esClient.bulk({ body })

    if (result.errors) {
      console.error('[Search] Some tickets failed to index')
    }
  } catch (error) {
    console.error('Failed to reindex tickets:', error)
    esAvailable = false
  }
}


async function searchTickets(query, filters = {}) {
  if (!esAvailable) {
    return searchTicketsFallback(query, filters)
  }

  try {
    const must = []
    const should = []
    const filter = []

    if (query && query.trim().length > 0) {
      const q = query.trim()

      const idMatch = q.match(/^#?(\d+)$|^id:\s*(\d+)$/i)

      if (idMatch) {
        const ticketId = parseInt(idMatch[1] || idMatch[2])
        must.push({ term: { id: ticketId } })
      } else {
        must.push({
          bool: {
            should: [
              {
                match_phrase: {
                  title: {
                    query: q,
                    boost: 5
                  }
                }
              },
              {
                match_phrase: {
                  description: {
                    query: q,
                    boost: 2
                  }
                }
              },
              {
                match: {
                  title: {
                    query: q,
                    fuzziness: 'AUTO',
                    prefix_length: 1,
                    boost: 3
                  }
                }
              },
              {
                match: {
                  description: {
                    query: q,
                    fuzziness: 'AUTO',
                    prefix_length: 1,
                    boost: 1
                  }
                }
              },
              {
                wildcard: {
                  'title.keyword': {
                    value: `*${q.toLowerCase()}*`,
                    boost: 1.5,
                    case_insensitive: true
                  }
                }
              },
              {
                match: {
                  tagNames: {
                    query: q,
                    fuzziness: 'AUTO',
                    boost: 1.5
                  }
                }
              },
              {
                wildcard: {
                  category: {
                    value: `*${q.toLowerCase()}*`,
                    case_insensitive: true,
                    boost: 1
                  }
                }
              },
              {
                multi_match: {
                  query: q,
                  fields: ['createdBy.name', 'createdBy.login', 'assignedTo.name', 'assignedTo.login'],
                  fuzziness: 'AUTO',
                  boost: 1
                }
              }
            ],
            minimum_should_match: 1
          }
        })
      }
    }

    if (filters.status) {
      const statuses = (Array.isArray(filters.status) ? filters.status : [filters.status])
      filter.push({ terms: { status: statuses } })
    }
    if (filters.priority) {
      const priorities = (Array.isArray(filters.priority) ? filters.priority : [filters.priority])
      filter.push({ terms: { priority: priorities } })
    }
    if (filters.category) {
      filter.push({ terms: { category: Array.isArray(filters.category) ? filters.category : [filters.category] } })
    }
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      filter.push({ terms: { tagIds: filters.tags } })
    }
    if (filters.createdById) {
      filter.push({ term: { createdById: filters.createdById } })
    }
    if (filters.assignedToId) {
      filter.push({ term: { assignedToId: filters.assignedToId } })
    }

    if (filters.createdAfter || filters.createdBefore) {
      const range = {}
      if (filters.createdAfter) range.gte = filters.createdAfter
      if (filters.createdBefore) range.lte = filters.createdBefore
      filter.push({ range: { createdAt: range } })
    }

    const result = await esClient.search({
      index: TICKETS_INDEX,
      body: {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        highlight: {
          fields: {
            title: { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
            description: { pre_tags: ['<mark>'], post_tags: ['</mark>'], fragment_size: 150, number_of_fragments: 2 }
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ],
        size: 100
      }
    })

    return {
      total: result.hits.total.value,
      tickets: result.hits.hits.map(hit => ({
        ...hit._source,
        _score: hit._score,
        _highlight: hit.highlight || null
      }))
    }
  } catch (error) {
    console.error('ES Search error, falling back to Prisma:', error.message)
    esAvailable = false
    return searchTicketsFallback(query, filters)
  }
}


async function searchTicketsFallback(query, filters = {}) {
  try {
    const where = {}
    const q = (query || '').trim()

    if (q) {
      const idMatch = q.match(/^#?(\d+)$|^id:\s*(\d+)$/i)
      if (idMatch) {
        where.id = parseInt(idMatch[1] || idMatch[2])
      } else {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      }
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      where.status = { in: statuses }
    }
    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      where.priority = { in: priorities }
    }
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      where.tags = { some: { tagId: { in: filters.tags } } }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: { select: { id: true, login: true, name: true } },
        assignedTo: { select: { id: true, login: true, name: true } },
        tags: { include: { tag: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return {
      total: tickets.length,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        source: ticket.source || 'PORTAL',
        createdById: ticket.createdById,
        createdBy: ticket.createdBy,
        assignedToId: ticket.assignedToId,
        assignedTo: ticket.assignedTo,
        tagIds: ticket.tags.map(tt => tt.tag.id),
        tagNames: ticket.tags.map(tt => tt.tag.name),
        tags: ticket.tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        _score: null,
        _highlight: null
      }))
    }
  } catch (error) {
    console.error('Prisma fallback search error:', error)
    throw error
  }
}

module.exports = {
  indexTicket,
  deleteTicket,
  reindexAllTickets,
  searchTickets
}
