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
 const code=source.slice(0,source.indexOf('  setupWeather(); setupReminderSettings(); setupEvents();'))+`
 const originalCheckReminders=checkReminders;
 renderAll=()=>{};renderCalendar=()=>{};populateCategorySelect=()=>{};updateRecurrenceFields=()=>{};clearWeekdayPicker=()=>{};setWeekdayPicker=()=>{};
 toast=()=>{};checkReminders=()=>{};chooseScope=async()=>globalThis.scope||'one';shareOrDownload=async f=>globalThis.files.push(f);
 globalThis.api={renderToday,renderDay,renderWeek,renderMonth,renderSelectedDayAgenda,resetScheduleFilters,updateTimeParts,validReminder,readReminderFields,setReminderFields,validateForm,gatherForm,defaults,normalizeState,occursOn,occurrenceFor,occurrencesBetween,commitForm,deleteFlow,setStatusFlow,openNewEvent,openEditEvent,importBackup,exportBackup,calendarICS,foldICS,isStandalone,isIOS,saveState,candidateConflicts,checkReminders:originalCheckReminders,
 get state(){return state},set state(v){state=v},set editing(v){editingContext=v},get blocked(){return storageBlocked}};
})();`;
 ctx.files=files;vm.createContext(ctx);vm.runInContext(code,ctx);
 return {ctx,api:ctx.api,data,el,alerts,files,fail(v){fail=v}};
}
async function test(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name)}
(async()=>{
 await test('Five same-day schedules plus other dates survive reload and all calendar views; filters only hide data',()=>{
 const f=fixture();f.api.state.events=[];f.api.state.exceptions={};const d=new Date();const day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const data={title:'',categoryId:'pribadi',date:day,startTime:'08:00',endTime:'09:00',location:'',notes:'',reminderMinutes:-1,recurrence:{type:'none'}};
 for(let i=0;i<5;i++)f.api.commitForm({...data,title:'Same day '+i,startTime:String(8+i).padStart(2,'0')+':03',endTime:String(9+i).padStart(2,'0')+':07'});
 f.api.commitForm({...data,title:'Other date',date:'2027-01-20'});f.api.commitForm({...data,title:'Daily',recurrence:{type:'daily'}});
 assert.equal(new Set(f.api.state.events.map(e=>e.id)).size,7);const g=fixture(f.data.get('fahmiDailyPWA.v1'));assert.equal(g.api.state.events.length,7);assert.equal(g.api.occurrencesBetween(d,d,{filters:[]}).length,6);
 for(const html of [g.api.renderDay(d,''),g.api.renderWeek(d,d,''),g.api.renderMonth(d,d,'')])assert(html);
 g.api.renderToday();assert.equal((g.el('todayList').innerHTML.match(/<article/g)||[]).length,6);
 g.api.state.filters=['kuliah'];g.api.renderToday();assert(g.el('todayFilterNotice').innerHTML.includes('0 dari 6'));assert.equal(g.api.state.events.length,7);g.el('searchInput').value='no match';g.api.resetScheduleFilters();assert.equal(g.el('searchInput').value,'');assert.equal(g.api.state.filters.length,0);g.api.renderToday();assert.equal((g.el('todayList').innerHTML.match(/<article/g)||[]).length,6);
 assert.equal(g.api.occurrencesBetween(d,d,{query:'Same day 2'}).length,1);assert.equal(g.api.occurrencesBetween(new Date(2027,0,20),new Date(2027,0,20),{filters:[]}).length,2);
 });
 await test('Split time input uses +1h until manual edit, preserves legacy and rejects midnight rollover',()=>{
 const f=fixture();f.api.openNewEvent();assert.equal(f.el('eventEndTime').value,'10:00');
 f.el('eventStartHour').value='14';f.el('eventStartMinute').value='7';f.api.updateTimeParts('Start');assert.equal(f.el('eventStartTime').value,'14:07');assert.equal(f.el('eventEndTime').value,'15:07');
 f.el('eventEndHour').value='16';f.el('eventEndMinute').value='12';f.api.updateTimeParts('End');f.el('eventStartHour').value='15';f.api.updateTimeParts('Start');assert.equal(f.el('eventEndTime').value,'16:12');
 f.el('eventStartHour').value='17';f.api.updateTimeParts('Start');assert.equal(f.el('eventEndTime').value,'16:12');assert.equal(f.el('timeFieldMessage').textContent,'Waktu selesai harus setelah waktu mulai.');
 f.api.openNewEvent();f.el('eventStartHour').value='23';f.el('eventStartMinute').value='30';f.api.updateTimeParts('Start');assert.equal(f.el('eventEndTime').value,'');assert.equal(f.el('timeFieldMessage').textContent,'Pilih waktu selesai pada hari yang sama.');
 f.el('eventEndHour').value='23';f.el('eventEndMinute').value='50';f.api.updateTimeParts('End');assert.equal(f.el('eventEndTime').value,'23:50');
 const e=f.api.state.events[0];e.startTime='09:03';e.endTime='10:07';f.api.openEditEvent(e.id,e.date,'all');assert.equal(f.el('eventStartMinute').value,'03');assert.equal(f.el('eventEndMinute').value,'07');f.el('eventStartHour').value='08';f.api.updateTimeParts('Start');assert.equal(f.el('eventEndTime').value,'10:07');
 f.el('eventStartMinute').value='60';f.api.updateTimeParts('Start');assert.equal(f.el('eventStartTime').value,'');f.el('eventStartHour').value='24';f.el('eventStartMinute').value='00';f.api.updateTimeParts('Start');assert.equal(f.el('eventStartTime').value,'');
 });
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
 await test('5-minute and custom reminder persistence, backup, exceptions and limits',async()=>{
  const f=fixture();
  for(const minutes of [-1,0,5,10,30,1440,90,40320]){
    assert(f.api.validReminder(minutes));f.api.commitForm({...event,reminderMinutes:minutes});
    const raw=f.data.get('fahmiDailyPWA.v1');assert.equal(fixture(raw).api.state.events.at(-1).reminderMinutes,minutes);
  }
  for(const minutes of [-2,40321,1.5,NaN,Infinity])assert(!f.api.validReminder(minutes));
  const b=JSON.parse(f.data.get('fahmiDailyPWA.v1'));b.events[0].reminderMinutes=40321;assert.throws(()=>f.api.normalizeState(b));
  b.events[0].reminderMinutes=5;b.settings.defaultReminderMinutes=1.5;assert.throws(()=>f.api.normalizeState(b));
  const e=f.api.state.events.at(-1);f.api.editing={eventId:e.id,date:e.date,scope:'one'};f.api.commitForm({...event,reminderMinutes:90});
  await f.api.exportBackup();const g=fixture();await g.api.importBackup(f.files.at(-1));assert.equal(g.api.state.exceptions[e.id+'|'+e.date].overrides.reminderMinutes,90);
  assert(f.api.calendarICS({...f.api.occurrenceFor(e,new Date(2026,9,4,12)),reminderMinutes:5}).includes('TRIGGER:-PT5M'));
 });
 await test('Default only applies to new schedules, custom editing roundtrip and unit validation',()=>{
  const f=fixture();const old=JSON.stringify(f.api.state.events);f.api.state.settings.defaultReminderMinutes=5;f.api.saveState();f.api.openNewEvent();assert.equal(f.el('eventReminder').value,'5');assert.equal(JSON.stringify(f.api.state.events),old);
  for(const minutes of [0,90,120,2880,40320]){f.api.setReminderFields('event',minutes);assert.equal(f.api.readReminderFields('event'),minutes);}
  f.el('eventReminder').value='custom';f.el('eventReminderAmount').value='2';f.el('eventReminderUnit').value='60';assert.equal(f.api.readReminderFields('event'),120);
  f.el('eventReminderAmount').value='1.5';assert(Number.isNaN(f.api.readReminderFields('event')));
  f.el('eventReminderAmount').value='';assert(Number.isNaN(f.api.readReminderFields('event')));
  assert(f.api.validateForm({...event,reminderMinutes:40321}).includes('Pengingat'));
 });
 await test('Local custom reminders cover 28 days and zero-minute start alerts without repeating',async()=>{
  const f=fixture();let count=0;let fixed=new Date(2026,9,5,9,0).getTime();
  f.ctx.Date=class extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
  f.ctx.Notification={permission:'granted'};f.ctx.window.Notification=f.ctx.Notification;
  f.ctx.navigator.serviceWorker={getRegistration:async()=>({showNotification:async()=>{count++;}})};
  f.api.state.events=[{...event,id:'long-reminder',date:'2026-11-02',startTime:'09:00',endTime:'10:00',reminderMinutes:40320,recurrence:{type:'none'}},{...event,id:'zero-reminder',date:'2026-10-05',startTime:'09:00',endTime:'10:00',reminderMinutes:0,recurrence:{type:'none'}}];
  f.api.saveState();await f.api.checkReminders();assert.equal(count,2);await f.api.checkReminders();assert.equal(count,2);
  fixed+=15*86400000;await f.api.checkReminders();assert.equal(count,2);
 });
 await test('Outdoor coordinates, threshold, risk decision and recurring exception survive backup/reload',async()=>{
  const f=fixture(),outdoor={...event,activityType:'outdoor',weatherLocation:{name:'Bandung',latitude:-6.9,longitude:107.6},weatherAccepted:'weather-risk-proof'};
  f.api.commitForm(outdoor);const id=f.api.state.events.at(-1).id;f.api.editing={eventId:id,date:event.date,scope:'one'};f.api.commitForm({...outdoor,startTime:'22:00',endTime:'23:00'});
  f.api.state.settings.weatherThreshold=75;f.api.saveState();await f.api.exportBackup();const g=fixture();await g.api.importBackup(f.files.at(-1));const o=g.api.occurrenceFor(g.api.state.events.at(-1),new Date(2026,9,4,12));assert.equal(o.activityType,'outdoor');assert.equal(o.weatherLocation.latitude,-6.9);assert.equal(o.startTime,'22:00');assert.equal(g.api.state.settings.weatherThreshold,75);
  assert.equal(fixture(f.data.get('fahmiDailyPWA.v1')).api.state.events.at(-1).weatherAccepted,'weather-risk-proof');
 });
 await test('Outdoor data rejects invalid coordinates/threshold; old schedules remain Indoor',()=>{
  const f=fixture();assert.equal(f.api.occurrenceFor(f.api.state.events[0],new Date(2026,9,5,12)).activityType,'indoor');
  const b=f.api.defaults();b.events[0].activityType='outdoor';assert.throws(()=>f.api.normalizeState(b));b.events[0].weatherLocation={name:'Bad',latitude:200,longitude:0};assert.throws(()=>f.api.normalizeState(b));b.events[0].weatherLocation={name:'Bandung',latitude:-6.9,longitude:107.6};b.settings.weatherThreshold=101;assert.throws(()=>f.api.normalizeState(b));
 });
 await test('Weather cancellation respects new/all/one/moved recurrence scope without extra copy',()=>{
  const f=fixture();f.api.commitForm(event,true);const id=f.api.state.events.at(-1).id;assert.equal(f.api.state.events.at(-1).seriesStatus,'cancelled');
  f.api.editing={eventId:id,date:event.date,scope:'one'};f.api.commitForm(event,true);assert.equal(f.api.state.exceptions[id+'|'+event.date].status,'cancelled');
  f.api.editing={eventId:id,date:event.date,scope:'all'};f.api.commitForm({...event,title:'Edited'},true);assert.equal(f.api.state.events.length,7);
  f.api.editing={eventId:id,date:event.date,scope:'one'};f.api.commitForm({...event,date:'2026-10-12'},true);assert(f.api.state.exceptions[id+'|'+event.date].deleted);assert.equal(f.api.state.events.at(-1).seriesStatus,'cancelled');
 });
 console.log(`${results.length} app tests passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

