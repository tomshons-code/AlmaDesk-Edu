
import { get, post, put, del } from './apiClient'

export const templatesAPI = {
  getAll: async (category = null) => {
    let query = ''
    if (category && category !== 'null' && category !== 'undefined') {
      const upperCategory = typeof category === 'string' ? category.toUpperCase() : category
      query = `?category=${encodeURIComponent(upperCategory)}`
    }
    return get(`/templates${query}`)
  },

  get: (id) => get(`/templates/${id}`),

  create: (data) => post('/templates', data),

  update: (id, data) => put(`/templates/${id}`, data),

  delete: (id) => del(`/templates/${id}`),

  suggest: async ({ category = null, keywords = '', limit = 5 } = {}) => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (keywords) params.set('keywords', keywords)
    params.set('limit', String(limit))
    return get(`/templates/suggest?${params}`)
  }
}

export default templatesAPI
