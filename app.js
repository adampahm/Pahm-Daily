(() => {
  'use strict';

  const STORAGE_KEY = 'fahmiDailyPWA.v1';
  const WEEKDAYS = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const WEEKDAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  const $ = id => document.getElementById(id);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const pad = n => String(n).padStart(2,'0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseLocalDate = s => {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  };
  const withTime = (dateStr, timeStr) => {
    const d = parseLocalDate(dateStr);
    const [h,m] = timeStr.split(':').map(Number);
    d.setHours(h,m,0,0);
    return d;
  };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  const startOfWeek = d => {
    const x = new Date(d); x.setHours(12,0,0,0);
    const shift = (x.getDay()+6)%7;
    x.setDate(x.getDate()-shift);
    return x;
  };
  const endOfWeek = d => addDays(startOfWeek(d),6);
  const startOfMonthGrid = d => startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1, 12));
  const endOfMonthGrid = d => addDays(startOfMonthGrid(d),41);
  const fmtDateLong = d => new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
  const fmtDateShort = d => new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(d);
  const timeRange = o => `${o.startTime}–${o.endTime}`;
  const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  const defaults = () => ({
    version: 1,
    initialized: true,
    categories: [
      {id:'kuliah', name:'Kuliah', color:'#557A95', builtin:true},
      {id:'lari', name:'Lari', color:'#4F8A77', builtin:true},
      {id:'olahraga', name:'Olahraga', color:'#7D7399', builtin:true},
      {id:'meeting', name:'Meeting', color:'#B17A59', builtin:true},
      {id:'pribadi', name:'Pribadi', color:'#6C7890', builtin:true}
    ],
    events: [
      course('Proposal Tugas Akhir','2026-09-28','08:30','10:30','TULT-12.07',1),
      course('Speech Signal Processing','2026-09-29','09:30','12:30','(A302A) KU1.03.03',2),
      course('Radar, Navigasi dan Remote Sensing','2026-09-29','13:30','16:30','KU3.04.07',2),
      course('Sistem Komunikasi Seluler','2026-09-30','12:30','15:30','TULT-13.16',3),
      course('Steganografi dan Watermarking','2026-10-01','07:30','10:30','KU3.05.08',4),
      course('Komunikasi Akses Wireless','2026-10-02','08:30','11:30','KU3.04.07',5)
    ],
    exceptions: {},
    filters: [],
    notified: {},
    settings: { calendarMode: 'month' }
  });

  function course(title, date, startTime, endTime, location, weekday){
    return {
      id: uid(), title, categoryId:'kuliah', date, startTime, endTime, location,
      notes:'Jadwal kuliah Semester Ganjil 2026/2027', reminderMinutes:-1,
      recurrence:{type:'weekly', weekdays:[weekday], until:null}, createdAt:Date.now()
    };
  }

  let storageBlocked = false;
  let rawRecovery = null;
  let observedRaw = null;
  let storageMessage = '';
  const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
  const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseLocalDate(value)) === value;
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const validStatus = value => ['scheduled','done','cancelled'].includes(value);
  function normalizeState(data){
    if(!isObject(data) || (data.version !== undefined && data.version !== 1) ||
      !Array.isArray(data.categories) || !data.categories.length || !Array.isArray(data.events)) throw new Error('Format backup tidak sesuai.');
    const ids = new Set();
    for(const c of data.categories){
      if(!isObject(c) || !validId(c.id) || ids.has(c.id) || typeof c.name !== 'string' || !c.name.trim() ||
        !/^#[0-9a-f]{6}$/i.test(c.color)) throw new Error('Kategori backup tidak valid.');
      ids.add(c.id);
    }
    const eventIds = new Set();
    const validFields = e => typeof e.title === 'string' && !!e.title.trim() && ids.has(e.categoryId) &&
      validDate(e.date) && validTime(e.startTime) && validTime(e.endTime) && e.endTime > e.startTime &&
      (e.location === undefined || typeof e.location === 'string') && (e.notes === undefined || typeof e.notes === 'string') &&
      [-1,10,30,1440].includes(Number(e.reminderMinutes ?? -1));
    for(const e of data.events){
      if(!isObject(e) || !validId(e.id) || eventIds.has(e.id) || !validFields(e) ||
        (e.seriesStatus !== undefined && !validStatus(e.seriesStatus))) throw new Error('Jadwal backup tidak valid.');
      eventIds.add(e.id);
      const r = e.recurrence;
      if(r && (!isObject(r) || !['none','daily','weekly','custom'].includes(r.type) ||
        (r.until && (!validDate(r.until) || r.until < e.date)) ||
        (r.weekdays !== undefined && (!Array.isArray(r.weekdays) || r.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6))) ||
        (r.type === 'custom' && !r.weekdays?.length))) throw new Error('Pengulangan backup tidak valid.');
    }
    if(data.exceptions !== undefined && !isObject(data.exceptions)) throw new Error('Exception tidak valid.');
    for(const [key, ex] of Object.entries(data.exceptions || {})){
      const [id, date, extra] = key.split('|');
      if(extra !== undefined || !eventIds.has(id) || !validDate(date) || !isObject(ex) ||
        (ex.status !== undefined && !validStatus(ex.status)) || (ex.deleted !== undefined && typeof ex.deleted !== 'boolean')) throw new Error('Exception tidak valid.');
      if(ex.overrides){
        const allowed=['title','categoryId','date','startTime','endTime','location','notes','reminderMinutes'];
        const base=data.events.find(e=>e.id===id);
        if(!isObject(ex.overrides) || Object.keys(ex.overrides).some(k=>!allowed.includes(k)) ||
          (ex.overrides.date !== undefined && ex.overrides.date !== date) || !validFields({...base,date,...ex.overrides})) throw new Error('Perubahan kejadian tidak valid.');
      }
    }
    if(data.filters !== undefined && (!Array.isArray(data.filters) || data.filters.some(id=>!ids.has(id)))) throw new Error('Filter tidak valid.');
    if(data.notified !== undefined && (!isObject(data.notified) || Object.values(data.notified).some(v=>!Number.isFinite(v)))) throw new Error('Pengingat tidak valid.');
    if(data.settings !== undefined && (!isObject(data.settings) || (data.settings.calendarMode && !['day','week','month'].includes(data.settings.calendarMode)))) throw new Error('Pengaturan tidak valid.');
    return {...data,version:1,initialized:true,exceptions:data.exceptions || {},filters:data.filters || [],notified:data.notified || {},settings:{calendarMode:'month',...(data.settings || {})}};
  }
  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      observedRaw = raw;
      if(raw === null) return defaults();
      rawRecovery = raw;
      return normalizeState(JSON.parse(raw));
    } catch {
      storageBlocked = true;
      storageMessage = 'Data lokal tidak dapat dibaca. Data asli tidak ditimpa. Gunakan Backup Data untuk menyelamatkan salinan mentah, lalu Pulihkan Backup yang valid.';
      return {...defaults(),events:[]};
    }
  }
  let state = loadState();
  let committedState = JSON.stringify(state);
  let googleSync=null;
  const scheduleSignature = () => JSON.stringify({events:state.events,exceptions:state.exceptions,categories:state.categories});
  let lastScheduleSignature=scheduleSignature();
  function storageFailure(message){
    storageMessage=message;
    $('storageWarning').textContent=message;
    $('storageWarning').classList.remove('hidden');
    alert(message);
  }
  function saveState(){
    try {
      if(storageBlocked) throw new Error('blocked');
      if(localStorage.getItem(STORAGE_KEY) !== observedRaw){
        const error=new Error('Data berubah di tab/aplikasi lain. Perubahan ini belum disimpan. Tutup form lalu buka ulang aplikasi sebelum mengedit lagi; buat backup jika perlu.');
        error.name='StorageWriteError'; throw error;
      }
      const next=JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY,next);
      committedState=next;
      rawRecovery=next;
      observedRaw=next;
    } catch(cause) {
      state=JSON.parse(committedState);
      renderAll();
      const error=new Error(cause.name==='StorageWriteError' ? cause.message : 'Data gagal disimpan. Perubahan dibatalkan; data sebelumnya tetap dipertahankan. Buat Backup Data dan periksa ruang penyimpanan/izin browser.');
      error.name='StorageWriteError';
      throw error;
    }
    const signature=scheduleSignature();
    if(signature!==lastScheduleSignature){lastScheduleSignature=signature;googleSync?.changed();}
  }
  const handleStorageError = error => {
    if(error?.name !== 'StorageWriteError') return false;
    storageFailure(storageBlocked ? storageMessage : error.message); return true;
  };
  window.addEventListener('error', e=>{if(handleStorageError(e.error))e.preventDefault();});
  window.addEventListener('unhandledrejection', e=>{if(handleStorageError(e.reason))e.preventDefault();});

  let currentPage = 'todayPage';
  let selectedDate = new Date();
  selectedDate.setHours(12,0,0,0);
  let calendarCursor = new Date(selectedDate);
  let calendarMode = state.settings.calendarMode || 'month';
  let editingContext = null; // {eventId,date,scope}
  let pendingSave = null;
  let scopeResolver = null;

  function categoryById(id){ return state.categories.find(c => c.id === id) || {name:'Lainnya',color:'#7D8790'}; }
  function occurrenceKey(eventId, date){ return `${eventId}|${date}`; }

  function occursOn(event, d){
    const start = parseLocalDate(event.date);
    const day = new Date(d); day.setHours(12,0,0,0);
    if (day < start) return false;
    const until = event.recurrence?.until ? parseLocalDate(event.recurrence.until) : null;
    if (until && day > until) return false;
    const type = event.recurrence?.type || 'none';
    if (type === 'none') return dateKey(day) === event.date;
    if (type === 'daily') return true;
    if (type === 'weekly') return day.getDay() === start.getDay();
    if (type === 'custom') return (event.recurrence.weekdays || []).includes(day.getDay());
    return false;
  }

  function occurrenceFor(event, d){
    const dk = dateKey(d);
    if (!occursOn(event,d)) return null;
    const ex = state.exceptions[occurrenceKey(event.id,dk)] || null;
    if (ex?.deleted) return null;
    const o = {
      eventId:event.id, date:dk, title:event.title, categoryId:event.categoryId,
      startTime:event.startTime, endTime:event.endTime, location:event.location || '', notes:event.notes || '',
      reminderMinutes:Number(event.reminderMinutes ?? -1), recurrence:event.recurrence,
      status:event.seriesStatus || 'scheduled', isRecurring:(event.recurrence?.type || 'none') !== 'none'
    };
    if (ex?.overrides) Object.assign(o, ex.overrides);
    if (ex?.status) o.status = ex.status;
    o.startDateTime = withTime(o.date,o.startTime);
    o.endDateTime = withTime(o.date,o.endTime);
    return o;
  }

  function occurrencesBetween(start,end,{query='',filters=state.filters}={}){
    const out=[]; const q=query.trim().toLocaleLowerCase('id-ID');
    let d=new Date(start); d.setHours(12,0,0,0);
    const last=new Date(end); last.setHours(12,0,0,0);
    for(; d<=last; d=addDays(d,1)){
      for(const ev of state.events){
        const o=occurrenceFor(ev,d);
        if(!o) continue;
        if(filters?.length && !filters.includes(o.categoryId)) continue;
        if(q && !`${o.title} ${o.location} ${o.notes}`.toLocaleLowerCase('id-ID').includes(q)) continue;
        out.push(o);
      }
    }
    return out.sort((a,b)=>a.startDateTime-b.startDateTime || a.title.localeCompare(b.title));
  }

  function todayOccurrences(){ const d=new Date(); return occurrencesBetween(d,d); }
  function futureNext(){
    const now=new Date();
    const list=occurrencesBetween(now,addDays(now,30),{filters:[]}).filter(o => o.status==='scheduled' && o.endDateTime>now);
    return list[0] || null;
  }

  function renderAll(){
    renderTopbar(); renderToday(); renderCalendar(); renderSettings(); populateCategorySelect(); updateNotificationUI();
  }

  function renderTopbar(){
    const map={todayPage:['Penjadwalan pribadi','Hari Ini'],calendarPage:['Lihat dan atur agenda','Kalender'],settingsPage:['Sesuaikan aplikasi','Pengaturan']};
    $('topEyebrow').textContent=map[currentPage][0]; $('topTitle').textContent=map[currentPage][1];
  }

  function renderToday(){
    const now=new Date(); $('todayDateLabel').textContent=fmtDateLong(now);
    const next=futureNext();
    if(next){
      const cat=categoryById(next.categoryId);
      const isToday=next.date===dateKey(now);
      $('todayHero').innerHTML=`<div class="hero-card"><p class="hero-kicker">${isToday?'Kegiatan berikutnya':'Berikutnya'}</p><p class="hero-title">${escapeHtml(next.title)}</p><p class="hero-meta">${isToday?timeRange(next):fmtDateShort(parseLocalDate(next.date))+' • '+timeRange(next)}${next.location?' • '+escapeHtml(next.location):''}</p></div>`;
    } else {
      $('todayHero').innerHTML=`<div class="hero-card hero-empty"><p class="hero-kicker">Agenda</p><p class="hero-title">Belum ada kegiatan berikutnya</p><p class="hero-meta">Tambahkan jadwal agar harimu lebih teratur.</p></div>`;
    }
    const list=todayOccurrences();
    const week=occurrencesBetween(startOfWeek(now),endOfWeek(now),{filters:[]});
    $('statistics').textContent=`Minggu ini: ${week.length} kegiatan • ${week.filter(o=>o.status==='done').length} selesai • ${week.filter(o=>o.status==='cancelled').length} dibatalkan (semua kategori).`;
    $('todayList').innerHTML=list.length?list.map(eventCardHtml).join(''):emptyStateHtml('Tidak ada kegiatan hari ini','Gunakan tombol tambah untuk membuat jadwal.');
    bindEventCards($('todayList'));
  }

  function renderCalendar(){
    [...$('calendarMode').querySelectorAll('button')].forEach(b=>b.classList.toggle('active',b.dataset.mode===calendarMode));
    const query=$('searchInput')?.value || '';
    let start,end;
    if(calendarMode==='day'){ start=end=new Date(calendarCursor); }
    else if(calendarMode==='week'){ start=startOfWeek(calendarCursor); end=endOfWeek(calendarCursor); }
    else { start=startOfMonthGrid(calendarCursor); end=endOfMonthGrid(calendarCursor); }
    $('calendarPeriodLabel').textContent=periodLabel();
    $('calendarCanvas').innerHTML=calendarMode==='month'?renderMonth(start,end,query):calendarMode==='week'?renderWeek(start,end,query):renderDay(calendarCursor,query);
    bindCalendarCells();
    renderSelectedDayAgenda(query);
    renderActiveFilters();
  }

  function periodLabel(){
    if(calendarMode==='day') return fmtDateLong(calendarCursor);
    if(calendarMode==='week'){
      const s=startOfWeek(calendarCursor), e=endOfWeek(calendarCursor);
      return `${fmtDateShort(s)} – ${fmtDateShort(e)} ${e.getFullYear()}`;
    }
    return `${MONTHS[calendarCursor.getMonth()]} ${calendarCursor.getFullYear()}`;
  }

  function renderMonth(start,end,query){
    const occ=occurrencesBetween(start,end,{query});
    const by={}; occ.forEach(o=>(by[o.date] ||= []).push(o));
    let html='<div class="month-grid">';
    ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].forEach(x=>html+=`<div class="weekday-label">${x}</div>`);
    for(let d=new Date(start); d<=end; d=addDays(d,1)){
      const dk=dateKey(d), items=by[dk]||[];
      const outside=d.getMonth()!==calendarCursor.getMonth();
      const today=dk===dateKey(new Date()), selected=dk===dateKey(selectedDate);
      const dots=items.slice(0,3).map(o=>`<span class="cal-dot" style="background:${categoryById(o.categoryId).color}"></span>`).join('');
      html+=`<button class="day-cell ${outside?'outside':''} ${today?'today':''} ${selected?'selected':''}" data-date="${dk}"><span class="day-number">${d.getDate()}</span><span class="dot-row">${dots}</span></button>`;
    }
    return html+'</div>';
  }

  function renderWeek(start,end,query){
    const occ=occurrencesBetween(start,end,{query}); const by={}; occ.forEach(o=>(by[o.date] ||= []).push(o));
    let html='<div class="week-cards">';
    for(let d=new Date(start); d<=end; d=addDays(d,1)){
      const dk=dateKey(d), items=by[dk]||[];
      html+=`<button class="week-day-card ${dk===dateKey(selectedDate)?'selected':''}" data-date="${dk}"><strong>${WEEKDAY_SHORT[d.getDay()]}</strong><small>${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</small><div class="week-mini">${items.slice(0,5).map(o=>`<span class="week-mini-item" style="background:${categoryById(o.categoryId).color}"></span>`).join('')}</div></button>`;
    }
    return html+'</div>';
  }

  function renderDay(d,query){
    const items=occurrencesBetween(d,d,{query});
    return `<div class="day-timeline">${items.length?items.map(o=>`<div style="display:grid;grid-template-columns:70px 6px 1fr;gap:10px;align-items:start;margin:8px 0 16px"><strong style="font-size:13px">${o.startTime}</strong><span style="height:100%;min-height:42px;border-radius:8px;background:${categoryById(o.categoryId).color}"></span><div><strong>${escapeHtml(o.title)}</strong><div class="muted small">${o.endTime}${o.location?' • '+escapeHtml(o.location):''}</div></div></div>`).join(''):'<p class="muted">Tidak ada kegiatan pada hari ini.</p>'}</div>`;
  }

  function renderSelectedDayAgenda(query){
    const items=occurrencesBetween(selectedDate,selectedDate,{query});
    $('selectedDayTitle').textContent=WEEKDAYS[selectedDate.getDay()]+', '+selectedDate.getDate()+' '+MONTHS[selectedDate.getMonth()];
    $('selectedDaySubtitle').textContent=items.length?`${items.length} kegiatan`:'Tidak ada kegiatan';
    $('calendarAgenda').innerHTML=items.length?items.map(eventCardHtml).join(''):emptyStateHtml('Belum ada kegiatan','Tambahkan jadwal untuk tanggal ini.');
    bindEventCards($('calendarAgenda'));
  }

  function renderActiveFilters(){
    $('activeFilters').innerHTML=state.filters.map(id=>{const c=categoryById(id);return `<button class="chip" data-remove-filter="${id}"><span style="color:${c.color}">●</span> ${escapeHtml(c.name)} ×</button>`}).join('');
    $('activeFilters').querySelectorAll('[data-remove-filter]').forEach(b=>b.onclick=()=>{state.filters=state.filters.filter(x=>x!==b.dataset.removeFilter);saveState();renderCalendar();});
  }

  function eventCardHtml(o){
    const cat=categoryById(o.categoryId);
    const status=o.status==='done'?'<span class="status-pill done">✓ Selesai</span>':o.status==='cancelled'?'<span class="status-pill cancelled">Dibatalkan</span>':'';
    return `<article class="event-card" data-event-id="${o.eventId}" data-date="${o.date}"><div class="event-bar" style="background:${cat.color}"></div><div class="event-main"><div class="event-time">${timeRange(o)} • ${escapeHtml(cat.name)}</div><p class="event-title">${escapeHtml(o.title)}</p>${o.location?`<p class="event-detail">⌖ ${escapeHtml(o.location)}</p>`:''}${status}</div><div class="event-actions"><button class="more-btn" aria-label="Aksi kegiatan">•••</button></div></article>`;
  }

  function emptyStateHtml(title,desc){ return `<div class="empty-state"><div class="empty-icon">◷</div><h3>${escapeHtml(title)}</h3><p class="muted">${escapeHtml(desc)}</p><button class="primary-btn inline-add" style="margin-top:12px">＋ Buat jadwal</button></div>`; }

  function bindEventCards(root){
    root.querySelectorAll('.inline-add').forEach(b=>b.onclick=()=>openNewEvent(dateKey(selectedDate)));
    root.querySelectorAll('.event-card').forEach(card=>{
      card.querySelector('.more-btn').onclick=e=>{e.stopPropagation();openActionSheet(card.dataset.eventId,card.dataset.date)};
      card.onclick=()=>openEditFlow(card.dataset.eventId,card.dataset.date);
    });
  }

  function bindCalendarCells(){
    $('calendarCanvas').querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{selectedDate=parseLocalDate(b.dataset.date);calendarCursor=new Date(selectedDate);renderCalendar();});
  }

  function renderSettings(){
    $('categoryList').innerHTML=state.categories.map(c=>`<div class="category-row"><div class="category-ident"><span class="category-swatch" style="background:${c.color}"></span><strong>${escapeHtml(c.name)}</strong></div>${c.builtin?'':'<button class="text-btn" data-delete-category="'+c.id+'">Hapus</button>'}</div>`).join('');
    $('categoryList').querySelectorAll('[data-delete-category]').forEach(b=>b.onclick=()=>deleteCategory(b.dataset.deleteCategory));
  }

  function populateCategorySelect(){
    const current=$('eventCategory').value;
    $('eventCategory').innerHTML=state.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    if(state.categories.some(c=>c.id===current)) $('eventCategory').value=current;
  }

  function openNewEvent(dk=dateKey(new Date())){
    editingContext=null; $('eventDialogTitle').textContent='Tambah Jadwal';
    $('eventForm').reset(); populateCategorySelect();
    $('eventCategory').value=state.categories[0]?.id || 'pribadi'; $('eventReminder').value='-1'; $('eventDate').value=dk;
    $('eventStartTime').value='09:00'; $('eventEndTime').value='10:00'; $('eventRecurrence').value='none';
    $('eventRecurrence').disabled=false; clearWeekdayPicker(); updateRecurrenceFields(); $('eventDialog').showModal();
  }

  function openEditFlow(eventId,dk){
    const ev=state.events.find(e=>e.id===eventId); if(!ev) return;
    const recurring=(ev.recurrence?.type || 'none')!=='none';
    if(!recurring) return openEditEvent(eventId,dk,'all');
    chooseScope('Ubah jadwal berulang','Pilih apakah perubahan berlaku untuk kejadian ini saja atau seluruh rangkaian.').then(scope=>{if(scope)openEditEvent(eventId,dk,scope)});
  }

  function openEditEvent(eventId,dk,scope){
    const ev=state.events.find(e=>e.id===eventId); const o=ev&&occurrenceFor(ev,parseLocalDate(dk)); if(!ev||!o)return;
    if(scope==='all') Object.assign(o,{...ev,date:ev.date});
    editingContext={eventId, date:dk, scope}; $('eventDialogTitle').textContent=scope==='one'?'Ubah Kejadian':'Ubah Jadwal'; populateCategorySelect();
    $('eventTitle').value=o.title; $('eventCategory').value=o.categoryId; $('eventReminder').value=String(o.reminderMinutes ?? -1);
    $('eventDate').value=o.date; $('eventStartTime').value=o.startTime; $('eventEndTime').value=o.endTime; $('eventLocation').value=o.location||''; $('eventNotes').value=o.notes||'';
    if(scope==='one'){ $('eventRecurrence').value='none'; $('eventRecurrence').disabled=true; $('eventUntil').value=''; }
    else { $('eventRecurrence').disabled=false; $('eventRecurrence').value=ev.recurrence?.type||'none'; $('eventUntil').value=ev.recurrence?.until||''; setWeekdayPicker(ev.recurrence?.weekdays||[]); }
    updateRecurrenceFields(); $('eventDialog').showModal();
  }

  function gatherForm(){
    const type=$('eventRecurrence').value;
    const weekdays=type==='custom'?[...$('weekdayPicker').querySelectorAll('button.active')].map(b=>Number(b.dataset.day)):type==='weekly'?[parseLocalDate($('eventDate').value).getDay()]:[];
    return {
      title:$('eventTitle').value.trim(), categoryId:$('eventCategory').value, date:$('eventDate').value,
      startTime:$('eventStartTime').value, endTime:$('eventEndTime').value, location:$('eventLocation').value.trim(), notes:$('eventNotes').value.trim(),
      reminderMinutes:Number($('eventReminder').value), recurrence:{type,weekdays,until:type==='none'?null:($('eventUntil').value||null)}
    };
  }

  function validateForm(data){
    if(!data.title||!data.date||!data.startTime||!data.endTime) return 'Lengkapi judul, tanggal, dan waktu.';
    if(withTime(data.date,data.endTime)<=withTime(data.date,data.startTime)) return 'Jam selesai harus setelah jam mulai.';
    if(data.recurrence.type==='custom'&&!data.recurrence.weekdays.length) return 'Pilih minimal satu hari untuk jadwal berulang.';
    if(data.recurrence.until && parseLocalDate(data.recurrence.until)<parseLocalDate(data.date)) return 'Tanggal akhir pengulangan tidak boleh sebelum tanggal mulai.';
    return null;
  }

  function candidateConflicts(data, context){
    const temp={id:context?.eventId || '__candidate__',...data};
    const dates=[];
    let d=parseLocalDate(data.date), end=addDays(d, data.recurrence.type==='none'?0:120);
    if(data.recurrence.until){ const u=parseLocalDate(data.recurrence.until); if(u<end)end=u; }
    for(;d<=end;d=addDays(d,1)) if(occursOn(temp,d)) dates.push(new Date(d));
    const conflicts=[];
    for(const day of dates){
      const cand=occurrenceFor({...temp,id:'__candidate__'},day); if(!cand)continue;
      const existing=occurrencesBetween(day,day,{filters:[]}).filter(o=>o.status==='scheduled' && !(context&&o.eventId===context.eventId&&(context.scope==='all'||o.date===context.date)));
      for(const o of existing){
        if(cand.startDateTime<o.endDateTime && cand.endDateTime>o.startDateTime){conflicts.push(o); if(conflicts.length>=3)return conflicts;}
      }
    }
    return conflicts;
  }

  function commitForm(data){
    if(!editingContext){ state.events.push({...data,id:uid(),createdAt:Date.now()}); }
    else if(editingContext.scope==='all'){
      const i=state.events.findIndex(e=>e.id===editingContext.eventId); if(i>=0)state.events[i]={...state.events[i],...data};
    } else {
      const key=occurrenceKey(editingContext.eventId,editingContext.date);
      if(data.date !== editingContext.date){
        state.exceptions[key]={...(state.exceptions[key]||{}),deleted:true};
        state.events.push({...data,id:uid(),recurrence:{type:'none',weekdays:[],until:null},createdAt:Date.now(),parentSeriesId:editingContext.eventId});
      } else {
        const existing=state.exceptions[key]||{};
        state.exceptions[key]={...existing,overrides:{title:data.title,categoryId:data.categoryId,date:data.date,startTime:data.startTime,endTime:data.endTime,location:data.location,notes:data.notes,reminderMinutes:data.reminderMinutes}};
      }
    }
    saveState(); $('eventDialog').close(); editingContext=null; renderAll(); checkReminders(); toast('Jadwal disimpan');
  }

  function openActionSheet(eventId,dk){
    const ev=state.events.find(e=>e.id===eventId); const o=ev&&occurrenceFor(ev,parseLocalDate(dk)); if(!o)return;
    const dlg=document.createElement('dialog'); dlg.className='center-dialog';
    dlg.innerHTML=`<div class="modal-card action-sheet"><h2>${escapeHtml(o.title)}</h2><button class="action-btn" data-a="calendar">Tambahkan ke Kalender</button><p class="muted small">Ekspor kejadian ini saja. Kalender tidak otomatis mengikuti perubahan Fahmi Daily.</p><button class="action-btn" data-a="edit">Ubah jadwal</button><button class="action-btn" data-a="done">${o.status==='done'?'Tandai belum selesai':'Tandai selesai'}</button><button class="action-btn" data-a="cancel">${o.status==='cancelled'?'Aktifkan kembali':'Batalkan kegiatan'}</button><button class="action-btn danger" data-a="delete">Hapus jadwal</button><button class="text-btn" data-a="close">Tutup</button></div>`;
    document.body.appendChild(dlg); dlg.showModal();
    dlg.addEventListener('close',()=>dlg.remove());
    dlg.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{
      const a=b.dataset.a; if(a==='calendar'){await exportCalendar(o);return;} if(a==='close'){dlg.close();return;} dlg.close();
      if(a==='edit')return openEditFlow(eventId,dk);
      if(a==='done')return setStatusFlow(eventId,dk,o.status==='done'?'scheduled':'done');
      if(a==='cancel')return setStatusFlow(eventId,dk,o.status==='cancelled'?'scheduled':'cancelled');
      if(a==='delete')return deleteFlow(eventId,dk);
    });
  }

  async function setStatusFlow(eventId,dk,status){
    const ev=state.events.find(e=>e.id===eventId); if(!ev)return;
    const recurring=(ev.recurrence?.type||'none')!=='none';
    let scope='one';
    if(recurring) scope=await chooseScope('Ubah status jadwal','Terapkan status pada kejadian ini atau seluruh rangkaian?');
    if(!scope)return;
    if(scope==='one'){
      const key=occurrenceKey(eventId,dk); state.exceptions[key]={...(state.exceptions[key]||{}),status};
    } else {
      ev.seriesStatus=status;
    }
    saveState();renderAll();toast(status==='done'?'Ditandai selesai':status==='cancelled'?'Kegiatan dibatalkan':'Status diperbarui');
  }

  async function deleteFlow(eventId,dk){
    const ev=state.events.find(e=>e.id===eventId); if(!ev)return;
    const recurring=(ev.recurrence?.type||'none')!=='none'; let scope='all';
    if(recurring) scope=await chooseScope('Hapus jadwal berulang','Hapus kejadian ini saja atau seluruh rangkaian?');
    if(!scope)return;
    const sure=confirm('Hapus jadwal ini? Tindakan ini tidak dapat dibatalkan.'); if(!sure)return;
    if(scope==='one') state.exceptions[occurrenceKey(eventId,dk)]={...(state.exceptions[occurrenceKey(eventId,dk)]||{}),deleted:true};
    else { state.events=state.events.filter(e=>e.id!==eventId); Object.keys(state.exceptions).filter(k=>k.startsWith(eventId+'|')).forEach(k=>delete state.exceptions[k]); }
    saveState();renderAll();toast('Jadwal dihapus');
  }

  function chooseScope(title,text){
    return new Promise(resolve=>{
      scopeResolver=resolve; $('scopeTitle').textContent=title; $('scopeText').textContent=text; $('scopeDialog').showModal();
    });
  }

  function recurrenceChanged(){ updateRecurrenceFields(); }
  function updateRecurrenceFields(){
    const type=$('eventRecurrence').value;
    $('weekdayPicker').classList.toggle('hidden',type!=='custom');
    $('untilField').classList.toggle('hidden',type==='none');
    if(type==='custom' && !$('weekdayPicker').querySelector('.active')){
      const d=$('eventDate').value?parseLocalDate($('eventDate').value).getDay():new Date().getDay();
      const btn=$('weekdayPicker').querySelector(`[data-day="${d}"]`); if(btn)btn.classList.add('active');
    }
  }
  function clearWeekdayPicker(){ $('weekdayPicker').querySelectorAll('button').forEach(b=>b.classList.remove('active')); }
  function setWeekdayPicker(days){ clearWeekdayPicker(); days.forEach(d=>$('weekdayPicker').querySelector(`[data-day="${d}"]`)?.classList.add('active')); }

  function renderFilterOptions(){
    $('filterOptions').innerHTML=state.categories.map(c=>`<label class="filter-option"><span class="filter-left"><span class="category-swatch" style="background:${c.color}"></span>${escapeHtml(c.name)}</span><input type="checkbox" value="${c.id}" ${state.filters.includes(c.id)?'checked':''}></label>`).join('');
    $('filterOptions').querySelectorAll('input').forEach(i=>i.onchange=()=>{if(i.checked&&!state.filters.includes(i.value))state.filters.push(i.value);else if(!i.checked)state.filters=state.filters.filter(x=>x!==i.value);saveState();renderCalendar();});
  }

  function deleteCategory(id){
    if(state.events.some(e=>e.categoryId===id) || Object.values(state.exceptions).some(ex=>ex.overrides?.categoryId===id)) return alert('Kategori masih digunakan oleh jadwal. Ubah kategori jadwal terlebih dahulu.');
    if(!confirm('Hapus kategori ini?')) return;
    state.categories=state.categories.filter(c=>c.id!==id); state.filters=state.filters.filter(x=>x!==id); saveState(); renderAll();
  }

  async function requestNotifications(){
    if(isIOS() && !isStandalone()){toast('Pasang ke Home Screen terlebih dahulu. Gunakan Kalender untuk reminder penting.');return;}
    if(!('Notification' in window)){toast('Browser ini tidak mendukung notifikasi web.');return;}
    try { const p=await Notification.requestPermission(); updateNotificationUI(); if(p==='granted'){toast('Notifikasi diaktifkan');checkReminders();} }
    catch { toast('Izin notifikasi tidak dapat diminta.'); }
  }
  function updateNotificationUI(){
    if(!$('notificationStatus'))return;
    if(!('Notification' in window)){ $('notificationStatus').textContent='Notifikasi web tidak didukung oleh browser ini.'; $('notificationBtn').disabled=true; return; }
    const p=Notification.permission;
    $('notificationStatus').textContent=p==='granted'?'Izin notifikasi aktif.':p==='denied'?'Izin notifikasi ditolak. Ubah dari Pengaturan Safari/iPhone bila ingin mengaktifkannya.':'Izin notifikasi belum diberikan.';
    $('notificationBtn').textContent=p==='granted'?'Aktif':'Aktifkan'; $('notificationBtn').disabled=p==='granted';
  }

  async function notifyOccurrence(o){
    if(!('Notification' in window) || Notification.permission!=='granted')return false;
    const body=`${timeRange(o)}${o.location?' • '+o.location:''}`;
    try {
      const reg=await navigator.serviceWorker?.getRegistration('./');
      if(reg) await reg.showNotification(o.title,{body,icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:`${o.eventId}-${o.date}-${o.startTime}`});
      else new Notification(o.title,{body});
      return true;
    } catch { return false; }
  }

  let checkingReminders=false;
  async function checkReminders(){
    if(checkingReminders || storageBlocked || document.hidden)return;
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    checkingReminders=true;
    try {
    const now=new Date(); const start=addDays(now,-1), end=addDays(now,2);
    const list=occurrencesBetween(start,end,{filters:[]}).filter(o=>o.status==='scheduled' && o.reminderMinutes>=0);
    let dirty=false;
    for(const o of list){
      const remindAt=new Date(o.startDateTime.getTime()-o.reminderMinutes*60000);
      const key=`${o.eventId}|${o.date}|${o.startTime}|${o.reminderMinutes}`;
      if(now>=remindAt && now<o.startDateTime && !state.notified[key]){ if(await notifyOccurrence(o)){state.notified[key]=Date.now(); dirty=true;} }
    }
    const cutoff=Date.now()-14*86400000;
    for(const [k,v] of Object.entries(state.notified)) if(v<cutoff){delete state.notified[k];dirty=true;}
    if(dirty)saveState();
    } finally {checkingReminders=false;}
  }

  function downloadFile(file){
    const url=URL.createObjectURL(file), a=document.createElement('a');
    a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function shareOrDownload(file){
    if(navigator.canShare?.({files:[file]}) && navigator.share){
      try {await navigator.share({files:[file],title:file.name});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    downloadFile(file);
  }
  async function exportBackup(){
    if(storageBlocked && rawRecovery === null){alert('Penyimpanan browser tidak dapat diakses; belum ada data yang bisa diekspor. Buka kembali pada browser/profil yang menyimpan jadwal Anda.');return;}
    const raw=storageBlocked && rawRecovery !== null ? rawRecovery : JSON.stringify(state,null,2);
    await shareOrDownload(new File([raw],`fahmi-daily-${storageBlocked?'recovery':'backup'}-${dateKey(new Date())}.json`,{type:'application/json'}));
  }
  async function importBackup(file){
    let next;
    try {
      if(file.size > 10*1024*1024) throw new Error('Backup terlalu besar (maksimum 10 MB).');
      next=normalizeState(JSON.parse(await file.text()));
    } catch(error){alert('File backup tidak valid. '+error.message);return;}
    if(!confirm('Pulihkan backup akan mengganti data saat ini. Buat Backup Data lebih dahulu. Lanjutkan?'))return;
    try {
      const old=localStorage.getItem(STORAGE_KEY);
      // Extra local recovery copy before any destructive replacement.
      if(old !== null) localStorage.setItem(STORAGE_KEY+'.beforeRestore',old);
      const serialized=JSON.stringify(next);
      localStorage.setItem(STORAGE_KEY,serialized);
      state=next; committedState=serialized; rawRecovery=serialized; observedRaw=serialized; storageBlocked=false;
      calendarMode=state.settings.calendarMode;
      $('storageWarning').classList.add('hidden');
      renderAll();
      lastScheduleSignature=scheduleSignature();
      googleSync?.pauseAfterRestore();
      toast('Backup berhasil dipulihkan');
    } catch {storageFailure('Pemulihan gagal disimpan. Data sebelumnya tetap dipertahankan. Periksa ruang penyimpanan browser.');}
  }
  const icsText = value => String(value || '').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const utcStamp = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  function foldICS(line){
    const encoder=new TextEncoder(); let result='', part='', size=0;
    for(const char of line){
      const bytes=encoder.encode(char).length;
      if(size+bytes>75){result+=part+'\r\n';part=' ';size=1;}
      part+=char;size+=bytes;
    }
    return result+part;
  }
  function calendarICS(o){
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Fahmi Daily//ID','CALSCALE:GREGORIAN','BEGIN:VEVENT',
      `UID:${o.eventId}-${o.date}@fahmi-daily.local`,`DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART:${utcStamp(o.startDateTime)}`,`DTEND:${utcStamp(o.endDateTime)}`,
      `SUMMARY:${icsText(o.title)}`,`LOCATION:${icsText(o.location)}`,`DESCRIPTION:${icsText(o.notes)}`,
      `STATUS:${o.status==='cancelled'?'CANCELLED':'CONFIRMED'}`];
    if(o.reminderMinutes>=0)lines.push('BEGIN:VALARM',`TRIGGER:-PT${o.reminderMinutes}M`,'ACTION:DISPLAY',`DESCRIPTION:${icsText(o.title)}`,'END:VALARM');
    lines.push('END:VEVENT','END:VCALENDAR');
    return lines.map(foldICS).join('\r\n')+'\r\n';
  }
  async function exportCalendar(o){
    await shareOrDownload(new File([calendarICS(o)],`fahmi-daily-${o.date}.ics`,{type:'text/calendar'}));
    toast('File .ics diekspor. Cara membuka di Kalender bergantung pada iOS; lihat panduan di Pengaturan.');
  }

  function toast(msg){
    const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),2200);
  }

  function shiftCalendar(dir){
    if(calendarMode==='day') calendarCursor=addDays(calendarCursor,dir);
    else if(calendarMode==='week') calendarCursor=addDays(calendarCursor,7*dir);
    else calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+dir,1,12);
    selectedDate=new Date(calendarCursor); renderCalendar();
  }

  function setupEvents(){
    document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{
      currentPage=b.dataset.page; document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===currentPage)); document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===b)); renderTopbar(); if(currentPage==='calendarPage')renderCalendar(); if(currentPage==='settingsPage')renderSettings(); window.scrollTo({top:0,behavior:'smooth'});
    });
    $('quickAddBtn').onclick=()=>openNewEvent(currentPage==='calendarPage'?dateKey(selectedDate):dateKey(new Date()));
    $('closeEventBtn').onclick=()=>{$('eventDialog').close();editingContext=null;};
    $('eventRecurrence').onchange=recurrenceChanged;
    $('eventDate').onchange=()=>{if($('eventRecurrence').value==='custom')updateRecurrenceFields();};
    $('weekdayPicker').querySelectorAll('button').forEach(b=>b.onclick=()=>b.classList.toggle('active'));
    $('eventForm').addEventListener('submit',e=>{
      e.preventDefault(); const data=gatherForm(); const err=validateForm(data); if(err){toast(err);return;}
      if(data.reminderMinutes>=0 && 'Notification' in window && Notification.permission==='default') requestNotifications();
      const conflicts=candidateConflicts(data,editingContext);
      if(conflicts.length){pendingSave=()=>commitForm(data);$('conflictText').textContent=`Bertabrakan dengan ${conflicts.map(x=>x.title).join(', ')}. Anda tetap dapat menyimpan jadwal.`;$('conflictDialog').showModal();return;}
      commitForm(data);
    });
    $('scopeOneBtn').onclick=()=>{$('scopeDialog').close();scopeResolver?.('one');scopeResolver=null;};
    $('scopeAllBtn').onclick=()=>{$('scopeDialog').close();scopeResolver?.('all');scopeResolver=null;};
    $('scopeCancelBtn').onclick=()=>{$('scopeDialog').close();scopeResolver?.(null);scopeResolver=null;};
    $('conflictBackBtn').onclick=()=>{$('conflictDialog').close();pendingSave=null;};
    $('conflictSaveBtn').onclick=()=>{$('conflictDialog').close();const fn=pendingSave;pendingSave=null;fn?.();};
    $('calendarMode').querySelectorAll('button').forEach(b=>b.onclick=()=>{calendarMode=b.dataset.mode;state.settings.calendarMode=calendarMode;saveState();renderCalendar();});
    $('prevPeriodBtn').onclick=()=>shiftCalendar(-1); $('nextPeriodBtn').onclick=()=>shiftCalendar(1);
    $('todayNavBtn').onclick=()=>{calendarCursor=new Date();calendarCursor.setHours(12,0,0,0);selectedDate=new Date(calendarCursor);renderCalendar();};
    $('searchInput').oninput=()=>renderCalendar();
    $('filterBtn').onclick=()=>{renderFilterOptions();$('filterDialog').showModal();};
    $('filterCloseBtn').onclick=()=>$('filterDialog').close();
    $('filterResetBtn').onclick=()=>{state.filters=[];saveState();renderFilterOptions();renderCalendar();};
    $('notificationBtn').onclick=requestNotifications;
    $('addCategoryBtn').onclick=()=>{$('categoryForm').reset();$('categoryColor').value='#5B7CFA';$('categoryDialog').showModal();};
    $('categoryCancelBtn').onclick=()=>$('categoryDialog').close();
    $('categoryForm').addEventListener('submit',e=>{e.preventDefault();const name=$('categoryName').value.trim();if(!name)return;if(state.categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){toast('Nama kategori sudah ada');return;}state.categories.push({id:uid(),name,color:$('categoryColor').value,builtin:false});saveState();$('categoryDialog').close();renderAll();toast('Kategori dibuat');});
    $('scopeDialog').addEventListener('cancel',()=>{scopeResolver?.(null);scopeResolver=null;});
    document.querySelector('.file-label').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('importInput').click();}});
    $('exportBtn').onclick=exportBackup; $('importInput').onchange=e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.target.value='';};
  }

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let swRegistration=null;
  let applyUpdate=false;
  let offlineReady=false;
  function updateAppStatus(){
    document.documentElement.classList.toggle('standalone',isStandalone());
    $('installHint').classList.toggle('hidden',!isIOS() || isStandalone());
    $('appStatus').textContent=`v1.3.0 • ${isStandalone()?'Home Screen / standalone':'Browser'} • ${navigator.onLine?'Online':'Offline'} • ${offlineReady?'Cache offline siap':'Cache offline belum terkonfirmasi'}`;
  }
  async function registerSW(){
    if(!('serviceWorker' in navigator) || !window.isSecureContext){updateAppStatus();return;}
    try {
      swRegistration=await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});
      const waiting=()=>{$('updateNotice').classList.toggle('hidden',!swRegistration.waiting);};
      waiting();
      swRegistration.addEventListener('updatefound',()=>{
        const worker=swRegistration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed')waiting();});
      });
      const ready=await navigator.serviceWorker.ready;
      const names=await caches.keys();
      for(const name of names.filter(name=>name.startsWith(`fahmi-daily:${ready.scope}:`))){
        const cache=await caches.open(name);
        const core=['index.html','styles.css','app.js','google-config.js','google-calendar.js','google-server.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
        if((await Promise.all(core.map(path=>cache.match(new URL(path,ready.scope).href)))).every(Boolean)){offlineReady=true;break;}
      }
      updateAppStatus();
    } catch { $('appStatus').textContent='Offline belum siap. Periksa HTTPS/koneksi lalu buka ulang aplikasi.'; }
  }
  function setupPlatform(){
    if(storageMessage){$('storageWarning').textContent=storageMessage;$('storageWarning').classList.remove('hidden');}
    document.querySelectorAll('.install-help').forEach(b=>b.onclick=()=>$('installDialog').showModal());
    $('installCloseBtn').onclick=()=>$('installDialog').close();
    $('updateBtn').onclick=()=>{
      if(document.querySelector('dialog[open]')){toast('Simpan atau tutup form terlebih dahulu.');return;}
      if(confirm('Perbarui aplikasi sekarang? Halaman akan dimuat ulang.')){applyUpdate=true;swRegistration?.waiting?.postMessage({type:'SKIP_WAITING'});}
    };
    let reload=false;
    navigator.serviceWorker?.addEventListener('controllerchange',()=>{
      if(!reload && applyUpdate){reload=true;location.reload();}
    });
    $('checkUpdateBtn').onclick=async()=>{
      try {if(!swRegistration){await registerSW();return;}await swRegistration.update();toast('Pemeriksaan update selesai. Jika tersedia, tombol Perbarui akan muncul.');}
      catch {toast('Update belum dapat diperiksa. Coba saat online.');}
    };
    $('persistBtn').onclick=async()=>{
      try {const granted=await navigator.storage?.persist?.();toast(granted?'Penyimpanan persisten disetujui. Tetap buat backup.':'Browser belum menyetujui penyimpanan persisten. Tetap buat backup berkala.');}
      catch {toast('Gunakan Backup Data untuk cadangan.');}
    };
    ['online','offline','pageshow'].forEach(type=>window.addEventListener(type,updateAppStatus));
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change',updateAppStatus);
    const viewport=window.visualViewport;
    const resize=()=>{
      document.documentElement.style.setProperty('--visual-height',`${viewport?.height || window.innerHeight}px`);
      document.documentElement.style.setProperty('--keyboard-inset',`${Math.max(0,window.innerHeight-(viewport?.height || window.innerHeight)-(viewport?.offsetTop || 0))}px`);
    };
    viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);resize();
    document.addEventListener('focusin',event=>{
      if(event.target.matches('input,textarea,select') && event.target.closest('dialog'))setTimeout(()=>event.target.scrollIntoView({block:'nearest'}),300);
    });
    updateAppStatus();
  }

  function setupGoogleSync(){
    if(!window.FahmiGoogleCalendar || !window.FahmiGoogleServer){$('googleSyncStatus').textContent='Modul Google belum dimuat. Periksa update aplikasi.';return;}
    let loaded=false,busy=false,popup=null,backend;
    const render=status=>{
      $('googleSyncStatus').textContent=status.message;
      $('googleSyncStatus').classList.toggle('sync-error',status.error);
      $('googleSyncBanner').classList.toggle('hidden',!status.enabled);
      $('googleSyncBanner').textContent=status.message;
      $('googleAccount').textContent=status.account?`Akun: ${status.account}`:'Google belum terhubung.';
      $('googleTarget').textContent=status.calendarId?`ID kalender tujuan: ${status.calendarId}`:'';
      $('googleLastSync').textContent=status.lastSync?`Sinkron terakhir: ${status.lastSync}`:'';
      $('googleConnectBtn').disabled=!loaded || !status.enabled || status.running || busy;
      $('googleSyncBtn').disabled=!status.enabled || status.running || busy;
      $('googleDisconnectBtn').disabled=(!status.enabled && !backend?.hasSession) || status.running || busy;
      $('googlePrepareBtn').disabled=status.running || busy;
      $('googleRecoverBtn').disabled=!status.connected || status.running || busy;
      $('googleCompleteBtn').disabled=busy;
    };
    try {backend=window.FahmiGoogleServer.create();}
    catch(error){$('googleSyncStatus').textContent=error.message;return;}
    googleSync=window.FahmiGoogleCalendar.create({getState:()=>state,
      canSync:()=>{try{return !storageBlocked && localStorage.getItem(STORAGE_KEY)===observedRaw;}catch{return false;}},
      onStatus:render,credentialProvider:force=>backend.session(force)});
    $('googleClientId').value=googleSync.clientId || '';
    const showError=error=>{if(!handleStorageError(error))googleSync.fail(error.message);};
    $('googlePrepareBtn').onclick=async()=>{
      busy=true;googleSync.status();
      try{
        const recoveryId=$('googleRecoveryId').value.trim();
        if(recoveryId && !confirm('Gunakan kalender lama ini sebagai tujuan? Pulihkan backup lokal terlebih dahulu agar jadwal yang masih diperlukan tidak dihapus.'))return;
        saveState();
        const server=await backend.prepare();
        googleSync.configure(server.clientId,recoveryId);$('googleClientId').value=server.clientId;loaded=true;
        googleSync.notice('Server siap. Tekan Hubungkan Google untuk memberikan izin koneksi otomatis.');
      }catch(error){showError(error);}finally{busy=false;googleSync.status();}
    };
    $('googleConnectBtn').onclick=async()=>{
      // Open during the gesture, before the network await; manual link is a fallback.
      popup=window.open('about:blank','_blank');busy=true;googleSync.status();
      try{
        saveState();const login=await backend.begin();
        $('googleAuthLink').href=login.url;$('googleAuthLink').classList.remove('hidden');
        if(popup)popup.location.href=login.url;
        googleSync.notice('Selesaikan izin di Google. Jika tidak kembali otomatis, salin kode koneksi dari halaman hasil ke bagian di bawah.');
      }catch(error){popup?.close();showError(error);}finally{busy=false;googleSync.status();}
    };
    const complete=async(state,code)=>{
      if(busy)return;
      busy=true;googleSync.notice('Menyelesaikan koneksi Google…');
      try{
        const credentials=await backend.complete(state,code);
        $('googleConnectionCode').value='';$('googleAuthLink').classList.add('hidden');
        await googleSync.acceptServerSession(credentials);
      }catch(error){showError(error);}finally{busy=false;googleSync.status();}
    };
    window.addEventListener('message',event=>{
      if(event.origin!==backend.origin || !popup || event.source!==popup || event.data?.type!=='fahmi-google-code')return;
      complete(event.data.state,event.data.code);
    });
    $('googleCompleteBtn').onclick=()=>{
      const parts=$('googleConnectionCode').value.trim().split('.');
      if(parts.length!==2){googleSync.fail('Tempel seluruh kode koneksi dari halaman hasil login Google.');return;}
      complete(parts[0],parts[1]);
    };
    $('googleSyncBtn').onclick=()=>{
      if(confirm('Sinkronkan data lokal saat ini ke kalender Fahmi Daily? Jadwal Google milik integrasi yang tidak ada lagi di data lokal akan dihapus.'))googleSync.sync(true);
    };
    $('googleDisconnectBtn').onclick=async()=>{
      busy=true;
      try{
        googleSync.disconnect();loaded=false;await backend.disconnect();
        googleSync.notice('Koneksi perangkat dihentikan dan izin yang tersimpan untuk perangkat ini dihapus dari server. Event kalender tetap ada.');
      }catch(error){googleSync.fail('Sinkron lokal dihentikan. Koneksi server belum dapat dihapus; tekan Hentikan Sinkron lagi saat online. '+error.message);}
      finally{busy=false;googleSync.status();}
    };
    $('googleRecoverBtn').onclick=async()=>{
      const id=$('googleRecoveryId').value.trim();if(!id){toast('Isi ID kalender dari Google Calendar terlebih dahulu.');return;}
      if(!confirm('Gunakan kalender ini sebagai tujuan sinkron data lokal? Pulihkan backup lokal terlebih dahulu agar jadwal yang masih diperlukan tidak dihapus.'))return;
      try{await googleSync.recoverCalendar(id);}catch(error){showError(error);}
    };
    window.addEventListener('online',()=>{if(googleSync.enabled)googleSync.changed();});
    window.addEventListener('offline',()=>googleSync.notice('Offline: jadwal tersimpan lokal. Sinkron dicoba kembali saat aplikasi aktif dan online.'));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && googleSync.enabled)googleSync.changed();});
    // Resume only an explicitly enabled integration with an existing device session.
    try{if(googleSync.enabled && backend.hasSession)googleSync.sync();
      else googleSync.notice('Tekan Siapkan Koneksi Google untuk mengaktifkan perpanjangan akses otomatis.');
    }catch(error){showError(error);}
  }


  setupEvents(); setupPlatform(); setupGoogleSync(); renderAll(); registerSW(); checkReminders(); setInterval(checkReminders,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderToday();checkReminders();}});
})();
