import {createServer} from 'vite'
import {readFile} from 'node:fs/promises'
import {createPreviewHandlers, previewHandlers} from '../server/preview-handlers.mjs'
import {fetchTrialContent} from '../server/sanity-content.mjs'

// The managed local preview has no outbound network configuration. An optional,
// ignored snapshot supports visual QA only; production Functions never read it.
let snapshot
try {snapshot=JSON.parse(await readFile(new URL('../.preview-published.json',import.meta.url),'utf8'))} catch(error) {if(error.code!=='ENOENT')throw error}
if(snapshot && (snapshot.perspective!=='published' || !Array.isArray(snapshot.documents) || snapshot.documents.some(doc=>!doc._id?.startsWith('wyatt-trial-'))))throw Error('Invalid published preview snapshot')
const localHandlers=snapshot?createPreviewHandlers({fetchContent:async({slug,perspective,token})=>{
  if(perspective!=='published')return fetchTrialContent({slug,perspective,token})
  return slug?snapshot.documents.find(doc=>doc.slug?.current===slug)||null:snapshot.documents
}}):previewHandlers
const handlers={'/api/content':previewHandlers.content,'/api/preview/enable':previewHandlers.enable,'/api/preview/disable':previewHandlers.disable}
const portArg=process.argv.indexOf('--port')
const port=Number(portArg>=0?process.argv[portArg+1]:process.env.PORT)||4173
const apiPlugin={name:'matador-preview-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://'+req.headers.host)
  const handler=handlers[url.pathname]
  if(!handler)return next()
  try{
    let response=await (url.pathname==='/api/content'?localHandlers.content:handler)(new Request(url,{method:req.method,headers:req.headers}))
    if(snapshot && url.pathname==='/api/content' && response.ok){
      const result=await response.json()
      if(result.perspective==='published')response=Response.json({...result,source:'development-snapshot',capturedAt:snapshot.capturedAt},{status:response.status,headers:response.headers})
      else response=Response.json(result,{status:response.status,headers:response.headers})
    }
    res.writeHead(response.status,Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  }catch{res.writeHead(500);res.end('Preview server error')}
})}}
const server=await createServer({plugins:[apiPlugin],server:{host:'0.0.0.0',port,strictPort:true,allowedHosts:true}})
await server.listen()
server.printUrls()
if(snapshot)console.info(`Local visual review uses a published CMS snapshot captured ${snapshot.capturedAt}.`)
