const redis = require('../config/redis')


const cacheMiddleware = (duration = 60) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next()
    }

    const cacheKey = `cache:${req.originalUrl}:user:${req.user?.id || 'anonymous'}`

    try {
      const cachedData = await redis.get(cacheKey)

      if (cachedData) {
        return res.json(JSON.parse(cachedData))
      }

      const originalJson = res.json.bind(res)
      res.json = (data) => {
        redis.setex(cacheKey, duration, JSON.stringify(data))
          .catch(err => console.error('Redis setex error:', err))

        return originalJson(data)
      }

      next()
    } catch (error) {
      console.error('Cache middleware error:', error)
      next()
    }
  }
}


const clearCache = async (pattern) => {
  try {
    const keys = []
    let cursor = '0'
    do {
      const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      keys.push(...batch)
    } while (cursor !== '0')

    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`[Cache] Wyczyszczono ${keys.length} kluczy pasujacych do: ${pattern}`)
    }
  } catch (error) {
    console.error('[Cache] Blad czyszczenia cache:', error.message)
  }
}

module.exports = {
  cacheMiddleware,
  clearCache
}
