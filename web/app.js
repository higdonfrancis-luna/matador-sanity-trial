// Reads published content straight from Sanity's public CDN. No token: the dataset is public.
const API = 'https://i2tdfchw.apicdn.sanity.io/v2024-01-01/data/query/production'
const TYPES = {page: 'Page', practiceArea: 'Practice Area', attorney: 'Attorney'}
const app = document.getElementById('app')

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))

async function query(groq, params = {}) {
  const url = new URL(API)
  url.searchParams.set('query', groq)
  for (const [k, v] of Object.entries(params)) url.searchParams.set('$' + k, JSON.stringify(v))
  const r = await fetch(url, {cache: 'no-store'})
  if (!r.ok) throw new Error('Sanity answered ' + r.status)
  return (await r.json()).result
}

function span(s) {
  let t = esc(s.text)
  if ((s.marks || []).includes('strong')) t = '<strong>' + t + '</strong>'
  if ((s.marks || []).includes('em')) t = '<em>' + t + '</em>'
  return t
}

function body(blocks) {
  let html = '', inList = false
  for (const b of blocks || []) {
    if (b._type === 'image') {
      if (inList) { html += '</ul>'; inList = false }
      if (b.url) html += `<figure><img src="${esc(b.url)}" alt="${esc(b.alt)}" loading="lazy"></figure>`
      continue
    }
    if (b._type !== 'block') continue
    const text = (b.children || []).map(span).join('')
    if (b.listItem) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${text}</li>`
      continue
    }
    if (inList) { html += '</ul>'; inList = false }
    const tag = b.style === 'h2' || b.style === 'h3' ? b.style : 'p'
    html += `<${tag}>${text}</${tag}>`
  }
  return inList ? html + '</ul>' : html
}

async function showList() {
  document.title = 'Sanity Trial Preview'
  const docs = await query('*[_type in $types && defined(slug.current)] | order(_type asc){_type, "name": coalesce(title, name), "slug": slug.current}', {types: Object.keys(TYPES)})
  app.innerHTML = '<h1>Pages</h1><div class="list">' + docs.map((d) =>
    `<a href="/${esc(d.slug)}/">${esc(d.name)}<small>${TYPES[d._type]}</small></a>`).join('') + '</div>'
}

async function showDoc(slug) {
  const imgs = '{..., _type == "image" => {..., "url": asset->url}}'
  const d = await query(`*[_type in $types && slug.current == $slug][0]{..., "photoUrl": photo.asset->url, body[]${imgs}, bio[]${imgs}}`, {types: Object.keys(TYPES), slug})
  if (!d) { app.innerHTML = '<h1>Not found</h1><p class="muted">Nothing published at this address yet.</p>'; return }
  document.title = d.seo?.title || d.title || d.name
  let html = `<p class="kind">${TYPES[d._type]}</p>`
  if (d._type === 'attorney') {
    if (d.photoUrl) html += `<figure><img src="${esc(d.photoUrl)}" alt="${esc(d.photo?.alt)}"></figure>`
    html += `<h1>${esc(d.name)}</h1>` + (d.role ? `<p class="role">${esc(d.role)}</p>` : '') + body(d.bio)
  } else {
    html += `<h1>${esc(d.headline || d.title)}</h1>` + (d.intro ? `<p class="intro">${esc(d.intro)}</p>` : '') + body(d.body)
  }
  app.innerHTML = html
}

const slug = location.pathname.replace(/^\/+|\/+$/g, '')
;(slug ? showDoc(slug) : showList()).catch((e) => {
  app.innerHTML = `<h1>Couldn't load</h1><p class="muted">${esc(e.message)}</p>`
})
