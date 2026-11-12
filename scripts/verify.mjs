import {spawn} from 'node:child_process'
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
function run(args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${args[0]} exited with ${code}`)))})}
let server
try{
  await run(['--experimental-vm-modules','--test',...['banter','quality','rhythm','layout','prop-staging'].map(name=>`scripts/${name}.test.mjs`)])
  let up=await fetch('http://127.0.0.1:5199/src/main.js').then(response=>response.ok).catch(()=>false)
  if(!up){
    server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5199','--strictPort','--host','127.0.0.1'],{stdio:'ignore',windowsHide:true})
    for(let n=0;n<100&&!up;n++){await sleep(200);up=await fetch('http://127.0.0.1:5199/src/main.js').then(response=>response.ok).catch(()=>false)}
    if(!up)throw Error('The local game server did not start')
  }
  await run(['scripts/gameplay.mjs'])
}finally{server?.kill()}
