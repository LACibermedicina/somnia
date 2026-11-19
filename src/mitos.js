'use strict';
/* Somnia — módulo Mitos (v0.1.0-alpha)
   Rotas:
     GET    /api/mitos                        catálogo público (semente + banco), já filtrado por papel
     PUT    /api/mitos/item?t=myth|char&id=   cria/edita (admin e historiador verificado publicam; membro propõe)
     DELETE /api/mitos/item?t=myth|char&id=   exclui (admin; autor de proposta pendente)
     POST   /api/mitos/flashcard {id}         gera flashcard 4 quadrantes por IA (admin/historiador)
     POST   /api/mitos/guia {q}               assistente do Guia (login; responde só com base no acervo público)
     POST   /api/i18n {lang, texts[]}         tradução contextual por IA com cache em SQLite (público, limitado)
   Nenhuma rota deste módulo lê sonhos, pareceres ou dados pessoais (LGPD: só conteúdo público vai à IA). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const LANGS = { en: 'English', es: 'Spanish (neutral Latin American)', zh: 'Simplified Chinese (Mandarin)', hi: 'Hindi (Devanagari script)', pt: 'Brazilian Portuguese' };
const COLL = { myth: 'myths', char: 'mchars' };
const STATUS = ['publicado', 'pendente', 'oculto'];

module.exports = function install(k) {
  const { db, getDoc, putDoc, allDocs, deny, jbody, json, limit, sessUser, isPro, bcast, audit, callAI, ROOT, ENV } = k;
  db.exec(`CREATE TABLE IF NOT EXISTS i18n(h TEXT PRIMARY KEY, lang TEXT NOT NULL, src TEXT NOT NULL, out TEXT NOT NULL, ts INTEGER NOT NULL);`);
  const qGet = db.prepare('SELECT out FROM i18n WHERE h=?'), qPut = db.prepare('INSERT OR REPLACE INTO i18n(h,lang,src,out,ts) VALUES(?,?,?,?,?)');
  const SEED_FILE = path.join(ROOT, 'public', 'mitos', 'santos.json');
  const PROMPT_FILE = path.join(ROOT, 'src', 'prompts', 'flashcard-mitos.md');
  let seed = null, seedM = 0;
  function loadSeed() {
    try { const st = fs.statSync(SEED_FILE); if (!seed || st.mtimeMs !== seedM) { seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')); seedM = st.mtimeMs } }
    catch (e) { console.error('[mitos] semente inválida:', e.message); seed = seed || { fontes: {}, mitos: [], personagens: [] } }
    return seed;
  }

  /* limpeza profunda: só tipos JSON simples, com limites */
  function clean(v, depth = 0) {
    if (depth > 6) return undefined;
    if (typeof v === 'string') return v.slice(0, 6000);
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.slice(0, 80).map(x => clean(x, depth + 1)).filter(x => x !== undefined);
    if (v && typeof v === 'object') { const o = {}; let n = 0; for (const key of Object.keys(v)) { if (++n > 60) break; if (!/^[A-Za-z0-9_]{1,40}$/.test(key) || key === '__proto__' || key === 'constructor') continue; const c = clean(v[key], depth + 1); if (c !== undefined) o[key] = c } return o }
    return undefined;
  }
  const canCurate = u => !!u && (u.admin || (u.verified && u.role === 'historia'));

  function catalog(u) {
    const s = loadSeed(), cur = canCurate(u);
    const merge = (list, coll) => {
      const map = new Map(list.map(x => [x.id, { ...x, origem: 'semente', status: 'publicado' }]));
      for (const d of allDocs(coll)) map.set(d.id, { ...d, origem: 'banco' });
      return [...map.values()].filter(x => x.status === 'publicado' || cur || (u && x.author === u.id && x.status === 'pendente'));
    };
    return { colecao: s.colecao, aviso: s.aviso, fontes: s.fontes || {}, mitos: merge(s.mitos || [], COLL.myth), personagens: merge(s.personagens || [], COLL.char), curador: cur };
  }

  function writeItem(u, t, id, body) {
    if (!COLL[t]) deny(400, 'Tipo inválido.');
    if (!/^[a-z0-9-]{3,60}$/.test(id)) deny(400, 'Id inválido (use letras minúsculas, números e hífen).');
    if (u.status === 'suspenso') deny(403, 'Conta suspensa.');
    const raw = JSON.stringify(body || {}); if (raw.length > 80000) deny(413, 'Conteúdo grande demais.');
    const d = clean(body) || {};
    const name = t === 'myth' ? d.titulo : d.nome;
    if (!name || !String(name).trim()) deny(400, t === 'myth' ? 'Título é obrigatório.' : 'Nome é obrigatório.');
    if (t === 'myth' && !d.resumo) deny(400, 'Resumo é obrigatório.');
    const old = getDoc(COLL[t], id), seedHas = (loadSeed()[t === 'myth' ? 'mitos' : 'personagens'] || []).some(x => x.id === id);
    if (canCurate(u)) { d.status = STATUS.includes(d.status) ? d.status : 'publicado'; d.author = (old && old.author) || u.id }
    else {
      if (seedHas || (old && old.author !== u.id)) deny(403, 'Somente curadores editam este item.');
      if (old && old.status !== 'pendente') deny(403, 'Item já revisado: peça ao curador.');
      limit('mprop:' + u.id, 20, 36e5); d.status = 'pendente'; d.author = u.id;
    }
    d.id = undefined; delete d.id; delete d.origem; d.ts = Date.now(); d.editor = u.id;
    putDoc(COLL[t], id, d); bcast('mitos'); audit('mitos:' + t, u.id, '', id + ' ' + d.status);
    return { ok: true, status: d.status };
  }

  async function aiJSON(prompt, max) {
    const txt = String(await callAI(prompt, max || 4000)).trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    try { return JSON.parse(txt) } catch (e) { const m = txt.match(/[\[{][\s\S]*[\]}]/); if (!m) deny(502, 'A IA não devolveu JSON.'); return JSON.parse(m[0]) }
  }

  function flashPrompt(m) {
    let tpl = ''; try { tpl = fs.readFileSync(PROMPT_FILE, 'utf8') } catch (e) { tpl = 'Gere um flashcard em 4 quadrantes sobre o tema abaixo.' }
    const s = loadSeed(), fontes = (m.fontes || []).map(k => s.fontes && s.fontes[k] ? s.fontes[k].t : k).join('\n- ');
    return tpl + `\n\n## Parâmetros desta execução\n1. Tema Central (Mito): ${m.titulo} — ${m.subtitulo || ''}\n2. Contexto Alvo: Flashcard de Revisão | Suporte cognitivo, fontes e simbologia\n3. Fontes e Referências Mandatórias:\n- ${fontes}\n\n## Material de base (use somente isto; não invente datas nem autores)\nLocal: ${m.local} (${m.municipio}) · Época: ${m.epoca}\nResumo: ${m.resumo}\nNarrativa: ${m.historia || ''}\n`;
  }

  async function translate(lang, texts, ip) {
    if (!LANGS[lang]) deny(400, 'Idioma não suportado.');
    if (!Array.isArray(texts) || !texts.length) return { lang, out: [] };
    texts = texts.slice(0, 80).map(t => String(t || '').slice(0, 3000));
    const total = texts.reduce((a, t) => a + t.length, 0); if (total > 40000) deny(413, 'Texto demais para traduzir de uma vez.');
    const hs = texts.map(t => crypto.createHash('sha256').update(lang + '\u0000' + t).digest('hex'));
    const out = texts.map((t, i) => { if (!t.trim()) return t; const r = qGet.get(hs[i]); return r ? r.out : null });
    const miss = out.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
    if (miss.length) {
      if (!ENV.ANTHROPIC_API_KEY) return { lang, out: out.map((v, i) => v === null ? texts[i] : v), partial: true, error: 'IA não configurada: conteúdo mantido no idioma original.' };
      limit('i18n:' + ip, +ENV.I18N_PER_HOUR || 60, 36e5);
      const src = miss.map(i => texts[i]);
      const prompt = `You are a professional literary and academic translator for a cultural heritage app about myths and legends of Santos (Brazil). Translate each string of the JSON array below from Portuguese into ${LANGS[lang]}.
Rules: keep the same number of items and order; keep proper names, place names (Santos, Monte Serrat, Paquetá...), book titles and dates unchanged except for script transliteration where natural; preserve punctuation, numbers, emoji and any leading/trailing spaces; keep an accurate, academic but accessible tone; do not add explanations.
Answer ONLY with a JSON array of strings.

${JSON.stringify(src)}`;
      let tr;
      try { tr = await aiJSON(prompt, 8000) } catch (e) { audit('i18n_error', '', ip, e.message); return { lang, out: out.map((v, i) => v === null ? texts[i] : v), partial: true, error: 'Falha na tradução por IA.' } }
      if (!Array.isArray(tr) || tr.length !== src.length) return { lang, out: out.map((v, i) => v === null ? texts[i] : v), partial: true, error: 'Tradução incompleta.' };
      miss.forEach((i, j) => { const v = String(tr[j] ?? texts[i]).slice(0, 6000); out[i] = v; qPut.run(hs[i], lang, texts[i], v, Date.now()) });
    }
    return { lang, out };
  }

  async function guia(u, q) {
    q = String(q || '').slice(0, 600).trim(); if (!q) deny(400, 'Pergunta vazia.');
    const c = catalog(null);
    const base = c.mitos.map(m => `[${m.id}] ${m.titulo} (${m.epoca}; ${m.local}): ${m.resumo}`).join('\n');
    const chars = c.personagens.map(p => `{${p.id}} ${p.nome}: ${p.papel}`).join('\n');
    const prompt = `Você é "Lume", o guia simpático do Somnia, um acervo de mitos e lendas de Santos e da Baixada Santista. Responda em português, em até 120 palavras, com tom acolhedor e preciso.
Use SOMENTE o acervo abaixo. Se a resposta não estiver nele, diga que o acervo ainda não tem essa informação e sugira um mito relacionado. Diferencie fato documentado de tradição oral. Nunca peça nem comente dados pessoais do usuário.
No fim, liste entre colchetes os ids dos mitos citados, ex.: [fantasma-paqueta].

ACERVO DE MITOS:
${base}

PERSONAGENS:
${chars}

PERGUNTA: ${q}`;
    limit('guia:' + u.id, +ENV.GUIA_PER_HOUR || 20, 36e5);
    const text = String(await callAI(prompt, 700)).trim();
    const ids = [...text.matchAll(/\[([a-z0-9-]{3,60})\]/g)].map(x => x[1]).filter(id => c.mitos.some(m => m.id === id));
    return { text: text.replace(/\s*\[[a-z0-9-, ]+\]\s*$/, ''), mitos: [...new Set(ids)] };
  }

  /* devolve true se tratou a rota */
  return async function route(req, res, url, ip) {
    const p = url.pathname;
    if (p === '/api/mitos' && req.method === 'GET') { return json(res, 200, catalog(sessUser(req))), true }
    if (p === '/api/i18n' && req.method === 'POST') { const b = await jbody(req); return json(res, 200, await translate(String(b.lang || ''), b.texts, ip)), true }
    if (!p.startsWith('/api/mitos/')) return false;
    const u = sessUser(req); if (!u) deny(401, 'Faça login para continuar.');
    if (p === '/api/mitos/item') {
      const t = url.searchParams.get('t') || '', id = url.searchParams.get('id') || '';
      if (req.method === 'PUT') { limit('mw:' + u.id, 120, 6e4); return json(res, 200, writeItem(u, t, id, await jbody(req))), true }
      if (req.method === 'DELETE') {
        if (!COLL[t]) deny(400, 'Tipo inválido.'); const old = getDoc(COLL[t], id);
        if (!old) deny(404, 'Item não está no banco (itens da semente podem ser ocultados, não excluídos).');
        if (!u.admin && !(old.author === u.id && old.status === 'pendente')) deny(403, 'Sem permissão para excluir.');
        db.prepare('DELETE FROM docs WHERE c=? AND id=?').run(COLL[t], id); bcast('mitos'); audit('mitos:del', u.id, ip, t + ':' + id); return json(res, 200, { ok: true }), true;
      }
    }
    if (p === '/api/mitos/flashcard' && req.method === 'POST') {
      if (!canCurate(u)) deny(403, 'Somente curadores geram flashcards por IA.');
      if (!ENV.ANTHROPIC_API_KEY) deny(503, 'IA não configurada neste servidor.');
      limit('ai:' + u.id, +ENV.AI_PER_HOUR || 30, 36e5);
      const b = await jbody(req), m = catalog(u).mitos.find(x => x.id === String(b.id || '')); if (!m) deny(404, 'Mito não encontrado.');
      const fc = clean(await aiJSON(flashPrompt(m), 4000));
      if (!fc || !fc.b || !fc.c || !fc.d || !fc.e) deny(502, 'A IA devolveu um flashcard incompleto. Tente de novo.');
      return json(res, 200, { flashcard: fc }), true;
    }
    if (p === '/api/mitos/guia' && req.method === 'POST') {
      if (!ENV.ANTHROPIC_API_KEY) deny(503, 'IA não configurada neste servidor.');
      const b = await jbody(req); return json(res, 200, await guia(u, b.q)), true;
    }
    deny(404, 'Rota não encontrada.');
  };
};
module.exports.LANGS = LANGS;
