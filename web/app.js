import {renderDocument, escapeHtml} from './render.js'
import aboutTemplate from './about-template.html?raw'
import {renderAbout, setAboutTemplate} from './about-preview.js'

setAboutTemplate(aboutTemplate)
const app = document.getElementById('app')
const status = document.getElementById('preview-status')
const requestedPreview = new URLSearchParams(location.search).get('preview') === '1'
let preview = false, perspective = 'drafts', lastContent = '', loading = false, disableEditing, editingModule
const types = {page: 'Page', practiceArea: 'Practice Area', attorney: 'Attorney'}
const slug = location.pathname.replace(/^\/+|\/+$/g, '')

function attrs(doc, path) {
  if (!preview) return ''
  const value = editingModule.createDataAttribute({projectId:'i2tdfchw', dataset:'production', id:doc._id.replace(/^drafts\./,''), type:doc._type, path, baseUrl:location.origin+'/studio'}).toString()
  return ' data-sanity="'+escapeHtml(value)+'"'
}

async function refresh() {
  if (loading) return
  loading = true
  try {
    const query = new URLSearchParams(slug ? {slug} : {})
    if (requestedPreview || preview) query.set('preview','1')
    if (preview) query.set('perspective',perspective)
    const response = await fetch('/api/content?'+query, {credentials:'same-origin',cache:'no-store'})
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Unable to load this page')
    preview = result.preview
    if (preview && !editingModule) editingModule = await import('@sanity/visual-editing')
    status.textContent = result.source === 'development-snapshot' ? 'Local review · Published snapshot' : preview ? (result.perspective === 'drafts' ? 'Draft preview · Changes appear as you edit' : 'Published preview') : 'Published website content'
    const content = JSON.stringify([result.document || result.documents, preview])
    if (content !== lastContent) {
      lastContent = content
      if (result.document) {
        const doc = result.document
        document.title = doc.seo?.title || doc.title || doc.name
        let description = document.querySelector('meta[name="description"]')
        if (!description) {description=document.createElement('meta');description.name='description';document.head.append(description)}
        description.content=doc.seo?.description || ''
        const about=doc._id.replace(/^drafts\./,'')==='wyatt-trial-about-us'
        document.body.classList.toggle('about-preview',about)
        if (about && !document.getElementById('wyatt-styles')) {
          const link=document.createElement('link');link.id='wyatt-styles';link.rel='stylesheet';link.href='/assets/wyatt-about.css';document.head.append(link)
        }
        app.innerHTML = about ? renderAbout(doc,{preview,fieldAttributes:path=>attrs(doc,path)}) : renderDocument(doc,path=>attrs(doc,path))
      } else {
        app.innerHTML='<h1>Pages</h1><div class="list">'+result.documents.map(doc=>'<a href="/'+encodeURIComponent(doc.slug.current)+'/'+(preview?'?preview=1':'')+'">'+escapeHtml(doc.title||doc.name)+'<small>'+types[doc._type]+'</small></a>').join('')+'</div>'
      }
    }
    if (preview && !disableEditing) disableEditing=editingModule.enableVisualEditing({
      history: {
        subscribe(navigate) {
          const update=()=>navigate({type:'push',url:location.pathname+location.search})
          update();window.addEventListener('popstate',update)
          return ()=>window.removeEventListener('popstate',update)
        },
        update(update) {
          if(update.type==='pop'){history.back();return}
          const target=new URL(update.url,location.origin)
          if(target.origin!==location.origin)return
          if(!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)?$/.test(target.pathname))return
          target.searchParams.set('preview','1')
          if(target.href===location.href)return
          if(update.type==='replace')location.replace(target.href)
          else location.assign(target.href)
        },
      },
      onPerspectiveChange(value) {perspective=value==='published'?'published':'drafts';void refresh()},
      refresh:async()=>{await refresh()},
    })
  } catch(error) {
    status.textContent='Preview unavailable'
    app.innerHTML='<h1>Unable to load this page</h1><p>'+escapeHtml(error.message)+'</p><p><a href="/studio/presentation">Open the website editor</a></p>'
    lastContent=''
    if(disableEditing){disableEditing();disableEditing=undefined}
  } finally {loading=false}
}
void refresh()
setInterval(()=>{if(preview&&!document.hidden)void refresh()},2000)
document.addEventListener('visibilitychange',()=>{if(preview&&!document.hidden)void refresh()})
