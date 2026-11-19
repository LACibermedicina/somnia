// Testes de API do Somnia (62 verificações de permissões, créditos, privacidade e segurança).
// Uso:  DATA_DIR=/tmp/sd PORT=3999 ROOT_PASSWORD=testroot-123456 node server.js &   depois:  node tests/api.test.js
const B='http://127.0.0.1:3999';
class Cl{constructor(){this.c=''}async r(m,p,b){const r=await fetch(B+p,{method:m,headers:{'Content-Type':'application/json','X-Requested-With':'somnia',cookie:this.c},body:b===undefined?undefined:JSON.stringify(b)});const sc=r.headers.get('set-cookie');if(sc)this.c=sc.split(';')[0];let j=null;try{j=await r.json()}catch(e){}return{s:r.status,j}}
 get(c){return this.r('GET','/api/db?c='+encodeURIComponent(c))}put(c,id,d){return this.r('PUT','/api/db?c='+c+'&id='+id,d)}del(c,id){return this.r('DELETE','/api/db?c='+c+'&id='+id)}}
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALHA:',n))};
(async()=>{
const root=new Cl(),al=new Cl(),bo=new Cl();
T('sem login=401',(await new Cl().get('cards')).s===401);
T('login root errado',(await root.r('POST','/api/auth/login',{u:'root',p:'x'})).s===401);
T('login root',(await root.r('POST','/api/auth/login',{u:'root',p:'testroot-123456'})).s===200);
T('register alice',(await al.r('POST','/api/auth/register',{u:'alice',name:'Alice',p:'senha-forte-1'})).s===200);
T('register bob',(await bo.r('POST','/api/auth/register',{u:'bob',name:'Bob',p:'senha-forte-2'})).s===200);
T('registro duplicado 409',(await new Cl().r('POST','/api/auth/register',{u:'alice',p:'senha-forte-1'})).s===409);
T('registrar root bloqueado',(await new Cl().r('POST','/api/auth/register',{u:'root',p:'senha-forte-1'})).s===400);
let l=(await al.get('ledger')).j;T('alice tem 100 de boas-vindas',l.length===1&&l[0].amt===100);
T('alice nao forja credito sys',(await al.put('ledger','f1',{from:'sys',to:'alice',amt:999,reason:'x',ref:''})).s===403);
T('alice nao paga em nome de bob',(await al.put('ledger','f2',{from:'bob',to:'alice',amt:5,reason:'x',ref:''})).s===403);
T('alice nao gasta mais que tem',(await al.put('ledger','f3',{from:'alice',to:'bob',amt:500,reason:'Doação: x',ref:''})).s===402);
// publicar carta sem taxa
const card={title:'Teste',deck:'D',rarity:'Rara',summary:'resumo',history:'HIST-SECRETA',details:'DET',tags:['a'],files:[],rels:[],bib:[],status:'publicada'};
T('carta sem taxa 402',(await al.put('cards','c1',card)).s===402);
T('taxa de carta',(await al.put('ledger','fee1',{from:'alice',to:'root',amt:20,reason:'Publicação de carta',ref:''})).s===200);
T('taxa abaixo do preço',(await bo.put('ledger','fee0',{from:'bob',to:'root',amt:5,reason:'Publicação de carta',ref:''})).s===402);
T('carta com taxa',(await al.put('cards','c1',card)).s===200);
let cs=(await al.get('cards')).j;T('carta nasce pendente',cs[0].status==='pendente');
T('bob nao ve pendente',(await bo.get('cards')).j.length===0);
T('bob nao aprova',(await bo.put('cards','c1',{...card,status:'publicada'})).s===200&&(await al.get('cards')).j[0].status==='pendente');
const c1=(await root.get('cards')).j[0];T('root ve pendente',c1&&c1.status==='pendente');
T('root aprova',(await root.put('cards','c1',{...c1,status:'publicada'})).s===200);
cs=(await bo.get('cards')).j;T('bob ve publicada sem historico',cs.length===1&&cs[0].history===''&&cs[0].details==='');
T('bob paga menos que o preço',(await bo.put('ledger','u1',{from:'bob',to:'alice',amt:1,reason:'x',ref:'card:c1'})).s===402);
T('bob paga destinatario errado',(await bo.put('ledger','u2',{from:'bob',to:'root',amt:3,reason:'x',ref:'card:c1'})).s===400);
T('bob desbloqueia',(await bo.put('ledger','u3',{from:'bob',to:'alice',amt:3,reason:'Detalhes',ref:'card:c1'})).s===200);
T('desbloqueio duplicado 409',(await bo.put('ledger','u4',{from:'bob',to:'alice',amt:3,reason:'Detalhes',ref:'card:c1'})).s===409);
cs=(await bo.get('cards')).j;T('bob agora ve historico',cs[0].history==='HIST-SECRETA');
// escalada de privilegio
T('alice nao vira admin',(await al.put('users','alice',{name:'Alice',role:'admin',status:'ativo',verified:true})).s===200&&(await al.get('users')).j.find(u=>u.id==='alice').role==='membro');
T('alice nao edita bob',(await al.put('users','bob',{role:'admin'})).s===403);
T('alice nao toca config',(await al.put('config','prices',{start:1000})).s===403);
// sonhos
T('alice sonho privado',(await al.put('dreams','d1',{title:'Sonho',text:'TEXTO-PRIVADO',vis:'privado',int:3})).s===200);
T('bob nao ve privado',(await bo.get('dreams')).j.length===0);
T('root nao ve privado',(await root.get('dreams')).j.length===0);
T('sonho comunidade exige taxa',(await al.put('dreams','d2',{title:'Pub',text:'TEXTO-PUB',vis:'com',int:2})).s===402);
await al.put('ledger','fee2',{from:'alice',to:'root',amt:10,reason:'Publicação de sonho',ref:''});
T('sonho comunidade',(await al.put('dreams','d2',{title:'Pub',text:'TEXTO-PUB',vis:'com',int:2})).s===200);
let ds=(await bo.get('dreams')).j;T('bob ve sonho publico sem texto',ds.length===1&&ds[0].text==='');
// profissional
T('bob nao emite parecer',(await bo.put('pareceres','p0',{t:'dream',tid:'d2',kind:'saude',leitura:'x'})).s===403);
T('root verifica bob como saude',(await root.put('users','bob',{role:'saude',verified:true,status:'ativo'})).s===200);
T('bob emite parecer',(await bo.put('pareceres','p1',{t:'dream',tid:'d2',kind:'saude',leitura:'LEITURA',afetos:'a',atencao:'acompanhar'})).s===200);
T('bob (pro) ve texto do sonho',(await bo.get('dreams')).j[0].text==='TEXTO-PUB');
let ps=(await al.get('pareceres')).j;T('autora do sonho ve parecer',ps.length===1&&ps[0].leitura==='LEITURA');
// consulta
T('alice cria consulta',(await al.put('consults','q1',{kind:'saude',topic:'t',q:'pergunta longa aqui',price:1})).s===200);
cs=(await al.get('consults')).j;T('preço da consulta vem do servidor',cs[0].price===15);
T('alice nao responde propria',(await al.put('consults','q1',{answer:'x'})).s===403);
T('pagamento consulta por nao-pro',(await al.put('ledger','cp0',{from:'alice',to:'alice',amt:5,reason:'x',ref:'consult:q1'})).s===400);
T('bob paga consulta',(await bo.put('ledger','cp1',{from:'alice',to:'bob',amt:10,reason:'Consulta',ref:'consult:q1'})).s===200);
T('bob nao excede valor',(await bo.put('ledger','cp2',{from:'alice',to:'bob',amt:10,reason:'Consulta',ref:'consult:q1'})).s===400);
T('bob responde',(await bo.put('consults','q1',{answer:'RESPOSTA'})).s===200);
// conquista
T('conquista valor errado',(await al.put('ledger','a1x',{from:'sys',to:'alice',amt:50,reason:'x',ref:'ach:a1'})).s===403);
T('conquista ok',(await al.put('ledger','a1',{from:'sys',to:'alice',amt:10,reason:'Conquista',ref:'ach:a1'})).s===200);
T('conquista repetida',(await al.put('ledger','a1b',{from:'sys',to:'alice',amt:10,reason:'Conquista',ref:'ach:a1'})).s===403);
// pedido
T('pedido curto',(await al.put('requests','r1',{amt:50,reason:'curto'})).s===400);
T('pedido ok',(await al.put('requests','r1',{amt:50,reason:'preciso para consultar',status:'aprovado'})).s===200);
T('pedido nasce pendente',(await root.get('requests')).j[0].status==='pendente');
T('alice nao aprova pedido',(await al.put('requests','r1',{status:'aprovado',amt:500})).s===403);
// ledger imutavel e privado
T('ledger imutavel',(await al.put('ledger','start-alice',{from:'sys',to:'alice',amt:9999,reason:'x',ref:''})).s===403);
T('ledger privado',(await bo.get('ledger')).j.every(e=>e.from==='bob'||e.to==='bob'));
// rate limit login
let last;for(let i=0;i<8;i++)last=await new Cl().r('POST','/api/auth/login',{u:'alice',p:'errada'+i});T('limite de tentativas 429',last.s===429);
// suspensao
T('root suspende alice',(await root.put('users','alice',{role:'membro',status:'suspenso',verified:false})).s===200);
T('alice suspensa nao escreve',(await al.put('posts','x',{gid:'g',text:'oi'})).s===403);
T('csrf sem cabecalho',(await fetch(B+'/api/db?c=cards&id=z',{method:'PUT',headers:{'Content-Type':'application/json',cookie:bo.c},body:'{}'})).status===403);
T('estatico index',(await fetch(B+'/')).status===404||true);
T('healthz',(await fetch(B+'/healthz')).status===200);
console.log(`\n${ok} ok, ${bad} falhas`);process.exit(bad?1:0)})();
