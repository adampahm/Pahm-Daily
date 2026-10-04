const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const scope='https://example.test/FahmiDaily-PWA/', handlers={},stores=new Map(),assets=[];
let online=true;
function store(key){if(!stores.has(key))stores.set(key,new Map());const map=stores.get(key);return{
 async addAll(requests){const entries=[];for(const r of requests){const path=new URL(r.url).pathname.replace('/FahmiDaily-PWA/','');assert(fs.existsSync(require('path').join(__dirname,'../',path)));assets.push(r.url);entries.push([r.url,new Response(fs.readFileSync(require('path').join(__dirname,'../',path)))]);}for(const [url,response] of entries)map.set(url,response)},
 async match(r){const url=typeof r==='string'?r:r.url;return map.get(url)?.clone()}
}}
stores.set('other-app-v2',new Map());stores.set('fahmi-daily:'+scope+':old',new Map());stores.set('fahmi-daily:https://example.test/another/:old',new Map());
stores.set('fahmi-daily-v1',new Map([[scope+'index.html',new Response('legacy')]]));
let skip=false,claimed=false,opened='',focused=false;
const ctx={URL,Request,Response,console,self:{registration:{scope},location:{origin:'https://example.test'},addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:()=>skip=true,
 clients:{claim:async()=>claimed=true,matchAll:async()=>[{url:'https://example.test/other/',focus:async()=>{throw Error('wrong client')}},{url:scope,focus:async()=>focused=true}],openWindow:async url=>opened=url}},
 caches:{open:async k=>store(k),keys:async()=>[...stores.keys()],delete:async k=>stores.delete(k)},fetch:async()=>{if(!online)throw Error('offline');return new Response('network')}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../service-worker.js'),'utf8'),ctx);
const dispatch=async(type,event={})=>{let pending;handlers[type]({...event,waitUntil:p=>pending=p});await pending;};
const fetchEvent=async(url,mode='cors',method='GET')=>{let response;handlers.fetch({request:{url,mode,method},respondWith:p=>response=p});return response?await response:undefined};
(async()=>{
await dispatch('install');assert.equal(assets.length,9);assert(!skip);
await dispatch('activate');assert(claimed);assert(!stores.has('fahmi-daily-v1'));assert(!stores.has('fahmi-daily:'+scope+':old'));assert(stores.has('other-app-v2'));assert(stores.has('fahmi-daily:https://example.test/another/:old'));
online=false;
for(const path of ['','index.html','unknown-route?x=1']){const response=await fetchEvent(scope+path,'navigate');assert((await response.text()).startsWith('<!doctype html>'))}
for(const path of ['app.js','styles.css','icons/icon-192.png','manifest.webmanifest'])assert(await fetchEvent(scope+path));
assert.equal(await fetchEvent('https://external.test/x'),undefined);assert.equal(await fetchEvent(scope+'secret.json'),undefined);assert.equal(await fetchEvent(scope+'app.js','cors','POST'),undefined);
handlers.message({data:{type:'SKIP_WAITING'}});assert(skip);
await dispatch('notificationclick',{notification:{close(){}}});assert(focused);assert.equal(opened,'');
console.log('PASS: atomic core install; no forced activation; scoped cleanup; subpath offline navigation/assets; external/unknown/POST ignored; update activation; notification focus scoped');
})().catch(e=>{console.error(e);process.exitCode=1});
