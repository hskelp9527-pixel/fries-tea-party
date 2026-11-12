import { spawn } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = ms => new Promise(r => setTimeout(r, ms))
export { sleep }
export async function launch({ port = 9333, width = 1920, height = 1080, headless = true, extra = [] } = {}) {
  const probe = createServer()
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
  port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  const profile = fs.mkdtempSync(os.tmpdir() + '/tea-check-')
  const proc = spawn(CHROME, [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    ...(headless ? ['--headless=new'] : []), '--enable-unsafe-webgpu', '--enable-gpu', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--force-device-scale-factor=1', ...extra, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true })
  let launchError
  proc.on('error', error => { launchError = error })
  let targets
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.find(t => t.type === 'page')) break } catch {}
    await sleep(200)
  }
  const page = targets?.find(t => t.type === 'page')
  if (!page) { proc.kill(); throw launchError ?? new Error('The test browser did not open its debugging port') }
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject) })
  let id = 0
  const pending = new Map(), listeners = []
  ws.addEventListener('close', () => {
    for (const request of pending.values()) request.reject(new Error('Test browser closed'))
    pending.clear()
  })
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (p) m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result) }
    else for (const l of listeners) l(m)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) { reject(new Error('Test browser is not connected')); return }
    const timer = setTimeout(() => { pending.delete(request); reject(new Error(`Browser request timed out: ${method}`)) }, 180000)
    const request = ++id
    pending.set(request, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
    ws.send(JSON.stringify({ id: request, method, params }))
  })
  const on = fn => listeners.push(fn)
  const net = new Map(), logs = [], navigated = new Set()
  on(m => {
    if(m.method==='Page.frameNavigated'&&!m.params.frame.parentId)navigated.add(m.params.frame.loaderId)
    if (m.method === 'Network.responseReceived') net.set(m.params.requestId, { url: m.params.response.url, type: m.params.type, size: 0 })
    if (m.method === 'Network.loadingFinished') { const r = net.get(m.params.requestId); if (r) { r.size = m.params.encodedDataLength; r.done = m.params.timestamp } }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(`[${m.params.type}] ` + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 400))
    if (m.method === 'Runtime.exceptionThrown') logs.push('[exception] ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 600))
  })
  await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  const evaluate = async (expression, awaitPromise = true) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  const shot = async file => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')) }
  const key = async (code, keyName = code) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: keyName })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyName })
  }
  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  }
  const goto = async url => {
    net.clear(); logs.length = 0
    const navigation=await send('Page.navigate',{url}),end=Date.now()+30000
    while(navigation.loaderId&&!navigated.has(navigation.loaderId)){
      if(Date.now()>end)throw Error(`Navigation did not enter a new document: ${url}`)
      await sleep(20)
    }
  }
  const close = async () => {
    try { await send('Browser.close') } catch {}
    ws.close(); proc.kill()
    // This is the unique temporary profile created above, never a signed-in profile.
    const resolved = path.resolve(profile), temporaryRoot = path.resolve(os.tmpdir())
    if (path.dirname(resolved) !== temporaryRoot || !path.basename(resolved).startsWith('tea-check-')) throw new Error('Unexpected browser profile path')
    for (let i = 0; i < 10; i++) {
      try { fs.rmSync(resolved, { recursive: true }); break } catch { await sleep(200) }
    }
  }
  async function record(file) {
    const encoder = spawn(process.env.FFMPEG_PATH ?? 'E:/Tools/ffmpeg/bin/ffmpeg.exe', ['-y','-loglevel','error','-f','image2pipe','-framerate','10','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p',file], {stdio:['pipe','ignore','pipe'],windowsHide:true})
    let first,previous,frames=0,error='',recording=true
    encoder.stderr.on('data',chunk=>{error+=chunk})
    const finished=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('exit',code=>code===0?resolve():reject(Error(error)))})
    finished.catch(()=>{})
    const options={format:'jpeg',quality:65,maxWidth:1280,maxHeight:720,everyNthFrame:6}
    on(message=>{
      if(message.method==='Page.frameNavigated'&&!message.params.frame.parentId&&recording)send('Page.startScreencast',options).catch(()=>{})
      if(message.method!=='Page.screencastFrame')return
      send('Page.screencastFrameAck',{sessionId:message.params.sessionId}).catch(()=>{})
      if(!recording)return
      const time=message.params.metadata.timestamp
      first??=time
      const target=Math.round((time-first)*10),frame=Buffer.from(message.params.data,'base64')
      while(frames<=target){encoder.stdin.write(previous??frame);frames++}
      previous=frame
    })
    await send('Page.startScreencast',options)
    return async()=>{await send('Page.stopScreencast');recording=false;encoder.stdin.end();await finished;return {file,seconds:frames/10,frames,audio:false}}
  }
  return { send, evaluate, shot, key, click, goto, close, net, logs, on, record }
}
