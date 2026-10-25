import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto'

export const SESSION_COOKIE = '__Host-matador_preview'
export const SESSION_SECONDS = 60 * 60
const SCOPE = 'i2tdfchw/production/wyatt-trial'

export function hasSessionSecret(secret) {
  return typeof secret === 'string' && Buffer.byteLength(secret) >= 32
}

function signature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createPreviewSession(secret, origin, now = Date.now()) {
  if (!hasSessionSecret(secret)) throw new Error('Preview session secret is not configured')
  const issued = Math.floor(now / 1000)
  const payload = Buffer.from(JSON.stringify({
    v: 1, scope: SCOPE, aud: new URL(origin).origin,
    iat: issued, exp: issued + SESSION_SECONDS,
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function verifyPreviewSession(value, secret, origin, now = Date.now()) {
  if (!hasSessionSecret(secret) || typeof value !== 'string' || value.length > 2048) return null
  const parts = value.split('.')
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null
  const [payload, supplied] = parts
  const expected = signature(payload, secret)
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const seconds = Math.floor(now / 1000)
    if (data.v !== 1 || data.scope !== SCOPE || data.aud !== new URL(origin).origin ||
      !Number.isSafeInteger(data.iat) || !Number.isSafeInteger(data.exp) ||
      data.iat > seconds || data.exp <= seconds || data.exp - data.iat !== SESSION_SECONDS) return null
    return data
  } catch {
    return null
  }
}

export function readSessionCookie(header = '') {
  const values = header.split(';').map(value => value.trim())
    .filter(value => value.startsWith(`${SESSION_COOKIE}=`))
  // Ambiguous duplicate cookies must not select a privileged session.
  if (values.length !== 1) return values.length ? '' : null
  return values[0].slice(SESSION_COOKIE.length + 1)
}

export function serializeSessionCookie(value, {clear = false} = {}) {
  return `${SESSION_COOKIE}=${clear ? '' : value}; Path=/; Max-Age=${clear ? 0 : SESSION_SECONDS}; HttpOnly; Secure; SameSite=None; Partitioned`
}

export function previewRedirect(value, origin, {enable = true} = {}) {
  if (typeof value !== 'string' || !value) value = '/'
  if (/[\\\u0000-\u0020\u007f]/.test(value) || /%2f|%5c|%2e|%00|%0a|%0d/i.test(value) ||
    /(?:^|\/)\.{1,2}(?:\/|[?#]|$)/.test(value) || value.startsWith('//')) return null
  try {
    const target = new URL(value, origin)
    if (target.origin !== new URL(origin).origin || target.username || target.password ||
      !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)?$/.test(target.pathname)) return null
    // Keep only the content path; never propagate authentication parameters.
    return `${target.pathname}${enable ? '?preview=1' : ''}`
  } catch {
    return null
  }
}
