import {createImageUrlBuilder} from '@sanity/image-url'
const images=createImageUrlBuilder({projectId:'i2tdfchw',dataset:'production'})
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
const safeUrl=value=>/^https?:\/\//i.test(value||'')||/^\/(?!\/)/.test(value||'')?value:''
function imageUrl(image){
  if(!image?.asset)return ''
  try{return images.image(image).width(1400).auto('format').url()}catch{return safeUrl(image.url||image.asset?.url)}
}
export function renderImage(image,path,attrs=()=> ''){
  const url=imageUrl(image)
  return url?'<figure '+attrs(path)+'><img src="'+escapeHtml(url)+'" alt="'+escapeHtml(image.alt)+'" loading="lazy">'+(image.caption?'<figcaption>'+escapeHtml(image.caption)+'</figcaption>':'')+'</figure>':''
}
export function renderBody(blocks,field,attrs=()=> ''){
  let html='',list=''
  for(const block of blocks||[]){
    const path=field+'[_key=='+JSON.stringify(block._key)+']'
    if(block._type==='image'){
      if(list){html+='</'+list+'>';list=''}
      html+=renderImage(block,path,attrs);continue
    }
    if(block._type!=='block')continue
    const text=(block.children||[]).map(span=>{
      let value=escapeHtml(span.text)
      for(const mark of span.marks||[]){
        if(['strong','em','code'].includes(mark))value='<'+mark+'>'+value+'</'+mark+'>'
        const annotation=block.markDefs?.find(def=>def._key===mark)
        if(annotation?._type==='link'&&safeUrl(annotation.href))value='<a href="'+escapeHtml(annotation.href)+'" rel="noopener noreferrer">'+value+'</a>'
      }
      return value
    }).join('')
    const nextList=block.listItem?(block.listItem==='number'?'ol':'ul'):''
    if(list&&list!==nextList){html+='</'+list+'>';list=''}
    if(nextList&&!list){html+='<'+nextList+'>';list=nextList}
    const tag=nextList?'li':['h2','h3'].includes(block.style)?block.style:'p'
    html+='<'+tag+' '+attrs(path)+'>'+text+'</'+tag+'>'
  }
  return html+(list?'</'+list+'>':'')
}
export function renderDocument(doc,attrs=()=> ''){
  const attorney=doc._type==='attorney'
  const titlePath=attorney?'name':doc.headline?'headline':'title'
  return renderImage(doc.heroImage,'heroImage',attrs)+'<h1 '+attrs(titlePath)+'>'+escapeHtml(doc[titlePath])+'</h1>'+
    (attorney?renderImage(doc.photo,'photo',attrs)+(doc.role?'<p class="role" '+attrs('role')+'>'+escapeHtml(doc.role)+'</p>':''):doc.intro?'<p class="intro" '+attrs('intro')+'>'+escapeHtml(doc.intro)+'</p>':'')+
    renderBody(attorney?doc.bio:doc.body,attorney?'bio':'body',attrs)+
    '<div '+attrs('pageImages')+'>'+(doc.pageImages||[]).map(photo=>renderImage(photo,'pageImages[_key=='+JSON.stringify(photo._key)+']',attrs)).join('')+'</div>'
}
