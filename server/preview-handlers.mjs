import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {createSanityClient, fetchTrialContent} from './sanity-content.mjs'
import {
  createPreviewSession, hasSessionSecret, previewRedirect, readSessionCookie,
  serializeSessionCookie, verifyPreviewSession,
} from './preview-session.mjs'

function environment(name) {
  return typeof Netlify !== 'undefined' ? Netlify.env.get(name) : process.env[name]
}

function headers(extra = {}) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Netlify-CDN-Cache-Control': 'no-store',
    'Vary': 'Cookie',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
    ...extra,
  }
}

function json(body, status = 200, extra = {}) {
  return Response.json(body, {status, headers: headers(extra)})
}

function onlyGet(request) {
  return request.method === 'GET' ? null : json({error: 'Method not allowed'}, 405, {Allow: 'GET'})
}

export function createPreviewHandlers({
  env = environment, validate = validatePreviewUrl,
  client = createSanityClient, fetchContent = fetchTrialContent,
  now = Date.now,
} = {}) {
  return {
    async enable(request) {
      const wrongMethod = onlyGet(request)
      if (wrongMethod) return wrongMethod
      const url = new URL(request.url)
      const token = env('SANITY_API_READ_TOKEN')
      const secret = env('SANITY_PREVIEW_SESSION_SECRET')
      if (!token || !hasSessionSecret(secret)) return json({error: 'Draft preview is not configured'}, 503)
      if (!url.searchParams.get('sanity-preview-secret')) return json({error: 'A valid Studio preview link is required'}, 401)
      const requestedPath = url.searchParams.get('sanity-preview-pathname') || '/'
      if (!previewRedirect(requestedPath, url.origin)) return json({error: 'Invalid preview path'}, 400)
      try {
        const result = await validate(client(token), url.toString())
        if (!result.isValid) return json({error: 'Invalid or expired Studio preview link'}, 401)
        const location = previewRedirect(result.redirectTo || requestedPath, url.origin)
        if (!location) return json({error: 'Invalid preview path'}, 400)
        const session = createPreviewSession(secret, url.origin, now())
        return new Response(null, {status: 307, headers: headers({
          Location: location, 'Set-Cookie': serializeSessionCookie(session),
        })})
      } catch {
        // Error details may contain the preview secret or Sanity token.
        return json({error: 'Unable to validate this Studio preview link'}, 401)
      }
    },

    async disable(request) {
      const wrongMethod = onlyGet(request)
      if (wrongMethod) return wrongMethod
      const url = new URL(request.url)
      const location = previewRedirect(url.searchParams.get('redirect') || '/', url.origin, {enable: false})
      if (!location) return json({error: 'Invalid preview path'}, 400)
      return new Response(null, {status: 303, headers: headers({
        Location: location, 'Set-Cookie': serializeSessionCookie('', {clear: true}),
      })})
    },

    async content(request) {
      const wrongMethod = onlyGet(request)
      if (wrongMethod) return wrongMethod
      const url = new URL(request.url)
      const slug = url.searchParams.get('slug')
      if (slug !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return json({error: 'Invalid page address'}, 400)
      const requestedPerspective = url.searchParams.get('perspective')
      if (requestedPerspective && !['published', 'drafts'].includes(requestedPerspective)) return json({error: 'Unsupported perspective'}, 400)
      // With a same-origin /studio, its iframe and normal website tabs share
      // cookies. A cookie alone must never switch an ordinary page to drafts.
      const wantsPreview = url.searchParams.get('preview') === '1' || requestedPerspective === 'drafts'
      const cookie = readSessionCookie(request.headers.get('cookie') || '')
      const session = wantsPreview ? verifyPreviewSession(cookie, env('SANITY_PREVIEW_SESSION_SECRET'), url.origin, now()) : null
      if (wantsPreview && !session) {
        return json({error: 'Preview session has expired. Reopen the page from Sanity.', preview: false}, 401)
      }
      const perspective = session && requestedPerspective !== 'published' ? 'drafts' : 'published'
      const token = perspective === 'drafts' ? env('SANITY_API_READ_TOKEN') : undefined
      if (perspective === 'drafts' && !token) return json({error: 'Draft preview is not configured'}, 503)
      try {
        const data = await fetchContent({slug, perspective, token})
        if (slug && !data) return json({error: 'Page not found', perspective, preview: Boolean(session)}, 404)
        return json({[slug ? 'document' : 'documents']: data, perspective, preview: Boolean(session)})
      } catch {
        return json({error: 'Unable to load website content'}, 502)
      }
    },
  }
}

export const previewHandlers = createPreviewHandlers()
