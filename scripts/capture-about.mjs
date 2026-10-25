import {writeFile,mkdir} from 'node:fs/promises'
import {basename} from 'node:path'
import {JSDOM} from 'jsdom'

const source='https://wyatt-netlify.netlify.app/about-us/'
const api='https://i2tdfchw.api.sanity.io/v2026-01-01/data/query/production?query='+encodeURIComponent('*[_id=="wyatt-trial-about-us"][0]')
const get=async(url)=>{const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);return r}
const [html,data]=await Promise.all([(await get(source)).text(),(await get(api)).json()])
const dom=new JSDOM(html),document=dom.window.document,main=document.querySelector('main')
if(!main)throw Error('Missing source main')
const doc=data.result
const selectors=['.page-hero .lede','.split-copy .eyebrow','.split-copy h2','.split-copy .prose-l p:nth-child(1)','.split-copy .prose-l p:nth-child(2)',
 '.sec.sand .narrow .eyebrow','.sec.sand .narrow h2',
 '.promise:nth-child(1) .promise-title','.promise:nth-child(1) p:nth-child(2)',
 '.promise:nth-child(2) .promise-title','.promise:nth-child(2) p:nth-child(2)',
 '.promise:nth-child(3) .promise-title','.promise:nth-child(3) p:nth-child(2)',
 '.stat:nth-child(1) .stat-title','.stat:nth-child(1) .stat-text','.stat:nth-child(2) .stat-title','.stat:nth-child(2) .stat-text','.stat:nth-child(3) .stat-title','.stat:nth-child(3) .stat-text',
 '.split-pic--cut + .split-copy .eyebrow','.split-pic--cut + .split-copy h2','.split-pic--cut + .split-copy .prose-l p:nth-child(1)','.split-pic--cut + .split-copy .prose-l p:nth-child(2)',
 '.team', '.team', '.team', '.team li:nth-child(1)>span','.team li:nth-child(2)>span','.team li:nth-child(3)>span','.recognition']
const normalize=s=>String(s??'').replace(/\s+/g,' ').trim()
const text=b=>(b.children||[]).map(x=>x.text||'').join('')
const bindings={headline:{text:doc.headline}}, replacements=[]
for(let i=0;i<doc.body.length;i++){
 const b=doc.body[i];let el=main.querySelector(selectors[i])
 if(i>=23&&i<=25)el=main.querySelector('.team').closest('section').querySelector(['.eyebrow','h2','.sec-intro'][i-23])
 if(i===29)el=main.querySelector('.recognition').closest('section').querySelector('.eyebrow')
 if(!el)throw Error(`Missing target ${i}`)
 if(i<26||i>28){if(normalize(el.textContent)!==normalize(text(b)))throw Error(`Text mismatch ${i}: ${el.textContent}`)}
 bindings[b._key]={text:text(b),tag:el.tagName.toLowerCase(),attrs:[...el.attributes].map(a=>` ${a.name}="${a.value.replace(/"/g,'&quot;')}"`).join(''),prefix:[...el.children].filter(x=>x.tagName.toLowerCase()==='svg').map(x=>x.outerHTML).join(''),inner:el.innerHTML}
 replacements.push([el,document.createComment(`SANITY:${b._key}`)])
}
for(const [el,comment] of replacements)el.replaceWith(comment)
const h1=main.querySelector('h1');bindings.headline={text:doc.headline,tag:'h1',attrs:'',prefix:'',inner:h1.innerHTML};h1.replaceWith(document.createComment('SANITY:headline'))
await mkdir('web/assets/wyatt',{recursive:true})
const downloaded=new Map()
async function asset(url){const absolute=new URL(url,source).href;if(downloaded.has(absolute))return downloaded.get(absolute);const name=basename(new URL(absolute).pathname);const local='/assets/wyatt/'+name;downloaded.set(absolute,local);await writeFile('web'+local,Buffer.from(await(await get(absolute)).arrayBuffer()));return local}
const imageNames=['hero','storyPortrait','justinPortrait','awardJustia','awardTop100','awardRisingStars','awardTop40','awardAvvo','awardTrialLawyersUniversity','awardExpertise']
const imageTitles=['Hero background','Our story portrait','Meet Justin portrait','Justia award','Top 100 award','Rising Stars award','Top 40 award','Avvo award','Trial Lawyers University award','Expertise award']
const manifest=[];let imageIndex=0
for(const img of [...main.querySelectorAll('img')]){
 const original=img.getAttribute('src');const local=await asset(original);img.setAttribute('src',local)
 if(img.hasAttribute('srcset')){const entries=[];for(const entry of img.getAttribute('srcset').split(',')){const[u,size]=entry.trim().split(/\s+/);entries.push(`${await asset(u)} ${size}`)}img.setAttribute('srcset',entries.join(', '))}
 if(original.includes('/photos/')){const name=imageNames[imageIndex];if(!name)throw Error('Unexpected image count');manifest.push({name,title:imageTitles[imageIndex],source:new URL(original,source).href,localPath:'web'+local,alt:img.getAttribute('alt')||'',width:Number(img.getAttribute('width')),height:Number(img.getAttribute('height'))});img.replaceWith(document.createComment(`IMAGE:${name}`));bindings['image:'+name]={html:img.outerHTML};imageIndex++}
}
if(imageIndex!==imageNames.length)throw Error('Unexpected photos')
for(const a of main.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(href.startsWith('/'))a.setAttribute('href',new URL(href,source).href)}
for(const form of main.querySelectorAll('form'))form.remove()
let css=[...document.querySelectorAll('style')].map(x=>x.textContent).join('\n')
for(const match of [...css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)]){const u=match[2];if(!u.startsWith('data:'))css=css.replaceAll(match[0],`url("${await asset(u)}")`)}
await writeFile('web/assets/wyatt-about.css',css)
await writeFile('web/assets/about-bindings.json',JSON.stringify(bindings,null,2)+'\n')
await writeFile('web/about-image-slots.json',JSON.stringify(manifest,null,2)+'\n')
await writeFile('web/about-template.html',main.innerHTML+'\n')
console.log(JSON.stringify({source,blocks:doc.body.length,imageSlots:manifest.length,assets:downloaded.size}))
