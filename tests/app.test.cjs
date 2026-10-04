const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const results=[];
const source=fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8');
function fixture(raw=null){
 const data=new Map(raw===null?[]:[['fahmiDailyPWA.v1',raw]]),elements=new Map(),alerts=[],files=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,classList:{add(){},remove(){},toggle(){}},close(){},showModal(){},reset(){},querySelectorAll(){return []},querySelector(){return null}});return elements.get(id)};
 let fail=false;
 const ctx={console,crypto,Date,Intl,TextEncoder,File,Blob,URL,setTimeout:()=>0,clearTimeout(){},setInterval(){},
  window:{addEventListener(){},matchMedia(){return{matches:false}},isSecureContext:true},navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:1,standalone:false},
  document:{hidden:false,getElementById:el,querySelectorAll(){return[]}},alert:m=>alerts.push(m),confirm:()=>true,
  localStorage:{getItem:k=>data.get(k)??null,setItem(k,v){if(fail)throw Error('quota');data.set(k,v)}}};
 const code=source.slice(0,source.indexOf('  setupEvents();'))+`
 const originalCheckReminders=checkReminders;
 renderAll=()=>{};renderCalendar=()=>{};populateCategorySelect=()=>{};updateRecurrenceFields=()=>{};clearWeekdayPicker=()=>{};setWeekdayPicker=()=>{};
 toast=()=>{};checkReminders=()=>{};chooseScope=async()=>globalThis.scope||'one';shareOrDownload=async f=>globalThis.files.push(f);
 globalThis.api={defaults,normalizeState,occursOn,occurrenceFor,occurrencesBetween,commitForm,deleteFlow,setStatusFlow,openNewEvent,openEditEvent,importBackup,exportBackup,calendarICS,foldICS,isStandalone,isIOS,saveState,candidateConflicts,checkReminders:originalCheckReminders,
 get state(){return state},set state(v){state=v},set editing(v){editingContext=v},get blocked(){return storageBlocked}};
})();`;
 ctx.files=files;vm.createContext(ctx);vm.runInContext(code,ctx);
 return {ctx,api:ctx.api,data,el,alerts,files,fail(v){fail=v}};
}
async function test(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name)}
(async()=>{
 await test('Original localStorage v1 and all defaults preserved',()=>{const f=fixture();const raw=JSON.stringify(f.api.defaults());const g=fixture(raw);assert.equal(g.api.state.events.length,6);assert.equal(g.api.blocked,false)});
 await test('Corrupt storage retained and all writes blocked',()=>{const f=fixture('{broken');assert(f.api.blocked);assert.throws(()=>f.api.saveState());assert.equal(f.data.get('fahmiDailyPWA.v1'),'{broken')});
 await test('Quota failure rolls back memory and stored data',()=>{const f=fixture();f.api.saveState();const old=f.data.get('fahmiDailyPWA.v1');f.api.state.events=[];f.fail(true);assert.throws(()=>f.api.saveState());assert.equal(f.api.state.events.length,6);assert.equal(f.data.get('fahmiDailyPWA.v1'),old)});
 await test('Another tab cannot be overwritten by a stale editor',()=>{const f=fixture();f.api.saveState();const next=JSON.parse(f.data.get('fahmiDailyPWA.v1'));next.events[0].title='Updated elsewhere';const raw=JSON.stringify(next);f.data.set('fahmiDailyPWA.v1',raw);f.api.state.events=[];assert.throws(()=>f.api.saveState());assert.equal(f.data.get('fahmiDailyPWA.v1'),raw)});
 const event={title:'Test ü😀,;\\\nCatatan',categoryId:'pribadi',date:'2026-10-04',startTime:'20:00',endTime:'21:00',location:'Rumah',notes:'Baris 1\nBaris 2',reminderMinutes:30,recurrence:{type:'daily',weekdays:[],until:'2026-10-10'}};
 await test('Add, edit all, edit one, move occurrence, and persistence reload',()=>{const f=fixture();f.api.commitForm(event);const id=f.api.state.events.at(-1).id;assert(f.api.occursOn(f.api.state.events.at(-1),new Date(2026,9,10,12)));assert(!f.api.occursOn(f.api.state.events.at(-1),new Date(2026,9,11,12)));f.api.editing={eventId:id,date:event.date,scope:'all'};f.api.commitForm({...event,title:'Edited'});f.api.editing={eventId:id,date:event.date,scope:'one'};f.api.commitForm({...event,title:'One only'});assert.equal(f.api.occurrenceFor(f.api.state.events.at(-1),new Date(2026,9,4,12)).title,'One only');assert.equal(f.api.occurrenceFor(f.api.state.events.at(-1),new Date(2026,9,5,12)).title,'Edited');f.api.editing={eventId:id,date:event.date,scope:'one'};f.api.commitForm({...event,date:'2026-10-12'});assert.equal(f.api.occurrenceFor(f.api.state.events.find(e=>e.id===id),new Date(2026,9,4,12)),null);assert.equal(fixture(f.data.get('fahmiDailyPWA.v1')).api.state.events.length,8)});
 await test('Daily, weekly, custom weekdays, exception status, delete one/all',async()=>{const f=fixture();f.api.commitForm(event);const e=f.api.state.events.at(-1);assert(f.api.occursOn({...e,recurrence:{type:'weekly'}},new Date(2026,9,11,12)));assert(!f.api.occursOn({...e,recurrence:{type:'weekly'}},new Date(2026,9,5,12)));assert(f.api.occursOn({...e,recurrence:{type:'custom',weekdays:[1,3]}},new Date(2026,9,5,12)));await f.api.setStatusFlow(e.id,event.date,'done');assert.equal(f.api.occurrenceFor(e,new Date(2026,9,4,12)).status,'done');await f.api.deleteFlow(e.id,event.date);assert.equal(f.api.occurrenceFor(e,new Date(2026,9,4,12)),null);assert(f.api.occurrenceFor(e,new Date(2026,9,5,12)));f.ctx.scope='all';await f.api.deleteFlow(e.id,'2026-10-05');assert(!f.api.state.events.some(x=>x.id===e.id));assert(!Object.keys(f.api.state.exceptions).some(k=>k.startsWith(e.id+'|')))});
 await test('Whole-series editor retains original start; new form reenables recurrence',()=>{const f=fixture();const e=f.api.state.events[0];f.api.openEditEvent(e.id,'2026-10-05','all');assert.equal(f.el('eventDate').value,e.date);f.el('eventRecurrence').disabled=true;f.api.openNewEvent();assert.equal(f.el('eventRecurrence').disabled,false)});
 await test('Filters and text search; hidden categories still conflict',()=>{const f=fixture();f.api.commitForm(event);f.api.state.filters=['kuliah'];assert.equal(f.api.occurrencesBetween(new Date(2026,9,4),new Date(2026,9,4)).length,0);assert.equal(f.api.occurrencesBetween(new Date(2026,9,4),new Date(2026,9,4),{filters:[],query:'Rumah'}).length,1);assert.equal(f.api.candidateConflicts(event,null).length,3)});
 await test('JSON export/restore roundtrip; pre-restore recovery copy',async()=>{const f=fixture();f.api.commitForm(event);await f.api.exportBackup();const file=f.files[0];const raw=await file.text();const g=fixture();g.api.saveState();const old=g.data.get('fahmiDailyPWA.v1');await g.api.importBackup(file);assert.equal(g.data.get('fahmiDailyPWA.v1.beforeRestore'),old);assert.equal(JSON.stringify(g.api.state),JSON.stringify(JSON.parse(raw)))});
 await test('Invalid import and HTML attribute injection rejected without changing data',async()=>{const f=fixture();f.api.saveState();const old=f.data.get('fahmiDailyPWA.v1');const backup=JSON.parse(old);backup.categories[0].id='x" onclick="alert(1)';await f.api.importBackup(new File([JSON.stringify(backup)],'bad.json'));assert.equal(f.data.get('fahmiDailyPWA.v1'),old);assert(f.alerts.length);for(const value of ['2026-02-30','2026-13-01']){const b=JSON.parse(old);b.events[0].date=value;assert.throws(()=>f.api.normalizeState(b))}});
 await test('Quota during restore retains old data',async()=>{const f=fixture();f.api.saveState();const old=f.data.get('fahmiDailyPWA.v1');f.fail(true);await f.api.importBackup(new File([old],'backup.json'));assert.equal(f.data.get('fahmiDailyPWA.v1'),old)});
 await test('ICS UTC times, escaping, stable UID and all 3 alarms, UTF-8 folding',()=>{const f=fixture();f.api.commitForm(event);const o=f.api.occurrenceFor(f.api.state.events.at(-1),new Date(2026,9,4,12));for(const minutes of [10,30,1440]){const ics=f.api.calendarICS({...o,reminderMinutes:minutes,title:'Judul 😀'.repeat(30)});assert(ics.includes(`TRIGGER:-PT${minutes}M`));assert(ics.includes('DTSTART:'+o.startDateTime.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')));assert(ics.endsWith('END:VCALENDAR\r\n'));assert(ics.split('\r\n').every(line=>Buffer.byteLength(line)<=75));assert(!ics.includes('\ufffd'))}const ics=f.api.calendarICS(o);assert(ics.includes('\\,\\;\\\\\\n'));assert(ics.includes('DESCRIPTION:Baris 1\\nBaris 2'))});
 await test('Standalone iOS detection',()=>{const f=fixture();assert(f.api.isIOS());assert(!f.api.isStandalone());f.ctx.navigator.standalone=true;assert(f.api.isStandalone())});
 await test('Reminders ignore filters, deduplicate successful delivery, retry failure, pause while hidden',async()=>{
  const f=fixture();let count=0,fail=true;
  const fixed=new Date(2026,9,5,19,50).getTime();
  f.ctx.Date=class extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
  f.ctx.Notification={permission:'granted'};
  f.ctx.window.Notification=f.ctx.Notification;
  f.ctx.navigator.serviceWorker={getRegistration:async()=>({showNotification:async()=>{count++;if(fail)throw Error('delivery failed');}})};
  f.api.state.events=[{...event,id:'reminder-test',date:'2026-10-05',reminderMinutes:10,recurrence:{type:'none'}}];f.api.state.filters=['kuliah'];f.api.saveState();
  await f.api.checkReminders();assert.equal(count,1);assert.equal(Object.keys(f.api.state.notified).length,0);
  fail=false;await f.api.checkReminders();assert.equal(count,2);assert.equal(Object.keys(f.api.state.notified).length,1);
  await f.api.checkReminders();assert.equal(count,2);f.api.state.notified={};f.ctx.document.hidden=true;await f.api.checkReminders();assert.equal(count,2);
 });
 console.log(`${results.length} app tests passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});
