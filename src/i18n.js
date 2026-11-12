import en from './lang/en.json'
const dictionaries=import.meta.glob('./lang/*.json',{eager:true,import:'default'})
const listeners=new Set(),staticText=new Map(),missing=new Set()
const staticAttributes=new Map()
const has=code=>!!dictionaries[`./lang/${code}.json`]
let language=new URLSearchParams(location.search).get('lang')
try{language??=localStorage.getItem('tea-party-language-v2')}catch{}
language=has(language)?language:has('zh')?'zh':'en'
export const currentLanguage=()=>language
export function tr(source,values={}){
  const catalog=dictionaries[`./lang/${language}.json`]?._ui??{}
  let text=language==='en'?source:catalog[source]
  if(!text){if(language!=='en')missing.add(source);text=source}
  return text.replace(/\{(\w+)\}/g,(_,name)=>values[name]??`{${name}}`)
}
export const dialogue=id=>dictionaries[`./lang/${language}.json`]?.[id]??en[id]??''
export function localizeDOM(root=document.body){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT)
  while(walker.nextNode()){
    const node=walker.currentNode,key=node.nodeValue.trim()
    if(!key||node.parentElement?.closest('script,style,pre,canvas'))continue
    if(dictionaries['./lang/zh.json']?._ui?.[key])staticText.set(node,{key,before:node.nodeValue.match(/^\s*/)[0],after:node.nodeValue.match(/\s*$/)[0]})
  }
  for(const[node,{key,before,after}]of staticText)if(node.isConnected)node.nodeValue=before+tr(key)+after
  for(const element of root.querySelectorAll('[aria-label],[title]'))for(const name of ['aria-label','title']){
    const key=element.getAttribute(name)
    if(key&&dictionaries['./lang/zh.json']?._ui?.[key]){if(!staticAttributes.has(element))staticAttributes.set(element,new Map());staticAttributes.get(element).set(name,key)}
  }
  for(const[element,attributes]of staticAttributes)if(element.isConnected)for(const[name,key]of attributes)element.setAttribute(name,tr(key))
}
export function setLanguage(code){
  language=has(code)?code:'en';document.documentElement.lang=language==='zh'?'zh-CN':language
  try{localStorage.setItem('tea-party-language-v2',language)}catch{}
  localizeDOM();document.title=tr("The Six O'Clock Tea Party");for(const listener of listeners)listener(language)
  return language
}
export const onLanguageChange=listener=>{listeners.add(listener);return()=>listeners.delete(listener)}
localizeDOM();document.documentElement.lang=language==='zh'?'zh-CN':language
if(new URLSearchParams(location.search).has('diagnostics'))window.__localization={missing,language:currentLanguage}
