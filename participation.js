(()=>{
const form=document.querySelector('[data-general-contribution-form]');if(!form)return;
const cfg=window.LTP_DISCUSSION_CONFIG||{};const isEn=(document.documentElement.lang||'').toLowerCase().startsWith('en');
const msg=form.querySelector('[data-general-contribution-msg]');const submit=form.querySelector('button[type="submit"]');
form.addEventListener('submit',async e=>{e.preventDefault();if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){msg.textContent=isEn?'Submission service is unavailable.':'El servicio de aportes no está disponible.';return}
const file=form.file?.files?.[0];if(file&&file.size>10*1024*1024){msg.textContent=isEn?'The file exceeds 10 MB.':'El archivo supera los 10 MB.';return}
const fd=new FormData(form);fd.set('allow_contact',form.allow_contact.checked?'true':'false');fd.set('public_credit',form.public_credit.checked?'true':'false');fd.set('public_contact',form.public_contact.checked?'true':'false');
submit.disabled=true;msg.textContent=isEn?'Sending\u2026':'Enviando…';
try{const r=await fetch(`${cfg.supabaseUrl}/functions/v1/receive-contribution`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey},body:fd});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);form.reset();msg.textContent=isEn?'Thank you. We received your contribution for editorial review.':'Gracias. Recibimos tu aporte para revisión editorial.'}
catch(err){console.error(err);msg.textContent=err.message||String(err)}finally{submit.disabled=false}
});
})();
