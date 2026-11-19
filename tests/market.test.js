// Testes do marketplace: importação (JSON/HTML/ZIP/CSV), execução isolada, compra, avaliação e conectores.
// Uso: node tests/market.test.js   (sobe os próprios servidores temporários)
const {spawn}=require('child_process'),http=require('http'),zlib=require('zlib'),fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALHA:',n))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function startSrv(port,extra){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'somnia-'));const p=spawn('node',[path.join(ROOT,'server.js')],{env:{...process.env,PORT:port,DATA_DIR:dir,ROOT_PASSWORD:'testroot-123456',...extra},stdio:'ignore'});return{p,dir,B:'http://127.0.0.1:'+port}}
class Cl{constructor(B){this.B=B;this.c=''}async r(m,u,b,h){const raw=Buffer.isBuffer(b);const r=await fetch(this.B+u,{method:m,headers:{'X-Requested-With':'somnia',cookie:this.c,...(raw?{}:{'Content-Type':'application/json'}),...(h||{})},body:b===undefined?undefined:raw?b:JSON.stringify(b)});const sc=r.headers.get('set-cookie');if(sc)this.c=sc.split(';')[0];let j=null;const t=await r.text();try{j=JSON.parse(t)}catch(e){j=t}return{s:r.status,j,h:r.headers}}
 get(c){return this.r('GET','/api/db?c='+c)}put(c,id,d){return this.r('PUT','/api/db?c='+c+'&id='+id,d)}imp(name,buf,meta){return this.r('POST','/api/games/import',buf,{'X-Filename':encodeURIComponent(name),'X-Meta':encodeURIComponent(JSON.stringify(meta||{}))})}}
function crc(b){return zlib.crc32?zlib.crc32(b):0}
function zip(files,method=8){const loc=[],cen=[];let off=0;for(const[n,d]of files){const nm=Buffer.from(n),raw=Buffer.isBuffer(d)?d:Buffer.from(d),comp=method===8?zlib.deflateRawSync(raw):raw,c=crc(raw);
 const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(method,8);lh.writeUInt32LE(c>>>0,14);lh.writeUInt32LE(comp.length,18);lh.writeUInt32LE(raw.length,22);lh.writeUInt16LE(nm.length,26);loc.push(lh,nm,comp);
 const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(method,10);ch.writeUInt32LE(c>>>0,16);ch.writeUInt32LE(comp.length,20);ch.writeUInt32LE(raw.length,24);ch.writeUInt16LE(nm.length,28);ch.writeUInt32LE(off,42);cen.push(ch,nm);off+=30+nm.length+comp.length}
 const cd=Buffer.concat(cen),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(files.length,8);e.writeUInt16LE(files.length,10);e.writeUInt32LE(cd.length,12);e.writeUInt32LE(off,16);return Buffer.concat([...loc,cd,e])}
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
(async()=>{
 // ---- mock de uma base externa (ecossistema) ----
 const seen=[];const mock=http.createServer((q,s)=>{seen.push(q.headers.authorization||'');if(q.url==='/catalog')s.end(JSON.stringify({data:{items:[{gid:'g1',name:'Nave Rápida',summary:'Arcade espacial',category:'Arcade',price:2.5,img:'http://127.0.0.1:4001/c.png',play:'https://exemplo.com/nave'},{gid:'g2',name:'Labirinto',summary:'Puzzle',category:'Puzzle',price:0},{name:'sem id'}]}}));else if(q.url==='/c.png'){s.setHeader('Content-Type','image/png');s.end(PNG)}else if(q.url==='/redir'){s.writeHead(302,{Location:'http://127.0.0.1:4001/catalog'});s.end()}else{s.writeHead(404);s.end()}}).listen(4001);
 const A=startSrv(3997,{}),Bs=startSrv(3996,{ALLOW_PRIVATE_CONNECTORS:'true',ALLOW_HTTP_CONNECTORS:'true'});await sleep(1800);
 for(const S of[A]){
  const root=new Cl(S.B),bob=new Cl(S.B);
  T('root entra',(await root.r('POST','/api/auth/login',{u:'root',p:'testroot-123456'})).s===200);
  T('bob cadastra',(await bob.r('POST','/api/auth/register',{u:'bob',name:'Bob',p:'senha-forte-2'})).s===200);
  T('não-admin não importa',(await bob.imp('x.json',Buffer.from('{}'))).s===403);
  // ---- importação ----
  let r=await root.imp('p.json',Buffer.from(JSON.stringify({format:'somnia-game',title:'Base RPG Onírica',description:'Aventura de mesa',genre:'RPG',mode:'rpg',content:'# Regras\nSegredo do jogo',cards:[{title:'Mara',deck:'Sono',rarity:'Rara',summary:'x'}]})));
  T('importa pacote Somnia',r.s===200&&r.j.created.length===1);const idS=r.j.created[0]&&r.j.created[0].id;
  T('catálogo Somnia em lote',(await root.imp('c.json',Buffer.from(JSON.stringify({format:'somnia-catalog',games:[{title:'A'},{title:'B'}]})))).j.created.length===2);
  T('JSON sem formato é recusado',(await root.imp('z.json',Buffer.from('{"title":"x"}'))).s===400);
  r=await root.imp('jogo.html',Buffer.from('<html><body>JOGO-HTML</body></html>'),{title:'Mini HTML',price:5,genre:'Arcade'});const idH=r.j.created[0]&&r.j.created[0].id;T('importa HTML standalone',r.s===200&&idH);
  const zf=[['meujogo/index.html','<html><script src="game.js"></script>ZIP-GAME</html>'],['meujogo/game.js','console.log(1)'],['meujogo/capa.png',PNG],['meujogo/somnia.json',JSON.stringify({title:'Zip Aventura',description:'Jogo em ZIP',genre:'Aventura',price:3,cover:'capa.png'})],['meujogo/virus.exe','MZ'],['../evil.html','x'],['meujogo/.env','SEGREDO']];
  r=await root.imp('jogo.zip',zip(zf));T('importa ZIP (deflate) com pasta raiz e manifesto',r.s===200&&r.j.created[0].title==='Zip Aventura');const idZ=r.j.created[0]&&r.j.created[0].id;
  T('ZIP ignora tipos proibidos e avisa',r.j.warnings.some(w=>/virus\.exe/.test(w)));
  T('zip-slip e ocultos não são gravados',!fs.existsSync(path.join(S.dir,'evil.html'))&&!fs.existsSync(path.join(S.dir,'games','evil.html'))&&!fs.existsSync(path.join(S.dir,'games',idZ,'.env')));
  T('ZIP em modo "stored" funciona',(await root.imp('s.zip',zip([['index.html','<b>ok</b>']],0))).s===200);
  T('ZIP sem index.html é recusado',(await root.imp('n.zip',zip([['a.js','1']]))).s===400);
  T('extensão desconhecida é recusada',(await root.imp('a.exe',Buffer.from('x'))).s===415);
  const bomb=zip([['index.html','A'.repeat(5000)]]);const cd=bomb.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));bomb.writeUInt32LE(10,cd+24);
  T('ZIP com tamanho declarado falso é recusado',(await root.imp('b.zip',bomb)).s===400);
  r=await root.imp('l.csv',Buffer.from('title,description,genre,price,url\nCsv Um,Desc,Puzzle,4,https://a.com/x\n,sem titulo,x,0,\n"Csv, Dois",d2,RPG,0,'));T('importa CSV em lote',r.j.created.length===2&&r.j.warnings.length===1);
  // ---- publicação e visibilidade ----
  const g=(await root.get('games')).j;T('admin vê rascunhos/pendentes',g.length>=8&&g.every(x=>x.status==='pendente'));
  T('bob não vê pendentes',(await bob.get('games')).j.length===0);
  const zdoc=g.find(x=>x.id===idZ);T('capa do ZIP virou upload público',/^\/uploads\/[a-f0-9]+\.png$/.test(zdoc.cover)&&(await fetch(S.B+zdoc.cover)).status===200);
  const pub=async(id,price)=>{const d=(await root.get('games')).j.find(x=>x.id===id);return root.put('games',id,{...d,status:'publicado',price})};
  T('admin publica',(await pub(idZ,3)).s===200);await pub(idS,4);await pub(idH,0);
  T('não-admin não edita catálogo',(await bob.put('games',idZ,{title:'hack',kind:'standalone',status:'publicado',price:0})).s===403);
  const bl=(await bob.get('games')).j;const bz=bl.find(x=>x.id===idZ),bs=bl.find(x=>x.id===idS);T('bob vê 3 publicados',bl.length===3);
  T('conteúdo pago vem oculto',bs.content===null&&bs.owned===false);
  T('jogo grátis pode ser jogado',(await bob.r('POST','/api/games/play',{id:idH})).s===200);
  T('jogo pago exige compra',(await bob.r('POST','/api/games/play',{id:idZ})).s===402);
  T('compra abaixo do preço',(await bob.put('ledger','b1',{from:'bob',to:'root',amt:1,reason:'Jogo',ref:'game:'+idZ})).s===402);
  T('compra para destinatário errado',(await bob.put('ledger','b2',{from:'bob',to:'bob',amt:3,reason:'Jogo',ref:'game:'+idZ})).s===400);
  T('compra correta',(await bob.put('ledger','b3',{from:'bob',to:'root',amt:3,reason:'Jogo: Zip',ref:'game:'+idZ})).s===200);
  T('compra duplicada recusada',(await bob.put('ledger','b4',{from:'bob',to:'root',amt:3,reason:'Jogo: Zip',ref:'game:'+idZ})).s===409);
  r=await bob.r('POST','/api/games/play',{id:idZ});T('após a compra recebe link de execução',r.s===200&&/^\/g\/[^/]+\/[a-f0-9]{16}\/index\.html$/.test(r.j.url));
  const gr=await fetch(S.B+r.j.url);const csp=gr.headers.get('content-security-policy')||'';T('jogo servido em sandbox (sem cookies/API)',gr.status===200&&/^sandbox allow-scripts/.test(csp)&&!/allow-same-origin/.test(csp)&&gr.headers.get('x-frame-options')==='SAMEORIGIN'&&(await gr.text()).includes('ZIP-GAME'));
  T('arquivos relativos do jogo carregam com o mesmo token',(await fetch(S.B+r.j.url.replace('index.html','game.js'))).status===200);
  T('token adulterado é recusado',(await fetch(S.B+r.j.url.replace('/g/','/g/x'))).status===403);
  T('token de um jogo não abre outro',(await fetch(S.B+r.j.url.replace(idZ,idH))).status===403);
  T('path traversal bloqueado',[403,404].includes((await fetch(S.B+r.j.url.replace('index.html','..%2f..%2fsomnia.db'))).status));
  T('conteúdo Somnia liberado após compra',await (async()=>{await bob.put('ledger','b5',{from:'bob',to:'root',amt:4,reason:'Jogo: Base',ref:'game:'+idS});return (await bob.get('games')).j.find(x=>x.id===idS).content.markdown.includes('Segredo')})());
  // ---- avaliações ----
  T('avalia jogo comprado',(await bob.put('ratings',idZ+':bob',{game:idZ,stars:5})).s===200);
  T('nota inválida',(await bob.put('ratings',idZ+':bob',{game:idZ,stars:9})).s===400);
  T('não avalia em nome de outro',(await bob.put('ratings',idZ+':root',{game:idZ,stars:1})).s===403);
  const al=new Cl(S.B);await al.r('POST','/api/auth/register',{u:'ana',name:'Ana',p:'senha-forte-3'});
  T('quem não comprou não avalia',(await al.put('ratings',idZ+':ana',{game:idZ,stars:4})).s===403);
  const bz2=(await bob.get('games')).j.find(x=>x.id===idZ);T('média e voto próprio agregados',bz2.rating.n===1&&bz2.rating.avg===5&&bz2.mine===5&&bz2.buys===1);
  // ---- conectores, SSRF e estatísticas ----
  const cfg={name:'M3D teste',url:'http://127.0.0.1:4001/catalog',format:'generico',listPath:'data.items',mapping:{id:'gid',title:'name',desc:'summary',genre:'category',price:'price',cover:'img',url:'play'},authHeader:'Authorization',token:'segredo123',factor:10};
  T('não-admin não cria conector',(await bob.put('connectors','m3d',cfg)).s===403);
  T('admin cria conector',(await root.put('connectors','m3d',cfg)).s===200);
  const cl=(await root.get('connectors')).j[0];T('token nunca volta ao navegador',cl.token===''&&cl.hasToken===true);
  r=await root.r('POST','/api/games/connector',{id:'m3d',dry:true});T('http exige habilitação explícita',/https/.test(r.j.error||''));await root.put('connectors','priv',{name:'priv',url:'https://127.0.0.1:4001/catalog',format:'generico'});r=await root.r('POST','/api/games/connector',{id:'priv',dry:true});T('fonte em endereço interno bloqueada (SSRF)',/bloqueado/.test(r.j.error||''));
  T('estatísticas só para admin',(await bob.r('GET','/api/admin/stats')).s===403);
  const st=(await root.r('GET','/api/admin/stats')).j;T('estatísticas do admin',st.disk&&Array.isArray(st.audit)&&st.docs>0);
  S.root=root;
 }
 const root=new Cl(Bs.B);await root.r('POST','/api/auth/login',{u:'root',p:'testroot-123456'});
 await root.put('connectors','m3d',{name:'M3D teste',url:'http://127.0.0.1:4001/catalog',format:'generico',listPath:'data.items',mapping:{id:'gid',title:'name',desc:'summary',genre:'category',price:'price',cover:'img',url:'play'},authHeader:'Authorization',token:'segredo123',factor:10});
 let r=await root.r('POST','/api/games/connector',{id:'m3d',dry:true});T('teste a seco mostra amostra sem gravar',r.j.sample.length===2&&r.j.sample[0].title==='Nave Rápida'&&r.j.sample[0].price===25&&(await root.get('games')).j.length===0);
 r=await root.r('POST','/api/games/connector',{id:'m3d'});T('sincroniza: cria 2 e ignora 1 sem id',r.j.created===2&&r.j.skipped===1&&!r.j.error);
 let gs=(await root.get('games')).j;T('jogos externos entram pendentes com preço convertido',gs.length===2&&gs.every(x=>x.status==='pendente'&&x.kind==='external')&&gs.find(x=>x.title==='Nave Rápida').price===25);
 T('capa externa baixada para o servidor',/^\/uploads\//.test(gs.find(x=>x.title==='Nave Rápida').cover));
 T('token enviado como Bearer à fonte',seen.includes('Bearer segredo123'));
 const nv=gs.find(x=>x.title==='Nave Rápida');await root.put('games',nv.id,{...nv,price:40,status:'publicado'});
 r=await root.r('POST','/api/games/connector',{id:'m3d'});gs=(await root.get('games')).j;T('nova sincronização atualiza sem duplicar e preserva edições',r.j.created===0&&r.j.updated===2&&gs.length===2&&gs.find(x=>x.id===nv.id).price===40&&gs.find(x=>x.id===nv.id).status==='publicado');
 T('estado do conector registrado',(await root.get('connectors')).j[0].status==='ok'&&(await root.get('connectors')).j[0].lastResult.created===0);
 await root.put('connectors','redir',{name:'redir',url:'http://127.0.0.1:4001/redir',format:'generico'});r=await root.r('POST','/api/games/connector',{id:'redir'});T('redirecionamento não é seguido',/redirecionou/.test(r.j.error||''));
 await root.put('connectors','404',{name:'x',url:'http://127.0.0.1:4001/nada'});r=await root.r('POST','/api/games/connector',{id:'404'});T('erro da fonte é reportado',/HTTP 404/.test(r.j.error||''));
 console.log(`\n${ok} ok, ${bad} falhas`);A.p.kill();Bs.p.kill();mock.close();setTimeout(()=>process.exit(bad?1:0),200)})();
