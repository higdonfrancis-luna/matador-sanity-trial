import bindings from './assets/about-bindings.json' with {type:'json'}
import {createImageUrlBuilder} from '@sanity/image-url'

let aboutTemplate=''
const imageBuilder=createImageUrlBuilder({projectId:'i2tdfchw',dataset:'production'})
export function setAboutTemplate(html){aboutTemplate=String(html)}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const plain=b=>(b?.children||[]).map(s=>s.text||'').join('')
const safeUrl=u=>{try{const x=new URL(u,'https://trial.invalid');return ['https:','http:'].includes(x.protocol)?String(u):''}catch{return ''}}
function imageUrl(image,width=1400,height){
 if(image?.asset?._ref||image?.asset?._id){
  try{
   let builder=imageBuilder.image(image).width(width).auto('format')
   builder=height?builder.height(height).fit('crop'):builder.fit('max')
   return builder.url()
  }catch{}
 }
 const url=image?.asset?.url||image?.url||image?.assetUrl
 if(url)return safeUrl(url)
 const ref=image?.asset?._ref,match=typeof ref==='string'&&ref.match(/^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/)
 return match?`https://cdn.sanity.io/images/i2tdfchw/production/${match[1]}-${match[2]}.${match[3]}`:''
}
function inline(block){return(block.children||[]).map(span=>{
 let html=esc(span.text)
 for(const mark of span.marks||[]){
  if(mark==='strong')html=`<strong>${html}</strong>`
  else if(mark==='em')html=`<em>${html}</em>`
  else if(mark==='underline')html=`<u>${html}</u>`
  else if(mark==='code')html=`<code>${html}</code>`
  else{const def=(block.markDefs||[]).find(d=>d._key===mark);if(def?._type==='link'&&safeUrl(def.href))html=`<a href="${esc(def.href)}">${html}</a>`}
 }
 return html
}).join('')}

export function renderAbout(doc,{preview=false,template=aboutTemplate,fieldAttributes=()=>''}={}){
 if(!template)throw Error('The About Us template has not been loaded')
 const attr=path=>preview?fieldAttributes(path)||'':''
 const blocks=doc.body||[],byKey=new Map(blocks.filter(b=>b._key).map(b=>[b._key,b]))
 const blockPath=key=>`body[_key=="${key}"]`
 function picture(image,path,original=''){
  const sourceWidth=Number(original.match(/\bwidth="(\d+)"/)?.[1])
  const sourceHeight=Number(original.match(/\bheight="(\d+)"/)?.[1])
  const width=sourceWidth?Math.min(sourceWidth,1920):1400
  const height=sourceWidth&&sourceHeight?Math.round(width*sourceHeight/sourceWidth):undefined
  const src=imageUrl(image,width,height);if(!src)return ''
  const attributes=original.match(/^<img\b([^>]*)>/)?.[1]||''
  const kept=attributes.replace(/\s(?:src|srcset|alt|width|height)="[^"]*"/g,'')
  const meta=height?{width,height}:image.asset?.metadata?.dimensions
  return `<img${kept||' loading="lazy" decoding="async"'} src="${esc(src)}" alt="${esc(image.alt||'')}"${meta?` width="${Number(meta.width)}" height="${Number(meta.height)}"`:''}${attr(path)}>`
 }
 function extra(block,path){
  if(block._type==='image'){const image=picture(block,path);return image?`<figure${attr(path)}>${image}${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`:''}
  if(block._type!=='block')return ''
  const tag=['h2','h3','h4','blockquote'].includes(block.style)?block.style:'p'
  return `<${tag}${attr(path)}>${inline(block)}</${tag}>`
 }
 // Stable keys keep edits bound to their original slots even when an editor
 // reorders/removes blocks. Newly inserted blocks follow the nearest original.
 const after=new Map();let previous='headline'
 for(const b of blocks){if(bindings[b._key])previous=b._key;else after.set(previous,(after.get(previous)||'')+extra(b,blockPath(b._key)))}
 let result=template.replace(/<!--SANITY:([a-zA-Z0-9_-]+)-->/g,(_,key)=>{
  const binding=bindings[key],block=byKey.get(key)
  if(key!=='headline'&&!block)return after.get(key)||''
  const value=key==='headline'?(doc.headline??doc.title??''):plain(block)
  const unchanged=value===binding.text&&(key==='headline'||!(block.children||[]).some(child=>child.marks?.length))
  const inner=unchanged?binding.inner:(key==='headline'?esc(value):inline(block))
  const prefix=unchanged?'':binding.prefix
  return `<${binding.tag}${binding.attrs}${attr(key==='headline'?'headline':blockPath(key))}>${prefix}${inner}</${binding.tag}>${after.get(key)||''}`
 })
 result=result.replace(/<!--IMAGE:([a-zA-Z0-9_-]+)-->/g,(_,slot)=>{
  const original=bindings['image:'+slot].html
  // A missing object is the untouched legacy page. Once migrated, a missing
  // individual field means the editor deliberately removed that photo.
  if(doc.aboutImagesInitialized!==true&&!Object.hasOwn(doc,'aboutImages'))return original
  const path=`aboutImages.${slot}`
  return `<span style="display:contents"${attr(path)}>${picture(doc.aboutImages?.[slot],path,original)}</span>`
 })
 const additions=(doc.pageImages||[]).map(image=>extra({...image,_type:'image'},`pageImages[_key=="${image._key}"]`)).join('')
 if(additions)result+=`<section class="sec"><div class="ix art">${additions}</div></section>`
 result=result.replaceAll('href="https://wyatt-netlify.netlify.app/justin-l-wyatt-esq/"',`href="/justin-l-wyatt-esq/${preview?'?preview=1':''}"`)
 return result
}
