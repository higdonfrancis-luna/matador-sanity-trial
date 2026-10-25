import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {renderAbout,setAboutTemplate} from '../web/about-preview.js'
import bindings from '../web/assets/about-bindings.json' with {type:'json'}
import {planAboutImageSeed} from '../scripts/seed-about-images.mjs'

setAboutTemplate(await readFile(new URL('../web/about-template.html',import.meta.url),'utf8'))
const baseline=()=>({headline:bindings.headline.text,body:Object.entries(bindings).filter(([k])=>k!=='headline'&&!k.startsWith('image:')).map(([key,b])=>({_key:key,_type:'block',style:'normal',children:[{_type:'span',text:b.text,marks:[]}]}))})
test('every imported block stays visible, and original heading emphasis is retained',()=>{
 const html=renderAbout(baseline())
 for(const [key,b]of Object.entries(bindings)){if(key!=='headline'&&!key.startsWith('image:'))assert.ok(html.includes(b.inner),`Missing block ${key}`)}
 assert.ok(html.includes(bindings.headline.inner));assert.ok(!html.includes('<!--SANITY:'))
})
test('a keyed edit and deletion are reflected without shifting another slot',()=>{
 const doc=baseline(),key=doc.body[3]._key,removed=doc.body[4]._key,untouched=doc.body[5]._key
 doc.body[3].children[0].text='<script>alert("x")</script>'
 doc.body=doc.body.filter(b=>b._key!==removed).reverse()
 const html=renderAbout(doc,{preview:true,fieldAttributes:path=>` data-field="${path.replaceAll('"','&quot;')}"`})
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes(bindings[removed].inner));assert.ok(html.includes(bindings[untouched].inner));assert.ok(html.includes(key))
})
test('new body and gallery photos appear, unsafe URLs are rejected, removal clears them',()=>{
 const doc=baseline();doc.body.splice(4,0,{_type:'image',_key:'new-body-image',asset:{url:'https://cdn.sanity.io/test.jpg'},alt:'New <photo>'})
 doc.pageImages=[{_key:'gallery',asset:{url:'https://cdn.sanity.io/gallery.jpg'},caption:'A <caption>'},{_key:'bad',asset:{url:'javascript:alert(1)'}}]
 let html=renderAbout(doc);assert.ok(html.includes('test.jpg'));assert.ok(html.includes('gallery.jpg'));assert.ok(html.includes('A &lt;caption&gt;'));assert.ok(!html.includes('javascript:'))
 doc.body=doc.body.filter(b=>b._key!=='new-body-image');doc.pageImages=[];html=renderAbout(doc);assert.ok(!html.includes('test.jpg'));assert.ok(!html.includes('gallery.jpg'))
})
test('migrated existing image removal never resurrects the captured image',()=>{
 const doc=baseline();assert.ok(renderAbout(doc).includes('/assets/wyatt/justin-wyatt-headshot.webp'))
 doc.aboutImages={storyPortrait:{asset:{url:'https://cdn.sanity.io/replaced.jpg'},alt:'Replacement'}}
 let html=renderAbout(doc);assert.ok(html.includes('replaced.jpg'));assert.ok(!html.includes('/assets/wyatt/justin-wyatt-headshot.webp'));assert.ok(!html.includes('/assets/wyatt/arizona-desert.webp'))
 delete doc.aboutImages.storyPortrait;html=renderAbout(doc);assert.ok(!html.includes('replaced.jpg'));assert.ok(!html.includes('/assets/wyatt/justin-wyatt-headshot.webp'))
})
test('native image crops are honored and image request width is bounded',()=>{
 const doc=baseline()
 doc.aboutImages={storyPortrait:{asset:{_ref:'image-abc123-2400x1600-jpg'},crop:{_type:'sanity.imageCrop',top:0,bottom:0,left:0.25,right:0.25},hotspot:{_type:'sanity.imageHotspot',x:0.5,y:0.5,width:0.5,height:1}}}
 const html=renderAbout(doc)
 assert.ok(html.includes('rect='))
 assert.ok(html.includes('w=597'));assert.ok(html.includes('h=677'));assert.ok(html.includes('fit=crop'));assert.ok(html.includes('auto=format'))
})
test('the supported attorney link stays within the trial and preserves preview mode',()=>{
 assert.ok(renderAbout(baseline()).includes('href="/justin-l-wyatt-esq/"'))
 assert.ok(renderAbout(baseline(),{preview:true}).includes('href="/justin-l-wyatt-esq/?preview=1"'))
 assert.ok(!renderAbout(baseline(),{preview:true}).includes('href="https://wyatt-netlify.netlify.app/justin-l-wyatt-esq/"'))
})
test('removing the whole initialized picture object does not restore legacy images',()=>{
 const doc=baseline();doc.aboutImagesInitialized=true
 assert.ok(!renderAbout(doc).includes('/assets/wyatt/justin-wyatt-headshot.webp'))
 assert.ok(!renderAbout(doc).includes('/assets/wyatt/arizona-desert.webp'))
 assert.ok(renderAbout(baseline()).includes('/assets/wyatt/justin-wyatt-headshot.webp'))
})
test('image migration initializes once and preserves removed or legacy-edited pictures',()=>{
 const published={_id:'wyatt-trial-about-us',_rev:'pub-rev'},draft={_id:'drafts.wyatt-trial-about-us',_rev:'draft-rev'}
 const first=planAboutImageSeed(published,draft)
 assert.equal(first.needsAssets,true);assert.ok(first.patches.every(p=>p.initializeImages));assert.equal(first.patches[0].revision,'pub-rev')
 assert.deepEqual(planAboutImageSeed({...published,aboutImagesInitialized:true}),{patches:[],needsAssets:false})
 const legacy=planAboutImageSeed({...published,aboutImages:{storyPortrait:{asset:{_ref:'existing'}}}},draft)
 assert.equal(legacy.needsAssets,false);assert.ok(legacy.patches.every(p=>!p.initializeImages))
 const removed=planAboutImageSeed({...published,aboutImagesInitialized:true},{...draft,aboutImagesInitialized:true})
 assert.deepEqual(removed,{patches:[],needsAssets:false})
})
