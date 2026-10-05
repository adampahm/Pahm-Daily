'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const source=fs.readFileSync(path.join(__dirname,'../google-calendar.js'),'utf8');
const baseEvent=()=>({id:'event1',title:'Rapat',categoryId:'pribadi',date:'2026-10-05',startTime:'09:00',endTime:'10:00',location:'Rumah',notes:'Catatan',reminderMinutes:10,recurrence:{type:'none'}});
const baseState=()=>({events:[baseEvent()],categories:[{id:'pribadi',name:'Pribadi'}],exceptions:{}});
const clientId='123456-test.apps.googleusercontent.com';
const key='fahmiDailyPWA.googleCalendar.v1';
function fixture(options={}){
 const values=new Map(),calls=[],statuses=[],calendars=new Map(),events=new Map(),timers=new Map();let timerId=0,now=Date.now(),profile={sub:'account-a',email:'a@example.test'},state=baseState(),failWrite=false,hook=null,readable=true;
 if(options.raw!==undefined)values.set(key,options.raw);
 const storage={getItem:k=>values.get(k)??null,setItem(k,v){if(failWrite)throw Error('quota');values.set(k,v)}};
 const response=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 const request=async(url,opt={})=>{
  const method=opt.method || 'GET',body=opt.body?JSON.parse(opt.body):undefined;
  calls.push({url,method,body,headers:opt.headers});
  if(hook){const result=await hook({url,method,body});if(result)return result;}
  if(url.includes('/userinfo'))return response(profile);
  const uri=new URL(url),parts=uri.pathname.replace('/calendar/v3','').split('/').filter(Boolean).map(decodeURIComponent);
  if(parts[0]!=='calendars')throw Error('unexpected url');
  if(parts.length===1 && method==='POST'){
   const id='calendar-'+(calendars.size+1);calendars.set(id,{...body,id});events.set(id,new Map());return response(calendars.get(id));
  }
  const calendar=calendars.get(parts[1]);if(!calendar)return response({},404);
  if(parts.length===2)return response(calendar);
  const map=events.get(parts[1]);
  if(parts.length===3 && method==='GET'){
   const owner=(uri.searchParams.get('privateExtendedProperty') || '').split('=')[1];
   return response({items:[...map.values()].filter(e=>e.status!=='cancelled' && e.extendedProperties?.private?.fahmiOwner===owner)});
  }
  if(parts.length===3 && method==='POST'){
   if(map.has(body.id))return response({},409);
   map.set(body.id,{...body,status:'confirmed'});return response(map.get(body.id));
  }
  const event=map.get(parts[3]);if(!event)return response({},404);
  if(method==='GET')return response(event);
  if(method==='PUT'){map.set(parts[3],{...body,id:parts[3],status:'confirmed'});return response(map.get(parts[3]));}
  if(method==='DELETE'){map.set(parts[3],{...event,status:'cancelled'});return response(null,204);}
  throw Error('unexpected request');
 };
 const ctx={window:{google:{accounts:{oauth2:{hasGrantedAllScopes:()=>true}}}},document:{head:{appendChild(){throw Error('SDK unexpectedly loaded')}},createElement:()=>({})},navigator:{onLine:true},crypto,TextEncoder,Date,Intl,URLSearchParams,AbortController,localStorage:storage,fetch:request,
  setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id)};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const controller=ctx.window.FahmiGoogleCalendar.create({getState:()=>state,canSync:()=>readable,onStatus:s=>statuses.push(s),storage,request,clock:()=>now,credentialProvider:options.provider});
 return {ctx,controller,values,calls,statuses,calendars,events,timers,set state(v){state=v},get state(){return state},set now(v){now=v},get now(){return now},set profile(v){profile=v},set hook(v){hook=v},set readable(v){readable=v},set failWrite(v){failWrite=v},
  async connect(){controller.configure(clientId);await controller.acceptToken({access_token:'TEST_ONLY_TOKEN',expires_in:3600});},
  async flush(){for(const [id,t] of [...timers])if(t.ms===600){timers.delete(id);await t.fn();}},
  active(){return [...events.values()].flatMap(map=>[...map.values()]).filter(e=>e.status!=='cancelled')},
  plan(s=state){return ctx.window.FahmiGoogleCalendar.buildPlan(s,'Asia/Jakarta')}};
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS',name)}
(async()=>{
 await test('No Google requests or SDK load before opt-in',async()=>{const f=fixture();f.controller.changed();await f.flush();assert.equal(f.calls.length,0);assert(!f.controller.enabled);assert(f.ctx.window.FahmiGoogleCalendar.SCOPES.includes('calendar.app.created'))});
 await test('OAuth client ID validation and corrupt sync metadata fail closed',async()=>{const f=fixture();assert.throws(()=>f.controller.configure('client-secret'));const g=fixture({raw:'{bad'});assert.throws(()=>g.controller.configure(clientId));assert.equal(g.calls.length,0)});
 await test('Connect creates a dedicated calendar and event; token never persisted',async()=>{const f=fixture();await f.connect();assert.equal(f.calendars.size,1);assert.equal(f.active().length,1);assert.equal(f.active()[0].summary,'Rapat');assert.equal(f.active()[0].reminders.overrides[0].minutes,10);assert(![...f.values.values()].some(v=>v.includes('TEST_ONLY_TOKEN')));assert(f.statuses.at(-1).connected)});
 await test('Automatic local change creates updated event before deleting obsolete copy',async()=>{const f=fixture();await f.connect();f.calls.length=0;f.state.events[0].title='Rapat baru';f.controller.changed();await f.flush();assert.equal(f.active().length,1);assert.equal(f.active()[0].summary,'Rapat baru');const post=f.calls.findIndex(c=>c.method==='POST'),del=f.calls.findIndex(c=>c.method==='DELETE');assert(post>=0 && del>post)});
 await test('Repeated unchanged sync does not duplicate; delete removes app event',async()=>{const f=fixture();await f.connect();await f.controller.sync();assert.equal(f.active().length,1);f.state.events=[];await f.controller.sync();assert.equal(f.active().length,0)});
 await test('Reminder choices 10,30,1440 and done/no-reminder mapping',()=>{const f=fixture();for(const minutes of [10,30,1440]){f.state.events[0].reminderMinutes=minutes;assert.equal(f.plan()[0].body.reminders.overrides[0].minutes,minutes)}f.state.events[0].seriesStatus='done';assert.equal(f.plan()[0].body.reminders.overrides.length,0);assert(f.plan()[0].body.summary.startsWith('✓ '));f.state.events[0].seriesStatus='cancelled';assert.equal(f.plan().length,0)});
 await test('5-minute/custom reminder updates preserve Google event id without POST or DELETE',async()=>{
  const f=fixture();await f.connect();const id=f.active()[0].id;
  for(const minutes of [5,90,40320,0,-1]){
    f.calls.length=0;f.state.events[0].reminderMinutes=minutes;await f.controller.sync();
    assert.equal(f.active().length,1);assert.equal(f.active()[0].id,id);
    assert.equal(f.calls.filter(c=>c.method==='POST' || c.method==='DELETE').length,0);
    assert.equal(f.active()[0].reminders.overrides.length,minutes<0?0:1);
    if(minutes>=0)assert.equal(f.active()[0].reminders.overrides[0].minutes,minutes);
  }
 });
 await test('Google normalized dateTimes and omitted empty fields still update same reminder event',async()=>{
  const f=fixture();f.state.events[0].location='';await f.connect();const prior=f.active()[0],id=prior.id;
  prior.start.dateTime=new Date(prior.start.dateTime).toISOString().replace('.000Z','+00:00');prior.end.dateTime=new Date(prior.end.dateTime).toISOString().replace('.000Z','+00:00');delete prior.location;delete prior.transparency;
  f.calls.length=0;f.state.events[0].reminderMinutes=5;await f.controller.sync();assert.equal(f.active()[0].id,id);assert(!f.calls.some(c=>c.method==='POST' || c.method==='DELETE'));
 });
 await test('Lost reminder PUT response retries same event; last successful sync survives reload',async()=>{
  const f=fixture();await f.connect();const id=f.active()[0].id;f.state.events[0].reminderMinutes=5;let lost=true;
  f.hook=({method,body})=>{if(method==='PUT' && lost){lost=false;f.events.values().next().value.set(id,{...body,id,status:'confirmed'});throw Error('lost PUT response')}};
  await f.controller.sync();f.hook=null;await f.controller.sync();assert.equal(f.active().length,1);assert.equal(f.active()[0].id,id);assert.equal(f.active()[0].reminders.overrides[0].minutes,5);
  const raw=f.values.get(key),g=fixture({raw});g.controller.status();assert(g.statuses.at(-1).lastSync);assert(!raw.includes('TEST_ONLY_TOKEN'));
 });
 await test('Daily/weekly/custom RRULE, UNTIL, EXDATE and modified instance',()=>{const f=fixture();const e=f.state.events[0];e.recurrence={type:'daily',until:'2026-10-20'};assert(f.plan()[0].body.recurrence[0].startsWith('RRULE:FREQ=DAILY;UNTIL='));e.recurrence={type:'weekly'};assert.equal(f.plan()[0].body.recurrence[0],'RRULE:FREQ=WEEKLY;BYDAY=MO');e.recurrence={type:'custom',weekdays:[2,4]};assert.equal(f.plan()[0].body.recurrence[0],'RRULE:FREQ=WEEKLY;BYDAY=TU,TH');assert(f.plan()[0].body.start.dateTime.includes('2026-10-06'));f.state.exceptions['event1|2026-10-06']={overrides:{title:'Kejadian khusus',startTime:'11:00',endTime:'12:00'}};const plan=f.plan();assert.equal(plan.length,2);assert.equal(plan[0].body.summary,'Kejadian khusus');assert(plan[1].body.recurrence.some(r=>r.startsWith('EXDATE:')));f.state.exceptions['event1|2026-10-06']={deleted:true};assert.equal(f.plan().length,1)});
 await test('Cancelled series preserves explicitly reactivated occurrence',()=>{const f=fixture();f.state.events[0].seriesStatus='cancelled';f.state.events[0].recurrence={type:'daily'};f.state.exceptions['event1|2026-10-06']={status:'scheduled'};const plan=f.plan();assert.equal(plan.length,1);assert.equal(plan[0].key,'event1|2026-10-06')});
 await test('Offline saves defer network work, expiry requires new user authorization',async()=>{const f=fixture();await f.connect();f.calls.length=0;f.ctx.navigator.onLine=false;f.state.events[0].title='Offline edit';await f.controller.sync();assert.equal(f.calls.length,0);f.ctx.navigator.onLine=true;await f.controller.sync();assert.equal(f.active()[0].summary,'Offline edit');f.calls.length=0;f.now+=3600000;await f.controller.sync();assert.equal(f.calls.length,0);assert(!f.statuses.at(-1).connected)});
 await test('Network failure leaves old cloud event and local data intact; retry completes',async()=>{const f=fixture();await f.connect();f.state.events[0].title='New title';f.hook=({method})=>{if(method==='POST')throw Error('offline')};await f.controller.sync();assert.equal(f.active()[0].summary,'Rapat');assert.equal(f.state.events[0].title,'New title');f.hook=null;await f.controller.sync();assert.equal(f.active().length,1);assert.equal(f.active()[0].summary,'New title')});
 await test('Lost POST response retries same persisted id without duplication',async()=>{const f=fixture();await f.connect();f.state.events[0].title='Retry';let lost=true;f.hook=({method,body,url})=>{if(method==='POST' && url.includes('/events') && lost){lost=false;f.events.values().next().value.set(body.id,{...body,status:'confirmed'});throw Error('lost response')}};await f.controller.sync();f.hook=null;await f.controller.sync();assert.equal(f.active().length,1);assert.equal(f.active()[0].summary,'Retry')});
 await test('Only owned events deleted; another calendar/account is isolated',async()=>{const f=fixture();await f.connect();const map=f.events.values().next().value;map.set('external-event',{id:'external-event',summary:'Unrelated',status:'confirmed',extendedProperties:{private:{fahmiOwner:'another-owner'}}});f.state.events=[];await f.controller.sync();assert.equal(map.get('external-event').status,'confirmed');f.profile={sub:'account-b',email:'b@example.test'};f.state.events=[baseEvent()];await f.controller.acceptToken({access_token:'SECOND_TOKEN',expires_in:3600});assert.equal(f.calendars.size,2);assert.equal(Object.keys(JSON.parse(f.values.get(key)).accounts).length,2)});
 await test('Disconnect disables all further sync and does not delete remote events',async()=>{const f=fixture();await f.connect();f.controller.disconnect();f.calls.length=0;f.state.events=[];f.controller.changed();await f.flush();assert.equal(f.calls.length,0);assert.equal(f.active().length,1)});
 await test('Metadata quota/stale tab aborts before new cloud write',async()=>{const f=fixture();await f.connect();f.state.events[0].title='Quota';f.failWrite=true;f.calls.length=0;await f.controller.sync();assert(!f.calls.some(c=>c.method==='POST'||c.method==='DELETE'));assert.equal(f.active()[0].summary,'Rapat');f.failWrite=false;f.values.set(key,'changed elsewhere');await f.controller.sync();assert.equal(f.active()[0].summary,'Rapat')});
 await test('Unreadable local state blocks cloud sync',async()=>{const f=fixture();await f.connect();f.calls.length=0;f.readable=false;await f.controller.sync();assert.equal(f.calls.length,0)});
 await test('Restore pauses automatic cleanup until explicit forced sync',async()=>{const f=fixture();await f.connect();f.state.events=[];f.controller.pauseAfterRestore();f.calls.length=0;f.controller.changed();await f.flush();assert.equal(f.calls.length,0);assert.equal(f.active().length,1);await f.controller.sync(true);assert.equal(f.active().length,0)});
 await test('Known calendar link recovery reuses calendar rather than creating duplicates',async()=>{const f=fixture();await f.connect();const old=JSON.parse(f.values.get(key)),calendarId=old.accounts['account-a'].calendarId;f.controller.disconnect();const raw=JSON.parse(f.values.get(key));raw.accounts={};f.values.set(key,JSON.stringify(raw));const g=fixture({raw:JSON.stringify(raw)});for(const [id,c] of f.calendars)g.calendars.set(id,c);for(const [id,e] of f.events)g.events.set(id,e);g.controller.configure(clientId,calendarId);await g.controller.acceptToken({access_token:'RECOVERY_TOKEN',expires_in:3600});assert.equal(g.calendars.size,1);assert.equal(g.active().length,1)});
 await test('Unknown calendar-create outcome does not recreate on retry',async()=>{const f=fixture();f.hook=({method,url})=>{if(method==='POST' && url.endsWith('/calendars'))throw Error('unknown outcome')};await f.connect();f.hook=null;f.calls.length=0;await f.controller.sync();assert(!f.calls.some(c=>c.method==='POST'));assert(f.statuses.at(-1).message.includes('Pulihkan Tautan'))});
 const credentials=()=>({access_token:'SERVER_ACCESS',expires_in:3600,clientId,profile:{sub:'account-a',email:'a@example.test'}});
 await test('Server provider resumes and renews without SDK or duplicate calendar',async()=>{
  let count=0;const provider=async()=>{count++;return credentials()},f=fixture({provider});f.controller.configure(clientId);await f.controller.sync();assert.equal(count,1);assert.equal(f.active().length,1);
  f.now+=3600000;f.state.events[0].title='After expiry';await f.controller.sync();assert.equal(count,2);assert.equal(f.active()[0].summary,'After expiry');assert.equal(f.calendars.size,1);
  const g=fixture({provider,raw:f.values.get(key)});g.state=f.state;for(const [id,c] of f.calendars)g.calendars.set(id,c);for(const [id,e] of f.events)g.events.set(id,e);await g.controller.sync();assert.equal(g.calendars.size,1);assert.equal(g.active().length,1);
 });
 await test('Google 401 forces one server refresh then retries safely',async()=>{
  const refreshes=[];const f=fixture({provider:async force=>{refreshes.push(force);return credentials()}});f.controller.configure(clientId);await f.controller.sync();let reject=true;
  f.hook=()=>{if(reject){reject=false;return new Response('{}',{status:401})}};await f.controller.sync();assert.deepEqual(refreshes,[false,true]);assert.equal(f.active().length,1);assert(!f.statuses.at(-1).error);
 });
 await test('Concurrent provider resume is serialized before calendar writes',async()=>{
  const f=fixture({provider:async()=>credentials()});f.controller.configure(clientId);await Promise.all([f.controller.sync(),f.controller.sync()]);assert.equal(f.calendars.size,1);assert.equal(f.active().length,1);
 });
 await test('Disconnect while server refresh is pending prevents calendar writes',async()=>{
  let resolve;const f=fixture({provider:()=>new Promise(r=>{resolve=r})});f.controller.configure(clientId);const sync=f.controller.sync();f.controller.disconnect();resolve(credentials());await sync;assert.equal(f.calls.length,0);assert.equal(f.active().length,0);
 });
 await test('Mismatched server client ID fails before calendar access',async()=>{
  const f=fixture({provider:async()=>({...credentials(),clientId:'different'})});f.controller.configure(clientId);await f.controller.sync();assert.equal(f.calls.length,0);assert(f.statuses.at(-1).error);
 });
 console.log(`${passed} Google Calendar tests passed.`);
})().catch(error=>{console.error(error);process.exitCode=1});
