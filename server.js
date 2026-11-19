'use strict';
/* Somnia - servidor. Node >= 22.13, sem dependências externas. Ver DOCUMENTACAO.md */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),dns=require('dns').promises,{DatabaseSync}=require('node:sqlite');
const ROOT=__dirname;
try{for(const l of fs.readFileSync(path.join(ROOT,'.env'),'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}}catch(e){}
const ENV=process.env,CK=/^[a-z_]{3,40}$/.test(ENV.COOKIE_NAME||'')?ENV.COOKIE_NAME:'somnia_sid',BASE=/^\/[a-z0-9-]{1,30}$/.test(ENV.BASE_PATH||'')?ENV.BASE_PATH:'',VERSION=(()=>{try{return require('./package.json').version}catch(e){return '?'}})(),PORT=+ENV.PORT||3000,HOST=ENV.HOST||'127.0.0.1',SECURE=ENV.COOKIE_SECURE==='true',DATA=path.resolve(ENV.DATA_DIR||path.join(ROOT,'data'));
fs.mkdirSync(path.join(DATA,'uploads'),{recursive:true});
const db=new DatabaseSync(path.join(DATA,'somnia.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS docs(c TEXT NOT NULL,id TEXT NOT NULL,j TEXT NOT NULL,PRIMARY KEY(c,id));
CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,name TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(t TEXT PRIMARY KEY,u TEXT NOT NULL,exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,ts INTEGER,u TEXT,ip TEXT,ev TEXT,d TEXT);`);
const Q={get:db.prepare('SELECT j FROM docs WHERE c=? AND id=?'),all:db.prepare('SELECT id,j FROM docs WHERE c=?'),put:db.prepare('INSERT INTO docs(c,id,j) VALUES(?,?,?) ON CONFLICT(c,id) DO UPDATE SET j=excluded.j'),del:db.prepare('DELETE FROM docs WHERE c=? AND id=?'),
 bal:db.prepare("SELECT COALESCE(SUM(CASE WHEN json_extract(j,'$.to')=? THEN json_extract(j,'$.amt') ELSE 0 END),0)-COALESCE(SUM(CASE WHEN json_extract(j,'$.from')=? THEN json_extract(j,'$.amt') ELSE 0 END),0) AS b FROM docs WHERE c='ledger'"),
 held:db.prepare("SELECT COALESCE(SUM(json_extract(j,'$.price')),0) AS h FROM docs WHERE c='consults' AND json_extract(j,'$.from')=? AND json_extract(j,'$.status')='aberta'"),
 unl:db.prepare("SELECT json_extract(j,'$.ref') AS r FROM docs WHERE c='ledger' AND json_extract(j,'$.from')=?"),
 has:db.prepare("SELECT 1 AS x FROM docs WHERE c='ledger' AND json_extract(j,'$.to')=? AND json_extract(j,'$.ref')=? LIMIT 1"),
 dupe:db.prepare("SELECT 1 AS x FROM docs WHERE c='ledger' AND json_extract(j,'$.from')=? AND json_extract(j,'$.ref')=? AND json_extract(j,'$.to')=? LIMIT 1"),
 sumref:db.prepare("SELECT COALESCE(SUM(json_extract(j,'$.amt')),0) AS s FROM docs WHERE c='ledger' AND json_extract(j,'$.ref')=? AND json_extract(j,'$.from')=?"),
 fees:db.prepare("SELECT json_extract(j,'$.reason') AS r FROM docs WHERE c='ledger' AND json_extract(j,'$.from')=? AND json_extract(j,'$.reason') LIKE ?"),
 buys:db.prepare("SELECT COUNT(*) AS n FROM docs WHERE c='ledger' AND json_extract(j,'$.ref')=?"),
 acc:db.prepare('SELECT * FROM accounts WHERE id=?'),accs:db.prepare('SELECT id,name,ts FROM accounts')};
const getDoc=(c,id)=>{const r=Q.get.get(c,id);return r?JSON.parse(r.j):null};
const allDocs=c=>Q.all.all(c).map(r=>({id:r.id,...JSON.parse(r.j)}));
const putDoc=(c,id,d)=>Q.put.run(c,id,JSON.stringify(d));
const err=(s,m)=>{const e=new Error(m);e.status=s;return e},deny=(s,m)=>{throw err(s,m)};
const PR0={start:100,publishCard:20,publishDream:10,viewCard:3,viewDream:5,viewParecer:3,consult:15,expertShare:70};
const price=k=>{const c=getDoc('config','prices');return +(c&&c[k]!=null?c[k]:PR0[k])};
const ACH={a1:10,a2:15,a3:15,a4:20,a5:10,a6:20,a7:15,a8:40};
const bal=u=>Q.bal.get(u,u).b,held=u=>Q.held.get(u).h,avail=u=>bal(u)-held(u);
const scrypt=(p,s)=>new Promise((res,rej)=>crypto.scrypt(p,s,64,{N:16384,r:8,p:1,maxmem:64*1024*1024},(e,k)=>e?rej(e):res(k.toString('hex'))));
const safeEq=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
function audit(ev,u,ip,d){db.prepare('INSERT INTO audit(ts,u,ip,ev,d) VALUES(?,?,?,?,?)').run(Date.now(),u||'',ip||'',ev,d?String(d).slice(0,300):'')}
/* ---- usuários e sessões ---- */
const ROLES=['membro','saude','historia','admin'];
function userOf(id){const u=getDoc('users',id)||{};return{id,name:u.name||id,role:u.role||'membro',status:u.status||'ativo',verified:!!u.verified,admin:id==='root'||u.role==='admin'}}
const isPro=(u,k)=>u.admin||(u.verified&&(k?u.role===k:u.role==='saude'||u.role==='historia'));
const ensureUserDoc=(id,name,role,root)=>{if(!getDoc('users',id))putDoc('users',id,{name,role,status:'ativo',verified:false,root:!!root,joined:Date.now(),last:Date.now()})};
function newSession(id){const t=crypto.randomBytes(32).toString('base64url');db.prepare('INSERT INTO sessions(t,u,exp) VALUES(?,?,?)').run(t,id,Date.now()+7*864e5);return t}
const cookieOf=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split(/=(.*)/s).slice(0,2)).filter(x=>x[0]));
function sessUser(req){const t=cookieOf(req)[CK];if(!t)return null;const r=db.prepare('SELECT u FROM sessions WHERE t=? AND exp>?').get(t,Date.now());return r?userOf(r.u):null}
const setCookie=(res,t,max)=>res.setHeader('Set-Cookie',`${CK}=${t}; HttpOnly; SameSite=Lax; Path=${BASE||'/'}; Max-Age=${max}${SECURE?'; Secure':''}`);
const hits=new Map();function limit(key,max,win){const n=Date.now(),a=(hits.get(key)||[]).filter(t=>n-t<win);if(a.length>=max)deny(429,'Muitas tentativas. Aguarde e tente de novo.');a.push(n);hits.set(key,a)}
setInterval(()=>{db.prepare('DELETE FROM sessions WHERE exp<?').run(Date.now());const n=Date.now();for(const[k,a]of hits)if(!a.some(t=>n-t<36e5))hits.delete(k)},36e5).unref();
async function setPassword(id,name,pw){const salt=crypto.randomBytes(16).toString('hex');db.prepare('INSERT INTO accounts(id,name,salt,hash,ts) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET salt=excluded.salt,hash=excluded.hash').run(id,name,salt,await scrypt(pw,salt),Date.now())}
async function initRoot(){if(Q.acc.get('root'))return;let pw=ENV.ROOT_PASSWORD,gen=false;if(!pw||pw.length<8){pw=crypto.randomBytes(12).toString('base64url');gen=true}
 await setPassword('root','Root',pw);ensureUserDoc('root','Root','admin',true);
 if(gen)console.log('\n[SOMNIA] ROOT_PASSWORD ausente ou curta. Senha inicial gerada para o usuario "root":\n         '+pw+'\n         Anote e troque em seguida (icone de chave no app).\n');
 else if(pw.length<12)console.log('[SOMNIA] AVISO: a senha do root tem menos de 12 caracteres. Troque por uma senha longa e unica.')}
/* ---- esquemas e limpeza de dados ---- */
const SC={cards:{title:'s120',deck:'s80',rarity:'s20',summary:'s500',history:'s8000',details:'s8000',tags:'as',files:'ao',rels:'ao',bib:'as',status:'s20',author:'s40',ts:'n'},
 groups:{name:'s80',theme:'s80',desc:'s400',members:'as',owner:'s40'},posts:{gid:'s40',name:'s60',author:'s40',text:'s2000',ts:'n'},
 biblio:{title:'s300',author:'s200',year:'s30',area:'s60',note:'s400',ver:'s20',by:'s40'},
 history:{coll:'s40',doc:'s60',action:'s20',before:'x',after:'x',title:'s200',by:'s40',byName:'s60',ts:'n',undone:'b',undoneBy:'s60',undoneAt:'n'},
 users:{name:'s60',role:'s12',status:'s12',verified:'b',root:'b',joined:'n',last:'n',pedido:'x'},
 dreams:{title:'s120',text:'s8000',date:'s20',affects:'as',elements:'as',int:'n',rec:'b',vis:'s12',link:'s40',author:'s40',ts:'n'},
 pareceres:{t:'s10',tid:'s40',kind:'s10',leitura:'s4000',afetos:'s300',atencao:'s60',contexto:'s4000',evidencia:'s20',nota:'s500',parallels:'as',bib:'as',byRole:'s60',byName:'s60',author:'s40',ts:'n'},
 ledger:{from:'s40',to:'s40',amt:'n',reason:'s200',ref:'s80',ts:'n'},requests:{user:'s40',name:'s60',amt:'n',reason:'s1000',status:'s12',note:'s300',decidedBy:'s60',ts:'n'},
 consults:{from:'s40',kind:'s10',topic:'s200',q:'s4000',price:'n',status:'s12',answer:'s6000',expert:'s40',expertName:'s60',answeredAt:'n',ts:'n'},
 games:{title:'s120',desc:'s2000',genre:'s40',tags:'as',cover:'s200',kind:'s12',source:'s60',extId:'s120',price:'n',status:'s12',author:'s40',entry:'s200',url:'s400',content:'x',version:'s30',notes:'s300',ts:'n',plays:'n'},
 connectors:{name:'s80',url:'s400',format:'s12',listPath:'s80',mapping:'x',authHeader:'s40',token:'s300',factor:'n',lastSync:'n',lastResult:'x',status:'s20'},ratings:{game:'s40',user:'s40',stars:'n'}};
const str=(v,n)=>String(v==null?'':v).slice(0,n);
function clean(d,sc){if(!d||typeof d!=='object'||Array.isArray(d))deny(400,'Dados inválidos.');const o={};for(const k in sc){const t=sc[k],v=d[k];if(v===undefined)continue;
 if(t[0]==='s')o[k]=str(v,+t.slice(1));else if(t==='n')o[k]=Number.isFinite(+v)?+v:0;else if(t==='b')o[k]=!!v;
 else if(t==='as')o[k]=(Array.isArray(v)?v:[]).slice(0,60).map(x=>str(x,80));
 else if(t==='ao')o[k]=(Array.isArray(v)?v:[]).slice(0,60).map(x=>{const r={};if(x&&typeof x==='object')for(const kk of Object.keys(x).slice(0,6))r[str(kk,20)]=str(x[kk],300);return r});
 else o[k]=v}return o}
const arr=v=>Array.isArray(v)?v:[],isUp=r=>/^\/uploads\/[a-f0-9]+\.[a-z0-9]+$/.test(r||'');
/* ---- leitura com filtros e paywall no servidor ---- */
function readRows(c,u){
 if(c==='accounts')return Q.accs.all().map(a=>({id:a.id,name:a.name,ts:a.ts}));
 const m=/^data\/users\/(.+)$/.exec(c);if(m){if(m[1]!==u.id&&!u.admin)deny(403,'Sem acesso.');return allDocs(c)}
 if(!SC[c]&&c!=='config')deny(404,'Coleção desconhecida.');
 const rows=allDocs(c),unl=new Set(Q.unl.all(u.id).map(r=>r.r)),pro=isPro(u);
 const dreamOk=d=>d&&(d.author===u.id||d.vis==='com'||(d.vis==='prof'&&pro));
 switch(c){
  case 'cards':return rows.filter(x=>x.status==='publicada'||x.author===u.id||u.admin).map(x=>x.author===u.id||u.admin||pro||unl.has('card:'+x.id)?x:{...x,history:'',details:''});
  case 'dreams':return rows.filter(dreamOk).map(x=>x.author===u.id||u.admin||pro||unl.has('dream:'+x.id)?x:{...x,text:''});
  case 'pareceres':return rows.filter(p=>p.t==='dream'?dreamOk(getDoc('dreams',p.tid)):(pro||p.author===u.id)).map(p=>{const d=p.t==='dream'?getDoc('dreams',p.tid):null;
    return p.author===u.id||u.admin||pro||(d&&d.author===u.id)||unl.has('par:'+p.id)?p:{...p,leitura:'',afetos:'',atencao:'',contexto:'',evidencia:'',nota:'',parallels:[],bib:[]}});
  case 'consults':return rows.filter(x=>x.from===u.id||x.expert===u.id||u.admin||(x.status==='aberta'&&isPro(u,x.kind)));
  case 'requests':return rows.filter(x=>u.admin||x.user===u.id);
  case 'ledger':return rows.filter(x=>u.admin||x.from===u.id||x.to===u.id);
  case 'history':return rows.filter(x=>u.admin||x.by===u.id);
  case 'users':return rows.map(x=>u.admin||x.id===u.id?x:{...x,pedido:undefined});
  case 'games':{const rt={};allDocs('ratings').forEach(r=>{(rt[r.game]=rt[r.game]||[]).push(r)});
   return rows.filter(g=>g.status==='publicado'||u.admin).map(g=>{const rs=rt[g.id]||[],free=u.admin||!g.price||unl.has('game:'+g.id),mine=rs.find(r=>r.user===u.id);
    return{...g,url:(free||g.kind!=='external')?g.url:'',content:free?g.content:null,buys:Q.buys.get('game:'+g.id).n,rating:{avg:rs.length?rs.reduce((a,r)=>a+r.stars,0)/rs.length:0,n:rs.length},mine:mine?mine.stars:0,owned:free}})}
  case 'connectors':if(!u.admin)deny(403,'Somente o administrador acessa os conectores.');return rows.map(x=>({...x,token:'',hasToken:!!x.token}));
  case 'ratings':return [];
  default:return rows}}
/* ---- escrita com regras ---- */
function feeUnits(uid,like){return Q.fees.all(uid,like).reduce((a,r)=>{const m=/\((\d+) cartas\)/.exec(r.r);return a+(m?+m[1]:1)},0)}
function ledgerRule(e,u){e.ts=Date.now();e.amt=Math.floor(e.amt);if(!(e.amt>0&&e.amt<=1e6))deny(400,'Valor inválido.');if(!e.to||e.to===e.from)deny(400,'Destino inválido.');
 if(e.to!=='root'&&!Q.acc.get(e.to))deny(400,'Destinatário inexistente.');
 if(e.from==='sys'){if(u.admin)return;if(e.to===u.id&&/^ach:/.test(e.ref)&&ACH[e.ref.slice(4)]===e.amt&&!Q.has.get(u.id,e.ref))return;deny(403,'Concessão de créditos não autorizada.')}
 if((e.ref||'').startsWith('consult:')){const cs=getDoc('consults',e.ref.slice(8));if(!cs||cs.status!=='aberta'||!isPro(u,cs.kind)||e.from!==cs.from||(e.to!==u.id&&e.to!=='root'))deny(403,'Pagamento de consulta inválido.');if(Q.sumref.get(e.ref,cs.from).s+e.amt>cs.price)deny(400,'Valor acima do combinado.');return}
 if(e.from!==u.id)deny(403,'Você só pode movimentar os seus créditos.');if(avail(u.id)<e.amt)deny(402,'Créditos insuficientes.');
 const m=/^(card|dream|par|game):(.+)$/.exec(e.ref||'');
 if(m){const t=m[1],tg=getDoc(t==='card'?'cards':t==='dream'?'dreams':t==='game'?'games':'pareceres',m[2]);if(!tg)deny(404,'Conteúdo inexistente.');if(t==='game'&&tg.status!=='publicado')deny(404,'Jogo indisponível.');
  if(/\(taxa\)$/.test(e.reason||'')){if(e.to!=='root')deny(400,'Destino da taxa inválido.');return}
  const need=t==='game'?tg.price:t==='par'?Math.round(price('viewParecer')*price('expertShare')/100):price(t==='card'?'viewCard':'viewDream'),exp=(tg.author&&tg.author!=='sys')?tg.author:'root';
  if(e.amt<need)deny(402,'Valor abaixo do preço.');if(e.to!==exp)deny(400,'Destinatário incorreto.');if(Q.dupe.get(e.from,e.ref,e.to))deny(409,'Conteúdo já desbloqueado.');return}
 if(e.ref)deny(400,'Referência inválida.');
 const f=/^Publicação de (carta|deck|sonho)/.exec(e.reason||'');if(f){const units=f[1]==='deck'?+((/\((\d+) cartas\)/.exec(e.reason)||[])[1]||0):1,unit=price(f[1]==='sonho'?'publishDream':'publishCard');if(e.to!=='root'||e.amt<units*unit)deny(402,'Taxa de publicação abaixo do preço.')}}
function applyWrite(op,c,id,data,u){
 if(u.status==='suspenso')deny(403,'Conta suspensa.');const old=getDoc(c,id),adm=u.admin,m=/^data\/users\/(.+)$/.exec(c);
 if(m){if(m[1]!==u.id&&!adm)deny(403,'Sem acesso.');if(op==='delete')return null;return clean(data,{xp:'n',got:'as'})}
 if(!SC[c]&&c!=='config')deny(404,'Coleção desconhecida.');
 if(op==='delete'){if(!old)return null;const o=old;
  const ok={cards:adm||o.author===u.id,groups:adm||o.owner===u.id,posts:adm||o.author===u.id,dreams:adm||o.author===u.id,pareceres:adm||o.author===u.id}[c]??adm;if(!ok||c==='users'||c==='ledger'&&!adm)deny(403,'Sem permissão para excluir.');return null}
 if(c==='config'){if(!adm||id!=='prices')deny(403,'Somente o administrador altera preços.');const o={};for(const k in PR0)o[k]=Math.max(0,Math.floor(+data[k]||0));o.expertShare=Math.min(100,o.expertShare);return o}
 let d=clean(data,SC[c]);
 switch(c){
  case 'cards':if(!old){if(!d.title||!d.deck||!d.summary)deny(400,'Título, deck e resumo são obrigatórios.');d.author=u.id;d.status=adm&&d.status==='publicada'?'publicada':'pendente';d.ts=Date.now();d.files=arr(d.files).filter(f=>isUp(f.url)||!f.url);d.rels=arr(d.rels);d.bib=arr(d.bib);
    if(!adm){const mine=allDocs('cards').filter(x=>x.author===u.id).length;if(feeUnits(u.id,'Publicação de carta%')+feeUnits(u.id,'Publicação de deck%')<mine+1)deny(402,'Taxa de publicação pendente.')}}
   else if(adm||old.author===u.id){d.author=old.author;if(!adm||!['publicada','pendente'].includes(d.status))d.status=adm?old.status:old.status;if(!adm)d.status=old.status;d.files=arr(d.files).filter(f=>isUp(f.url)||!f.url)}
   else d={...old,rels:arr(d.rels),bib:arr(d.bib)};return d;
  case 'groups':if(!old){if(!d.name||!d.theme)deny(400,'Informe nome e tema.');d.owner=u.id;d.members=[u.id];return d}
   if(adm||old.owner===u.id){d.owner=old.owner;return d}const nm=new Set(arr(d.members)),om=new Set(arr(old.members));if([...nm].filter(x=>!om.has(x)).concat([...om].filter(x=>!nm.has(x))).some(x=>x!==u.id))deny(403,'Você só altera a sua própria participação.');return{...old,members:arr(d.members)};
  case 'posts':if(!old){if(!getDoc('groups',d.gid)||!d.text)deny(400,'Mensagem inválida.');d.author=u.id;d.name=u.name;d.ts=Date.now();return d}if(!adm&&old.author!==u.id)deny(403,'Sem permissão.');d.author=old.author;return d;
  case 'biblio':if(!old){if(!d.title||!d.author||!d.year)deny(400,'Informe título, autor e ano.');d.by=u.id;d.ver=adm&&d.ver==='verificada'?'verificada':'a verificar';return d}if(!adm)deny(403,'Somente o administrador altera fontes.');d.by=old.by;return d;
  case 'history':if(!old){d.by=u.id;d.byName=u.name;d.ts=Date.now();return d}if(!adm&&old.by!==u.id)deny(403,'Sem permissão.');return{...old,undone:!!d.undone,undoneBy:d.undoneBy||old.undoneBy,undoneAt:d.undoneAt||old.undoneAt};
  case 'users':{if(!old){if(id!==u.id)deny(403,'Sem permissão.');return{name:u.name,role:id==='root'?'admin':'membro',status:'ativo',verified:false,root:id==='root',joined:Date.now(),last:Date.now()}}
   const ped=x=>x&&typeof x==='object'?{tipo:['saude','historia'].includes(x.tipo)?x.tipo:'saude',registro:str(x.registro,200)}:undefined;
   if(id===u.id)return{...old,last:Date.now(),pedido:d.pedido!==undefined?ped(d.pedido):old.pedido};
   if(!adm)deny(403,'Sem permissão.');if(old.root||id==='root')deny(403,'O root não pode ser alterado por outros.');
   return{...old,role:ROLES.includes(d.role)?d.role:old.role,status:['ativo','suspenso'].includes(d.status)?d.status:old.status,verified:!!d.verified}}
  case 'dreams':if(!old){if(!d.title||!d.text)deny(400,'Informe título e narrativa.');d.author=u.id;d.vis=['privado','prof','com'].includes(d.vis)?d.vis:'privado';d.int=Math.min(5,Math.max(1,d.int||3));d.ts=Date.now();
    if(d.vis==='com'&&!adm){const n=allDocs('dreams').filter(x=>x.author===u.id&&x.vis==='com').length;if(feeUnits(u.id,'Publicação de sonho%')<n+1)deny(402,'Taxa de publicação pendente.')}return d}
   if(old.author!==u.id)deny(403,'Somente o autor edita o sonho.');d.author=old.author;return d;
  case 'pareceres':if(!old){if(!['saude','historia'].includes(d.kind)||!isPro(u,d.kind))deny(403,'Somente profissionais verificados desta área emitem pareceres.');if(!['dream','card'].includes(d.t)||!getDoc(d.t==='dream'?'dreams':'cards',d.tid))deny(404,'Alvo inexistente.');
    d.author=u.id;d.byName=u.name;d.byRole=u.role===d.kind&&u.verified?(d.kind==='saude'?'Saúde mental, verificado':'História/Antropologia, verificado'):'Admin';d.ts=Date.now();return d}
   if(!adm&&old.author!==u.id)deny(403,'Sem permissão.');d.author=old.author;return d;
  case 'ledger':if(old)deny(403,'Lançamentos são imutáveis.');ledgerRule(d,u);return d;
  case 'requests':if(!old){d.user=u.id;d.name=u.name;d.status='pendente';d.amt=Math.floor(d.amt);delete d.note;delete d.decidedBy;if(!(d.amt>0&&d.amt<=500)||(d.reason||'').length<10)deny(400,'Pedido inválido.');if(allDocs('requests').some(r=>r.user===u.id&&r.status==='pendente'))deny(409,'Você já tem um pedido pendente.');d.ts=Date.now();return d}
   if(!adm)deny(403,'Somente o administrador decide pedidos.');return{...old,status:['aprovado','negado'].includes(d.status)?d.status:old.status,amt:Math.floor(d.amt)||old.amt,note:d.note||'',decidedBy:u.name};
  case 'consults':if(!old){if(!['saude','historia'].includes(d.kind)||!d.topic||(d.q||'').length<10)deny(400,'Consulta inválida.');d.from=u.id;d.status='aberta';d.price=price('consult');if(avail(u.id)<d.price)deny(402,'Créditos insuficientes.');d.ts=Date.now();delete d.answer;delete d.expert;return d}
   if(old.status!=='aberta'||!isPro(u,old.kind)||old.from===u.id)deny(403,'Esta consulta não pode ser respondida por você.');if(!(d.answer||'').trim())deny(400,'Escreva a resposta.');return{...old,status:'respondida',answer:d.answer,expert:u.id,expertName:u.name,answeredAt:Date.now()};
  case 'games':{if(!adm)deny(403,'Somente o administrador gerencia o catálogo.');const sts=['rascunho','pendente','publicado','arquivado'];
   if(!old&&d.kind==='standalone')deny(400,'Jogos standalone entram pela importação (.html ou .zip).');if(!['somnia','standalone','external'].includes(d.kind))d.kind=old?old.kind:'external';
   if(old){d.author=old.author;d.source=old.source;d.extId=old.extId;d.entry=old.entry;d.kind=old.kind;d.content=old.content;d.ts=old.ts;d.plays=old.plays}else{d.author=u.id;d.source='manual';d.extId='';d.entry='';d.content=d.kind==='somnia'?cleanContent(d.content):null;d.ts=Date.now();d.plays=0}
   if(!sts.includes(d.status))d.status=old?old.status:'rascunho';d.title=gstr(d.title,120)||'Sem título';d.desc=gstr(d.desc,2000);d.price=Math.max(0,Math.floor(d.price||0));d.cover=isUp(d.cover)?d.cover:(old?old.cover:'');d.url=/^https?:\/\//i.test(d.url||'')?d.url:'';d.tags=arr(d.tags).slice(0,10);return d}
  case 'connectors':{if(!adm)deny(403,'Somente o administrador gerencia conectores.');if(!/^https?:\/\//i.test(d.url||''))deny(400,'Informe uma URL http(s) válida.');if(!d.name)deny(400,'Informe um nome.');
   const mp={};for(const k of Object.keys(MAPD))if(d.mapping&&typeof d.mapping[k]==='string'&&d.mapping[k])mp[k]=str(d.mapping[k],80);d.mapping=mp;d.format=['generico','somnia'].includes(d.format)?d.format:'generico';d.factor=+d.factor>0?+d.factor:1;
   if(!d.token&&old)d.token=old.token;d.lastSync=old?old.lastSync:0;d.lastResult=old?old.lastResult:null;d.status=old?old.status:'novo';return d}
  case 'ratings':{const g=getDoc('games',d.game);if(!g||g.status!=='publicado')deny(404,'Jogo indisponível.');if(id!==d.game+':'+u.id)deny(403,'Avaliação inválida.');d.user=u.id;d.stars=Math.floor(d.stars);if(!(d.stars>=1&&d.stars<=5))deny(400,'Use de 1 a 5 estrelas.');
   if(g.price&&!adm&&!Q.dupe.get(u.id,'game:'+d.game,g.author&&g.author!=='sys'?g.author:'root'))deny(403,'Desbloqueie o jogo antes de avaliar.');return d}
  default:deny(403,'Sem permissão.')}}
/* ---- marketplace de jogos: importação, execução isolada, conectores ---- */
const GAMES=path.join(DATA,'games');fs.mkdirSync(GAMES,{recursive:true});
let SECRET;try{SECRET=fs.readFileSync(path.join(DATA,'.secret'))}catch(e){SECRET=crypto.randomBytes(32);fs.writeFileSync(path.join(DATA,'.secret'),SECRET,{mode:0o600})}
const sign=p=>crypto.createHmac('sha256',SECRET).update(p).digest('base64url');
const mkTok=(id,exp)=>{const p=Buffer.from(id+'|'+exp).toString('base64url');return p+'.'+sign(p)};
function chkTok(t,id){const[p,s]=String(t).split('.');if(!p||!s||!safeEq(sign(p),s))return false;const[i,e]=Buffer.from(p,'base64url').toString().split('|');return i===id&&+e>Date.now()}
const GEXT=new Set(['html','htm','js','mjs','css','json','txt','md','xml','csv','png','jpg','jpeg','gif','webp','svg','ico','mp3','ogg','wav','m4a','mp4','webm','woff','woff2','ttf','otf','wasm','glb','gltf','bin','atlas','map']);
const newGid=()=>crypto.randomBytes(8).toString('hex');
function unzip(buf){let i=buf.length-22;while(i>=0&&buf.readUInt32LE(i)!==0x06054b50)i--;if(i<0)deny(400,'ZIP inválido.');
 const n=buf.readUInt16LE(i+10);let p=buf.readUInt32LE(i+16),total=0;const out=[];if(n>400)deny(400,'ZIP com arquivos demais (máximo 400).');
 for(let k=0;k<n;k++){if(buf.readUInt32LE(p)!==0x02014b50)deny(400,'ZIP corrompido.');
  const fl=buf.readUInt16LE(p+8),me=buf.readUInt16LE(p+10),cs=buf.readUInt32LE(p+20),us=buf.readUInt32LE(p+24),nl=buf.readUInt16LE(p+28),el=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lo=buf.readUInt32LE(p+42),name=buf.slice(p+46,p+46+nl).toString('utf8');p+=46+nl+el+cl;
  if(name.endsWith('/'))continue;if(fl&1)deny(400,'ZIP criptografado não é suportado.');if(cs===0xffffffff||us===0xffffffff)deny(400,'ZIP64 não é suportado.');
  total+=us;if(us>25*1048576||total>80*1048576)deny(400,'Conteúdo do ZIP grande demais (limite 80 MB).');
  const ds=lo+30+buf.readUInt16LE(lo+26)+buf.readUInt16LE(lo+28),raw=buf.slice(ds,ds+cs);let data;
  if(me===0)data=raw;else if(me===8){try{data=zlib.inflateRawSync(raw,{maxOutputLength:us+1})}catch(e){deny(400,'ZIP corrompido ou maior que o declarado.')}}else deny(400,'Método de compressão não suportado.');
  if(data.length!==us)deny(400,'ZIP inconsistente.');out.push({name,data})}return out}
function safeRel(n){n=n.replace(/\\/g,'/').replace(/^\.\//,'');if(!n||n.startsWith('/')||/(^|\/)\.\.(\/|$)/.test(n)||/^[a-zA-Z]:/.test(n)||n.includes('\0')||n.split('/').some(s=>s.startsWith('.')))return null;return n}
const gstr=(v,n)=>str(v,n).replace(/[<>]/g,'');
function cleanContent(c){c=c&&typeof c==='object'?c:{};return{mode:str(c.mode,20),markdown:str(c.markdown,200000),cards:arr(c.cards).slice(0,200).map(x=>({title:str(x&&x.title,120),deck:str(x&&x.deck,80),rarity:str(x&&x.rarity,20),summary:str(x&&x.summary,500)}))}}
function saveGame(id,g){putDoc('games',id,{title:gstr(g.title,120)||'Sem título',desc:gstr(g.desc,2000),genre:gstr(g.genre,40),tags:arr(g.tags).slice(0,10).map(t=>gstr(t,30)),cover:isUp(g.cover)?g.cover:'',kind:g.kind,source:g.source||'manual',extId:g.extId||'',price:Math.max(0,Math.floor(+g.price||0)),status:g.status||'pendente',author:g.author||'root',entry:g.entry||'',url:/^https?:\/\//i.test(g.url||'')?g.url:'',content:g.content||null,version:gstr(g.version,30),notes:gstr(g.notes,300),ts:g.ts||Date.now(),plays:g.plays||0})}
function importGame(buf,fname,meta,u){const ext=path.extname(fname).toLowerCase().replace('.',''),made=[],warn=[];meta=meta&&typeof meta==='object'?meta:{};
 const base=()=>({title:meta.title,desc:meta.desc,genre:meta.genre,tags:meta.tags,price:meta.price,version:meta.version,author:u.id,status:'pendente'});
 if(ext==='json'){let j;try{j=JSON.parse(buf.toString('utf8'))}catch(e){deny(400,'JSON inválido.')}
  const one=(g)=>{if(!g||typeof g!=='object'||!str(g.title,120))deny(400,'O pacote precisa ter "title".');const id=newGid();saveGame(id,{...g,desc:g.description||g.desc,kind:'somnia',content:cleanContent({mode:g.mode,markdown:g.content||g.markdown,cards:g.cards}),source:'import',author:u.id,status:'pendente'});made.push({id,title:g.title})};
  if(j.format==='somnia-game')one(j);else if(j.format==='somnia-catalog'&&Array.isArray(j.games)){if(j.games.length>200)deny(400,'Catálogo grande demais (máximo 200).');j.games.forEach(one)}else deny(400,'Formato não reconhecido. Use "format": "somnia-game" ou "somnia-catalog".')}
 else if(ext==='csv'){const rows=parseCsv(buf.toString('utf8'));if(rows.length<2)deny(400,'CSV vazio.');if(rows.length>501)deny(400,'CSV grande demais (máximo 500 linhas).');const h=rows[0].map(x=>x.trim().toLowerCase());if(!h.includes('title'))deny(400,'O CSV precisa da coluna "title".');
  rows.slice(1).forEach((r,ix)=>{const o=Object.fromEntries(h.map((k,i)=>[k,r[i]||'']));if(!o.title.trim()){warn.push('Linha '+(ix+2)+' sem título, ignorada.');return}const id=newGid();saveGame(id,{title:o.title,desc:o.description||o.desc,genre:o.genre,tags:(o.tags||'').split(/[;|]/).map(s=>s.trim()).filter(Boolean),price:o.price,url:o.url,kind:'external',source:'csv',author:u.id,status:'pendente'});made.push({id,title:o.title})})}
 else if(ext==='html'||ext==='htm'){const id=newGid(),dir=path.join(GAMES,id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),buf);saveGame(id,{...base(),title:meta.title||path.basename(fname,'.'+ext),kind:'standalone',entry:'index.html',source:'import'});made.push({id,title:meta.title||fname})}
 else if(ext==='zip'){let files=unzip(buf).map(f=>({...f,name:safeRel(f.name)})).filter(f=>f.name);const tops=new Set(files.map(f=>f.name.split('/')[0]));
  if(tops.size===1&&files.every(f=>f.name.includes('/'))){const t=[...tops][0]+'/';files=files.map(f=>({...f,name:f.name.slice(t.length)}))}
  if(!files.some(f=>f.name==='index.html'))deny(400,'O ZIP precisa ter index.html na raiz (ou dentro de uma única pasta).');
  let man={};const mf=files.find(f=>f.name==='somnia.json');if(mf){try{man=JSON.parse(mf.data.toString('utf8'))}catch(e){warn.push('somnia.json inválido, ignorado.')}}
  const id=newGid(),dir=path.join(GAMES,id);fs.mkdirSync(dir,{recursive:true});let coverUp='';
  for(const f of files){const e=path.extname(f.name).toLowerCase().replace('.','');if(!GEXT.has(e)){warn.push('Arquivo ignorado (tipo não permitido): '+f.name);continue}
   const dest=path.join(dir,f.name);if(!dest.startsWith(dir+path.sep))continue;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,f.data);
   if(man.cover&&safeRel(String(man.cover))===f.name&&['png','jpg','jpeg','webp','gif'].includes(e)&&f.data.length<3e6){const n=crypto.randomBytes(16).toString('hex')+'.'+e;fs.writeFileSync(path.join(DATA,'uploads',n),f.data);coverUp='/uploads/'+n}}
  const m2={...man,...meta};saveGame(id,{title:m2.title||'Jogo standalone',desc:m2.description||m2.desc,genre:m2.genre,tags:m2.tags,price:m2.price,version:m2.version,cover:coverUp,kind:'standalone',entry:'index.html',source:'import',author:u.id,status:'pendente'});made.push({id,title:m2.title||'Jogo standalone'})}
 else deny(415,'Formato não suportado. Envie .json (pacote Somnia), .html ou .zip (standalone) ou .csv (lote).');
 return{created:made,warnings:warn}}
function parseCsv(t){const rows=[];let r=[],f='',q=false;t=t.replace(/^\uFEFF/,'');for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}else if(c==='"')q=true;else if(c===','||c===';'){r.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else f+=c}r.push(f);if(r.some(x=>x.trim()))rows.push(r);return rows}
/* conectores (APIs HTTP/JSON de outras bases do ecossistema) */
const isPriv=ip=>{ip=ip.replace(/^::ffff:/i,'');return ip==='::'||/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/i.test(ip)};
async function guardUrl(url){let u;try{u=new URL(url)}catch(e){deny(400,'URL inválida.')}if(!['https:','http:'].includes(u.protocol))deny(400,'Use uma URL http(s).');if(u.protocol==='http:'&&ENV.ALLOW_HTTP_CONNECTORS!=='true')deny(400,'Use https (ou habilite ALLOW_HTTP_CONNECTORS no servidor).');
 if(ENV.ALLOW_PRIVATE_CONNECTORS!=='true'){let a;try{a=await dns.lookup(u.hostname,{all:true})}catch(e){deny(502,'Não foi possível resolver o endereço da fonte.')}if(!a.length||a.some(x=>isPriv(x.address)))deny(400,'Endereço interno bloqueado (habilite ALLOW_PRIVATE_CONNECTORS para fontes na rede privada).')}return u}
async function ext(url,headers,max){await guardUrl(url);const r=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(10000)});if(r.status>=300&&r.status<400)deny(502,'A fonte redirecionou a requisição (não seguimos redirecionamentos).');if(!r.ok)deny(502,'A fonte respondeu HTTP '+r.status+'.');const b=Buffer.from(await r.arrayBuffer());if(b.length>max)deny(502,'Resposta grande demais.');return{b,ct:r.headers.get('content-type')||''}}
const dig=(o,p)=>String(p||'').split('.').filter(Boolean).reduce((a,k)=>a==null?a:a[k],o);
const MAPD={id:'id',title:'title',desc:'description',genre:'genre',tags:'tags',cover:'cover',price:'price',url:'url',version:'version'};
async function syncConnector(id,dry,u){const c=getDoc('connectors',id);if(!c)deny(404,'Conector não encontrado.');const hdr={Accept:'application/json'};
 if(c.token)hdr[c.authHeader||'Authorization']=(c.authHeader&&c.authHeader.toLowerCase()!=='authorization')?c.token:'Bearer '+c.token;
 let res={created:0,updated:0,skipped:0,sample:[],error:''};
 try{const{b}=await ext(c.url,hdr,5e6);let j;try{j=JSON.parse(b.toString('utf8'))}catch(e){deny(502,'A fonte não devolveu JSON válido.')}
  let list=c.listPath?dig(j,c.listPath):j;if(!Array.isArray(list)&&Array.isArray(j&&j.games))list=j.games;if(!Array.isArray(list))deny(502,'Não encontrei a lista de jogos (confira o "caminho da lista").');
  const mp={...MAPD,...(c.format==='somnia'?{desc:'desc'}:{}),...(c.mapping||{})},fac=+c.factor>0?+c.factor:1;let covers=0;
  for(const it of list.slice(0,500)){const eid=str(dig(it,mp.id),120),title=gstr(dig(it,mp.title),120);if(!eid||!title){res.skipped++;continue}
   const gid='x'+crypto.createHash('sha1').update(id+':'+eid).digest('hex').slice(0,16),old=getDoc('games',gid);
   const tags=dig(it,mp.tags),g={title,desc:gstr(dig(it,mp.desc),2000),genre:gstr(dig(it,mp.genre),40),tags:Array.isArray(tags)?tags:String(tags||'').split(/[;,|]/).map(s=>s.trim()).filter(Boolean),url:str(dig(it,mp.url),400),version:gstr(dig(it,mp.version),30)};
   const pr=Math.max(0,Math.round((+dig(it,mp.price)||0)*fac));
   if(res.sample.length<3)res.sample.push({title:g.title,genre:g.genre,price:pr,url:g.url});if(dry)continue;
   let cover=old?old.cover:'';const cu=str(dig(it,mp.cover),400);if(!cover&&/^https?:\/\//i.test(cu)&&covers<60){covers++;try{const{b,ct}=await ext(cu,{Accept:'image/*'},2e6),e=/png/.test(ct)?'png':/jpe?g/.test(ct)?'jpg':/webp/.test(ct)?'webp':/gif/.test(ct)?'gif':'';if(e){const n=crypto.randomBytes(16).toString('hex')+'.'+e;fs.writeFileSync(path.join(DATA,'uploads',n),b);cover='/uploads/'+n}}catch(e){}}
   if(old){saveGame(gid,{...old,...g,cover,kind:'external',source:id,extId:eid,price:old.price,status:old.status,author:old.author,ts:old.ts,plays:old.plays});res.updated++}
   else{saveGame(gid,{...g,cover,kind:'external',source:id,extId:eid,price:pr,status:'pendente',author:'root'});res.created++}}
 }catch(e){res.error=e.status?e.message:'Falha ao sincronizar.';if(!e.status)console.error(e)}
 if(!dry){putDoc('connectors',id,{...c,lastSync:Date.now(),lastResult:{created:res.created,updated:res.updated,skipped:res.skipped,error:res.error},status:res.error?'erro':'ok'});bcast('connectors');bcast('games');audit('connector_sync',u.id,'',id+' '+JSON.stringify({c:res.created,u:res.updated,e:res.error}))}
 return res}
function dirSize(d){let n=0;try{for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);n+=f.isDirectory()?dirSize(p):fs.statSync(p).size}}catch(e){}return n}

/* ---- SSE ---- */
const clients=new Set();const bcast=c=>{for(const r of clients)r.write(`data: ${JSON.stringify({c})}\n\n`)};
setInterval(()=>{for(const r of clients)r.write(': ping\n\n')},25e3).unref();
/* ---- HTTP ---- */
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.pdf':'application/pdf','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.svg':'image/svg+xml','.ico':'image/x-icon','.htm':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.mp4':'video/mp4','.webm':'video/webm','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.xml':'application/xml','.csv':'text/csv; charset=utf-8','.bin':'application/octet-stream','.map':'application/json','.atlas':'text/plain; charset=utf-8'};
const CSP="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'";
const json=(res,s,o)=>{res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const body=(req,lim=1e6)=>new Promise((res,rej)=>{let n=0;const b=[];req.on('data',c=>{n+=c.length;if(n>lim){rej(err(413,'Corpo grande demais.'));req.destroy()}else b.push(c)});req.on('end',()=>res(Buffer.concat(b)));req.on('error',rej)});
const jbody=async req=>{try{return JSON.parse((await body(req)).toString()||'{}')}catch(e){if(e.status)throw e;deny(400,'JSON inválido.')}};
const ipOf=req=>ENV.TRUST_PROXY==='true'?String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.socket.remoteAddress:req.socket.remoteAddress;
function serveFile(res,file,extra){fs.stat(file,(e,st)=>{if(e||!st.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Não encontrado')}
 res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':st.size,...extra});fs.createReadStream(file).pipe(res)})}
/* HTML: permite janelas internas (iframe same-origin) e, em homologação (BASE_PATH), reescreve URLs absolutas */
function serveHtml(res,file){fs.readFile(file,'utf8',(e,t)=>{if(e){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Não encontrado')}
 if(BASE){t=t.replace(/(\s(?:src|href|action)=["'])\/(?!\/)/g,'$1'+BASE+'/').replace(/<head>/i,'<head><script>window.SOMNIA_BASE='+JSON.stringify(BASE)+'</script><script src="'+BASE+'/base.js"></script><meta name="robots" content="noindex">')}
 const b=Buffer.from(t);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':b.length,'Content-Security-Policy':CSP.replace("frame-ancestors 'none'","frame-ancestors 'self'"),'X-Frame-Options':'SAMEORIGIN','Cache-Control':'no-cache'});res.end(b)})}
async function callAI(prompt,max){if(!ENV.ANTHROPIC_API_KEY)deny(503,'IA não configurada neste servidor.');
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':ENV.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:ENV.ANTHROPIC_MODEL||'claude-sonnet-5-5',max_tokens:max||4000,messages:[{role:'user',content:prompt}]}),signal:AbortSignal.timeout(90000)});
 const j=await r.json().catch(()=>({}));if(!r.ok){console.error('[IA]',r.status,j&&j.error&&j.error.message);deny(502,'Falha ao consultar a IA.')}return (j.content||[]).map(x=>x.text||'').join('')}
const MITOS=require('./src/mitos.js')({db,getDoc,putDoc,allDocs,deny,jbody,json,limit,sessUser,isPro,bcast,audit,callAI,ROOT,ENV});
async function api(req,res,url){const ip=ipOf(req),p=url.pathname;
 if(req.method!=='GET'&&req.headers['x-requested-with']!=='somnia')deny(403,'Cabeçalho obrigatório ausente.');
 if(p==='/api/auth/me'){const u=sessUser(req);return json(res,200,{user:u&&{id:u.id,name:u.name,role:u.role,admin:u.admin},ai:!!ENV.ANTHROPIC_API_KEY,version:VERSION,env:BASE?'teste':'producao'})}
 if(p==='/api/auth/register'&&req.method==='POST'){limit('reg:'+ip,10,36e5);const b=await jbody(req),id=str(b.u,20).trim().toLowerCase(),name=str(b.name,60).trim()||id,pw=str(b.p,200);
  if(!/^[a-z0-9_]{3,20}$/.test(id))deny(400,'Usuário: 3 a 20 letras minúsculas, números ou _.');if(['root','sys'].includes(id))deny(400,'Nome reservado.');if(pw.length<8)deny(400,'A senha precisa de ao menos 8 caracteres.');if(Q.acc.get(id))deny(409,'Esse usuário já existe.');
  await setPassword(id,name,pw);ensureUserDoc(id,name,'membro',false);putDoc('ledger','start-'+id,{from:'sys',to:id,amt:price('start'),reason:'Boas-vindas',ref:'start:'+id,ts:Date.now()});audit('register',id,ip);
  setCookie(res,newSession(id),604800);bcast('accounts');bcast('users');bcast('ledger');return json(res,200,{user:{id,name}})}
 if(p==='/api/auth/login'&&req.method==='POST'){const b=await jbody(req),id=str(b.u,20).trim().toLowerCase();limit('login:'+ip,20,9e5);limit('login:'+id,6,9e5);const a=Q.acc.get(id);
  if(!a||!safeEq(await scrypt(str(b.p,200),a.salt),a.hash)){audit('login_fail',id,ip);deny(401,'Usuário ou senha incorretos.')}
  const u=userOf(id);if(u.status==='suspenso'){audit('login_blocked',id,ip);deny(403,'Conta suspensa. Fale com o administrador.')}
  const d=getDoc('users',id);if(d){d.last=Date.now();putDoc('users',id,d)}audit('login',id,ip);setCookie(res,newSession(id),604800);return json(res,200,{user:{id,name:a.name}})}
 if(p==='/api/auth/logout'&&req.method==='POST'){const t=cookieOf(req)[CK];if(t)db.prepare('DELETE FROM sessions WHERE t=?').run(t);setCookie(res,'',0);return json(res,200,{ok:true})}
 if(await MITOS(req,res,url,ip))return;
 const u=sessUser(req);if(!u)deny(401,'Faça login para continuar.');
 if(p==='/api/auth/password'&&req.method==='POST'){limit('pw:'+u.id,5,36e5);const b=await jbody(req),a=Q.acc.get(u.id);if(!safeEq(await scrypt(str(b.old,200),a.salt),a.hash))deny(401,'Senha atual incorreta.');if(str(b.new,200).length<8)deny(400,'A nova senha precisa de ao menos 8 caracteres.');
  await setPassword(u.id,a.name,str(b.new,200));db.prepare('DELETE FROM sessions WHERE u=? AND t<>?').run(u.id,cookieOf(req)[CK]);audit('password',u.id,ip);return json(res,200,{ok:true})}
 if(p==='/api/stream'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store',Connection:'keep-alive','X-Accel-Buffering':'no'});res.write(': ok\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return}
 if(p==='/api/db'){const c=url.searchParams.get('c')||'',id=url.searchParams.get('id')||'';if(!/^[A-Za-z0-9_\-\/]{1,80}$/.test(c))deny(400,'Coleção inválida.');
  if(req.method==='GET')return json(res,200,readRows(c,u));
  if(!/^[A-Za-z0-9_\-:.]{1,80}$/.test(id))deny(400,'Id inválido.');
  if(req.method==='PUT'){limit('w:'+u.id,300,6e4);const d=applyWrite('set',c,id,await jbody(req),u);putDoc(c,id,d);if(u.admin&&['users','config','requests','ledger'].includes(c))audit('admin:'+c,u.id,ip,id);bcast(c);if(c==='ledger'){bcast('cards');bcast('dreams');bcast('pareceres');bcast('games')}return json(res,200,{ok:true})}
  if(req.method==='DELETE'){applyWrite('delete',c,id,null,u);Q.del.run(c,id);if(c==='games'&&/^[a-f0-9]{16}$/.test(id))fs.rmSync(path.join(GAMES,id),{recursive:true,force:true});bcast(c);return json(res,200,{ok:true})}}
 if(p==='/api/games/import'&&req.method==='POST'){if(!u.admin)deny(403,'Somente o administrador importa jogos.');limit('imp:'+u.id,30,36e5);let meta={};try{meta=JSON.parse(decodeURIComponent(req.headers['x-meta']||'{}'))}catch(e){}
  const buf=await body(req,60*1048576),r=importGame(buf,decodeURIComponent(req.headers['x-filename']||'arquivo'),meta,u);audit('game_import',u.id,ip,r.created.map(x=>x.title).join(', '));bcast('games');return json(res,200,r)}
 if(p==='/api/games/play'&&req.method==='POST'){const b=await jbody(req),g=getDoc('games',str(b.id,40));if(!g||g.kind!=='standalone'||(g.status!=='publicado'&&!u.admin))deny(404,'Jogo indisponível.');
  if(g.price&&!u.admin&&!Q.dupe.get(u.id,'game:'+b.id,g.author&&g.author!=='sys'?g.author:'root'))deny(402,'Desbloqueie o jogo para jogar.');g.plays=(g.plays||0)+1;putDoc('games',b.id,g);return json(res,200,{url:'/g/'+mkTok(b.id,Date.now()+6*36e5)+'/'+b.id+'/'+g.entry})}
 if(p==='/api/games/connector'&&req.method==='POST'){if(!u.admin)deny(403,'Somente o administrador usa conectores.');limit('conn:'+u.id,30,36e5);const b=await jbody(req);return json(res,200,await syncConnector(str(b.id,80),!!b.dry,u))}
 if(p==='/api/admin/stats'&&req.method==='GET'){if(!u.admin)deny(403,'Somente o administrador.');return json(res,200,{audit:db.prepare('SELECT ts,u,ip,ev,d FROM audit ORDER BY id DESC LIMIT 15').all(),disk:{uploads:dirSize(path.join(DATA,'uploads')),games:dirSize(GAMES)},node:process.version,uptime:Math.round(process.uptime()),ai:!!ENV.ANTHROPIC_API_KEY,docs:db.prepare('SELECT COUNT(*) AS n FROM docs').get().n})}
 if(p==='/api/ai'&&req.method==='POST'){if(!ENV.ANTHROPIC_API_KEY)deny(503,'IA não configurada neste servidor.');limit('ai:'+u.id,+ENV.AI_PER_HOUR||30,36e5);const b=await jbody(req),pr=str(b.prompt,60000);if(!pr)deny(400,'Prompt vazio.');
  try{return json(res,200,{text:await callAI(pr,4000)})}catch(e){audit('ai_error',u.id,ip,e.status||'');throw e}}
 if(p==='/api/upload'&&req.method==='POST'){limit('up:'+u.id,30,36e5);const ext=path.extname(str(decodeURIComponent(req.headers['x-filename']||''),120)).toLowerCase().replace('.','');if(!['png','jpg','jpeg','gif','webp','pdf','mp3','wav','ogg','m4a'].includes(ext))deny(415,'Tipo de arquivo não permitido.');
  const buf=await body(req,20*1024*1024),name=crypto.randomBytes(16).toString('hex')+'.'+ext;fs.writeFileSync(path.join(DATA,'uploads',name),buf);return json(res,200,{url:'/uploads/'+name})}
 deny(404,'Rota não encontrada.')}
const srv=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://x');if(BASE){if(url.pathname===BASE){res.writeHead(301,{Location:BASE+'/'});return res.end()}if(url.pathname.startsWith(BASE+'/'))url.pathname=url.pathname.slice(BASE.length)}res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
 if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 if(url.pathname==='/healthz'){res.writeHead(200);return res.end('ok')}
 if(url.pathname==='/versao'){return json(res,200,{version:VERSION,env:BASE?'teste':'producao'})}
 {const gm=/^\/g\/([A-Za-z0-9_\-.]+)\/([a-f0-9]{16})\/(.+)$/.exec(url.pathname);if(gm){let rel;try{rel=safeRel(decodeURIComponent(gm[3]))}catch(e){}if(!rel||!chkTok(gm[1],gm[2])){res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Acesso negado ou link expirado.')}
   const dir=path.join(GAMES,gm[2]),f=path.resolve(dir,rel);if(!f.startsWith(dir+path.sep))return serveFile(res,'/nonexistent');res.setHeader('X-Frame-Options','SAMEORIGIN');
   return serveFile(res,f,{'Content-Security-Policy':"sandbox allow-scripts allow-pointer-lock allow-fullscreen; default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' data: blob:; frame-ancestors 'self'",'Access-Control-Allow-Origin':'*','Cross-Origin-Resource-Policy':'cross-origin','Cache-Control':'private, max-age=300'})}}
 if(url.pathname.startsWith('/uploads/')){const f=path.resolve(DATA,'uploads',path.basename(url.pathname));return serveFile(res,f,{'Cache-Control':'public, max-age=86400','Content-Disposition':'inline'})}
 let rel=url.pathname==='/'||url.pathname==='/hub'||url.pathname==='/hub/'?'/hub/index.html':url.pathname==='/app'||url.pathname==='/app/'?'/index.html':url.pathname==='/manual'?'/manual.html':url.pathname==='/mascote'?'/mascote.html':url.pathname;const f=path.resolve(ROOT,'public','.'+rel);if(!f.startsWith(path.resolve(ROOT,'public')+path.sep))return serveFile(res,'/nonexistent');
 if(f.endsWith('.html'))return serveHtml(res,f);
 return serveFile(res,f,{'Content-Security-Policy':CSP,'Cache-Control':'no-cache'})
}catch(e){if(res.headersSent){try{res.end()}catch(x){}return}const s=e.status||500;if(s>=500)console.error(e);json(res,s,{error:s>=500?'Erro interno do servidor.':e.message})}});
(async()=>{
 if(process.argv.includes('--reset-root')){let pw=ENV.NEW_ROOT_PASSWORD;if(!pw){const rl=require('readline').createInterface({input:process.stdin,output:process.stdout});pw=await new Promise(r=>rl.question('Nova senha do root (min. 8): ',a=>{rl.close();r(a)}))}
  if(!pw||pw.length<8){console.error('Senha muito curta.');process.exit(1)}await setPassword('root','Root',pw);ensureUserDoc('root','Root','admin',true);db.prepare("DELETE FROM sessions WHERE u='root'").run();console.log('Senha do root atualizada.');process.exit(0)}
 await initRoot();srv.listen(PORT,HOST,()=>console.log(`[SOMNIA] ouvindo em http://${HOST}:${PORT}  (dados: ${DATA})`+(ENV.ANTHROPIC_API_KEY?'':'  | IA desativada (sem ANTHROPIC_API_KEY)')))})();
