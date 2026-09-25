let createClient = null;

const root = document.documentElement;
const articleKey = root.dataset.articleKey;
if (!articleKey) throw new Error('Missing data-article-key');
const isEn = (root.lang || '').toLowerCase().startsWith('en');
const cfg = window.LTP_DISCUSSION_CONFIG || {};
const text = isEn ? {
  debate:'Article discussion', join:'Join the discussion', latest:'Latest comments', all:'View full thread',
  note:'Reader opinions — not verified by La Trama Pública.', login:'Sign in by email', email:'Email', send:'Send access link',
  sent:'Check your email for the access link.', alias:'Public alias', saveAlias:'Save alias', comment:'Write a comment', publish:'Publish',
  reply:'Reply', report:'Report', noComments:'No comments yet. Start the discussion.', unavailable:'Discussion is being configured.'
} : {
  debate:'Debate de esta nota', join:'Sumate a la conversación', latest:'Últimos comentarios', all:'Ver discusión completa',
  note:'Opiniones de lectores — no verificadas por La Trama Pública.', login:'Ingresar por email', email:'Email', send:'Enviar enlace de acceso',
  sent:'Revisá tu email para abrir el enlace de acceso.', alias:'Alias público', saveAlias:'Guardar alias', comment:'Escribí un comentario', publish:'Publicar',
  reply:'Responder', report:'Reportar', noComments:'Todavía no hay comentarios. Abrí la conversación.', unavailable:'El debate se está configurando.'
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client = null, session = null, profile = null, comments = [];
function deviceInfo(){
  const ua=navigator.userAgent||'';
  const browser=/Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)&&!/Chrome\//.test(ua)?'Safari':'Other';
  const os=/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)?'iOS':/Mac OS X/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';
  const device_class=/Mobile|Android|iPhone|iPod/.test(ua)?'phone':/iPad|Tablet/.test(ua)?'tablet':'computer';
  return {device_class,browser,os,referrer:document.referrer||null,locale:navigator.language||null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||null,screen_width:screen.width,screen_height:screen.height};
}

function mount(){
  const main=document.querySelector('main'); if(!main) return;
  const rail=document.createElement('aside'); rail.className='discussion-rail'; rail.id='discussion-rail';
  rail.innerHTML=`<p class="eyebrow">${text.debate}</p><h2>${text.join}</h2><p class="discussion-count" data-comment-count>0</p><div class="discussion-mini" data-discussion-mini></div><a class="btn primary" href="#debate-thread">${text.all}</a><p class="discussion-note">${text.note}</p>`;
  document.body.appendChild(rail);
  const full=document.createElement('section'); full.className='section discussion-full'; full.id='debate-thread';
  full.innerHTML=`<div class="wrap narrow"><div class="section-head"><div><p class="eyebrow">${text.debate}</p><h2>${text.join}</h2></div><p class="discussion-count" data-comment-count>0</p></div><p class="discussion-note">${text.note}</p><div data-auth-box></div><div data-composer></div><div class="discussion-thread" data-thread></div></div>`;
  main.appendChild(full);
  document.querySelectorAll('.quick-question').forEach((b,i)=>{const a=document.createElement('a');a.className='block-discuss-link';a.href='#debate-thread';a.textContent=isEn?'Discuss this point →':'¿Qué pensás sobre esto? → Debate';a.dataset.section=String(i+1);b.appendChild(a)});
}
async function recordAccess(eventType){
  if(!client||!session) return;
  try{
    const {data}=await client.auth.getSession(); const token=data.session?.access_token; if(!token)return;
    await fetch(`${cfg.supabaseUrl}/functions/v1/record-access`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({event_type:eventType,...deviceInfo()})});
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

function renderTree(items,parent=null,depth=0){
  return items.filter(x=>(x.parent_id||null)===parent).map(c=>`<article class="reader-comment depth-${Math.min(depth,2)}" id="comment-${c.id}"><header><strong>${esc(c.alias)}</strong><time>${new Date(c.created_at).toLocaleString(isEn?'en-US':'es-AR')}</time></header><p>${esc(c.body).replace(/\n/g,'<br>')}</p><div class="comment-actions"><button type="button" data-reply="${c.id}">${text.reply}</button>${session?`<button type="button" data-report="${c.id}">${text.report}</button>`:''}</div>${renderTree(items,c.id,depth+1)}</article>`).join('');
}

function renderAuth(){
  const box=document.querySelector('[data-auth-box]'); if(!box)return;
  if(!cfg.enabled||!client){box.innerHTML=`<div class="discussion-status">${text.unavailable}</div>`;return}
  if(!session){box.innerHTML=`<form class="discussion-auth" data-login-form><h3>${text.login}</h3><label>${text.email}<input type="email" name="email" required autocomplete="email"></label><button class="btn primary" type="submit">${text.send}</button><p data-login-msg></p></form>`;return}
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
  renderAuth(); renderComposer();
}

async function login(email){
  const redirect=location.href.split('#')[0]+'#debate-thread';
  const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});
  if(error)throw error;
}

async function saveAlias(alias){
  const {error}=await client.rpc('set_my_alias',{p_alias:alias});
  if(error)throw error; await loadProfile(); render();
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
    if(f.matches('[data-login-form]')){e.preventDefault();const msg=f.querySelector('[data-login-msg]');await login(f.email.value.trim());msg.textContent=text.sent;f.reset()}
    if(f.matches('[data-alias-form]')){e.preventDefault();await saveAlias(f.alias.value.trim())}
    if(f.matches('[data-comment-form]')){e.preventDefault();const msg=f.querySelector('[data-comment-msg]');msg.textContent=isEn?'Publishing…':'Publicando…';await publishComment(f.body.value.trim(),f.parent_id.value);msg.textContent='';renderComposer()}
  }catch(err){console.error(err);const msg=f.querySelector('p');if(msg)msg.textContent=err.message||String(err)}
});

document.addEventListener('click',async e=>{
  const reply=e.target.closest('[data-reply]'); if(reply){renderComposer(reply.dataset.reply);document.querySelector('[data-comment-form]')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  if(e.target.closest('[data-cancel-reply]')){renderComposer();return}
  const report=e.target.closest('[data-report]'); if(report){try{await reportComment(report.dataset.report)}catch(err){alert(err.message||String(err))}return}
  if(e.target.closest('[data-signout]')){await client.auth.signOut();return}
});

async function init(){
  mount();
  if(!cfg.enabled||!cfg.supabaseUrl||!cfg.supabaseAnonKey){render();return}
  client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data}=await client.auth.getSession(); session=data.session;
  if(session){await loadProfile();await recordAccess('session')}
  client.auth.onAuthStateChange(async(event,newSession)=>{const was=!session&&!!newSession;session=newSession;if(session)await loadProfile();else profile=null;if(was)await recordAccess('login');render()});
  await loadComments();
  client.channel(`comments:${articleKey}`).on('postgres_changes',{event:'*',schema:'public',table:'comments',filter:`article_slug=eq.${articleKey}`},()=>loadComments()).subscribe();
}

init().catch(console.error);
