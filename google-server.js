(() => {
  'use strict';
  const KEY='fahmiDailyPWA.serverSession.v1',PENDING='fahmiDailyPWA.serverLogin.v1';
  const pattern=/^[A-Za-z0-9_-]{43}$/;
  const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  function create({base=window.FAHMI_BACKEND_URL,storage=localStorage,request=fetch,clock=()=>Date.now()}={}){
    if(base!=='https://fahmi-daily-api.fajarxxx055.workers.dev')throw new Error('Alamat server tidak sesuai konfigurasi aplikasi.');
    let cached=null,flight=null,generation=0,completing=false;
    const stored=()=>{const value=storage.getItem(KEY);if(value && !pattern.test(value))throw new Error('Data koneksi perangkat rusak. Hubungi bantuan sebelum menghapus data situs.');return value;};
    async function api(path,{method='GET',data,token}={}){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
      let response;
      try{response=await request(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,credentials:'omit',cache:'no-store',signal:controller.signal});}
      catch{throw new Error('Server belum dapat dihubungi. Jadwal tetap lokal; periksa internet atau akses workers.dev pada jaringan ini.');}
      finally{clearTimeout(timer);}
      let value;try{value=await response.json();}catch{throw new Error('Server belum menjalankan backend Fahmi Daily. Pasang worker.mjs terlebih dahulu.');}
      if(!response.ok){const error=new Error(value.error||'Koneksi server gagal.');error.status=response.status;throw error;}
      return value;
    }
    function validate(value){
      if(!value?.profile?.sub || !value.profile.email || typeof value.access_token!=='string' || !Number.isFinite(Number(value.expires_in)) || Number(value.expires_in)<=60 || !value.clientId)throw new Error('Respons koneksi server tidak lengkap.');
      return value;
    }
    function cache(value,token){validate(value);cached={value,token,until:clock()+(Number(value.expires_in)-90)*1000};return value;}
    async function session(force=false){
      const token=stored();if(!token)throw new Error('Hubungkan Google untuk mengaktifkan koneksi otomatis.');
      if(!force && cached?.token===token && clock()<cached.until)return {...cached.value,expires_in:Math.floor((cached.until-clock())/1000)+90};
      if(flight)return flight;
      const started=generation;
      flight=(async()=>{
        try{
          const value=await api('/session'+(force?'?refresh=1':''),{token});
          if(started!==generation || stored()!==token)throw new Error('Koneksi berubah di perangkat ini. Coba lagi.');
          return cache(value,token);
        }catch(error){if(error.status===401 && stored()===token){storage.removeItem(KEY);cached=null;}throw error;}
        finally{flight=null;}
      })();
      return flight;
    }
    async function prepare(){const value=await api('/health');if(!value.ready)throw new Error('Server belum siap. Lengkapi tabel D1, Client ID, Client Secret, kunci enkripsi dan email yang diizinkan.');return value;}
    async function begin(){
      const verifier=b64(crypto.getRandomValues(new Uint8Array(32)));
      const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      // Test writable storage before starting an OAuth flow.
      storage.setItem(PENDING,JSON.stringify({verifier,state:'',expires:clock()+600000}));
      const result=await api('/auth/start',{method:'POST',data:{challenge}});
      const url=new URL(result.url);
      if(url.origin!=='https://accounts.google.com' || url.pathname!=='/o/oauth2/v2/auth' || !pattern.test(result.state) || url.searchParams.get('state')!==result.state)throw new Error('Alamat login server tidak valid.');
      storage.setItem(PENDING,JSON.stringify({verifier,state:result.state,expires:clock()+600000}));
      return result;
    }
    async function complete(state,code){
      if(completing)throw new Error('Kode koneksi sedang diproses.');
      let pending;try{pending=JSON.parse(storage.getItem(PENDING));}catch{}
      if(!pending || pending.state!==state || pending.expires<clock() || !pattern.test(code) || !pattern.test(pending.verifier))throw new Error('Kode bukan untuk login dari aplikasi ini atau sudah kedaluwarsa. Mulai Hubungkan Google dari aplikasi yang sedang dipakai.');
      completing=true;
      try{
        const value=validate(await api('/auth/complete',{method:'POST',data:{code,verifier:pending.verifier}}));
        if(!pattern.test(value.session))throw new Error('Koneksi perangkat tidak valid.');
        const old=stored();
        try{storage.setItem(KEY,value.session);}catch(error){await api('/session',{method:'DELETE',token:value.session}).catch(()=>{});throw new Error('Koneksi belum disimpan karena penyimpanan penuh. Backup jadwal dan periksa ruang perangkat.');}
        generation++;cache(value,value.session);storage.removeItem(PENDING);
        // Old device sessions are revoked only after the replacement is durable.
        if(old && old!==value.session)await api('/session',{method:'DELETE',token:old}).catch(()=>{});
        return value;
      }finally{completing=false;}
    }
    async function disconnect(){
      generation++;cached=null;
      const token=stored();
      if(token)await api('/session',{method:'DELETE',token});
      if(stored()===token)storage.removeItem(KEY);
      storage.removeItem(PENDING);
    }
    return {prepare,begin,complete,session,disconnect,get hasSession(){try{return !!stored();}catch{return false;}},get origin(){return new URL(base).origin;}};
  }
  window.FahmiGoogleServer={create};
})();
