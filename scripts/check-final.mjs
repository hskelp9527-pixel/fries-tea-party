import fs from 'node:fs'
import {spawnSync}from'node:child_process'
import {createHash}from'node:crypto'
const out='art/review/2026-11-11/revision/final';fs.mkdirSync(out,{recursive:true})
const node=process.execPath,production={...process.env,TEA_URL:'http://127.0.0.1:5200'}
const jobs=[
  ['unit',node,['--experimental-vm-modules','--test','scripts/*.test.mjs']],
  ['build',node,['node_modules/vite/bin/vite.js','build']],
  ['assets',node,['scripts/asset-report.mjs']],
  ['views',node,['scripts/capture-review.mjs'],production],
  ['compose',process.env.PYTHON_PATH??'E:/Python/python.exe',['scripts/compose-review.py']],
  ['ordinary-natural',node,['scripts/gameplay.mjs','--no-skip'],production],
  ['contact-fixtures',node,['scripts/capture-contacts.mjs']],
  ['all-clip-contacts',node,['scripts/audit-contacts.mjs','--capture']],
  ['skin',node,['scripts/audit-skin.mjs']],
  ['motion-ui',node,['scripts/check-motion.mjs']],
  ['drink-contact',node,['scripts/check-drink-contact.mjs']],
  ['shrink-view',node,['scripts/check-shrink-view.mjs']],
  ['repeat',node,['scripts/check-repeat.mjs']],
  ['performance-high',node,['scripts/check-browser.mjs','frame=s14&perf&quality=high&profile'],production],
  ['performance-cpu4',node,['scripts/check-browser.mjs','start=explore&perf&quality=auto&cpu=4'],production],
  ['performance-webgl',node,['scripts/check-browser.mjs','frame=s14&perf&quality=high&webgl'],production],
]
const from=process.argv.find(a=>a.startsWith('--from='))?.slice(7)
const offset=from?jobs.findIndex(job=>job[0]===from):0
if(offset<0)throw Error('Unknown starting check: '+from)
const progress=from&&fs.existsSync(`${out}/checks.json`)?JSON.parse(fs.readFileSync(`${out}/checks.json`,'utf8')):{started:new Date().toISOString(),jobs:[]}
progress.status='running';delete progress.error
progress.jobs=progress.jobs.filter(row=>!jobs.slice(offset).some(job=>job[0]===row.name))
const save=()=>fs.writeFileSync(`${out}/checks.json`,JSON.stringify(progress,null,2))
for(const[name,command,args,env]of jobs.slice(offset)){
  const browserJob=!['unit','build','assets','compose'].includes(name)
  const row={name,status:'running',started:new Date().toISOString(),...(browserJob?{address:production.TEA_URL}:{})};progress.jobs.push(row);save();console.log(`CHECK ${name}`)
  const fd=fs.openSync(`${out}/${name}.log`,'w')
  const result=spawnSync(command,args,{env:env??(browserJob?production:process.env),stdio:['ignore',fd,fd],windowsHide:true});fs.closeSync(fd)
  row.status=result.status===0?'passed':'failed';row.finished=new Date().toISOString();row.exitCode=result.status;save()
  if(result.status!==0){progress.status='failed';progress.error=String(result.error??`${name} failed; see ${out}/${name}.log`);save();console.error(progress.error);process.exit(result.status??1)}
  if(name==='build'){
    const html=fs.readFileSync('dist/index.html','utf8'),script=html.match(/src="([^"]+\.js)"/)[1]
    progress.production={script,sha256:createHash('sha256').update(fs.readFileSync('dist'+script)).digest('hex')};save()
  }
  console.log(`PASSED ${name}`)
}
progress.status='passed';progress.finished=new Date().toISOString();save();console.log('Central final checks passed')
