

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'


function getToken() {
  return localStorage.getItem('almadesk_token')
}


function authHeaders(json = true) {
  const headers = {}
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (json) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}


async function handleResponse(response) {
  if (response.status === 204) {
    return null
  }

  let data
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    if (response.ok) return response
    const text = await response.text()
    data = { error: text || response.statusText }
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('almadesk_token')
      window.dispatchEvent(new Event('auth:logout'))
    }

    const error = new Error(data.error || data.message || `HTTP ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}


export async function get(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: authHeaders(false)
  })
  return handleResponse(response)
}


export async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(body)
  })
  return handleResponse(response)
}


export async function put(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify(body)
  })
  return handleResponse(response)
}


export async function patch(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(body)
  })
  return handleResponse(response)
}


export async function del(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(false)
  })
  return handleResponse(response)
}


export async function upload(path, formData, method = 'POST') {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData
  })
  return handleResponse(response)
}


export async function downloadBlob(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: authHeaders(false)
  })

  if (!response.ok) {
    const text = await response.text()
    const error = new Error(text || `HTTP ${response.status}`)
    error.status = response.status
    throw error
  }

  return response.blob()
}

const apiClient = { get, post, put, patch, del, upload, downloadBlob, getToken, API_BASE }
export default apiClient
