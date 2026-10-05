(() => {
  'use strict';
  const HOUR=3600000,TTL=30*60000,KEY='fahmiDailyPWA.weatherCache.v1';
  const rainCodes=new Set([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99]);
  const validCodes=new Set([0,1,2,3,45,48,71,73,75,77,85,86,...rainCodes]);
  const validLocation=l=>!!l && typeof l.name==='string' && l.name.trim().length>0 && l.name.length<=200 && Number.isFinite(l.latitude) && Math.abs(l.latitude)<=90 && Number.isFinite(l.longitude) && Math.abs(l.longitude)<=180;
  const bounds=e=>[new Date(e.date+'T'+e.startTime+':00').getTime(),new Date(e.date+'T'+e.endTime+':00').getTime()];
  const identity=e=>JSON.stringify([e.date,e.startTime,e.endTime,e.activityType,e.weatherLocation?.latitude,e.weatherLocation?.longitude]);
  const finite=(v,min=0,max=Infinity)=>typeof v==='number' && Number.isFinite(v) && v>=min && v<=max;
  function condition(code){return code>=95?'Badai petir':rainCodes.has(code)?'Hujan / gerimis':[71,73,75,77,85,86].includes(code)?'Salju':code===0?'Cerah':[1,2,3].includes(code)?'Berawan':[45,48].includes(code)?'Kabut':'Kondisi belum tersedia';}
  function analyze(data,event,threshold=60){
    const [start,end]=bounds(event),h=data?.hourly;
    if(!Number.isFinite(start) || !(end>start) || !h || !Array.isArray(h.time))return {state:'unavailable',reason:'Prakiraan belum tersedia.'};
    const times=h.time.map(t=>t*1000);
    // Precipitation/probability at t describes (t-1h,t]; weather code is instantaneous.
    if(start<times[0] || end>times.at(-1))return {state:'unavailable',reason:'Tanggal/jam berada di luar jangkauan prakiraan.'};
    const periods=times.map((t,i)=>({t,i})).filter(x=>x.t>start && x.t-HOUR<end);
    const codes=times.map((t,i)=>({t,i})).filter(x=>x.t<end && x.t+HOUR>start);
    let probabilities=[],amounts=[],riskCodes=[],knownCodes=[],complete=true;
    for(const {t,i} of periods){
      const p=h.precipitation_probability?.[i],mm=h.precipitation?.[i];
      if(finite(p,0,100))probabilities.push(p);
      if(finite(mm))amounts.push(mm);
      const code=i>0?h.weather_code?.[i-1]:null;
      if(!finite(p,0,100) && !validCodes.has(code))complete=false;
      if(i>0 && t-times[i-1]!==HOUR)complete=false;
      // Weather code describes the start of the overlapping hour, not the exact end.
      if(validCodes.has(code)){knownCodes.push(code);if(rainCodes.has(code))riskCodes.push(code);}
    }
    for(const {i} of codes){const code=h.weather_code?.[i];if(validCodes.has(code)){knownCodes.push(code);if(rainCodes.has(code))riskCodes.push(code);}}
    const probability=probabilities.length?Math.max(...probabilities):null;
    const risk=(probability!==null && probability>=threshold) || riskCodes.length>0;
    const state=risk?'rain':complete && periods.length?'low':'unavailable';
    let zone=data.timezone;try{new Intl.DateTimeFormat('id-ID',{timeZone:zone}).format(start);}catch{zone='UTC';}
    const fmt=t=>new Intl.DateTimeFormat('id-ID',{timeZone:zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(t);
    return {state,probability,amount:amounts.length===periods.length?amounts.reduce((a,b)=>a+b,0):null,
      condition:condition(riskCodes[0] ?? knownCodes[0]),zone,localTime:fmt(start)+' – '+fmt(end),
      reason:riskCodes.length?'Model memprediksi hujan/gerimis atau badai pada rentang kegiatan.':risk?`Kemungkinan hujan mencapai ${probability}% (ambang ${threshold}%).`:state==='low'?'Risiko hujan lebih rendah berdasarkan data yang tersedia; bukan jaminan cuaca cerah.':'Sebagian data per jam belum tersedia.',
      signature:identity(event)+'|'+threshold};
  }
  function create({request=fetch,storage=localStorage,clock=()=>Date.now(),online=()=>navigator.onLine}={}){
    let cache={};try{const saved=JSON.parse(storage.getItem(KEY)||'{}');if(saved && typeof saved==='object' && !Array.isArray(saved))cache=saved;}catch{}
    const inflight=new Map();
    async function json(url){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      try{const r=await request(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error(r.status===429?'Batas layanan cuaca tercapai. Coba lagi nanti.':'Layanan cuaca belum dapat dihubungi.');return await r.json();}
      finally{clearTimeout(timer);}
    }
    async function search(name){
      if(name.trim().length<2)return [];
      if(!online())throw Error('Offline. Cari lokasi kembali saat online.');
      const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:name.trim().slice(0,100),count:'6',language:'id',format:'json'});
      const data=await json(url.href);
      return (data.results||[]).map(l=>({name:[l.name,l.admin1,l.country].filter(Boolean).join(', '),latitude:l.latitude,longitude:l.longitude})).filter(validLocation);
    }
    async function forecast(location,force=false){
      if(!validLocation(location))throw Error('Pilih lokasi Outdoor terlebih dahulu.');
      const key=JSON.stringify([location.latitude,location.longitude]),entry=cache[key];
      if(entry && Number.isFinite(entry.at) && clock()>=entry.at && clock()-entry.at<TTL && (!force || clock()-entry.at<2*60000))return {...entry,stale:false};
      if(!online()){if(entry)return {...entry,stale:true};throw Error('Offline. Prakiraan belum tersedia; jadwal tetap dapat disimpan.');}
      if(inflight.has(key))return inflight.get(key);
      const task=(async()=>{
        try{
          const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:location.latitude,longitude:location.longitude,hourly:'precipitation_probability,precipitation,weather_code',forecast_days:'16',timezone:'auto',timeformat:'unixtime'});
          const data=await json(url.href);if(!Array.isArray(data.hourly?.time) || !data.hourly.time.length)throw Error('Data prakiraan belum tersedia.');
          const result={at:clock(),data};cache[key]=result;
          cache=Object.fromEntries(Object.entries(cache).sort((a,b)=>b[1].at-a[1].at).slice(0,10));
          try{storage.setItem(KEY,JSON.stringify(cache));}catch{}
          return {...result,stale:false};
        }catch(error){if(entry)return {...entry,stale:true,error:'Pembaruan cuaca gagal. '+error.message};throw error;}
      })();inflight.set(key,task);try{return await task;}finally{inflight.delete(key);}
    }
    async function check(event,threshold=60,force=false){
      if(event.activityType!=='outdoor')return {state:'indoor'};
      const [start,end]=bounds(event);
      if(!Number.isFinite(start) || !(end>start))return {state:'unavailable',reason:'Pilih tanggal serta jam mulai dan selesai yang valid.'};
      if(end<=clock() || start>clock()+16*24*HOUR)return {state:'unavailable',reason:'Tanggal berada di luar jangkauan prakiraan mendatang.'};
      try{const result=await forecast(event.weatherLocation,force);const assessment=analyze(result.data,event,threshold);return {...assessment,at:result.at,stale:result.stale,error:result.error,data:result.data};}
      catch(error){return {state:'unavailable',reason:error.name==='AbortError'?'Pemeriksaan cuaca terlalu lama. Coba Lagi.':error.message};}
    }
    return {search,check};
  }
  window.FahmiWeather={create,analyze,identity,bounds,validLocation,TTL};
})();
