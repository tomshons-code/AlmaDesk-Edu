
import { get, post, put, del, upload, downloadBlob } from './apiClient'

export const getArticles = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.category) queryParams.append('category', params.category)
  if (params.status) queryParams.append('status', params.status)
  if (params.search) queryParams.append('search', params.search)
  const qs = queryParams.toString()
  return get(`/knowledge-base${qs ? `?${qs}` : ''}`)
}

export const getArticle = (slug) => get(`/knowledge-base/${slug}`)

export const createArticle = (data) => post('/knowledge-base', data)

export const updateArticle = (id, data) => put(`/knowledge-base/${id}`, data)

export const deleteArticle = (id) => del(`/knowledge-base/${id}`)

export const submitFeedback = (id, helpful) => post(`/knowledge-base/${id}/feedback`, { helpful })

export const getCategoryStats = () => get('/knowledge-base/stats/categories')


export const uploadAttachments = (articleId, files) => {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  return upload(`/knowledge-base/${articleId}/attachments`, formData)
}

export const getAttachments = (articleId) => get(`/knowledge-base/${articleId}/attachments`)

export const downloadAttachment = (attachmentId) =>
  downloadBlob(`/knowledge-base/attachments/${attachmentId}/download`)

export const deleteAttachment = (attachmentId) =>
  del(`/knowledge-base/attachments/${attachmentId}`)
