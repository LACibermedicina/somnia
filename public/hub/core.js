/* Somnia Hub — núcleo: estado, API, gerenciador de janelas estilo macOS, dock, idiomas, sons e notificações. */
(function () {
  const B = window.SOMNIA_BASE || '';
  const U = p => B + p;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('somnia-' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } }, set(k, v) { try { localStorage.setItem('somnia-' + k, JSON.stringify(v)) } catch (e) { } } };

  const HUB = (window.HUB = {
    U, $, $$, E, store, mods: {}, wins: {}, z: 10, data: null, me: null, ai: false, version: '', lang: store.get('lang', 'pt'), muted: store.get('muted', false),
    trCache: {}, listeners: []
  });

  /* ---------- API ---------- */
  HUB.api = async function (method, url, body) {
    const r = await fetch(U(url), { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'somnia' }, body: body === undefined ? undefined : JSON.stringify(body) });
    let j = null; try { j = await r.json() } catch (e) { }
    if (!r.ok) { const e = new Error((j && j.error) || ('Erro ' + r.status)); e.status = r.status; throw e }
    return j;
  };
  HUB.loadMe = async function () {
    try { const m = await HUB.api('GET', '/api/auth/me'); HUB.me = m.user; HUB.ai = !!m.ai; HUB.version = m.version || HUB.version; HUB.env = m.env } catch (e) { HUB.me = null }
    renderUser();
  };
  HUB.loadData = async function () {
    try { HUB.data = await HUB.api('GET', '/api/mitos') }
    catch (e) { const r = await fetch(U('/mitos/santos.json')); const s = await r.json(); HUB.data = { ...s, mitos: s.mitos, personagens: s.personagens, curador: false, offline: true } }
    HUB.idx = { m: new Map(HUB.data.mitos.map(x => [x.id, x])), p: new Map(HUB.data.personagens.map(x => [x.id, x])) };
    HUB.emit('data');
  };
  HUB.on = (ev, fn) => HUB.listeners.push([ev, fn]);
  HUB.emit = (ev, d) => HUB.listeners.filter(l => l[0] === ev).forEach(l => { try { l[1](d) } catch (e) { console.error(e) } });

  /* ---------- i18n ---------- */
  HUB.t = k => (I18N.D[HUB.lang] && I18N.D[HUB.lang][k]) || I18N.D.pt[k] || k;
  HUB.applyUI = function (root) { $$('[data-i18n]', root).forEach(el => { el.textContent = HUB.t(el.dataset.i18n) }); $$('[data-i18n-ph]', root).forEach(el => { el.placeholder = HUB.t(el.dataset.i18nPh) }); $$('[data-i18n-title]', root).forEach(el => { el.title = HUB.t(el.dataset.i18nTitle) }) };
  HUB.setLang = async function (l) {
    HUB.lang = l; store.set('lang', l); document.documentElement.lang = { zh: 'zh-CN', hi: 'hi', es: 'es', en: 'en', pt: 'pt-BR' }[l] || 'pt-BR';
    $$('.flag').forEach(f => f.classList.toggle('on', f.dataset.lang === l));
    HUB.applyUI(document); Object.values(HUB.wins).forEach(w => HUB.render(w.id)); renderDock(); renderIcons(); clock();
  };
  /* traduz textos de conteúdo (.tr) dentro de um elemento, usando cache local e o serviço do servidor */
  HUB.trContent = async function (root) {
    const els = $$('.tr', root); if (!els.length) return;
    els.forEach(el => { if (el.dataset.o == null) el.dataset.o = el.textContent });
    if (HUB.lang === 'pt') { els.forEach(el => { el.textContent = el.dataset.o }); return }
    const lang = HUB.lang, cache = HUB.trCache[lang] || (HUB.trCache[lang] = new Map());
    const miss = [...new Set(els.map(el => el.dataset.o).filter(t => t.trim() && !cache.has(t)))];
    if (miss.length) {
      const busy = HUB.toast(HUB.t('translating'), 0);
      try {
        for (let i = 0; i < miss.length; i += 40) {
          const part = miss.slice(i, i + 40), r = await HUB.api('POST', '/api/i18n', { lang, texts: part });
          if (r.partial && !HUB._trWarned) { HUB._trWarned = true; HUB.toast(HUB.t('tr_fail'), 5000) }
          if (!r.partial) part.forEach((t, j) => cache.set(t, r.out[j]));
        }
      } catch (e) { if (!HUB._trWarned) { HUB._trWarned = true; HUB.toast(HUB.t('tr_fail'), 5000) } }
      busy.remove();
    }
    if (HUB.lang !== lang) return;
    els.forEach(el => { if (el.isConnected) el.textContent = cache.get(el.dataset.o) || el.dataset.o });
  };

  /* ---------- sons (WebAudio, sem arquivos) ---------- */
  let ac = null;
  HUB.beep = function (kind) {
    if (HUB.muted) return; try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime, f = { open: [520, 780], close: [600, 380], pop: [880, 1320], win: [660, 990], lose: [330, 220] }[kind] || [700, 900];
      o.type = 'sine'; o.frequency.setValueAtTime(f[0], n); o.frequency.exponentialRampToValueAtTime(f[1], n + .12);
      g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(.08, n + .02); g.gain.exponentialRampToValueAtTime(.0001, n + .18);
      o.connect(g).connect(ac.destination); o.start(n); o.stop(n + .2);
    } catch (e) { }
  };
  HUB.setMuted = function (m) { HUB.muted = m; store.set('muted', m); $$('[data-mute]').forEach(b => { b.textContent = m ? '🔇' : '🔊'; b.title = HUB.t(m ? 'unmute' : 'mute') }); HUB.emit('mute', m) };

  /* ---------- notificações ---------- */
  HUB.toast = function (msg, ms) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; $('#toasts').appendChild(el);
    if (ms !== 0) setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400) }, ms || 3200);
    return el;
  };

  /* ---------- módulos e janelas ---------- */
  HUB.mod = (id, def) => { HUB.mods[id] = { id, w: 860, h: 600, ...def } };
  const mobile = () => window.innerWidth < 760;
  HUB.open = function (id, arg) {
    const m = HUB.mods[id]; if (!m) return;
    if (m.hidden) { if (m.open) m.open(arg); return }
    let w = HUB.wins[id];
    if (w) { if (arg !== undefined) w.arg = arg; w.el.classList.remove('min'); HUB.focus(id); if (arg !== undefined) HUB.render(id); return w }
    const el = document.createElement('section'); el.className = 'win opening'; el.dataset.win = id; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', HUB.t(m.title || id));
    const n = Object.keys(HUB.wins).length, W = Math.min(m.w, window.innerWidth - 40), H = Math.min(m.h, window.innerHeight - 140);
    const pos = store.get('win-' + id, null);
    Object.assign(el.style, pos && !mobile() ? { left: pos.x + 'px', top: pos.y + 'px', width: pos.w + 'px', height: pos.h + 'px' } : { left: Math.max(10, (window.innerWidth - W) / 2 + n * 26 - 40) + 'px', top: Math.max(40, (window.innerHeight - H) / 2 + n * 22 - 40) + 'px', width: W + 'px', height: H + 'px' });
    el.innerHTML = `<header class="wbar"><div class="lights"><button class="l-close" aria-label="Fechar"></button><button class="l-min" aria-label="Minimizar"></button><button class="l-max" aria-label="Maximizar"></button></div>
      <div class="wtitle"><span class="wico">${ART.icon(m.icon || id, 20)}</span><span data-i18n="${m.title || id}">${E(HUB.t(m.title || id))}</span></div><div class="wtools"></div></header>
      <div class="wbody"></div><div class="grip" aria-hidden="true"></div>`;
    $('#windows').appendChild(el);
    w = HUB.wins[id] = { id, el, body: $('.wbody', el), tools: $('.wtools', el), arg, state: {} };
    $('.l-close', el).onclick = e => { e.stopPropagation(); HUB.close(id) };
    $('.l-min', el).onclick = e => { e.stopPropagation(); el.classList.add('min'); HUB.beep('close'); renderDock() };
    $('.l-max', el).onclick = e => { e.stopPropagation(); el.classList.toggle('max') };
    $('.wbar', el).ondblclick = e => { if (!e.target.closest('button')) el.classList.toggle('max') };
    el.addEventListener('pointerdown', () => HUB.focus(id));
    drag(el, $('.wbar', el), id); resize(el, $('.grip', el), id);
    if (mobile()) el.classList.add('max');
    HUB.focus(id); HUB.render(id); HUB.beep('open'); renderDock();
    setTimeout(() => el.classList.remove('opening'), 350);
    return w;
  };
  HUB.render = function (id) {
    const w = HUB.wins[id], m = HUB.mods[id]; if (!w || !m) return;
    w.tools.innerHTML = '';
    try { m.render(w, HUB) } catch (e) { console.error(e); w.body.innerHTML = `<div class="empty">Erro ao montar este módulo: ${E(e.message)}</div>` }
    HUB.applyUI(w.el); HUB.trContent(w.body);
  };
  HUB.close = function (id) {
    const w = HUB.wins[id]; if (!w) return; const m = HUB.mods[id]; if (m && m.destroy) try { m.destroy(w) } catch (e) { }
    w.el.classList.add('closing'); HUB.beep('close'); delete HUB.wins[id]; setTimeout(() => w.el.remove(), 220); renderDock();
  };
  HUB.focus = function (id) {
    const w = HUB.wins[id]; if (!w) return; w.el.style.zIndex = ++HUB.z;
    $$('.win').forEach(x => x.classList.toggle('active', x === w.el)); HUB.active = id;
    $('#menu-app').textContent = HUB.t(HUB.mods[id].title || id);
  };
  HUB.top = () => { let best = null, z = -1; for (const w of Object.values(HUB.wins)) { if (w.el.classList.contains('min')) continue; const zi = +w.el.style.zIndex || 0; if (zi > z) { z = zi; best = w.id } } return best };
  function drag(el, handle, id) {
    let sx, sy, ox, oy, on = false;
    handle.addEventListener('pointerdown', e => { if (e.target.closest('button,input,select') || el.classList.contains('max')) return; on = true; sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop; handle.setPointerCapture(e.pointerId); el.classList.add('dragging') });
    handle.addEventListener('pointermove', e => { if (!on) return; el.style.left = Math.min(window.innerWidth - 80, Math.max(-el.offsetWidth + 120, ox + e.clientX - sx)) + 'px'; el.style.top = Math.min(window.innerHeight - 60, Math.max(30, oy + e.clientY - sy)) + 'px' });
    handle.addEventListener('pointerup', () => { if (!on) return; on = false; el.classList.remove('dragging'); savePos(el, id) });
  }
  function resize(el, grip, id) {
    let sx, sy, ow, oh, on = false;
    grip.addEventListener('pointerdown', e => { on = true; sx = e.clientX; sy = e.clientY; ow = el.offsetWidth; oh = el.offsetHeight; grip.setPointerCapture(e.pointerId); e.stopPropagation() });
    grip.addEventListener('pointermove', e => { if (!on) return; el.style.width = Math.max(340, ow + e.clientX - sx) + 'px'; el.style.height = Math.max(260, oh + e.clientY - sy) + 'px' });
    grip.addEventListener('pointerup', () => { if (!on) return; on = false; savePos(el, id); HUB.emit('resize', id) });
  }
  const savePos = (el, id) => store.set('win-' + id, { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });

  /* ---------- área de trabalho, dock e barra de menus ---------- */
  const APPS = ['biblioteca', 'personagens', 'flashcards', 'jogos', 'grafo', 'agenda', 'museu', 'comunidade', 'ajuda'];
  function renderIcons() {
    $('#icons').innerHTML = APPS.map((a, i) => `<button class="dicon" data-open="${a}" style="--i:${i}"><span class="pixwrap">${ART.icon(a, 64)}</span><span class="dlabel">${E(HUB.t(a))}</span></button>`).join('');
  }
  function renderDock() {
    $('#dock').innerHTML = APPS.map(a => `<button class="dk ${HUB.wins[a] ? 'run' : ''}" data-open="${a}" aria-label="${E(HUB.t(a))}"><span class="pixwrap">${ART.icon(a, 46)}</span><span class="tip">${E(HUB.t(a))}</span></button>`).join('') +
      `<span class="dsep"></span><button class="dk" data-open="guia" aria-label="${E(HUB.t('guia'))}"><span class="pixwrap">${ART.icon('guia', 46)}</span><span class="tip">${E(HUB.t('guia'))}</span></button>`;
  }
  function renderUser() {
    const u = HUB.me; $('#user').innerHTML = u ? `<span class="avatar">${E(u.name[0] || '?').toUpperCase()}</span><span>${E(u.name)}</span>` : `<span data-i18n="login">${E(HUB.t('login'))}</span>`;
    $('#user').onclick = () => HUB.open('museu');
  }
  function renderFlags() {
    $('#flags').innerHTML = I18N.LANGS.map(l => `<button class="flag ${l === HUB.lang ? 'on' : ''}" data-lang="${l}" title="${E(I18N.D[l].lang)}" aria-label="${E(I18N.D[l].lang)}">${ART.flag(l)}</button>`).join('');
  }
  function clock() { const d = new Date(); $('#clock').textContent = d.toLocaleDateString({ pt: 'pt-BR', zh: 'zh-CN', hi: 'hi-IN', es: 'es', en: 'en-GB' }[HUB.lang] || 'pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) + '  ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }

  /* animação "jelly" nos ícones 3D */
  document.addEventListener('pointerdown', e => { const p = e.target.closest('.pixwrap'); if (p) { p.classList.remove('jelly'); void p.offsetWidth; p.classList.add('jelly'); HUB.beep('pop') } });
  /* olhos que seguem o ponteiro */
  let raf = 0; document.addEventListener('pointermove', e => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; $$('#icons .pupils, #dock .pupils, .portal .pupils').forEach(p => { const r = p.ownerSVGElement.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1, k = Math.min(2.2, d / 60); p.setAttribute('transform', `translate(${dx / d * k} ${dy / d * k})`) }) }) });

  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) { HUB.open(o.dataset.open, o.dataset.arg); return }
    const f = e.target.closest('.flag'); if (f) { HUB.setLang(f.dataset.lang); return }
    const m = e.target.closest('[data-mute]'); if (m) { HUB.setMuted(!HUB.muted); return }
  });
  /* clique duplo fora de qualquer janela (no fundo da área de trabalho) fecha a janela ativa */
  document.addEventListener('dblclick', e => { if (e.target.closest('.win,#dock,#menubar,.dicon,#lume,#lumechat')) return; const t = HUB.top(); if (t) HUB.close(t) });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#lumechat.open')) { $('#lumechat').classList.remove('open'); return } const t = HUB.top(); if (t) HUB.close(t) } });

  HUB.boot = async function () {
    renderFlags(); renderIcons(); renderDock(); renderUser(); HUB.setMuted(HUB.muted); clock(); setInterval(clock, 20000);
    await HUB.setLang(HUB.lang);
    await Promise.all([HUB.loadMe(), HUB.loadData()]);
    $('#ver').textContent = 'v' + (HUB.version || '0.1.0-alpha') + (HUB.env === 'teste' ? ' · teste' : '');
    if (HUB.env === 'teste') document.body.classList.add('env-teste');
    const first = !store.get('seen-welcome', false), hash = location.hash.replace('#', '');
    if (hash && HUB.mods[hash.split('/')[0]]) HUB.open(hash.split('/')[0], hash.split('/')[1]); else HUB.open('boasvindas');
    if (first) store.set('seen-welcome', true);
    if (HUB.mods.guia && HUB.mods.guia.init) HUB.mods.guia.init();
    /* o login acontece no Museu (janela interna): ao voltar o foco, atualiza a sessão */
    window.addEventListener('focus', () => HUB.loadMe()); setInterval(() => { if (document.visibilityState === 'visible') HUB.loadMe() }, 60000);
  };
})();
