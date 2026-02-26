const { Client } = require('@elastic/elasticsearch')

const config = require('./env')

const esClient = new Client({
  node: config.ELASTICSEARCH_NODE || 'http://localhost:9200',
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: false
})

esClient.ping()
  .then(() => console.log('[Elasticsearch] Connected'))
  .catch((err) => console.error('[Elasticsearch] Connection error:', err.message))

const TICKETS_INDEX = 'almadesk-tickets'

async function initializeIndex() {
  try {
    const indexExists = await esClient.indices.exists({ index: TICKETS_INDEX })

    if (!indexExists) {
      await esClient.indices.create({
        index: TICKETS_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                polish_analyzer: {
                  type: 'standard',
                  stopwords: '_polish_'
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: {
                type: 'text',
                analyzer: 'polish_analyzer',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              description: {
                type: 'text',
                analyzer: 'polish_analyzer'
              },
              status: { type: 'keyword' },
              priority: { type: 'keyword' },
              category: { type: 'keyword' },
              source: { type: 'keyword' },
              isArchived: { type: 'boolean' },
              createdById: { type: 'integer' },
              createdBy: {
                properties: {
                  id: { type: 'integer' },
                  login: { type: 'keyword' },
                  name: { type: 'text' }
                }
              },
              assignedToId: { type: 'integer' },
              assignedTo: {
                properties: {
                  id: { type: 'integer' },
                  login: { type: 'keyword' },
                  name: { type: 'text' }
                }
              },
              tagIds: { type: 'integer' },
              tagNames: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              tags: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'keyword' },
                  color: { type: 'keyword' }
                }
              },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              resolvedAt: { type: 'date' }
            }
          }
        }
      })
      console.log(`[Elasticsearch] Created index: ${TICKETS_INDEX}`)
    } else {
      console.log(`[Elasticsearch] Index already exists: ${TICKETS_INDEX}`)
    }
  } catch (error) {
    console.error('Failed to initialize Elasticsearch index:', error)
  }
}

initializeIndex()

module.exports = {
  esClient,
  TICKETS_INDEX
}
