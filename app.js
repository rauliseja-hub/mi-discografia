const $=s=>document.querySelector(s);const storeKey='mi-discografia-records-v1';const SUPABASE_URL='https://ejmatxopatslscrrebae.supabase.co';const SUPABASE_KEY='sb_publishable_q0cUfiUmnHWW2-CmcNsebA_muBk_RTQ';let scanner=null;let installPrompt=null;
const els={scan:$('#scanBtn'),manual:$('#manualBtn'),scanner:$('#scannerPanel'),form:$('#formPanel'),status:$('#statusPanel'),statusText:$('#statusText'),records:$('#records'),count:$('#countText'),search:$('#search'),install:$('#installBtn')};
function records(){return JSON.parse(localStorage.getItem(storeKey)||'[]')}function saveRecords(v){localStorage.setItem(storeKey,JSON.stringify(v));render()}
function show(el){el.classList.remove('hidden')}function hide(el){el.classList.add('hidden')}
function setStatus(text){els.statusText.textContent=text;show(els.status)}function stopStatus(){hide(els.status)}
async function startScanner(){show(els.scanner);stopStatus();scanner=new Html5Qrcode('reader');try{await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:150},formatsToSupport:[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E]},async code=>{await stopScanner();await lookupBarcode(code)},()=>{})}catch(e){setStatus('No se pudo abrir la cámara. Comprueba el permiso de Safari o introduce el código manualmente.')}}
async function stopScanner(){hide(els.scanner);if(scanner){try{await scanner.stop()}catch(e){}try{scanner.clear()}catch(e){}scanner=null}}
async function lookupBarcode(code){
  code=String(code).replace(/\D/g,'');
  setStatus(`Buscando el código ${code} en Discogs…`);
  try{
    const res=await fetch(`${SUPABASE_URL}/functions/v1/buscar-discogs`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify({barcode:code})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||`Error ${res.status}`);
    const results=Array.isArray(data.results)?data.results:[];
    if(!data.found||!results.length){
      stopStatus();
      openForm({barcode:code});
      alert('Discogs no ha encontrado este código. Puedes completar la ficha manualmente.');
      return;
    }
    let selected=results[0];
    if(results.length>1){
      const options=results.slice(0,10).map((r,i)=>`${i+1}. ${r.artista||'Artista desconocido'} — ${r.titulo||'Sin título'}${r.ano?` (${r.ano})`:''}${r.formato?` · ${r.formato}`:''}`).join('\n');
      const answer=prompt(`Discogs ha encontrado varias ediciones. Escribe el número correcto:\n\n${options}`,'1');
      if(answer===null){stopStatus();return}
      const index=Math.max(0,Math.min(results.length-1,(parseInt(answer,10)||1)-1));
      selected=results[index];
    }
    stopStatus();
    openForm({
      barcode:code,
      artist:selected.artista||'',
      title:selected.titulo||'',
      year:selected.ano||'',
      label:selected.sello||'',
      format:selected.formato||'',
      cover:selected.portada||''
    });
  }catch(e){
    console.error(e);
    stopStatus();
    openForm({barcode:code});
    alert(`No se pudo consultar Discogs. ${e.message||'Revisa la función de Supabase.'}`);
  }
}
function openForm(v={}){const ids=['barcode','artist','title','year','format','label','cover','editId'];ids.forEach(id=>$('#'+id).value=v[id]||'');show(els.form);$('#artist').focus()}
function render(){const q=els.search.value.trim().toLowerCase();const all=records();els.count.textContent=all.length?`${all.length} ${all.length===1?'disco guardado':'discos guardados'}`:'Tu colección está vacía';els.records.innerHTML='';const filtered=all.filter(r=>`${r.artist} ${r.title} ${r.year}`.toLowerCase().includes(q));if(!filtered.length){els.records.innerHTML='<div class="empty">Todavía no hay discos que mostrar.</div>';return}filtered.sort((a,b)=>a.artist.localeCompare(b.artist)).forEach(r=>{const node=$('#recordTemplate').content.cloneNode(true);const img=node.querySelector('.record-cover');img.src=r.cover||'icons/placeholder.svg';img.onerror=()=>img.src='icons/placeholder.svg';node.querySelector('.record-title').textContent=r.title;node.querySelector('.record-artist').textContent=r.artist;node.querySelector('.record-format').textContent=r.format||'DISCO';node.querySelector('.record-meta').textContent=[r.year,r.label].filter(Boolean).join(' · ');node.querySelector('.record-menu').onclick=()=>openForm(r);els.records.append(node)})}
els.scan.onclick=startScanner;els.manual.onclick=()=>{const code=prompt('Escribe los números del código de barras:');if(code)lookupBarcode(code)};$('#closeScanner').onclick=stopScanner;$('#closeForm').onclick=()=>hide(els.form);els.search.oninput=render;
$('#recordForm').onsubmit=e=>{e.preventDefault();const r={id:$('#editId').value||crypto.randomUUID(),barcode:$('#barcode').value.trim(),artist:$('#artist').value.trim(),title:$('#title').value.trim(),year:$('#year').value.trim(),format:$('#format').value.trim(),label:$('#label').value.trim(),cover:$('#cover').value.trim()};let all=records();const duplicate=all.find(x=>x.barcode&&x.barcode===r.barcode&&x.id!==r.id);if(duplicate&&!confirm('Ya tienes un disco con este código. ¿Quieres guardarlo igualmente?'))return;const ix=all.findIndex(x=>x.id===r.id);if(ix>=0)all[ix]=r;else all.unshift(r);saveRecords(all);hide(els.form);e.target.reset()};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;show(els.install)});els.install.onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;hide(els.install)}else alert('En iPhone: abre esta página en Safari, pulsa Compartir y después “Añadir a pantalla de inicio”.')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');render();
