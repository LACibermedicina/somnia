/* Somnia - camada de compatibilidade: expõe window.claude.use('db'|'user'|'sample'|'assets'|'downloads')
   falando com o servidor (server.js). Carregado ANTES do app. */
(function(){
try{sessionStorage.removeItem('somnia-sess')}catch(e){}
const SM=window.SOMNIA={loggedIn:false,lastError:'',subs:[],es:null};
SM.api=async function(m,u,b){const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json','X-Requested-With':'somnia'},credentials:'same-origin',body:b===undefined?undefined:JSON.stringify(b)});
 let j=null;try{j=await r.json()}catch(e){}
 if(!r.ok){const e=new Error((j&&j.error)||('Erro '+r.status));e.status=r.status;if(r.status===401&&SM.loggedIn&&!u.startsWith('/api/auth')){alert('Sua sessão expirou. Entre novamente.');location.reload()}throw e}return j};
const snap=rows=>({docs:rows.map(r=>{const{id,...d}=r;return{id,data:()=>d}}),size:rows.length});
const dsnap=(rows,id)=>{const r=rows.find(x=>x.id===id);if(!r)return{exists:false,id,data:()=>undefined};const{id:_,...d}=r;return{exists:true,id,data:()=>d}};
async function load(s){try{const rows=await SM.api('GET','/api/db?c='+encodeURIComponent(s.c));s.cb(s.id?dsnap(rows,s.id):snap(rows))}catch(e){if(s.err)s.err(e)}}
SM.raw=async function(u,body,headers){const r=await fetch(u,{method:'POST',credentials:'same-origin',headers:{'X-Requested-With':'somnia','Content-Type':'application/octet-stream',...(headers||{})},body});let j=null;try{j=await r.json()}catch(e){}if(!r.ok)throw new Error((j&&j.error)||('Erro '+r.status));return j};
SM.reload=()=>Promise.all(SM.subs.map(load));
const pend={};
SM.start=function(){SM.loggedIn=true;if(SM.es)SM.es.close();SM.es=new EventSource('/api/stream');
 SM.es.onmessage=ev=>{try{const m=JSON.parse(ev.data);clearTimeout(pend[m.c]);pend[m.c]=setTimeout(()=>SM.subs.filter(s=>s.c===m.c).forEach(load),150)}catch(e){}}};
const fail=e=>{SM.lastError=e.message;throw e};
const DB={collection:c=>({
 doc:id=>({set:async d=>{try{await SM.api('PUT','/api/db?c='+encodeURIComponent(c)+'&id='+encodeURIComponent(id),d);return true}catch(e){fail(e)}},
  delete:async()=>{try{await SM.api('DELETE','/api/db?c='+encodeURIComponent(c)+'&id='+encodeURIComponent(id));return true}catch(e){fail(e)}},
  onSnapshot:(cb,err)=>{const s={c,id,cb,err};SM.subs.push(s);load(s);return()=>{const i=SM.subs.indexOf(s);if(i>=0)SM.subs.splice(i,1)}}}),
 onSnapshot:(cb,err)=>{const s={c,cb,err};SM.subs.push(s);load(s);return()=>{const i=SM.subs.indexOf(s);if(i>=0)SM.subs.splice(i,1)}}})};
let ME=null;const me=()=>ME||(ME=SM.api('GET','/api/auth/me').catch(()=>({user:null,ai:false})));
window.claude={use:async n=>{
 if(n==='db')return DB;
 if(n==='user'){const m=await me();return{me:async()=>({name:m.user?m.user.name:'Visitante',id:m.user?m.user.id:'local'}),canEdit:async()=>false,id:async()=>m.user?m.user.id:'local'}}
 if(n==='sample'){const m=await me();if(!m.ai)return null;return{json:async prompt=>{const r=await SM.api('POST','/api/ai',{prompt:prompt+'\n\nResponda somente com JSON válido, sem markdown e sem texto extra.'});const t=String(r.text||'').trim().replace(/^```(?:json)?\s*|\s*```$/g,'');try{return JSON.parse(t)}catch(e){const x=t.match(/[\[{][\s\S]*[\]}]/);return JSON.parse(x[0])}}}}
 if(n==='assets')return{upload:async f=>{const r=await fetch('/api/upload',{method:'POST',credentials:'same-origin',headers:{'X-Requested-With':'somnia','X-Filename':encodeURIComponent(f.name),'Content-Type':'application/octet-stream'},body:f});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Falha no envio');return{url:j.url}}};
 if(n==='downloads')return{save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data],{type:'text/markdown;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}};
 return null}};
})();
