import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
const root=path.resolve('dist'),zip=promisify(gzip),cache=new Map(),port=Number(process.env.PORT??5200)
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.json':'application/json','.webp':'image/webp','.ogg':'audio/ogg','.wasm':'application/wasm'}
createServer(async(req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname))
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{
    const ext=path.extname(file),compressed=/gzip/.test(req.headers['accept-encoding']??'')&&['.html','.js','.css','.json','.wasm','.glb'].includes(ext)
    const stat=await fs.stat(file),key=file+stat.mtimeMs+compressed
    if(!cache.has(key))cache.set(key,fs.readFile(file).then(bytes=>compressed?zip(bytes):bytes))
    const bytes=await cache.get(key)
    res.writeHead(200,{'Content-Type':types[ext]??'application/octet-stream','Content-Length':bytes.length,...(compressed?{'Content-Encoding':'gzip','Vary':'Accept-Encoding'}:{})}).end(bytes)
  }catch{res.writeHead(404).end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log(`Production garden: http://127.0.0.1:${port}`))
