const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  try{
    const {barcode}=await req.json();
    if(!barcode)return json({error:'Falta el código de barras'},400);
    const token=Deno.env.get('DISCOGS_TOKEN');
    if(!token)return json({error:'No se ha configurado DISCOGS_TOKEN'},500);
    const headers={Authorization:`Discogs token=${token}`,'User-Agent':'MiDiscografia/1.1'};
    const search=await fetch(`https://api.discogs.com/database/search?barcode=${encodeURIComponent(barcode)}&type=release&per_page=10`,{headers});
    if(!search.ok)return json({error:`Error de Discogs ${search.status}`},search.status);
    const searchData=await search.json();
    const releases=(searchData.results||[]).filter((x:any)=>x.type==='release');
    if(!releases.length)return json({found:false});
    for(const release of releases){
      const stats=await fetch(`https://api.discogs.com/marketplace/stats/${release.id}?curr_abbr=EUR`,{headers});
      if(!stats.ok)continue;
      const data=await stats.json();
      if(data.lowest_price?.value){
        return json({found:true,release_id:release.id,title:release.title,price:data.lowest_price.value,currency:data.lowest_price.currency||'EUR',num_for_sale:data.num_for_sale||0});
      }
    }
    return json({found:true,release_id:releases[0].id,title:releases[0].title,price:null,currency:'EUR',num_for_sale:0});
  }catch(error){return json({error:error instanceof Error?error.message:'Error desconocido'},500)}
});
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})}
