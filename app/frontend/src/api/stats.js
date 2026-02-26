
import { get } from './apiClient'

export async function getDashboardStats() {
  const data = await get('/stats/dashboard')
  return data.data
}

export async function getTrendsData(days = 30) {
  const data = await get(`/stats/trends?days=${days}`)
  return data.data
}
