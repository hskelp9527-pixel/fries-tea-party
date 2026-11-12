import assert from 'node:assert/strict'
import { sleep } from './browser.mjs'
export function routeDriver(browser,{skipScenes=true,autoJump=false}={}) {
  const evaluate=browser.evaluate
  async function until(expression,seconds=120){
    const end=Date.now()+seconds*1000
    while(Date.now()<end){
      const errors=browser.logs.filter(log=>/^\[(exception|error)\]/.test(log))
      assert.equal(errors.length,0,errors.join('\n'))
      if(await evaluate(expression).catch(()=>false))return
      await sleep(100)
    }
    throw new Error(`Timed out: ${expression}; ${JSON.stringify(await evaluate('({phase:__tea.S.game.phase,paused:__tea.S.game.paused,gears:__tea.S.game.gears,puzzle:__tea.gearGames})').catch(()=>null))}`)
  }
  const down=code=>browser.send('Input.dispatchKeyEvent',{type:'keyDown',code,key:code==='Space'?' ':code})
  const up=code=>browser.send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code==='Space'?' ':code})
  async function walk(x,z,tolerance=.2,seconds=80){
    await until('__tea.P.player.control',180)
    const end=Date.now()+seconds*1000
    let previous=Infinity,stuck=0
    await down('ShiftLeft');await down('KeyW')
    try{
      while(Date.now()<end){
        const state=await evaluate(`(()=>{const p=__tea.P.player,dx=${x}-p.feet.x,dz=${z}-p.feet.z;p.yaw=Math.atan2(-dx,-dz);return {distance:Math.hypot(dx,dz),feet:p.feet.toArray(),control:p.control}})()`)
        if(state.distance<tolerance)return state.feet
        if(!state.control){await up('KeyW');if(skipScenes)await browser.key('Enter','Enter');await until('__tea.P.player.control',100);await down('KeyW')}
        stuck=previous-state.distance<.006?stuck+1:0
        if(autoJump&&stuck>9){await browser.key('Space',' ');stuck=0}
        previous=state.distance
        await sleep(120)
      }
      throw new Error(`Walk blocked towards ${x},${z}: ${JSON.stringify(await evaluate('__tea.P.player.feet.toArray()'))}`)
    }finally{await up('KeyW');await up('ShiftLeft')}
  }
  async function path(points,tolerance=.25){for(const [x,z]of points)await walk(x,z,tolerance)}
  async function interact(label,{skip=skipScenes,control=true}={}){
    await until(`document.getElementById('prompt').dataset.action===${JSON.stringify(label)}`,12)
    await browser.key('KeyE','e');await sleep(250)
    if(skip)await browser.key('Enter','Enter')
    if(control)await until('__tea.P.player.control',180)
  }
  async function puzzle(){
    await until('__tea.gearGames.active',30)
    const kind=await evaluate('__tea.gearGames.kind')
    if(kind==='tree'){
      while(await evaluate('__tea.gearGames.active')){
        await sleep(100)
        const state=await evaluate(`(()=>{const g=__tea.gearGames,r=document.getElementById('gear-game-canvas').getBoundingClientRect();return {round:g.round,target:g.target,rect:{x:r.x,y:r.y,w:r.width,h:r.height}}})()`)
        await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:state.rect.x+state.rect.w*state.target.x,y:state.rect.y+state.rect.h*state.target.y})
        await down('Space');await until(`!__tea.gearGames.active||__tea.gearGames.round>${state.round}`,7);await up('Space')
      }
    }else if(kind==='hall'){
      while(await evaluate('__tea.gearGames.active')){
        const goal=await evaluate('__tea.gearGames.correctWatch'),round=await evaluate('__tea.gearGames.round')
        await browser.key('Digit'+(goal+1),String(goal+1));await until('__tea.gearGames.listenRemaining===0',6)
        await browser.key('Space',' ');await until(`!__tea.gearGames.active||__tea.gearGames.round>${round}`,5)
      }
    }else{
      while(await evaluate('__tea.gearGames.active')){
        const state=await evaluate('({lane:__tea.gearGames.lane,safe:__tea.gearGames.safeLane,round:__tea.gearGames.round,mistakes:__tea.gearGames.mistakes,failed:__tea.gearGames.failed})')
        if(state.failed){await browser.key('KeyR','r');await sleep(200);continue}
        for(let i=state.lane;i<state.safe;i++)await browser.key('KeyD','d')
        for(let i=state.lane;i>state.safe;i--)await browser.key('KeyA','a')
        await until('__tea.gearGames.open||__tea.gearGames.failed||!__tea.gearGames.active',20)
        if(!await evaluate('__tea.gearGames.active'))break
        if(await evaluate('__tea.gearGames.failed'))continue
        await browser.key('Space',' ');await until(`!__tea.gearGames.active||__tea.gearGames.round>${state.round}||__tea.gearGames.mistakes>${state.mistakes}`,7);await sleep(800)
      }
    }
    await until('__tea.P.player.control',180)
  }
  return {until,walk,path,interact,puzzle,down,up}
}
