const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const discogsHeaders=(token:string)=>({Authorization:`Discogs token=${token}`,'User-Agent':'MiDiscografia/1.0 +https://rauliseja-hub.github.io/mi-discografia/'});
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  try{
    const token=Deno.env.get('DISCOGS_TOKEN');
    if(!token)return json({error:'Falta el secreto DISCOGS_TOKEN'},500);
    const body=await req.json();
    const headers=discogsHeaders(token);
    if(body.release_id){
      const identityRes=await fetch('https://api.discogs.com/oauth/identity',{headers});
      if(!identityRes.ok)return json({error:`No se pudo identificar la cuenta de Discogs (${identityRes.status})`},502);
      const identity=await identityRes.json();
      const username=identity.username;
      const releaseId=Number(body.release_id);
      const addRes=await fetch(`https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/1/releases/${releaseId}`,{method:'POST',headers});
      if(addRes.ok){const added=await addRes.json().catch(()=>({}));return json({added:true,release_id:releaseId,instance_id:added.instance_id});}
      if(addRes.status===409)return json({already_in_collection:true,release_id:releaseId});
      const errorText=await addRes.text();return json({error:`Discogs no pudo añadir el disco (${addRes.status}): ${errorText.slice(0,180)}`},502);
    }
    const barcode=String(body.barcode||'').replace(/\D/g,'');
    if(!barcode)return json({error:'Falta el código de barras'},400);
    const searchRes=await fetch(`https://api.discogs.com/database/search?barcode=${encodeURIComponent(barcode)}&type=release&per_page=10`,{headers});
    if(!searchRes.ok)return json({error:`Discogs no pudo buscar el código (${searchRes.status})`},502);
    const search=await searchRes.json();
    const results=(search.results||[]).slice(0,10).map((r:any)=>({id:r.id,title:r.title||'',year:r.year||'',format:Array.isArray(r.format)?r.format.join(', '):'',country:r.country||'',label:Array.isArray(r.label)?r.label.join(', '):'',cover:r.cover_image||r.thumb||''}));
    if(!results.length)return json({results:[],found:false});
    if(results.length===1){
      return json({results,found:true});
    }
    return json({results,found:true});
  }catch(error){return json({error:error instanceof Error?error.message:'Error desconocido'},500)}
});
