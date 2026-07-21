const $=s=>document.querySelector(s);
const storeKey='mi-discografia-records-v1';
const SUPABASE_URL='https://ejmatxopatslscrrebae.supabase.co';
const SUPABASE_KEY='sb_publishable_q0cUfiUmnHWW2-CmcNsebA_muBk_RTQ';
let scanner=null;let installPrompt=null;
const els={scan:$('#scanBtn'),manual:$('#manualBtn'),scanner:$('#scannerPanel'),form:$('#formPanel'),status:$('#statusPanel'),statusText:$('#statusText'),records:$('#records'),count:$('#countText'),search:$('#search'),install:$('#installBtn')};
function records(){return JSON.parse(localStorage.getItem(storeKey)||'[]')}
function saveRecords(v){localStorage.setItem(storeKey,JSON.stringify(v));render()}
function show(el){el.classList.remove('hidden')}function hide(el){el.classList.add('hidden')}
function setStatus(text){els.statusText.textContent=text;show(els.status)}function stopStatus(){hide(els.status)}
async function startScanner(){show(els.scanner);stopStatus();scanner=new Html5Qrcode('reader');try{await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:150},formatsToSupport:[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E]},async code=>{await stopScanner();await lookupBarcode(code)},()=>{})}catch(e){setStatus('No se pudo abrir la cámara. Comprueba el permiso de Safari o introduce el código manualmente.')}}
async function stopScanner(){hide(els.scanner);if(scanner){try{await scanner.stop()}catch(e){}try{scanner.clear()}catch(e){}scanner=null}}

// Se conserva la búsqueda original con MusicBrainz, que era la que reconocía bien los códigos.
async function lookupBarcode(code){
  code=String(code).replace(/\D/g,'');setStatus(`Buscando el código ${code}…`);
  try{
    const url=`https://musicbrainz.org/ws/2/release/?query=barcode:${encodeURIComponent(code)}&fmt=json&limit=5`;
    const res=await fetch(url);if(!res.ok)throw new Error('search');const data=await res.json();
    if(!data.releases?.length){stopStatus();openForm({barcode:code});alert('No hemos encontrado este código. Puedes completar la ficha manualmente.');return}
    const r=data.releases[0];let detail=r;
    try{const d=await fetch(`https://musicbrainz.org/ws/2/release/${r.id}?inc=artists+labels+recordings+release-groups+media&fmt=json`);if(d.ok)detail=await d.json()}catch(e){}
    const artist=(detail['artist-credit']||r['artist-credit']||[]).map(a=>a.name||a.artist?.name).filter(Boolean).join(', ');
    const label=(detail['label-info']||[]).map(x=>x.label?.name).filter(Boolean).join(', ');
    const format=(detail.media||[]).map(m=>m.format).filter(Boolean).join(', ');
    const cover=`https://coverartarchive.org/release/${r.id}/front-500`;
    stopStatus();openForm({barcode:code,artist,title:detail.title||r.title,year:(detail.date||r.date||'').slice(0,4),label,format,cover});
  }catch(e){stopStatus();openForm({barcode:code});alert('La búsqueda automática no respondió. El código ya está copiado para completar la ficha.')}
}

async function callDiscogsFunction(payload){
  const res=await fetch(`${SUPABASE_URL}/functions/v1/anadir-discogs`,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
    body:JSON.stringify(payload)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||`Error ${res.status}`);
  return data;
}

async function syncWithDiscogs(record){
  if(!record.barcode)return {synced:false,reason:'sin código'};
  setStatus('Guardado en la app. Buscando la edición en Discogs…');
  try{
    let data=await callDiscogsFunction({barcode:record.barcode,artist:record.artist,title:record.title});
    if(data.already_in_collection){stopStatus();return {synced:true,already:true,releaseId:data.release_id}}
    if(Array.isArray(data.results)&&data.results.length){
      let selected=data.results[0];
      if(data.results.length>1){
        const options=data.results.slice(0,10).map((r,i)=>`${i+1}. ${r.title||'Sin título'}${r.year?` (${r.year})`:''}${r.format?` · ${r.format}`:''}`).join('\n');
        const answer=prompt(`El disco ya está guardado en la aplicación. Elige la edición que quieres añadir a Discogs:\n\n${options}`,'1');
        if(answer===null){stopStatus();return {synced:false,cancelled:true}}
        const index=Math.max(0,Math.min(data.results.length-1,(parseInt(answer,10)||1)-1));selected=data.results[index];
      }
      setStatus('Añadiendo el disco a tu colección de Discogs…');
      data=await callDiscogsFunction({release_id:selected.id});
    }
    stopStatus();
    if(data.added||data.already_in_collection)return {synced:true,releaseId:data.release_id};
    return {synced:false};
  }catch(e){
    console.error(e);stopStatus();
    alert('El disco se ha guardado en la aplicación, pero no se pudo añadir a Discogs. Puedes volver a editarlo y guardarlo para reintentarlo.');
    return {synced:false,error:e.message};
  }
}

function openForm(v={}){const ids=['barcode','artist','title','year','format','label','cover','editId'];ids.forEach(id=>$('#'+id).value=v[id]||'');show(els.form);$('#artist').focus()}
function render(){const q=els.search.value.trim().toLowerCase();const all=records();els.count.textContent=all.length?`${all.length} ${all.length===1?'disco guardado':'discos guardados'}`:'Tu colección está vacía';els.records.innerHTML='';const filtered=all.filter(r=>`${r.artist} ${r.title} ${r.year}`.toLowerCase().includes(q));if(!filtered.length){els.records.innerHTML='<div class="empty">Todavía no hay discos que mostrar.</div>';return}filtered.sort((a,b)=>a.artist.localeCompare(b.artist)).forEach(r=>{const node=$('#recordTemplate').content.cloneNode(true);const img=node.querySelector('.record-cover');img.src=r.cover||'icons/placeholder.svg';img.onerror=()=>img.src='icons/placeholder.svg';node.querySelector('.record-title').textContent=r.title;node.querySelector('.record-artist').textContent=r.artist;node.querySelector('.record-format').textContent=r.format||'DISCO';node.querySelector('.record-meta').textContent=[r.year,r.label,r.discogsSynced?'✓ Discogs':null].filter(Boolean).join(' · ');node.querySelector('.record-menu').onclick=()=>openForm(r);els.records.append(node)})}
els.scan.onclick=startScanner;els.manual.onclick=()=>{const code=prompt('Escribe los números del código de barras:');if(code)lookupBarcode(code)};$('#closeScanner').onclick=stopScanner;$('#closeForm').onclick=()=>hide(els.form);els.search.oninput=render;
$('#recordForm').onsubmit=async e=>{
  e.preventDefault();
  const r={id:$('#editId').value||crypto.randomUUID(),barcode:$('#barcode').value.trim(),artist:$('#artist').value.trim(),title:$('#title').value.trim(),year:$('#year').value.trim(),format:$('#format').value.trim(),label:$('#label').value.trim(),cover:$('#cover').value.trim()};
  let all=records();const duplicate=all.find(x=>x.barcode&&x.barcode===r.barcode&&x.id!==r.id);if(duplicate&&!confirm('Ya tienes un disco con este código. ¿Quieres guardarlo igualmente?'))return;
  const ix=all.findIndex(x=>x.id===r.id);if(ix>=0)r.discogsSynced=all[ix].discogsSynced||false;
  if(ix>=0)all[ix]=r;else all.unshift(r);saveRecords(all);hide(els.form);e.target.reset();
  const result=await syncWithDiscogs(r);
  if(result.synced){const updated=records();const pos=updated.findIndex(x=>x.id===r.id);if(pos>=0){updated[pos].discogsSynced=true;updated[pos].discogsReleaseId=result.releaseId||updated[pos].discogsReleaseId;saveRecords(updated)}alert(result.already?'El disco ya estaba en tu colección de Discogs.':'Disco guardado también en tu colección de Discogs.');}
};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;show(els.install)});els.install.onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;hide(els.install)}else alert('En iPhone: abre esta página en Safari, pulsa Compartir y después “Añadir a pantalla de inicio”.')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');render();
