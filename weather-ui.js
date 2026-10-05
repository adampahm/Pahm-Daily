(() => {
  'use strict';
  function create({getState,getForm,getOccurrences,getConflicts,onEdit,onRefresh,escapeHtml,toast}){
    const $=id=>document.getElementById(id),api=window.FahmiWeather.create(),results=new Map();
    let selected=null,token=0,searchToken=0,timer,formStatus='scheduled',review=null,batchRunning=false,batchAgain=false,lastBatch=0;
    let locationMode='my',locationRevision=0,geoBusy=false,autoAttempted=false,editingLocation=true,privacySeen=false,privacyVisible=false;
    try{privacySeen=localStorage.getItem('fahmiDailyPWA.weatherLocationPrivacy.v1')==='seen';}catch{}
    const threshold=()=>getState().settings.weatherThreshold ?? 60;
    const labels={loading:'Memeriksa cuaca…',rain:'☂ Risiko hujan',low:'☀ Risiko hujan rendah',unavailable:'○ Prakiraan belum tersedia',indoor:'Indoor'};
    const safe=escapeHtml;
    const key=o=>o.eventId+'|'+o.date;
    function details(r,e){
      const data=r.probability===null || r.probability===undefined?'Kemungkinan hujan belum tersedia':`Kemungkinan hujan tertinggi: ${r.probability}%`;
      return `<strong>${safe(labels[r.state]||labels.unavailable)}</strong><p>${safe(e.weatherLocation?.name || 'Pilih lokasi kegiatan')} · ${safe(e.date)} · ${safe(e.startTime)}–${safe(e.endTime)}</p><p>${safe(r.reason || '')}</p>${r.state==='rain' || r.state==='low'?`<p>${safe(r.condition)} · ${safe(data)}${r.amount!==null?` · Curah hujan pada jam prakiraan yang tercakup: ${r.amount.toFixed(1)} mm`:''}</p><p class="muted small">Waktu lokasi: ${safe(r.localTime)} (${safe(r.zone)}). Jam jadwal mengikuti perangkat.</p>`:''}${r.at?`<p class="muted small">Diperiksa ${safe(new Date(r.at).toLocaleString('id-ID'))}${r.stale?' · Hasil lama; perlu diperbarui':''}</p>`:''}${r.error?`<p>${safe(r.error)}</p>`:''}<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Sumber: Open-Meteo · data CC BY 4.0</a>`;
    }
    function fields(){return {activityType:$('eventActivityType').value,weatherLocation:$('eventActivityType').value==='outdoor'?selected:null};}
    function renderLocation(message=''){
      const picked=!!selected && !editingLocation;
      $('weatherLocationChoice').classList.toggle('hidden',picked);
      $('weatherManualFields').classList.toggle('hidden',picked || locationMode!=='manual');
      $('weatherMyLocationFields').classList.toggle('hidden',picked || locationMode!=='my');
      $('weatherChangeLocationBtn').classList.toggle('hidden',!picked);
      $('weatherMyLocationBtn').setAttribute('aria-pressed',String(locationMode==='my'));
      $('weatherOtherLocationBtn').setAttribute('aria-pressed',String(locationMode==='manual'));
      $('weatherLocateBtn').disabled=geoBusy;
      $('weatherSelectedLocation').textContent=message || selected?.name || (geoBusy?'Mendeteksi lokasi…':'');
      $('weatherLocationPrivacy').classList.toggle('hidden',!privacyVisible);
      $('weatherLocationHint').classList.toggle('hidden',privacyVisible || picked || geoBusy);
    }
    function enterOutdoor(){
      if($('eventActivityType').value!=='outdoor')return;
      if(!privacySeen){privacySeen=true;privacyVisible=true;try{localStorage.setItem('fahmiDailyPWA.weatherLocationPrivacy.v1','seen');}catch{}}
      renderLocation();
      if(!selected && locationMode==='my' && !autoAttempted){autoAttempted=true;locate(false);}
    }
    function chooseLocationMode(mode){
      locationRevision++;searchToken++;geoBusy=false;selected=null;locationMode=mode;editingLocation=true;
      $('weatherSearchResults').innerHTML='';renderLocation();changed();
      if(mode==='my'){autoAttempted=true;locate(false);}
    }
    async function locate(explicit=false){
      if(geoBusy || locationMode!=='my' || $('eventActivityType').value!=='outdoor' || !$('eventDialog').open)return;
      const mine=++locationRevision;geoBusy=true;renderLocation();
      const current=()=>mine===locationRevision && locationMode==='my' && $('eventActivityType').value==='outdoor' && $('eventDialog').open;
      const failed=()=>{if(!current())return;geoBusy=false;selected=null;locationMode='manual';editingLocation=true;renderLocation('Lokasi tidak tersedia. Pilih lokasi lain.');changed();};
      if(!navigator.geolocation){failed();return;}
      let permission='unknown';
      try{if(navigator.permissions?.query)permission=(await navigator.permissions.query({name:'geolocation'})).state;}catch{}
      if(!current())return;
      if(permission==='denied'){failed();return;}
      if(!explicit && permission!=='granted'){geoBusy=false;renderLocation();return;}
      try{navigator.geolocation.getCurrentPosition(position=>{
        if(!current())return;
        const location={name:'Lokasi Saya',latitude:Number(position.coords.latitude.toFixed(4)),longitude:Number(position.coords.longitude.toFixed(4))};
        if(!window.FahmiWeather.validLocation(location)){failed();return;}
        geoBusy=false;selected=location;editingLocation=false;renderLocation();changed();
      },failed,{enableHighAccuracy:false,timeout:10000,maximumAge:300000});}catch{failed();}
    }
    function open(event={}){
      token++;searchToken++;locationRevision++;clearTimeout(timer);geoBusy=false;autoAttempted=false;privacyVisible=false;
      selected=event.weatherLocation || null;editingLocation=!selected;
      locationMode=selected && !['Lokasi Saya','Lokasi perangkat'].includes(selected.name)?'manual':'my';
      formStatus=event.status || event.seriesStatus || 'scheduled';
      $('eventActivityType').value=event.activityType || 'indoor';$('weatherCitySearch').value='';$('weatherSearchResults').innerHTML='';
      renderLocation();changed();enterOutdoor();
    }
    function shortStatus(r){
      if(r.stale)return 'Hasil lama — perbarui prakiraan';
      if(r.state==='unavailable' && /offline/i.test(r.reason || ''))return 'Offline — coba lagi saat terhubung';
      return r.state==='rain'?'Kemungkinan hujan':r.state==='low'?'Risiko hujan rendah':'Prakiraan belum tersedia';
    }
    function compactCard(r,e){
      return `<strong>${safe(shortStatus(r))}</strong>${r.state==='rain'?'<p>Pertimbangkan mengganti waktu kegiatan.</p>':''}<details><summary>Lihat Detail</summary>${details(r,e)}</details><a class="weather-source" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo · CC BY 4.0</a>`;
    }
    function changed(){
      const mine=++token;clearTimeout(timer);
      const outdoor=$('eventActivityType').value==='outdoor';$('weatherOutdoorFields').classList.toggle('hidden',!outdoor);
      $('weatherFormCard').classList.toggle('hidden',!outdoor);
      if(!outdoor){locationRevision++;geoBusy=false;return;}
      $('weatherFormCard').innerHTML='<strong>Memeriksa cuaca…</strong>';
      timer=setTimeout(()=>checkForm(mine),650);
    }
    async function checkForm(mine=++token,force=false){
      const e=getForm(),id=window.FahmiWeather.identity(e),limit=threshold();
      if(formStatus!=='scheduled'){if(mine===token)$('weatherFormCard').innerHTML='<strong>Pemeriksaan cuaca nonaktif</strong>';return {state:'indoor'};}
      const r=await api.check(e,limit,force);
      if(mine!==token || id!==window.FahmiWeather.identity(getForm()) || limit!==threshold())return null;
      $('weatherFormCard').classList.toggle('weather-rain',r.state==='rain');$('weatherFormCard').innerHTML=compactCard(r,e);
      return r;
    }
    async function gate(data,done){
      if(data.activityType!=='outdoor' || formStatus!=='scheduled'){done(data);return;}
      const mine=++token,id=window.FahmiWeather.identity(data);clearTimeout(timer);
      $('weatherFormCard').innerHTML='<strong>Memeriksa cuaca…</strong>';
      const r=await checkForm(mine);
      if(!r || mine!==token || !$('eventDialog').open || window.FahmiWeather.identity(getForm())!==id)return;
      if(r.state!=='rain'){done(data);return;}
      review={data,r,done,id};$('weatherRiskText').innerHTML=`<p class="weather-event-name">${safe(data.title)}</p><p class="muted">${safe(data.date)} · ${safe(data.startTime)}–${safe(data.endTime)}</p><p>Pertimbangkan mengganti waktu kegiatan.</p>`;
      let alternatives=[];
      if(r.data && !r.stale){
        const duration=window.FahmiWeather.bounds(data)[1]-window.FahmiWeather.bounds(data)[0];
        const originalStart=window.FahmiWeather.bounds(data)[0];
        for(const unix of [...r.data.hourly.time].sort((a,b)=>Math.abs(a*1000-originalStart)-Math.abs(b*1000-originalStart))){
          const rounded=Math.ceil(unix*1000/300000)*300000;
          const start=new Date(rounded),end=new Date(rounded+duration),pad=n=>String(n).padStart(2,'0');
          const day=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
          const time=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
          if(start.getTime()<=Date.now() || day(start)!==data.date || day(end)!==data.date || start.getHours()<6 || end.getHours()>21 || (end.getHours()===21 && end.getMinutes()>0))continue;
          const candidate={...data,startTime:time(start),endTime:time(end)};
          const alt=window.FahmiWeather.analyze(r.data,candidate,threshold());
          if(alt.state!=='low' || getConflicts(candidate).length)continue;
          alternatives.push(candidate);if(alternatives.length===2)break;
        }
        $('weatherRiskText').innerHTML+=alternatives.length?'<p class="muted small">Pilihan waktu lain</p>'+alternatives.map((e,i)=>`<button class="soft-btn" data-weather-alternative="${i}">${safe(e.startTime)}–${safe(e.endTime)}</button>`).join(' '):'';

      }
      $('weatherRiskText').innerHTML+=`<details><summary>Lihat Detail</summary>${details(r,data)}</details><a class="weather-source" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo · CC BY 4.0</a>`;
$('weatherRiskText').querySelectorAll('[data-weather-alternative]').forEach(b=>b.onclick=()=>{const e=alternatives[Number(b.dataset.weatherAlternative)];review=null;$('weatherRiskDialog').close();$('eventStartTime').value=e.startTime;$('eventEndTime').value=e.endTime;window.FahmiTimeFields?.assign(e.startTime,e.endTime);changed();});
      $('weatherRiskDialog').showModal();
    }
    function finishReview(cancel){
      if(!review)return;const pending=review;
      if(pending.id!==window.FahmiWeather.identity(getForm())){review=null;$('weatherRiskDialog').close();toast('Waktu/lokasi berubah. Periksa cuaca kembali.');return;}
      if(cancel && !confirm('Batalkan kegiatan ini? Status menjadi Dibatalkan dan perubahan mengikuti sinkron Google.'))return;
      review=null;$('weatherRiskDialog').close();pending.done({...pending.data,weatherAccepted:cancel?'':pending.r.signature},cancel);
    }
    async function notify(o,r){
      if(!('Notification' in window) || Notification.permission!=='granted' || r.stale)return;
      const storageKey='fahmiDailyPWA.weatherAlerts.v1',stamp=key(o)+'|'+r.signature;let seen={};
      try{seen=JSON.parse(localStorage.getItem(storageKey)||'{}');if(seen[stamp])return;}catch{return;}
      try{
        const body=`${o.title}: ${o.date}, ${o.startTime}–${o.endTime}. Pertimbangkan mengganti waktu kegiatan.`;
        const reg=await navigator.serviceWorker?.getRegistration('./');
        if(reg)await reg.showNotification('Kemungkinan hujan',{body,icon:'./icons/icon-192.png',tag:'weather-'+o.eventId+'-'+o.date});
        else new Notification('Kemungkinan hujan',{body});
        seen[stamp]=Date.now();for(const [k,v] of Object.entries(seen))if(v<Date.now()-17*86400000)delete seen[k];
        localStorage.setItem(storageKey,JSON.stringify(seen));
      }catch{}
    }
    async function refresh(force=false){
      if(document.hidden)return;
      if(batchRunning){batchAgain=true;return;}
      if(!force && Date.now()-lastBatch<2*60000)return;
      batchRunning=true;lastBatch=Date.now();
      try{
        const start=new Date(),end=new Date(Date.now()+16*86400000);
        const list=getOccurrences(start,end).filter(o=>o.activityType==='outdoor' && o.status==='scheduled' && o.endDateTime>Date.now()).sort((a,b)=>Number(results.has(key(a)))-Number(results.has(key(b))));
        const valid=new Set(list.map(key));for(const k of results.keys())if(!valid.has(k))results.delete(k);
        let count=0;
        for(const o of list){
          if(document.hidden)break;if(++count>40)break;
          const limit=threshold(),id=window.FahmiWeather.identity(o),r=await api.check(o,limit);
          const latest=getOccurrences(new Date(o.date+'T12:00'),new Date(o.date+'T12:00')).find(x=>key(x)===key(o));
          if(!latest || latest.endDateTime<=Date.now() || latest.status!=='scheduled' || latest.activityType!=='outdoor' || window.FahmiWeather.identity(latest)!==id || threshold()!==limit)continue;
          results.set(key(o),{...r,event:latest,identity:id,threshold:limit});if(r.state==='rain')await notify(latest,r);
        }
      }finally{
        batchRunning=false;
        const risks=[...results.values()].filter(r=>r.state==='rain');
        $('weatherOverviewBanner').classList.toggle('hidden',!risks.length);
        $('weatherOverviewBanner').innerHTML=risks.length?`<strong>☂ ${risks.length} kegiatan Outdoor berisiko hujan</strong>`+risks.slice(0,5).map((r,i)=>`<button class="soft-btn" data-weather-open="${i}">${safe(r.event.title)} · ${safe(r.event.date)} · ${safe(r.event.startTime)}${r.stale?' · Hasil lama':''}</button>`).join(''):'';
        $('weatherOverviewBanner').querySelectorAll('[data-weather-open]').forEach(b=>b.onclick=()=>{const o=risks[Number(b.dataset.weatherOpen)].event;onEdit?.(o.eventId,o.date);});
        onRefresh();if(batchAgain){batchAgain=false;refresh(true);}
      }
    }
    function badge(o){
      if(o.activityType!=='outdoor')return '';
      if(o.status!=='scheduled')return '<p class="event-detail">Outdoor · Pemeriksaan cuaca nonaktif</p>';
      const r=results.get(key(o));const valid=r && r.identity===window.FahmiWeather.identity(o) && r.threshold===threshold();
      const label=valid?labels[r.state]:'○ Prakiraan belum tersedia',stale=valid && (r.stale || (r.at && Date.now()-r.at>=window.FahmiWeather.TTL));
      return `<p class="weather-pill ${valid && r.state==='rain'?'weather-rain':''}">Outdoor · ${safe(label)}${stale?' · Hasil lama':''}</p>`;
    }
    $('eventActivityType').onchange=()=>{changed();enterOutdoor();};
    $('weatherMyLocationBtn').onclick=()=>chooseLocationMode('my');
    $('weatherOtherLocationBtn').onclick=()=>chooseLocationMode('manual');
    $('weatherChangeLocationBtn').onclick=()=>{editingLocation=true;renderLocation();};
    for(const id of ['eventDate','eventStartTime','eventEndTime'])$(id).addEventListener('change',changed);
    $('weatherRetryBtn').onclick=()=>{const mine=++token;checkForm(mine,true);};
    $('weatherSearchBtn').onclick=async()=>{
      const query=$('weatherCitySearch').value.trim(),mine=++searchToken;
      $('weatherSearchResults').textContent='Mencari lokasi…';
      try{const found=await api.search(query);if(mine!==searchToken || query!==$('weatherCitySearch').value.trim())return;
        $('weatherSearchResults').innerHTML=found.length?found.map((l,i)=>`<button type="button" class="list-action" data-weather-place="${i}">${safe(l.name)}</button>`).join(''):'Lokasi tidak ditemukan. Coba nama kota lain.';
        $('weatherSearchResults').querySelectorAll('[data-weather-place]').forEach(b=>b.onclick=()=>{searchToken++;locationRevision++;geoBusy=false;selected=found[Number(b.dataset.weatherPlace)];locationMode='manual';editingLocation=false;renderLocation();$('weatherSearchResults').innerHTML='';changed();});
      }catch(error){if(mine===searchToken)$('weatherSearchResults').textContent=error.name==='AbortError'?'Pencarian lokasi terlalu lama. Coba Lagi.':error.message;}
    };
    $('weatherCitySearch').addEventListener('input',()=>{searchToken++;});
    $('weatherLocateBtn').onclick=()=>locate(true);
    $('weatherKeepBtn').onclick=()=>finishReview(false);$('weatherCancelBtn').onclick=()=>finishReview(true);
    $('weatherChangeBtn').onclick=()=>{review=null;$('weatherRiskDialog').close();$('eventStartHour').focus();};
    $('weatherRiskDialog').addEventListener('cancel',()=>{review=null;});
    $('eventDialog').addEventListener('close',()=>{token++;searchToken++;locationRevision++;geoBusy=false;clearTimeout(timer);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',()=>refresh(true));
    window.setInterval?.(()=>refresh(),30*60000);
    return {fields,open,gate,badge,refresh,changed};
  }
  window.FahmiWeatherUI={create};
})();
