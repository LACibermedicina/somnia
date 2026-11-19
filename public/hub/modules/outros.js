/* Agenda (datas dos mitos + notas locais), Museu 3D (app clássico), Comunidade (esqueleto), Ajuda/Sobre e Guia Lume (avatar com IA) */
(function () {
  const { E, $, $$ } = HUB;

  /* ---------- Agenda ---------- */
  HUB.mod('agenda', {
    title: 'agenda', w: 920, h: 660,
    render(w) {
      if (!HUB.data) { w.body.innerHTML = `<div class="empty" data-i18n="loading"></div>`; return }
      const st = w.state, now = new Date(); st.y = st.y ?? now.getFullYear(); st.mo = st.mo ?? now.getMonth(); st.sel = st.sel || `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nk = 'notas-' + (HUB.me ? HUB.me.id : 'visitante'), notes = HUB.store.get(nk, {});
      const ev = {}; HUB.data.mitos.forEach(m => (m.datas || []).forEach(d => { const k = d.d.slice(5); (ev[k] = ev[k] || []).push({ ...d, m }) }));
      const first = new Date(st.y, st.mo, 1), days = new Date(st.y, st.mo + 1, 0).getDate(), off = first.getDay();
      const loc = HUB.lang === 'pt' ? 'pt-BR' : HUB.lang, wd = [...Array(7)].map((_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(loc, { weekday: 'short' }));
      const cells = []; for (let i = 0; i < off; i++) cells.push('<div class="cd empty"></div>');
      for (let d = 1; d <= days; d++) { const k = `${String(st.mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, fk = `${st.y}-${k}`; cells.push(`<button class="cd ${k === st.sel ? 'sel' : ''} ${now.getFullYear() === st.y && now.getMonth() === st.mo && now.getDate() === d ? 'today' : ''}" data-k="${k}"><b>${d}</b>${ev[k] ? '<i class="dot m"></i>' : ''}${(notes[fk] || []).length ? '<i class="dot n"></i>' : ''}</button>`) }
      const fk = `${st.y}-${st.sel}`, list = ev[st.sel] || [], nl = notes[fk] || [];
      w.body.innerHTML = `<div class="agenda"><div class="cal">
        <div class="cal-head"><button class="btn ghost" data-mv="-1">◀</button><h3>${first.toLocaleDateString(loc, { month: 'long', year: 'numeric' })}</h3><button class="btn ghost" data-mv="1">▶</button></div>
        <div class="cal-grid">${wd.map(x => `<div class="wd">${E(x)}</div>`).join('')}${cells.join('')}</div></div>
        <aside class="day"><h4 data-i18n="on_this_day"></h4>${list.length ? list.map(x => `<button class="evt" data-open="biblioteca" data-arg="${E(x.m.id)}">${ART.glyph('ampulheta', 26)}<span><b>${E(x.d.slice(0, 4))}</b> — <span class="tr">${E(x.t)}</span></span></button>`).join('') : '<p class="fine">—</p>'}
          <h4 data-i18n="notes"></h4><ul class="notes">${nl.map((n, i) => `<li><span>${E(n)}</span><button class="x" data-del="${i}" aria-label="Excluir">✕</button></li>`).join('')}</ul>
          <form class="addnote"><input maxlength="300" data-i18n-ph="add_note"><button class="btn">+</button></form><p class="fine">🔒 <span data-i18n="notes_local"></span></p></aside></div>`;
      $$('[data-mv]', w.body).forEach(b => b.onclick = () => { st.mo += +b.dataset.mv; if (st.mo < 0) { st.mo = 11; st.y-- } if (st.mo > 11) { st.mo = 0; st.y++ } HUB.render('agenda') });
      $$('.cd[data-k]', w.body).forEach(b => b.onclick = () => { st.sel = b.dataset.k; HUB.render('agenda') });
      $('.addnote', w.body).onsubmit = e => { e.preventDefault(); const v = $('input', e.target).value.trim(); if (!v) return; (notes[fk] = notes[fk] || []).push(v); HUB.store.set(nk, notes); HUB.render('agenda') };
      $$('[data-del]', w.body).forEach(b => b.onclick = () => { nl.splice(+b.dataset.del, 1); notes[fk] = nl; if (!nl.length) delete notes[fk]; HUB.store.set(nk, notes); HUB.render('agenda') });
    }
  });

  /* ---------- Museu 3D (aplicação clássica do Somnia em janela) ---------- */
  HUB.mod('museu', {
    title: 'museu', w: 1180, h: 760,
    render(w) {
      if (w.body.querySelector('iframe')) return;
      w.tools.innerHTML = `<a class="tbtn" href="${HUB.U('/app')}" target="_blank" rel="noopener" title="Abrir em nova aba">↗</a>`;
      w.body.innerHTML = `<iframe class="appframe" src="${HUB.U('/app')}" title="Somnia — Museu 3D, cartas, sonhos e loja"></iframe>`;
      $('iframe', w.body).addEventListener('load', () => HUB.loadMe());
    }
  });

  /* ---------- Comunidade (esqueleto desta iteração) ---------- */
  HUB.mod('comunidade', {
    title: 'comunidade', w: 640, h: 440,
    render(w) {
      w.body.innerHTML = `<div class="soon">${ART.icon('comunidade', 120)}<p data-i18n="community_soon"></p>
        <ul class="road"><li>💬 Chat em tempo real (WebSocket/SSE) por guilda e por mito</li><li>🎥 Salas de videochamada WebRTC com servidor TURN</li><li>🛡️ Moderação, denúncias e consentimento LGPD</li></ul>
        <button class="btn" data-open="museu" data-i18n="open_museum"></button></div>`;
    }
  });

  /* ---------- Ajuda / Sobre ---------- */
  HUB.mod('ajuda', {
    title: 'ajuda', w: 720, h: 620,
    render(w) {
      const n = HUB.data ? HUB.data.mitos.length : 0, c = HUB.data ? HUB.data.personagens.length : 0;
      w.body.innerHTML = `<div class="help">
        <div class="wl-head">${ART.lume(72)}<div><h2>Somnia <small id="ver2">v${E(HUB.version || '0.1.0-alpha')}</small></h2><p data-i18n="tagline"></p></div></div>
        <h4>Como usar</h4><ul>
          <li><b>Ícones animados</b> na área de trabalho e no dock abrem cada módulo em janelas arrastáveis e redimensionáveis (canto inferior direito).</li>
          <li><b>Fechar</b>: botão vermelho, tecla Esc ou <b>clique duplo no fundo</b> da área de trabalho.</li>
          <li><b>Bandeiras</b> no topo traduzem a interface; o conteúdo dos mitos é traduzido pela IA contextual do servidor (quando configurada) e fica em cache.</li>
          <li><b>Flashcards</b>: frente com pergunta-gatilho; verso com o infográfico de 4 quadrantes. Marque Errei/Difícil/Fácil para revisar no tempo certo.</li>
          <li><b>Museu 3D</b>: abre o Somnia clássico (login, sonhos, cartas, loja de jogos e guildas).</li></ul>
        <h4>Acervo</h4><p>${n} mitos e ${c} personagens de Santos e da Baixada Santista, com fontes primárias e secundárias indicadas em cada mito. Atributos das cartas são lúdicos (design de jogo), não dados históricos.</p>
        <h4>Privacidade (LGPD)</h4><p>Esta área pública não coleta dados pessoais. Notas da agenda e progresso dos flashcards ficam só no seu navegador. Só textos públicos do acervo são enviados à IA para tradução; sonhos e pareceres nunca passam por esse serviço.</p>
        <p class="fine">Referência de pesquisa: Novo Milênio — Histórias e Lendas de Santos (novomilenio.inf.br/santos). Ilustrações geradas por código (SVG), sem imagens de terceiros.</p></div>`;
    }
  });

  /* ---------- Guia Lume: avatar flutuante, arrastável, com opção de silenciar ---------- */
  const TIPS = ['Clique em mim para perguntar sobre as lendas!', 'Sabia que o Ipupiara foi registrado por Gândavo em 1576?', 'No Duelo de Cartas, escolha o atributo mais forte do seu personagem.', 'Os flashcards têm 4 quadrantes: processo, apoio cognitivo, fluxograma e resumo.', 'Arraste os nós no Grafo para ver como mitos e personagens se ligam.'];
  function localAnswer(q) {
    const words = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\W+/).filter(x => x.length > 3);
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const scored = HUB.data.mitos.map(m => { const t = norm([m.titulo, m.subtitulo, m.local, m.resumo, ...(m.tags || []), ...(m.personagens || []).map(id => (HUB.idx.p.get(id) || {}).nome)].join(' ')); return [words.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0), m] }).filter(x => x[0]).sort((a, b) => b[0] - a[0]);
    if (!scored.length) return { text: 'Ainda não encontrei isso no acervo. Que tal começar pelo Fantasma do Paquetá, a lenda mais famosa de Santos?', mitos: ['fantasma-paqueta'] };
    const m = scored[0][1]; return { text: `${m.titulo} (${m.epoca}): ${m.resumo}`, mitos: scored.slice(0, 3).map(x => x[1].id) };
  }
  HUB.mod('guia', {
    title: 'guia', hidden: true,
    init() {
      const el = document.createElement('div'); el.id = 'lume'; el.innerHTML = `<div class="lume-bubble"></div><button class="lume-btn" aria-label="Guia Lume">${ART.lume(86)}</button><button class="lume-mute" data-mute title="">🔊</button>`;
      document.body.appendChild(el);
      const chat = document.createElement('div'); chat.id = 'lumechat'; chat.innerHTML = `<header>${ART.lume(34)}<b data-i18n="guia"></b><span class="grow"></span><button class="x" aria-label="Fechar">✕</button></header><div class="msgs"></div><form><input maxlength="600" data-i18n-ph="ask"><button class="btn" data-i18n="send"></button></form><p class="fine">IA responde só com base no acervo público. Não informe dados pessoais.</p>`;
      document.body.appendChild(chat); HUB.applyUI(chat); HUB.setMuted(HUB.muted);
      const pos = HUB.store.get('lume-pos', null); if (pos) { el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto' }
      let sx, sy, ox, oy, on = false, moved = false; const btn = $('.lume-btn', el);
      btn.addEventListener('pointerdown', e => { on = true; moved = false; sx = e.clientX; sy = e.clientY; const r = el.getBoundingClientRect(); ox = r.left; oy = r.top; btn.setPointerCapture(e.pointerId) });
      btn.addEventListener('pointermove', e => { if (!on) return; if (Math.hypot(e.clientX - sx, e.clientY - sy) > 5) moved = true; if (!moved) return; el.style.left = Math.max(0, Math.min(innerWidth - 90, ox + e.clientX - sx)) + 'px'; el.style.top = Math.max(30, Math.min(innerHeight - 110, oy + e.clientY - sy)) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto' });
      btn.addEventListener('pointerup', () => { on = false; if (moved) { const r = el.getBoundingClientRect(); HUB.store.set('lume-pos', { x: r.left, y: r.top }) } else { chat.classList.toggle('open'); if (chat.classList.contains('open')) { $('input', chat).focus(); if (!$('.msgs', chat).children.length) add('bot', 'Olá! Eu sou o Lume, o vaga-lume guardião das lendas. Pergunte, por exemplo: "Quem era o fantasma do Paquetá?"') } HUB.beep('pop') } });
      $('.x', chat).onclick = () => chat.classList.remove('open');
      const add = (who, txt, ids) => { const d = document.createElement('div'); d.className = 'msg ' + who; d.innerHTML = `<p>${E(txt)}</p>${(ids || []).map(id => { const m = HUB.idx.m.get(id); return m ? `<button class="chip" data-open="biblioteca" data-arg="${E(id)}">${E(m.titulo)}</button>` : '' }).join('')}`; $('.msgs', chat).appendChild(d); d.scrollIntoView({ block: 'end' }) };
      $('form', chat).onsubmit = async e => {
        e.preventDefault(); const i = $('input', chat), q = i.value.trim(); if (!q) return; i.value = ''; add('me', q);
        const wait = document.createElement('div'); wait.className = 'msg bot typing'; wait.innerHTML = '<p>…</p>'; $('.msgs', chat).appendChild(wait);
        let r; if (HUB.me && HUB.ai) { try { r = await HUB.api('POST', '/api/mitos/guia', { q }) } catch (err) { r = localAnswer(q); r.text += ' (resposta do acervo local: ' + err.message + ')' } } else r = localAnswer(q);
        wait.remove(); add('bot', r.text, r.mitos); HUB.beep('pop');
      };
      const bub = $('.lume-bubble', el); let k = 0;
      const say = () => { if (HUB.muted || chat.classList.contains('open')) { bub.classList.remove('show'); return } bub.textContent = TIPS[k++ % TIPS.length]; bub.classList.add('show'); setTimeout(() => bub.classList.remove('show'), 6500) };
      setTimeout(say, 4000); setInterval(say, 45000);
      HUB.on('mute', m => { el.classList.toggle('muted', m); if (m) bub.classList.remove('show') }); el.classList.toggle('muted', HUB.muted);
    },
    open() { const c = $('#lumechat'); if (c) { c.classList.add('open'); HUB.applyUI(c); $('input', c).focus() } },
    render() { }
  });
})();
