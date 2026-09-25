import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
const ALLOWED_ORIGIN='https://floydskd-netizen.github.io';
const cors=(origin:string)=>({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):null;
function adminKey(){const raw=Deno.env.get('SUPABASE_SECRET_KEYS');if(raw){const keys=JSON.parse(raw);if(keys.default)return keys.default}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}
async function sha256(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';const headers=cors(origin===ALLOWED_ORIGIN?origin:ALLOWED_ORIGIN);
 if(req.method==='OPTIONS')return origin===ALLOWED_ORIGIN?new Response('ok',{headers}):new Response('Forbidden',{status:403});
 if(req.method!=='POST'||origin!==ALLOWED_ORIGIN)return new Response('Forbidden',{status:403,headers});
 const body=await req.json().catch(()=>null);if(!body)return new Response('Bad request',{status:400,headers});
 const eventType=body.event_type==='share'?'share':body.event_type==='pageview'?'pageview':null;
 const pagePath=text(body.path,500),visitor=text(body.visitor_id,80);
 if(!eventType||!pagePath?.startsWith('/la-trama-publica/')||!visitor||!/^[0-9a-f-]{36}$/i.test(visitor))return new Response('Bad request',{status:400,headers});
 const url=Deno.env.get('SUPABASE_URL')||'',key=adminKey();if(!url||!key)return new Response('Server configuration error',{status:500,headers});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await admin.from('analytics_events').insert({event_type:eventType,path:pagePath,article_slug:text(body.article_slug,160),visitor_hash:await sha256(visitor),referrer_host:text(body.referrer_host,255),utm_source:text(body.utm_source,120),utm_medium:text(body.utm_medium,120),utm_campaign:text(body.utm_campaign,160),utm_content:text(body.utm_content,200),locale:text(body.locale,40),device_class:['mobile','tablet','desktop'].includes(body.device_class)?body.device_class:null,target:text(body.target,80)});
 if(error){console.error(error);return new Response('Database error',{status:500,headers});}
 return new Response(null,{status:204,headers});
});
