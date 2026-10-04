(() => {
  'use strict';
  const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
  const SCOPES = `openid email ${SCOPE}`;
  const KEY = 'fahmiDailyPWA.googleCalendar.v1';
  const API = 'https://www.googleapis.com/calendar/v3';
  const DAY = ['SU','MO','TU','WE','TH','FR','SA'];
  const pad = n => String(n).padStart(2,'0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const localDate = value => { const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12); };
  const time = (date,value) => {const d=localDate(date);const [h,m]=value.split(':').map(Number);d.setHours(h,m,0,0);return d;};
  const stamp = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const uuid = () => crypto.randomUUID().replace(/-/g,'');
  const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
  function occursOn(event,date){
    if(date<event.date || (event.recurrence?.until && date>event.recurrence.until))return false;
    const type=event.recurrence?.type || 'none',day=localDate(date).getDay();
    return type==='daily' || (type==='weekly' && day===localDate(event.date).getDay()) ||
      (type==='custom' && event.recurrence.weekdays.includes(day)) || (type==='none' && date===event.date);
  }
  function eventBody(event,date,status,categories,zone){
    const category=categories.find(c=>c.id===event.categoryId)?.name || 'Lainnya';
    return {
      summary: `${status==='done'?'✓ ':''}${event.title}`,
      location:event.location || '',
      description:[event.notes || '',`Kategori: ${category}`,'Dikelola oleh Fahmi Daily. Ubah jadwal melalui Fahmi Daily.'].filter(Boolean).join('\n\n'),
      start:{dateTime:time(date,event.startTime).toISOString(),timeZone:zone},
      end:{dateTime:time(date,event.endTime).toISOString(),timeZone:zone},
      reminders:{useDefault:false,overrides:status==='scheduled' && Number(event.reminderMinutes)>=0 ? [{method:'popup',minutes:Number(event.reminderMinutes)}] : []},
      transparency:status==='done'?'transparent':'opaque'
    };
  }
  // RRULE for the base series; EXDATE plus single events preserve local exceptions.
  // No rolling horizon: unbounded local recurring schedules stay unbounded in Google.
  function buildPlan(state,zone=Intl.DateTimeFormat().resolvedOptions().timeZone){
    const plan=[];
    for(const event of state.events){
      const type=event.recurrence?.type || 'none',status=event.seriesStatus || 'scheduled';
      if(type==='none'){
        const ex=state.exceptions[`${event.id}|${event.date}`] || {};
        const effective={...event,...ex.overrides};
        const effectiveStatus=ex.status || status;
        if(!ex.deleted && effectiveStatus!=='cancelled')plan.push({key:event.id,body:eventBody(effective,effective.date,effectiveStatus,state.categories,zone)});
        continue;
      }
      let first=localDate(event.date);
      for(let i=0;i<7 && !occursOn(event,dateKey(first));i++)first.setDate(first.getDate()+1);
      if(!occursOn(event,dateKey(first)))continue;
      const body=eventBody(event,dateKey(first),status,state.categories,zone);
      let rule=type==='daily'?'RRULE:FREQ=DAILY':'RRULE:FREQ=WEEKLY;BYDAY='+
        (type==='weekly'?[DAY[localDate(event.date).getDay()]]:event.recurrence.weekdays.map(d=>DAY[d])).join(',');
      if(event.recurrence.until){const end=localDate(event.recurrence.until);end.setHours(23,59,59,0);rule+=';UNTIL='+stamp(end);}
      body.recurrence=[rule];
      const excluded=[];
      for(const [key,ex] of Object.entries(state.exceptions)){
        const [id,date]=key.split('|');
        if(id!==event.id || !occursOn(event,date))continue;
        excluded.push(stamp(time(date,event.startTime)));
        const effective={...event,date,...ex.overrides};
        const effectiveStatus=ex.status || status;
        if(!ex.deleted && effectiveStatus!=='cancelled')plan.push({key:`${event.id}|${date}`,body:eventBody(effective,effective.date,effectiveStatus,state.categories,zone)});
      }
      if(excluded.length)body.recurrence.push('EXDATE:'+excluded.sort().join(','));
      if(status!=='cancelled')plan.push({key:event.id,body});
    }
    return plan;
  }

  function create({getState,canSync,onStatus,storage=localStorage,request=fetch,clock=()=>Date.now(),credentialProvider=null}){
    let config={version:1,enabled:false,clientId:'',accounts:{}},configRaw=null,storageError=false;
    try {
      configRaw=storage.getItem(KEY);
      if(configRaw!==null){
        const parsed=JSON.parse(configRaw);
        if(parsed.version!==1 || typeof parsed.enabled!=='boolean' || typeof parsed.clientId!=='string' || !parsed.accounts || typeof parsed.accounts!=='object' || Array.isArray(parsed.accounts))throw new Error();
        for(const target of Object.values(parsed.accounts)){
          if(!target || typeof target.calendarId!=='string' || !/^[a-f0-9]{32}$/.test(target.owner) || !target.records || typeof target.records!=='object' || Array.isArray(target.records))throw new Error();
          for(const record of Object.values(target.records))if(!record || !/^[a-f0-9]{32}$/.test(record.id) || !/^[a-f0-9]{64}$/.test(record.hash))throw new Error();
        }
        config=parsed;
      }
    } catch {storageError=true;}
    let accessToken='',expiresAt=0,account=null,epoch=0,running=false,again=false,pending=true,lastSync='',timer;
    const emit = (message,error=false) => onStatus({message,error,enabled:config.enabled,connected:!!account && !!accessToken && clock()<expiresAt,account:account?.email || '',calendarId:account?config.accounts[account.sub]?.calendarId || '':'',running,pending,lastSync,clientId:config.clientId});
    function persist(){
      if(storageError)throw new Error('Konfigurasi sinkron tidak dapat dibaca. Jadwal lokal aman; hubungi bantuan sebelum mengganti konfigurasi.');
      const current=storage.getItem(KEY);
      if(current!==configRaw)throw new Error('Konfigurasi Google berubah di tab lain. Buka ulang aplikasi sebelum menyinkronkan.');
      const next=JSON.stringify(config);
      storage.setItem(KEY,next);configRaw=next;
    }
    const authorized = () => config.enabled && canSync() && !!account && !!accessToken && clock()<expiresAt;
    function check(context){
      if(!authorized())throw new Error('Hubungkan Google kembali untuk melanjutkan sinkronisasi. Data tetap tersimpan lokal.');
      if(context && context.epoch!==epoch)throw new Error('Sinkronisasi dihentikan karena koneksi berubah.');
      if(storage.getItem(KEY)!==configRaw)throw new Error('Konfigurasi Google berubah di tab lain. Buka ulang aplikasi sebelum menyinkronkan.');
    }
    function assignServerCredentials(value){
      if(!value?.profile?.sub || !value.profile.email || !value.access_token || !Number.isFinite(Number(value.expires_in)) || Number(value.expires_in)<=60 || value.clientId!==config.clientId)throw new Error('Identitas atau konfigurasi server tidak sesuai. Siapkan koneksi kembali.');
      if(account && account.sub!==value.profile.sub)throw new Error('Akun server berubah. Hentikan sinkron lalu hubungkan akun yang benar.');
      account=value.profile;accessToken=value.access_token;expiresAt=clock()+(Number(value.expires_in)-60)*1000;
    }
    async function ensureCredentials(context,force=false){
      if(!credentialProvider || (!force && accessToken && clock()<expiresAt))return;
      if(!config.enabled || !canSync())throw new Error('Sinkron tidak aktif atau data lokal belum aman.');
      const started=epoch,value=await credentialProvider(force);
      if(epoch!==started || (context && context.epoch!==epoch))throw new Error('Koneksi berubah; sinkron dihentikan.');
      assignServerCredentials(value);
    }
    async function acceptServerSession(value){
      if(!credentialProvider || !config.enabled)throw new Error('Siapkan koneksi server terlebih dahulu.');
      assignServerCredentials(value);epoch++;
      if(config.recoveryId){await recoverCalendar(config.recoveryId);delete config.recoveryId;persist();}
      else await performSync();
    }
    async function api(path,{method='GET',body,context}={}){
      await ensureCredentials(context);

      check(context);
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
      let response;
      try {response=await request(API+path,{method,headers:{Authorization:`Bearer ${accessToken}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'omit'});}
      catch {throw new Error('Koneksi Google gagal. Jadwal tetap lokal; coba Sinkron Sekarang saat online.');}
      finally {clearTimeout(timeout);}
      check(context);
      if(response.status===401 && credentialProvider && !context?.retried){
        accessToken='';expiresAt=0;await ensureCredentials(context,true);
        return api(path,{method,body,context:{...(context||{epoch}),retried:true}});
      }
      if(response.status===401){accessToken='';expiresAt=0;const error=new Error('Izin sesi Google kedaluwarsa. Tekan Hubungkan Google lagi.');error.status=401;throw error;}
      if(!response.ok){const error=new Error(response.status===403?'Google menolak akses. Periksa API, scope, kuota, akun dan konfigurasi OAuth.':`Google Calendar belum dapat disinkronkan (HTTP ${response.status}). Coba lagi; jadwal lokal tetap aman.`);error.status=response.status;throw error;}
      return response.status===204?null:response.json();
    }
    async function ensureCalendar(context){
      const saved=config.accounts[account.sub];
      if(saved?.calendarId){
        try {await api(`/calendars/${encodeURIComponent(saved.calendarId)}`,{context});return saved;}
        catch(error){if(error.status===404 || error.status===410)throw new Error('Kalender tujuan dihapus/tidak tersedia. Jangan membuat kalender pengganti tanpa memeriksa akun. Lihat panduan pemulihan.');throw error;}
      }
      // Persist intent before creating the calendar. If response/storage is lost,
      // stop rather than silently creating duplicate calendars on every retry.
      if(saved?.creationPending)throw new Error('Pembuatan kalender sebelumnya belum terkonfirmasi. Periksa Google Calendar lalu gunakan Pulihkan Tautan Kalender.');
      const target={calendarId:'',owner:uuid(),records:{},creationPending:true};
      config.accounts[account.sub]=target;persist();
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
      let created;
      try {created=await api('/calendars',{method:'POST',context,body:{summary:'Fahmi Daily',description:`Fahmi Daily sync owner=${target.owner}. Sinkron satu arah dari aplikasi.`,timeZone:zone}});}
      catch(error){
        // A definitive 4xx response did not create a calendar. Unknown network
        // outcomes retain creationPending so retry cannot create duplicates.
        if(error.status>=400 && error.status<500){delete config.accounts[account.sub];persist();}
        throw error;
      }
      target.calendarId=created.id;target.creationPending=false;persist();return target;
    }
    async function listEvents(target,context){
      const events=[];let page='';
      do {
        const params=new URLSearchParams({maxResults:'2500',singleEvents:'false',showDeleted:'false',privateExtendedProperty:`fahmiOwner=${target.owner}`});
        if(page)params.set('pageToken',page);
        const data=await api(`/calendars/${encodeURIComponent(target.calendarId)}/events?${params}`,{context});
        events.push(...(data.items || []));page=data.nextPageToken || '';
      } while(page);
      return events.filter(event=>event.extendedProperties?.private?.fahmiOwner===target.owner && !event.recurringEventId && event.status!=='cancelled');
    }
    async function performSync(force=false){
      pending=true;
      if(running){again=true;return;}
      if(!config.enabled){emit('Google Calendar belum diaktifkan.');return;}
      if(!canSync()){emit('Data lokal perlu dipulihkan sebelum sinkronisasi.',true);return;}
      if(!navigator.onLine){emit('Offline: perubahan tersimpan lokal. Sinkron akan dicoba saat online dan sesi Google masih aktif.');return;}
      try {await ensureCredentials({epoch});}catch(error){emit(error.message,true);return;}
      if(!authorized()){emit('Perubahan tersimpan lokal. Hubungkan Google untuk menyinkronkan.');return;}
      if(config.restorePaused && !force){emit('Backup dipulihkan. Periksa jadwal lalu tekan Sinkron Sekarang sebelum perubahan dikirim ke Google.');return;}
      if(running){again=true;return;}
      running=true;again=false;emit('Menyinkronkan ke Google Calendar…');
      const context={epoch};
      try {
        persist();
        if(config.restorePaused && force){config.restorePaused=false;persist();}
        const snapshot=JSON.parse(JSON.stringify(getState()));
        const snapshotKey=JSON.stringify({events:snapshot.events,exceptions:snapshot.exceptions,categories:snapshot.categories});
        const target=await ensureCalendar(context),remote=await listEvents(target,context),keep=new Set();
        const plan=buildPlan(snapshot);
        for(const item of plan){
          check(context);
          const keyHash=await hash(item.key),contentHash=await hash(JSON.stringify(item.body));
          const existing=remote.find(e=>e.extendedProperties?.private?.fahmiKey===keyHash && e.extendedProperties.private.fahmiContent===contentHash);
          if(existing){
            keep.add(existing.id);
            if(force)await api(`/calendars/${encodeURIComponent(target.calendarId)}/events/${existing.id}?sendUpdates=none`,{method:'PUT',context,body:{...item.body,extendedProperties:{private:{fahmiOwner:target.owner,fahmiKey:keyHash,fahmiContent:contentHash}}}});
            continue;
          }
          // Persist the id before POST so a timeout can be retried idempotently.
          let record=target.records[keyHash];
          if(!record || record.hash!==contentHash){record={id:uuid(),hash:contentHash};target.records[keyHash]=record;}
          persist();
          const body={...item.body,id:record.id,extendedProperties:{private:{fahmiOwner:target.owner,fahmiKey:keyHash,fahmiContent:contentHash}}};
          const path=`/calendars/${encodeURIComponent(target.calendarId)}/events`;
          try {await api(path+'?sendUpdates=none',{method:'POST',body,context});}
          catch(error){
            if(error.status!==409)throw error;
            const duplicate=await api(path+'/'+record.id,{context});
            if(duplicate.status==='cancelled'){
              record.id=uuid();persist();body.id=record.id;
              await api(path+'?sendUpdates=none',{method:'POST',body,context});
            } else if(duplicate.extendedProperties?.private?.fahmiOwner!==target.owner || duplicate.extendedProperties.private.fahmiKey!==keyHash || duplicate.extendedProperties.private.fahmiContent!==contentHash){
              throw new Error('ID event bertabrakan. Sinkron dihentikan agar event lain tidak ditimpa.');
            }
          }
          keep.add(record.id);
        }
        // Finish all upserts before deleting obsolete events owned by this app.
        // If local data changed mid-flight, skip cleanup and use the newest snapshot.
        const current=getState();
        if(snapshotKey!==JSON.stringify({events:current.events,exceptions:current.exceptions,categories:current.categories})){again=true;return;}
        for(const event of remote){
          const latest=getState();
          if(snapshotKey!==JSON.stringify({events:latest.events,exceptions:latest.exceptions,categories:latest.categories})){again=true;return;}
          check(context);
          if(!keep.has(event.id)){
            try {await api(`/calendars/${encodeURIComponent(target.calendarId)}/events/${encodeURIComponent(event.id)}?sendUpdates=none`,{method:'DELETE',context});}
            catch(error){if(error.status!==404 && error.status!==410)throw error;}
          }
        }
        pending=false;lastSync=new Date(clock()).toLocaleString('id-ID');emit(`Sinkron selesai: ${plan.length} event/rangkaian. Kalender iPhone akan mengikuti pembaruan akun Google.`);
      } catch(error){emit(error.message,true);}
      finally {running=false;emitStatus();if(again && authorized())queue();}
    }
    let lastMessage='Google Calendar belum diaktifkan.',lastError=false;
    const report=emit;
    // Retain status text while buttons are refreshed after asynchronous work.
    onStatus=((callback)=>status=>{lastMessage=status.message;lastError=status.error;callback(status);})(onStatus);
    function emitStatus(){report(lastMessage,lastError);}
    function queue(){pending=true;clearTimeout(timer);timer=setTimeout(()=>performSync(),600);emitStatus();}
    function configure(clientId,recoveryId=''){
      if(!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId))throw new Error('Masukkan OAuth Client ID aplikasi Web yang berakhiran .apps.googleusercontent.com; bukan Client Secret.');
      if(config.clientId && config.clientId!==clientId && Object.keys(config.accounts).length)throw new Error('Client ID sudah terhubung ke kalender. Gunakan Client ID yang sama atau lihat panduan pemulihan.');
      const previous={...config};config={...config,clientId,enabled:true,recoveryId};
      try {persist();}catch(error){config=previous;throw error;}
      emit('Konfigurasi disimpan. Siapkan lalu hubungkan Google.');
    }
    async function acceptToken(response){
      if(response.error || !response.access_token)throw new Error('Izin Google tidak diberikan. Jadwal tetap lokal.');
      if(!window.google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE))throw new Error('Izin kalender diperlukan. Hubungkan ulang dan setujui izin tersebut.');
      const started=epoch;
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
      let profile;
      try {
        const result=await request('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${response.access_token}`},signal:controller.signal,cache:'no-store',credentials:'omit'});
        if(!result.ok)throw new Error();profile=await result.json();
      } catch {throw new Error('Akun Google belum dapat diverifikasi. Coba hubungkan lagi.');}
      finally {clearTimeout(timeout);}
      if(epoch!==started || !config.enabled)return;
      if(!profile.sub || !profile.email)throw new Error('Identitas akun Google tidak lengkap.');
      const previous=account?.sub;
      account={sub:profile.sub,email:profile.email};
      if(!Number.isFinite(Number(response.expires_in)) || Number(response.expires_in)<=60)throw new Error('Masa berlaku sesi Google tidak valid. Hubungkan kembali.');
      accessToken=response.access_token;expiresAt=clock()+Math.max(0,Number(response.expires_in)-60)*1000;epoch++;
      if(previous && previous!==account.sub)emit('Akun berubah. Sinkron memakai kalender terpisah milik akun ini.');
      if(config.recoveryId){
        await recoverCalendar(config.recoveryId);
        delete config.recoveryId;persist();
      } else await performSync();
    }
    function disconnect(){
      config.enabled=false;
      try {persist();}catch(error){config.enabled=true;throw error;}
      epoch++;accessToken='';expiresAt=0;account=null;clearTimeout(timer);
      emit('Sinkron dihentikan. Event Google yang sudah dibuat tetap ada; jadwal lokal tetap aman.');
    }
    function pauseAfterRestore(){
      clearTimeout(timer);epoch++;config.restorePaused=true;pending=true;
      try {persist();}
      catch {emit('Backup lokal dipulihkan; sinkron dijeda. Konfigurasi jeda belum dapat disimpan. Tetap periksa data sebelum menghubungkan ulang.',true);return;}
      emit('Backup dipulihkan. Periksa jadwal lalu tekan Sinkron Sekarang; sinkron otomatis dijeda.');
    }
    async function recoverCalendar(calendarId){
      check();if(running)throw new Error('Tunggu sinkron selesai.');
      const calendar=await api('/calendars/'+encodeURIComponent(calendarId));
      const owner=/Fahmi Daily sync owner=([a-f0-9]{32})\./.exec(calendar.description || '')?.[1];
      if(!owner)throw new Error('Kalender ini bukan kalender yang dibuat integrasi Fahmi Daily.');
      config.accounts[account.sub]={calendarId,owner,records:{},creationPending:false};persist();
      await performSync();
    }
    function fail(message){emit(message,true);}
    function notice(message){emit(message);}
    emit(storageError?'Konfigurasi Google rusak/tidak tersedia. Sinkron diblokir; jadwal lokal tidak diubah.':'Google belum terhubung pada sesi ini.',storageError);
    return {configure,acceptToken,acceptServerSession,disconnect,recoverCalendar,pauseAfterRestore,sync:performSync,changed:queue,status:emitStatus,fail,
      notice,get clientId(){return config.clientId;},get enabled(){return config.enabled;}};
  }

  let sdkPromise;
  function loadGoogle(){
    if(window.google?.accounts?.oauth2)return Promise.resolve();
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.referrerPolicy='no-referrer';
      const timer=setTimeout(()=>{script.remove();sdkPromise=null;reject(new Error('Google belum dapat dimuat. Periksa internet lalu tekan Siapkan Koneksi Google lagi.'));},15000);
      script.onload=()=>{clearTimeout(timer);resolve();};
      script.onerror=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(new Error('Google belum dapat dimuat. Jadwal tetap bisa digunakan offline.'));};
      document.head.appendChild(script);
    });
    return sdkPromise;
  }
  window.FahmiGoogleCalendar={create,buildPlan,loadGoogle,SCOPES};
})();
