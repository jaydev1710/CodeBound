const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  console.info('[CodeBound API]', options.method || 'GET', url)
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    throw new Error(`Cannot connect to CodeBound backend at ${API_BASE_URL}. Start FastAPI on port 8000 and make sure this page is using the current project.`)
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail ?? `CodeBound request failed (${response.status}).`)
  return body
}

export async function sendChat(message, history, signal) {
  return request('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
    signal,
  })
}

export async function selectWorkspace(path) {
  return request('/workspace/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export async function getWorkspace() { return request('/workspace') }
export async function getWorkspaceTree(path = '') { return request(`/workspace/tree?path=${encodeURIComponent(path)}`) }
export async function approveChange(id) { return request(`/changes/${encodeURIComponent(id)}/approve`, { method: 'POST' }) }
export async function rejectChange(id) { return request(`/changes/${encodeURIComponent(id)}/reject`, { method: 'POST' }) }
