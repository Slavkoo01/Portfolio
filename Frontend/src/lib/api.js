/**
 * API client for the Flask backend.
 *
 * CSRF model (double-submit COOKIE — matches the backend):
 *  - The backend sets a non-HttpOnly cookie `csrf_token` (after login, or when
 *    we call GET /api/auth/csrf).
 *  - For every mutating request we READ that cookie and echo its value in the
 *    `X-CSRF-Token` header. The server compares header vs cookie.
 *
 * IMPORTANT: the token lives in the COOKIE, not in the /csrf response body.
 * So we read document.cookie — not the JSON — to get it.
 */

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'X-CSRF-Token'

function readCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

async function ensureCsrf() {
  let token = readCookie(CSRF_COOKIE)
  if (token) return token
  await fetch('/api/auth/csrf', { credentials: 'include' })
  return readCookie(CSRF_COOKIE)
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request(method, path, { body, isForm } = {}) {
  const opts = { method, credentials: 'include', headers: {} }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await ensureCsrf()
    if (token) opts.headers[CSRF_HEADER] = token
  }

  if (body !== undefined) {
    if (isForm) {
      opts.body = body
    } else {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
  }

  const res = await fetch(path, opts)

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Request failed (${res.status})`
    const code = data?.error?.code
    throw new ApiError(msg, res.status, code)
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body, opts) => request('POST', path, { body, ...opts }),
  put: (path, body, opts) => request('PUT', path, { body, ...opts }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),

  async login(identifier, password) {
    return request('POST', '/api/auth/login', { body: { identifier, password } })
  },
  async logout() {
    return request('POST', '/api/auth/logout')
  },
  me: () => request('GET', '/api/auth/me'),
}
