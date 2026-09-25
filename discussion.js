let createClient = null;

const root = document.documentElement;
const articleKey = root.dataset.articleKey;
if (!articleKey) throw new Error('Missing data-article-key');
const isEn = (root.lang || '').toLowerCase().startsWith('en');
const cfg = window.LTP_DISCUSSION_CONFIG || {};
const text = isEn ? {
  debate:'Article discussion', join:'Join the discussion', latest:'Latest comments', all:'View full thread',
  note:'Reader opinions — not verified by La Trama Pública.', login:'Sign in by email', email:'Email', send:'Send code', code:'Access code', verify:'Verify code', changeEmail:'Use another email',
  sent:'Check your email and enter the access code.', alias:'Public alias', saveAlias:'Save alias', comment:'Write a comment', publish:'Publish',
  reply:'Reply', report:'Report', noComments:'No comments yet. Start the discussion.', unavailable:'Discussion is being configured.'
} : {
  debate:'Debate de esta nota', join:'Sumate a la conversación', latest:'Últimos comentarios', all:'Ver discusión completa',
  note:'Opiniones de lectores — no verificadas por La Trama Pública.', login:'Ingresar por email', email:'Email', send:'Enviar código', code:'Código de acceso', verify:'Verificar código', changeEmail:'Usar otro email',
  sent:'Revisá tu email e ingresá el código de acceso.', alias:'Alias público', saveAlias:'Guardar alias', comment:'Escribí un comentario', publish:'Publicar',
  reply:'Responder', report:'Reportar', noComments:'Todavía no hay comentarios. Abrí la conversación.', unavailable:'El debate se está configurando.'
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client = null, session = null, profile = null, comments = [], pendingOtpEmail = '';
let contributorProfile = null, ownEvidence = [], verifiedEvidence = [];
try{pendingOtpEmail=sessionStorage.getItem('ltp_otp_email')||''}catch{}
function setPendingOtpEmail(email){pendingOtpEmail=email;try{if(email)sessionStorage.setItem('ltp_otp_email',email);else sessionStorage.removeItem('ltp_otp_email')}catch{}}
function deviceInfo(){
  const ua=navigator.userAgent||'';
  const browser=/Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)&&!/Chrome\//.test(ua)?'Safari':'Other';
  const os=/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)?'iOS':/Mac OS X/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';
  const device_class=/Mobile|Android|iPhone|iPod/.test(ua)?'phone':/iPad|Tablet/.test(ua)?'tablet':'computer';
  return {device_class,browser,os,referrer:document.referrer||null,locale:navigator.language||null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||null,screen_width:screen.width,screen_height:screen.height};
}

function mount(){
  const main=document.querySelector('main'); if(!main) return;
  const inline=document.querySelector('[data-discussion-inline], .comment-preview');
  const threadTarget=inline?'debate':'debate-thread';
  const rail=document.createElement('aside'); rail.className='discussion-rail'; rail.id='discussion-rail';
  rail.innerHTML=`<p class="eyebrow">${text.debate}</p><h2>${text.join}</h2><p class="discussion-count" data-comment-count>0</p><div class="discussion-mini" data-discussion-mini></div><a class="btn primary" href="#${threadTarget}">${text.all}</a><p class="discussion-note">${text.note}</p>`;
  document.body.appendChild(rail);
  const hero=main.querySelector('.article-hero');
  if(hero && !main.querySelector('.participation-cta')){
    const cta=document.createElement('section');
    cta.className='participation-cta';
    cta.innerHTML=`<div class="wrap narrow participation-cta-inner"><div><p class="eyebrow">${isEn?'Open participation':'Participación abierta'}</p><h2>${isEn?'Be part of La Trama Pública':'Sé parte de La Trama Pública'}</h2><p>${isEn?'Contribute information, sources and documents. Help us verify the facts and build a more complete investigation.':'Aportá información, fuentes y documentos. Ayudanos a verificar los hechos y construir una investigación más completa.'}</p></div><a class="btn primary" href="#aportar">${isEn?'Contribute information':'Aportar información'}</a></div>`;
    hero.insertAdjacentElement('afterend',cta);
  }
  if(inline){
    inline.classList.remove('comment-preview');
    inline.classList.add('discussion-inline');
    inline.setAttribute('data-discussion-inline','');
    inline.innerHTML=`<p class="discussion-count" data-comment-count>0</p><p class="discussion-note">${text.note}</p><div data-auth-box></div><div data-composer></div><div class="discussion-thread" data-thread></div><div id="aportar" data-contribution-box></div><div data-verified-evidence></div>`;
  }else{
    const full=document.createElement('section'); full.className='section discussion-full'; full.id='debate-thread';
    full.innerHTML=`<div class="wrap narrow"><div class="section-head"><div><p class="eyebrow">${text.debate}</p><h2>${text.join}</h2></div><p class="discussion-count" data-comment-count>0</p></div><p class="discussion-note">${text.note}</p><div data-auth-box></div><div data-composer></div><div class="discussion-thread" data-thread></div><div id="aportar" data-contribution-box></div><div data-verified-evidence></div></div>`;
    main.appendChild(full);
  }
  document.querySelectorAll('.quick-question').forEach((b,i)=>{const a=document.createElement('a');a.className='block-discuss-link';a.href=`#${threadTarget}`;a.textContent=isEn?'Discuss this point →':'¿Qué pensás sobre esto? → Debate';a.dataset.section=String(i+1);b.appendChild(a)});
}
async function recordAccess(eventType){
  if(!client||!session) return;
  try{
    const {data}=await client.auth.getSession(); const token=data.session?.access_token; if(!token)return;
    await fetch(`${cfg.supabaseUrl}/functions/v1/record-access`,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabaseAnonKey,'Authorization':`Bearer ${token}`},body:JSON.stringify({event_type:eventType,...deviceInfo()})});
  }catch(e){console.warn('access log failed',e)}
}

async function loadProfile(){
  if(!session){profile=null;return}
  const {data,error}=await client.from('user_profiles').select('alias,role').eq('user_id',session.user.id).maybeSingle();
  if(error) console.warn(error); profile=data||null;
}

async function loadComments(){
  if(!client){comments=[];render();return}
  const {data,error}=await client.rpc('public_comments',{p_article_slug:articleKey});
  if(error){console.error(error);comments=[]}else comments=data||[];
  render();
}

async function loadContributorProfile(){
  if(!client||!session||!profile){contributorProfile=null;return}
  const {data,error}=await client.rpc('my_contributor_profile');
  if(error){console.warn(error);contributorProfile=null;return}
  contributorProfile=Array.isArray(data)?(data[0]||null):data;
}

async function loadEvidence(){
  if(!client){verifiedEvidence=[];ownEvidence=[];return}
  const pub=await client.rpc('public_evidence_contributions',{p_article_slug:articleKey});
  if(pub.error){console.warn(pub.error);verifiedEvidence=[]}else verifiedEvidence=pub.data||[];
  if(session&&profile){
    const own=await client.rpc('my_evidence_submissions',{p_article_slug:articleKey});
    if(own.error){console.warn(own.error);ownEvidence=[]}else ownEvidence=own.data||[];
  }else ownEvidence=[];
}

function safeHttpUrl(value){
  try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}
}
function evidenceRelationLabel(value){
  const es={confirms:'Confirma',contradicts:'Contradice',context:'Agrega contexto',correction:'Propone corrección',document:'Aporta documento',other:'Otro aporte'};
  const en={confirms:'Confirms',contradicts:'Contradicts',context:'Adds context',correction:'Proposes correction',document:'Provides document',other:'Other contribution'};
  return (isEn?en:es)[value]||value;
}
function evidenceStatusLabel(value){
  const es={pending:'Recibido',reviewing:'En revisión',verified:'Verificado',rejected:'No incorporado'};
  const en={pending:'Received',reviewing:'Under review',verified:'Verified',rejected:'Not incorporated'};
  return (isEn?en:es)[value]||value;
}
function renderVerifiedEvidence(){
  const host=document.querySelector('[data-verified-evidence]'); if(!host)return;
  if(!verifiedEvidence.length){host.innerHTML='';return}
  host.innerHTML=`<section class="verified-evidence"><p class="eyebrow">${isEn?'Verified reader contributions':'Aportes verificados de lectores'}</p><h3>${isEn?'Sources incorporated into this article':'Fuentes aportadas por la comunidad'}</h3><div class="evidence-list">${verifiedEvidence.map(x=>{const href=safeHttpUrl(x.source_url);const credit=x.credit_name?`<strong>${esc(x.credit_name)}</strong>`:(isEn?'Anonymous contribution':'Aporte anónimo');const profileUrl=safeHttpUrl(x.credit_url);const contact=x.public_contact_method&&x.public_contact_value?`<span>${esc(x.public_contact_method)}: ${esc(x.public_contact_value)}</span>`:'';return `<article class="evidence-card"><div><span class="evidence-badge">${esc(evidenceRelationLabel(x.relation))}</span><p>${esc(x.summary)}</p>${href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${isEn?'Open source':'Abrir fuente'}</a>`:''}</div><footer><span>${isEn?'Credit':'Crédito'}: ${profileUrl?`<a href="${esc(profileUrl)}" target="_blank" rel="noopener noreferrer">${credit}</a>`:credit}</span>${contact}</footer></article>`}).join('')}</div></section>`;
}
function renderContribution(){
  const host=document.querySelector('[data-contribution-box]'); if(!host)return;
  const title=isEn?'Help us verify':'Ayudanos a verificar';
  const intro=isEn?'If you have a public document, primary source or verifiable data that confirms, contradicts or adds context to this article, send it for editorial review.':'Si tenés un documento público, una fuente primaria o un dato verificable que confirma, contradice o agrega contexto a esta nota, podés enviarlo para revisión editorial.';
  if(!session||!profile){host.innerHTML=`<section class="contribution-panel"><p class="eyebrow">${isEn?'Collaborative verification':'Verificación colaborativa'}</p><h3>${title}</h3><p>${intro}</p><p class="discussion-note">${isEn?'Sign in above and choose a public alias to contribute evidence.':'Ingresá arriba y elegí un alias público para aportar evidencia.'}</p></section>`;renderVerifiedEvidence();return}
  const cp=contributorProfile||{}; const creditName=cp.credit_name||profile.alias||'';
  const options=[['','—'],['email','Email'],['whatsapp','WhatsApp'],['telegram','Telegram'],['phone',isEn?'Phone / SMS':'Teléfono / SMS'],['x','X'],['other',isEn?'Other':'Otro']].map(([v,l])=>`<option value="${v}"${cp.contact_method===v?' selected':''}>${l}</option>`).join('');
  const mine=ownEvidence.length?`<div class="my-evidence"><h4>${isEn?'Your submissions':'Tus aportes'}</h4>${ownEvidence.map(x=>{const href=safeHttpUrl(x.source_url);return `<article><span class="evidence-status status-${esc(x.status)}">${esc(evidenceStatusLabel(x.status))}</span><strong>${esc(evidenceRelationLabel(x.relation))}</strong><p>${esc(x.summary)}</p>${href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${isEn?'Source':'Fuente'}</a>`:''}${x.review_note?`<small>${isEn?'Editorial note':'Nota editorial'}: ${esc(x.review_note)}</small>`:''}</article>`}).join('')}</div>`:'';
  host.innerHTML=`<section class="contribution-panel"><p class="eyebrow">${isEn?'Collaborative verification':'Verificación colaborativa'}</p><h3>${title}</h3><p>${intro}</p><form class="evidence-form" data-evidence-form><label>${isEn?'Source URL':'URL de la fuente'}<input name="source_url" type="url" required placeholder="https://..."></label><label>${isEn?'What does it contribute?':'¿Qué aporta?'}<select name="relation" required><option value="confirms">${isEn?'Confirms':'Confirma'}</option><option value="contradicts">${isEn?'Contradicts':'Contradice'}</option><option value="context">${isEn?'Adds context':'Agrega contexto'}</option><option value="correction">${isEn?'Proposes correction':'Propone corrección'}</option><option value="document">${isEn?'Provides document':'Aporta documento'}</option><option value="other">${isEn?'Other':'Otro'}</option></select></label><label>${isEn?'Explain why this source matters':'Explicá qué permite verificar'}<textarea name="summary" minlength="5" maxlength="2000" required></textarea></label><p class="discussion-note">${isEn?'If you do not change your credit preferences, your public alias will be used as the credit.':'Si no cambiás tus preferencias de crédito, se usará tu alias público como crédito.'}</p><button class="btn primary" type="submit">${isEn?'Send for review':'Enviar para revisión'}</button><p data-evidence-msg></p></form><details class="contributor-settings"><summary>${isEn?'Credit and contact preferences':'Créditos y contacto'}</summary><form data-contributor-form><label>${isEn?'Name shown in credits':'Nombre para los créditos'}<input name="credit_name" maxlength="80" value="${esc(creditName)}"></label><label>${isEn?'Public profile / website (optional)':'Perfil o sitio público (opcional)'}<input name="credit_url" type="url" value="${esc(cp.credit_url||'')}" placeholder="https://..."></label><label>${isEn?'Preferred contact method (optional)':'Medio de contacto preferido (opcional)'}<select name="contact_method">${options}</select></label><label>${isEn?'Contact information':'Dato de contacto'}<input name="contact_value" maxlength="200" value="${esc(cp.contact_value||'')}"></label><label class="check"><input type="checkbox" name="credit_enabled"${cp.credit_enabled===false?'':' checked'}> ${isEn?'Credit me when an accepted contribution is published':'Mostrar mi crédito cuando un aporte sea verificado'}</label><label class="check"><input type="checkbox" name="allow_contact"${cp.allow_contact===false?'':' checked'}> ${isEn?'La Trama Pública may contact me privately about my contribution':'La Trama Pública puede contactarme en privado por mi aporte'}</label><label class="check"><input type="checkbox" name="public_contact"${cp.public_contact?' checked':''}> ${isEn?'Also show this contact information publicly with my credit':'También mostrar públicamente este dato de contacto junto a mi crédito'}</label><p class="discussion-note">${isEn?'Contact information stays private unless you explicitly enable the last option.':'El dato de contacto permanece privado salvo que actives expresamente la última opción.'}</p><button class="btn ghost" type="submit">${isEn?'Save preferences':'Guardar preferencias'}</button><p data-contributor-msg></p></form></details>${mine}</section>`;
  renderVerifiedEvidence();
}

function renderTree(items,parent=null,depth=0){
  return items.filter(x=>(x.parent_id||null)===parent).map(c=>`<article class="reader-comment depth-${Math.min(depth,2)}" id="comment-${c.id}"><header><strong>${esc(c.alias)}</strong><time>${new Date(c.created_at).toLocaleString(isEn?'en-US':'es-AR')}</time></header><p>${esc(c.body).replace(/\n/g,'<br>')}</p><div class="comment-actions"><button type="button" data-reply="${c.id}">${text.reply}</button>${session?`<button type="button" data-report="${c.id}">${text.report}</button>`:''}</div>${renderTree(items,c.id,depth+1)}</article>`).join('');
}

function renderAuth(){
  const box=document.querySelector('[data-auth-box]'); if(!box)return;
  if(!cfg.enabled||!client){box.innerHTML=`<div class="discussion-status">${text.unavailable}</div>`;return}
  if(!session){
    if(pendingOtpEmail){box.innerHTML=`<form class="discussion-auth" data-otp-form><h3>${text.code}</h3><label>${text.code}<input type="text" name="token" inputmode="numeric" pattern="[0-9]{6,10}" maxlength="10" autocomplete="one-time-code" required></label><button class="btn primary" type="submit">${text.verify}</button><button class="btn ghost" type="button" data-change-email>${text.changeEmail}</button><p data-otp-msg>${text.sent}</p></form>`;return}
    box.innerHTML=`<form class="discussion-auth" data-login-form><h3>${text.login}</h3><label>${text.email}<input type="email" name="email" required autocomplete="email"></label><button class="btn primary" type="submit">${text.send}</button><p data-login-msg></p></form>`;return
  }
  if(!profile){box.innerHTML=`<form class="discussion-auth" data-alias-form><h3>${text.alias}</h3><label>${text.alias}<input type="text" name="alias" minlength="3" maxlength="40" required></label><button class="btn primary" type="submit">${text.saveAlias}</button><p class="discussion-note">${isEn?'Your email remains private.':'Tu email permanece privado.'}</p></form>`;return}
  box.innerHTML=`<div class="discussion-user"><strong>@${esc(profile.alias)}</strong><button type="button" data-signout>${isEn?'Sign out':'Salir'}</button></div>`;
}
function renderComposer(replyTo=''){
  const host=document.querySelector('[data-composer]'); if(!host)return;
  if(!session||!profile){host.innerHTML='';return}
  host.innerHTML=`<form class="discussion-composer" data-comment-form><input type="hidden" name="parent_id" value="${esc(replyTo)}"><label>${replyTo?(isEn?'Your reply':'Tu respuesta'):text.comment}<textarea name="body" maxlength="4000" required></textarea></label><div><button class="btn primary" type="submit">${text.publish}</button>${replyTo?`<button class="btn ghost" type="button" data-cancel-reply>${isEn?'Cancel':'Cancelar'}</button>`:''}</div><p data-comment-msg></p></form>`;
}

function render(){
  document.querySelectorAll('[data-comment-count]').forEach(el=>el.textContent=`${comments.length} ${comments.length===1?(isEn?'comment':'comentario'):(isEn?'comments':'comentarios')}`);
  const mini=document.querySelector('[data-discussion-mini]'); if(mini)mini.innerHTML=comments.slice(-3).reverse().map(c=>`<a href="#comment-${c.id}"><strong>@${esc(c.alias)}</strong><span>${esc(c.body.slice(0,110))}${c.body.length>110?'…':''}</span></a>`).join('')||`<p>${text.noComments}</p>`;
  const thread=document.querySelector('[data-thread]'); if(thread)thread.innerHTML=comments.length?renderTree(comments):`<p class="discussion-empty">${text.noComments}</p>`;
  renderAuth(); renderComposer(); renderContribution();
}

async function login(email){
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
  if(error)throw error;
  setPendingOtpEmail(email);
}

async function verifyOtpCode(token){
  if(!pendingOtpEmail)throw new Error(isEn?'Enter your email again.':'Ingresá tu email nuevamente.');
  const code=String(token||'').replace(/\D/g,'');
  if(code.length<6||code.length>10)throw new Error(isEn?'Enter the access code from your email.':'Ingresá el código de acceso que recibiste por email.');
  const {error}=await client.auth.verifyOtp({email:pendingOtpEmail,token:code,type:'email'});
  if(error)throw error;
  setPendingOtpEmail('');
  const {data}=await client.auth.getSession(); session=data.session;
  if(session)await loadProfile();
  render();
}

async function saveAlias(alias){
  const {error}=await client.rpc('set_my_alias',{p_alias:alias});
  if(error)throw error; await loadProfile(); render();
}

async function saveContributorPreferences(form){
  const args={
    p_credit_name:form.credit_name.value.trim()||null,
    p_credit_url:form.credit_url.value.trim()||null,
    p_credit_enabled:form.credit_enabled.checked,
    p_contact_method:form.contact_method.value||null,
    p_contact_value:form.contact_value.value.trim()||null,
    p_allow_contact:form.allow_contact.checked,
    p_public_contact:form.public_contact.checked
  };
  const {error}=await client.rpc('save_contributor_profile',args); if(error)throw error;
  await loadContributorProfile(); render();
}
async function submitEvidence(form){
  const {error}=await client.rpc('submit_evidence',{p_article_slug:articleKey,p_source_url:form.source_url.value.trim(),p_relation:form.relation.value,p_summary:form.summary.value.trim()});
  if(error)throw error; await loadEvidence(); render();
}

async function publishComment(body,parent_id){
  const row={article_slug:articleKey,user_id:session.user.id,body,parent_id:parent_id||null};
  const {error}=await client.from('comments').insert(row); if(error)throw error;
  await recordAccess('comment'); await loadComments();
}

async function reportComment(id){
  const reason=prompt(isEn?'Why are you reporting this comment?':'¿Por qué reportás este comentario?'); if(!reason)return;
  const {error}=await client.from('comment_reports').insert({comment_id:id,reporter_id:session.user.id,reason}); if(error)throw error;
  await recordAccess('report'); alert(isEn?'Report received.':'Reporte recibido.');
}
document.addEventListener('submit',async e=>{
  const f=e.target;
  try{
    if(f.matches('[data-login-form]')){e.preventDefault();await login(f.email.value.trim());render()}
    if(f.matches('[data-otp-form]')){e.preventDefault();await verifyOtpCode(f.token.value)}
    if(f.matches('[data-alias-form]')){e.preventDefault();await saveAlias(f.alias.value.trim());await loadContributorProfile();await loadEvidence();render()}
    if(f.matches('[data-contributor-form]')){e.preventDefault();const msg=f.querySelector('[data-contributor-msg]');await saveContributorPreferences(f);if(msg)msg.textContent=isEn?'Saved.':'Guardado.'}
    if(f.matches('[data-evidence-form]')){e.preventDefault();const msg=f.querySelector('[data-evidence-msg]');if(msg)msg.textContent=isEn?'Sending…':'Enviando…';await submitEvidence(f);}
    if(f.matches('[data-comment-form]')){e.preventDefault();const msg=f.querySelector('[data-comment-msg]');msg.textContent=isEn?'Publishing…':'Publicando…';await publishComment(f.body.value.trim(),f.parent_id.value);msg.textContent='';renderComposer()}
  }catch(err){console.error(err);const msg=f.querySelector('p');if(msg)msg.textContent=err.message||String(err)}
});

document.addEventListener('click',async e=>{
  const reply=e.target.closest('[data-reply]'); if(reply){renderComposer(reply.dataset.reply);document.querySelector('[data-comment-form]')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  if(e.target.closest('[data-cancel-reply]')){renderComposer();return}
  if(e.target.closest('[data-change-email]')){setPendingOtpEmail('');render();return}
  const report=e.target.closest('[data-report]'); if(report){try{await reportComment(report.dataset.report)}catch(err){alert(err.message||String(err))}return}
  if(e.target.closest('[data-signout]')){await client.auth.signOut();return}
});

async function init(){
  mount();
  if(!cfg.enabled||!cfg.supabaseUrl||!cfg.supabaseAnonKey){render();return}
  const supabaseModule=await import('https://esm.sh/@supabase/supabase-js@2');
  createClient=supabaseModule.createClient;
  client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data}=await client.auth.getSession(); session=data.session;
  if(session){setPendingOtpEmail('');await loadProfile();await loadContributorProfile();await recordAccess('session')}
  client.auth.onAuthStateChange(async(event,newSession)=>{const was=!session&&!!newSession;session=newSession;if(session){setPendingOtpEmail('');await loadProfile();await loadContributorProfile()}else{profile=null;contributorProfile=null;ownEvidence=[]}if(was)await recordAccess('login');await loadEvidence();render()});
  await loadComments();
  await loadEvidence();
  client.channel(`comments:${articleKey}`).on('postgres_changes',{event:'*',schema:'public',table:'comments',filter:`article_slug=eq.${articleKey}`},()=>loadComments()).subscribe();
}

init().catch(console.error);
