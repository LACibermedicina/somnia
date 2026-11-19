// Testes do módulo Mitos e do suporte a homologação (BASE_PATH). Sobe os próprios servidores.
// Uso: node tests/mitos.test.js
const { spawn } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
let ok = 0, bad = 0; const T = (n, c) => { c ? ok++ : (bad++, console.log('FALHA:', n)) };
function up(port, env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somnia-t-'));
  const p = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dir, ROOT_PASSWORD: 'testroot-123456', ANTHROPIC_API_KEY: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((res, rej) => { let t = ''; const on = d => { t += d; if (/ouvindo/.test(t)) res({ p, dir }) }; p.stdout.on('data', on); p.stderr.on('data', on); setTimeout(() => rej(new Error('servidor não subiu: ' + t)), 8000) });
}
class Cl {
  constructor(base) { this.b = base; this.c = '' }
  async r(m, u, body, hdr) {
    const r = await fetch(this.b + u, { method: m, redirect: 'manual', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'somnia', cookie: this.c, ...(hdr || {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc) this.c = sc.split(';')[0]; this.sc = sc || this.sc;
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt) } catch (e) { } return { s: r.status, j, txt, h: r.headers };
  }
}
(async () => {
  const A = await up(3995, {}), B = 'http://127.0.0.1:3995';
  try {
    const anon = new Cl(B), root = new Cl(B), al = new Cl(B), bo = new Cl(B);
    let r = await anon.r('GET', '/api/mitos');
    T('catálogo público sem login', r.s === 200 && r.j.mitos.length >= 15 && r.j.personagens.length >= 20);
    T('catálogo traz fontes', r.j.fontes && r.j.fontes.gandavo && r.j.fontes.gandavo.tipo === 'primaria');
    T('todo mito tem flashcard de 4 quadrantes', r.j.mitos.every(m => m.flashcard && m.flashcard.b.etapas.length === 4 && m.flashcard.c.chave && m.flashcard.d.literal && m.flashcard.e.pontos.length));
    T('visitante não é curador', r.j.curador === false);
    T('hub na raiz', (await anon.r('GET', '/')).txt.includes('HUB.boot'));
    T('app clássico em /app', (await anon.r('GET', '/app')).txt.includes('shim.js'));
    T('HTML permite iframe same-origin', /SAMEORIGIN/.test((await anon.r('GET', '/app')).h.get('x-frame-options')));
    T('versão', (await anon.r('GET', '/versao')).j.version === require('../package.json').version);
    T('escrita exige login', (await anon.r('PUT', '/api/mitos/item?t=myth&id=teste-x', { titulo: 'X', resumo: 'y' })).s === 401);
    T('i18n exige cabeçalho CSRF', (await anon.r('POST', '/api/i18n', { lang: 'en', texts: ['Olá'] }, { 'X-Requested-With': '' })).s === 403);
    T('i18n idioma inválido', (await anon.r('POST', '/api/i18n', { lang: 'xx', texts: ['Olá'] })).s === 400);
    r = await anon.r('POST', '/api/i18n', { lang: 'en', texts: ['Olá', ''] });
    T('i18n sem IA devolve original e partial', r.s === 200 && r.j.partial === true && r.j.out[0] === 'Olá');
    T('i18n texto grande demais', (await anon.r('POST', '/api/i18n', { lang: 'en', texts: Array(20).fill('x'.repeat(2999)) })).s === 413);
    T('login root', (await root.r('POST', '/api/auth/login', { u: 'root', p: 'testroot-123456' })).s === 200);
    T('alice registra', (await al.r('POST', '/api/auth/register', { u: 'alice', name: 'Alice', p: 'senha-forte-1' })).s === 200);
    T('bob registra', (await bo.r('POST', '/api/auth/register', { u: 'bob', name: 'Bob', p: 'senha-forte-2' })).s === 200);
    T('membro não edita mito da semente', (await al.r('PUT', '/api/mitos/item?t=myth&id=fantasma-paqueta', { titulo: 'Hack', resumo: 'x' })).s === 403);
    T('id inválido', (await al.r('PUT', '/api/mitos/item?t=myth&id=../x', { titulo: 'X', resumo: 'y' })).s === 400);
    T('título obrigatório', (await al.r('PUT', '/api/mitos/item?t=myth&id=sem-titulo', { resumo: 'y' })).s === 400);
    r = await al.r('PUT', '/api/mitos/item?t=myth&id=sereia-guaruja', { titulo: 'A Sereia', resumo: 'Proposta de teste', status: 'publicado', __proto__: { x: 1 } });
    T('membro propõe mito -> pendente', r.s === 200 && r.j.status === 'pendente');
    T('visitante não vê proposta', !(await anon.r('GET', '/api/mitos')).j.mitos.some(m => m.id === 'sereia-guaruja'));
    T('autora vê a própria proposta', (await al.r('GET', '/api/mitos')).j.mitos.some(m => m.id === 'sereia-guaruja' && m.status === 'pendente'));
    T('bob não vê proposta da alice', !(await bo.r('GET', '/api/mitos')).j.mitos.some(m => m.id === 'sereia-guaruja'));
    T('bob não edita proposta da alice', (await bo.r('PUT', '/api/mitos/item?t=myth&id=sereia-guaruja', { titulo: 'B', resumo: 'b' })).s === 403);
    T('bob não exclui proposta da alice', (await bo.r('DELETE', '/api/mitos/item?t=myth&id=sereia-guaruja')).s === 403);
    r = await root.r('GET', '/api/mitos');
    T('admin é curador e vê pendentes', r.j.curador === true && r.j.mitos.some(m => m.id === 'sereia-guaruja'));
    T('admin publica', (await root.r('PUT', '/api/mitos/item?t=myth&id=sereia-guaruja', { titulo: 'A Sereia', resumo: 'Revisada', status: 'publicado' })).j.status === 'publicado');
    T('publicado aparece ao visitante', (await anon.r('GET', '/api/mitos')).j.mitos.some(m => m.id === 'sereia-guaruja' && m.resumo === 'Revisada'));
    T('alice não edita após revisão', (await al.r('PUT', '/api/mitos/item?t=myth&id=sereia-guaruja', { titulo: 'X', resumo: 'x' })).s === 403);
    T('admin edita semente (override)', (await root.r('PUT', '/api/mitos/item?t=char&id=sr-rato', { nome: 'Sr. Rato', papel: 'Comerciante', mitos: ['rato-sobrenome'] })).s === 200);
    T('override aparece', (await anon.r('GET', '/api/mitos')).j.personagens.find(p => p.id === 'sr-rato').origem === 'banco');
    T('admin oculta mito da semente', (await root.r('PUT', '/api/mitos/item?t=myth&id=fonte-itororo', { titulo: 'A Fonte do Itororó', resumo: 'x', status: 'oculto' })).s === 200);
    T('oculto some para visitante', !(await anon.r('GET', '/api/mitos')).j.mitos.some(m => m.id === 'fonte-itororo'));
    T('excluir override restaura semente', (await root.r('DELETE', '/api/mitos/item?t=myth&id=fonte-itororo')).s === 200 && (await anon.r('GET', '/api/mitos')).j.mitos.find(m => m.id === 'fonte-itororo').origem === 'semente');
    T('flashcard IA: membro 403', (await al.r('POST', '/api/mitos/flashcard', { id: 'ipupiara' })).s === 403);
    T('flashcard IA sem chave 503', (await root.r('POST', '/api/mitos/flashcard', { id: 'ipupiara' })).s === 503);
    T('guia sem login 401', (await anon.r('POST', '/api/mitos/guia', { q: 'oi' })).s === 401);
    T('guia sem chave 503', (await al.r('POST', '/api/mitos/guia', { q: 'oi' })).s === 503);
    T('conteúdo enorme 413', (await root.r('PUT', '/api/mitos/item?t=myth&id=enorme', { titulo: 'X', resumo: 'x'.repeat(90000) })).s === 413);
  } finally { A.p.kill() }

  /* homologação: BASE_PATH=/teste e cookie próprio */
  const H = await up(3994, { BASE_PATH: '/teste', COOKIE_NAME: 'somnia_sid_teste' }), HB = 'http://127.0.0.1:3994';
  try {
    const c = new Cl(HB);
    let r = await c.r('GET', '/teste');
    T('/teste redireciona para /teste/', r.s === 301 && r.h.get('location') === '/teste/');
    r = await c.r('GET', '/teste/');
    T('hub em /teste/ com base injetada', r.s === 200 && r.txt.includes('window.SOMNIA_BASE="/teste"') && r.txt.includes('src="/teste/hub/core.js"') && r.txt.includes('noindex'));
    T('api em /teste/api/mitos', (await c.r('GET', '/teste/api/mitos')).s === 200);
    T('base.js servido', (await c.r('GET', '/teste/base.js')).txt.includes('SOMNIA_BASE'));
    T('ambiente teste em /versao', (await c.r('GET', '/teste/versao')).j.env === 'teste');
    r = await c.r('POST', '/teste/api/auth/login', { u: 'root', p: 'testroot-123456' });
    T('cookie de homologação com nome e caminho próprios', r.s === 200 && /^somnia_sid_teste=/.test(c.sc) && /Path=\/teste/.test(c.sc));
    T('sessão funciona em /teste', (await c.r('GET', '/teste/api/auth/me')).j.user.id === 'root');
    T('app clássico em /teste/app reescrito', (await c.r('GET', '/teste/app')).txt.includes('src="/teste/shim.js"'));
  } finally { H.p.kill() }
  console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
