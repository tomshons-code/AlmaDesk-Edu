
import { get, post, put, del } from './apiClient'

export async function getCategoryMappings() {
  const data = await get('/category-mappings')
  return data.data
}

export async function getCategories() {
  const data = await get('/category-mappings/categories')
  return data.data
}

export async function getOrganizationalUnits() {
  const data = await get('/category-mappings/units')
  return data.data
}

export async function createCategoryMapping(mapping) {
  return post('/category-mappings', mapping)
}

export async function updateCategoryMapping(id, mapping) {
  return put(`/category-mappings/${id}`, mapping)
}

export async function deleteCategoryMapping(id) {
  return del(`/category-mappings/${id}`)
}
