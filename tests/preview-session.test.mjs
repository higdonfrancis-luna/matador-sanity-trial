import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPreviewSession, previewRedirect, readSessionCookie, serializeSessionCookie,
  SESSION_COOKIE, SESSION_SECONDS, verifyPreviewSession,
} from '../server/preview-session.mjs'
import {createPreviewHandlers} from '../server/preview-handlers.mjs'

const ORIGIN = 'https://matador-sanity-trial.netlify.app'
const SECRET = 'test-only-independent-session-secret-123456789'
const NOW = 1803434400000
const TOKEN = 'test-only-viewer-token'
const ENABLE_URL = `${ORIGIN}/api/preview/enable?sanity-preview-secret=test-studio-secret&sanity-preview-pathname=%2Fabout-us%2F`

function request(path = '/api/content', cookie, options = {}) {
  return new Request(`${ORIGIN}${path}`, {
    ...options,
    headers: {...(cookie === undefined ? {} : {cookie: `${SESSION_COOKIE}=${cookie}`}), ...options.headers},
  })
}

function setup(overrides = {}) {
  const calls = []
  const config = {SANITY_API_READ_TOKEN: TOKEN, SANITY_PREVIEW_SESSION_SECRET: SECRET}
  const handlers = createPreviewHandlers({
    env: name => config[name],
    now: () => NOW,
    client: token => ({testToken: token}),
    validate: async (client, url) => {
      calls.push({operation: 'validate', client, url})
      return {isValid: true, redirectTo: '/about-us/'}
    },
    fetchContent: async args => {
      calls.push({operation: 'fetch', ...args})
      return args.slug ? {_id: 'wyatt-trial-about-us', _type: 'page', title: 'About us'} : []
    },
    ...overrides,
  })
  return {handlers, calls, config}
}

test('signed session is scoped to this preview origin and expires after one hour', () => {
  const session = createPreviewSession(SECRET, ORIGIN, NOW)
  assert.ok(verifyPreviewSession(session, SECRET, ORIGIN, NOW))
  assert.ok(verifyPreviewSession(session, SECRET, ORIGIN, NOW + (SESSION_SECONDS - 1) * 1000))
  assert.equal(verifyPreviewSession(session, SECRET, ORIGIN, NOW + SESSION_SECONDS * 1000), null)
  assert.equal(verifyPreviewSession(session, SECRET, 'https://another-site.example', NOW), null)
  assert.equal(verifyPreviewSession(session, SECRET, ORIGIN, NOW - 1000), null)
})

test('tampering with either session payload or signature does not authenticate', () => {
  const session = createPreviewSession(SECRET, ORIGIN, NOW)
  const [payload, signature] = session.split('.')
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
  data.exp += 86400
  const forged = `${Buffer.from(JSON.stringify(data)).toString('base64url')}.${signature}`
  assert.equal(verifyPreviewSession(forged, SECRET, ORIGIN, NOW), null)
  const changed = `${payload}.${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`
  assert.equal(verifyPreviewSession(changed, SECRET, ORIGIN, NOW), null)
  assert.equal(verifyPreviewSession(session, 'different-secret-with-at-least-32-characters', ORIGIN, NOW), null)
})

test('session signing requires an independent configured secret and cookie ambiguity is rejected', () => {
  assert.throws(() => createPreviewSession(undefined, ORIGIN, NOW))
  assert.throws(() => createPreviewSession('short', ORIGIN, NOW))
  const session = createPreviewSession(SECRET, ORIGIN, NOW)
  assert.equal(verifyPreviewSession(session, undefined, ORIGIN, NOW), null)
  assert.equal(readSessionCookie('other=value'), null)
  assert.equal(readSessionCookie(`${SESSION_COOKIE}=first; ${SESSION_COOKIE}=second`), '')
})

test('preview cookie is Secure, HttpOnly, cross-site and partitioned with no Domain', () => {
  const cookie = serializeSessionCookie('session-value')
  for (const flag of ['Path=/', 'Secure', 'HttpOnly', 'SameSite=None', 'Partitioned', 'Max-Age=3600']) assert.ok(cookie.includes(flag))
  assert.ok(!cookie.includes('Domain='))
  assert.ok(serializeSessionCookie('', {clear: true}).includes('Max-Age=0'))
})

test('redirects permit only same-origin content paths and remove all supplied query parameters', () => {
  assert.equal(previewRedirect('/about-us/?sanity-preview-secret=must-not-leak#part', ORIGIN), '/about-us/?preview=1')
  assert.equal(previewRedirect(`${ORIGIN}/about-us/`, ORIGIN), '/about-us/?preview=1')
  assert.equal(previewRedirect('/', ORIGIN), '/?preview=1')
  assert.equal(previewRedirect('/about-us/?preview=1', ORIGIN, {enable: false}), '/about-us/')
  for (const value of ['https://evil.example/', '//evil.example/', '/\\evil.example/', '/api/content', '/x/../about-us/', '/%2e%2e/about-us/', '/%2F%2Fevil.example/', '/about-us/%0d%0aLocation:evil', 'javascript:alert(1)']) {
    assert.equal(previewRedirect(value, ORIGIN), null, value)
  }
})

test('valid Studio handshake creates a signed session and strips secret from redirect', async () => {
  const {handlers, calls} = setup()
  const response = await handlers.enable(new Request(ENABLE_URL))
  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), '/about-us/?preview=1')
  const cookie = readSessionCookie(response.headers.get('set-cookie'))
  assert.ok(verifyPreviewSession(cookie, SECRET, ORIGIN, NOW))
  assert.equal(calls[0].client.testToken, TOKEN)
  assert.ok(!response.headers.get('set-cookie').includes(TOKEN))
  assert.ok(!response.headers.get('location').includes('test-studio-secret'))
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
})

test('no Viewer token or signing secret means preview remains unavailable, without validation call', async () => {
  for (const missing of ['SANITY_API_READ_TOKEN', 'SANITY_PREVIEW_SESSION_SECRET']) {
    const {handlers, config, calls} = setup()
    delete config[missing]
    const response = await handlers.enable(new Request(ENABLE_URL))
    assert.equal(response.status, 503)
    assert.equal(calls.length, 0)
    assert.equal(response.headers.get('set-cookie'), null)
  }
})

test('missing, invalid, or failing Studio validation does not issue session cookies', async () => {
  const missing = await setup().handlers.enable(request('/api/preview/enable'))
  assert.equal(missing.status, 401)
  const invalid = await setup({validate: async () => ({isValid: false})}).handlers.enable(new Request(ENABLE_URL))
  assert.equal(invalid.status, 401)
  const thrown = await setup({validate: async () => {throw new Error(TOKEN)}}).handlers.enable(new Request(ENABLE_URL))
  assert.equal(thrown.status, 401)
  assert.ok(!(await thrown.text()).includes(TOKEN))
  for (const response of [missing, invalid, thrown]) assert.equal(response.headers.get('set-cookie'), null)
})

test('both requested and validated redirect paths are checked before granting preview', async () => {
  const {handlers, calls} = setup()
  const badPath = `${ORIGIN}/api/preview/enable?sanity-preview-secret=s&sanity-preview-pathname=${encodeURIComponent('https://evil.example/')}`
  assert.equal((await handlers.enable(new Request(badPath))).status, 400)
  assert.equal(calls.length, 0)
  const compromisedResult = setup({validate: async () => ({isValid: true, redirectTo: '//evil.example/'})})
  const response = await compromisedResult.handlers.enable(new Request(ENABLE_URL))
  assert.equal(response.status, 400)
  assert.equal(response.headers.get('set-cookie'), null)
})

test('anonymous visitors receive published content without a Sanity token', async () => {
  const {handlers, calls, config} = setup()
  delete config.SANITY_API_READ_TOKEN
  delete config.SANITY_PREVIEW_SESSION_SECRET
  const response = await handlers.content(request('/api/content?slug=about-us'))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).perspective, 'published')
  assert.equal(calls[0].token, undefined)
  assert.equal(calls[0].perspective, 'published')
  assert.ok(response.headers.get('cache-control').includes('no-store'))
  assert.equal(response.headers.get('access-control-allow-origin'), null)
})

test('only a valid signed session can request draft content', async () => {
  const {handlers, calls} = setup()
  const session = createPreviewSession(SECRET, ORIGIN, NOW)
  const response = await handlers.content(request('/api/content?slug=about-us&preview=1', session))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.perspective, 'drafts')
  assert.equal(body.preview, true)
  assert.equal(calls[0].token, TOKEN)
  assert.equal(calls[0].perspective, 'drafts')
  assert.ok(!JSON.stringify(body).includes(TOKEN))
})

test('forged and expired sessions are denied before any content fetch', async () => {
  const {handlers, calls} = setup()
  for (const cookie of ['drafts', 'forged.signature', createPreviewSession(SECRET, ORIGIN, NOW - SESSION_SECONDS * 1000)]) {
    const response = await handlers.content(request('/api/content?slug=about-us&preview=1', cookie))
    assert.equal(response.status, 401)
  }
  assert.equal(calls.length, 0)
})

test('explicit preview flags cannot bypass authentication', async () => {
  const {handlers, calls} = setup()
  for (const path of ['/api/content?preview=1', '/api/content?perspective=drafts']) {
    assert.equal((await handlers.content(request(path))).status, 401)
  }
  assert.equal(calls.length, 0)
})

test('signed sessions cannot fetch drafts if the Viewer token is removed', async () => {
  const {handlers, config, calls} = setup()
  const session = createPreviewSession(SECRET, ORIGIN, NOW)
  delete config.SANITY_API_READ_TOKEN
  assert.equal((await handlers.content(request('/api/content?preview=1', session))).status, 503)
  assert.equal(calls.length, 0)
})

test('published perspective is supported inside preview, but raw and arbitrary perspectives are rejected', async () => {
  const {handlers, calls} = setup()
  const session = createPreviewSession(SECRET, ORIGIN, NOW)
  const response = await handlers.content(request('/api/content?perspective=published&preview=1', session))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {documents: [], perspective: 'published', preview: true})
  assert.equal(calls[0].token, undefined)
  assert.equal((await handlers.content(request('/api/content?perspective=raw', session))).status, 400)
})

test('ordinary website pages stay published even with same-origin Studio cookies', async () => {
  const {handlers, calls} = setup()
  for (const cookie of [createPreviewSession(SECRET, ORIGIN, NOW), createPreviewSession(SECRET, ORIGIN, NOW - SESSION_SECONDS * 1000), 'forged.signature']) {
    const response = await handlers.content(request('/api/content?slug=about-us', cookie))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.perspective, 'published')
    assert.equal(body.preview, false)
  }
  assert.ok(calls.every(call => call.perspective === 'published' && call.token === undefined))
})

test('invalid slugs never reach Sanity and unavailable documents return 404', async () => {
  const {handlers, calls} = setup()
  for (const slug of ['', '../private', '*[_type=="secret"]', 'about-us/extra']) {
    assert.equal((await handlers.content(request(`/api/content?slug=${encodeURIComponent(slug)}`))).status, 400)
  }
  assert.equal(calls.length, 0)
  const missing = setup({fetchContent: async () => null})
  assert.equal((await missing.handlers.content(request('/api/content?slug=missing'))).status, 404)
})

test('upstream errors do not disclose tokens, queries, or internal exception messages', async () => {
  const {handlers} = setup({fetchContent: async () => {throw new Error(`upstream token=${TOKEN}`)}})
  const response = await handlers.content(request('/api/content'))
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), {error: 'Unable to load website content'})
})

test('disable expires the same cookie and cannot redirect to another origin', async () => {
  const {handlers} = setup()
  const response = await handlers.disable(request('/api/preview/disable?redirect=%2Fabout-us%2F'))
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('location'), '/about-us/')
  assert.ok(response.headers.get('set-cookie').includes(`${SESSION_COOKIE}=;`))
  assert.ok(response.headers.get('set-cookie').includes('Max-Age=0'))
  assert.equal((await handlers.disable(request('/api/preview/disable?redirect=https://evil.example/'))).status, 400)
})

test('handlers reject non-GET calls', async () => {
  const {handlers} = setup()
  for (const handler of Object.values(handlers)) {
    const response = await handler(request('/api/content', undefined, {method: 'POST'}))
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('allow'), 'GET')
  }
})
