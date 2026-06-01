export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }
  return fetch(url, { ...options, headers }).then(res => {
    if (res.status === 401 && token) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return res
  })
}
