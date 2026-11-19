/* Boas-vindas (portais) e Biblioteca de Mitos (cards HQ, leitura, linha do tempo) */
(function () {
  const { E, $, $$ } = HUB;
  const TIPOS = ['assombração', 'milagre', 'criatura', 'fenômeno', 'encantamento', 'história-lenda'];
  const fonteTxt = k => (HUB.data.fontes[k] || { t: k });

  HUB.mod('boasvindas', {
    title: 'welcome', icon: 'guia', w: 900, h: 560,
    render(w) {
      const portals = [['biblioteca', 'p_bib'], ['personagens', 'p_chars'], ['jogos', 'p_games']];
      w.body.innerHTML = `<div class="welcome">
        <div class="wl-head">${ART.lume(84)}<div><h1 data-i18n="welcome"></h1><p data-i18n="welcome_sub"></p></div></div>
        <div class="portals">${portals.map(([a, d], i) => `<button class="portal" data-open="${a}" style="--i:${i}"><span class="pixwrap big">${ART.icon(a, 132)}</span><strong data-i18n="${a}"></strong><small data-i18n="${d}"></small></button>`).join('')}</div>
        <p class="hint">💡 <span data-i18n="close_hint"></span></p></div>`;
    }
  });

  function card(m) {
    return `<article class="hq ${m.status && m.status !== 'publicado' ? 'pend' : ''}" data-myth="${E(m.id)}" tabindex="0" style="--rar:${(ART.RAR[m.raridade] || ART.RAR.Comum)[0]}">
      <div class="hq-art">${ART.scene(m)}<span class="hq-year">${E(m.ano)}</span>${m.sensivel ? `<span class="hq-flag" data-i18n="sensitive"></span>` : ''}</div>
      <div class="hq-cap"><h3 class="tr">${E(m.titulo)}</h3></div>
      <p class="hq-bubble tr">${E(m.subtitulo || '')}</p>
      <p class="hq-sum tr">${E(m.resumo)}</p>
      <footer><span class="chip">${E(m.municipio)}</span><span class="chip t-${E(m.tipo)} tr">${E(m.tipo)}</span><span class="stars" title="${E(m.raridade)}">${'★'.repeat({ 'Lendária': 4, 'Épica': 3, 'Rara': 2 }[m.raridade] || 1)}</span></footer></article>`;
  }

  function detail(w, m) {
    const chars = (m.personagens || []).map(id => HUB.idx.p.get(id)).filter(Boolean);
    w.body.innerHTML = `<div class="myth">
      <div class="myth-top"><button class="btn ghost" data-act="back">← <span data-i18n="back"></span></button>
        <div class="grow"></div><button class="btn" data-open="flashcards" data-arg="${E(m.id)}">🃏 <span data-i18n="study"></span></button><button class="btn ghost" data-open="grafo" data-arg="${E(m.id)}">🕸️ <span data-i18n="see_graph"></span></button></div>
      <div class="comic">
        <div class="panel p-art">${ART.scene(m, { burst: true })}<div class="p-title"><h2 class="tr">${E(m.titulo)}</h2></div><div class="p-bubble tr">${E(m.subtitulo || '')}</div></div>
        <div class="panel p-meta">
          <dl><dt data-i18n="place"></dt><dd class="tr">${E(m.local)} — ${E(m.municipio)}</dd><dt data-i18n="era"></dt><dd class="tr">${E(m.epoca)}</dd><dt data-i18n="type"></dt><dd class="tr">${E(m.tipo)}</dd><dt data-i18n="rarity"></dt><dd>${E(m.raridade)}</dd></dl>
          ${m.sensivel ? `<p class="warn">⚠️ <span data-i18n="sensitive"></span>. Se você estiver passando por um momento difícil, o CVV atende 24h pelo telefone 188.</p>` : ''}
        </div>
        <div class="panel p-chars"><h4 data-i18n="characters_linked"></h4><div class="mini-cards">${chars.map(p => `<button class="mini" data-open="personagens" data-arg="${E(p.id)}" style="--rar:${(ART.RAR[p.raridade] || ART.RAR.Comum)[0]}">${ART.portrait(p)}<span class="tr">${E(p.nome)}</span></button>`).join('') || '<em>—</em>'}</div></div>
        <div class="panel p-text"><p class="lead tr">${E(m.resumo)}</p><p class="tr">${E(m.historia || '')}</p></div>
        <div class="panel p-src"><h4 data-i18n="sources"></h4><ol>${(m.fontes || []).map(k => { const f = fonteTxt(k); return `<li><span class="badge ${f.tipo === 'primaria' ? 'pri' : 'sec'}" data-i18n="${f.tipo === 'primaria' ? 'primary' : 'secondary'}"></span> ${E(f.t)}${f.url ? ` <a href="${E(f.url)}" target="_blank" rel="noopener noreferrer">↗</a>` : ''}${f.nota ? `<br><small>${E(f.nota)}</small>` : ''}</li>` }).join('')}</ol>
          <p class="fine">${E(HUB.data.aviso || '')}</p></div>
      </div></div>`;
    $('[data-act=back]', w.body).onclick = () => { w.arg = undefined; HUB.render('biblioteca') };
  }

  function timeline(list) {
    const sorted = list.slice().sort((a, b) => a.ano - b.ano);
    return `<div class="vtl">${sorted.map((m, i) => `<button class="vtl-item ${i % 2 ? 'r' : 'l'}" data-myth="${E(m.id)}"><span class="vtl-year">${E(m.ano)}</span>
      <span class="vtl-card"><span class="vtl-art">${ART.scene(m)}</span><span class="vtl-txt"><b class="tr">${E(m.titulo)}</b><small class="tr">${E(m.epoca)} · ${E(m.municipio)}</small></span></span></button>`).join('')}</div>
      <p class="fine center">Ano de referência usado para ordenar; veja a época e as divergências entre versões em cada mito.</p>`;
  }

  HUB.mod('biblioteca', {
    title: 'biblioteca', w: 1040, h: 680,
    render(w) {
      if (!HUB.data) { w.body.innerHTML = `<div class="empty" data-i18n="loading"></div>`; return }
      if (w.arg) { const m = HUB.idx.m.get(w.arg); if (m) return detail(w, m) }
      const st = w.state; st.q = st.q || ''; st.tipo = st.tipo || ''; st.sort = st.sort || 'chrono'; st.view = st.view || 'grid';
      const q = st.q.toLowerCase();
      let list = HUB.data.mitos.filter(m => (!st.tipo || m.tipo === st.tipo) && (!q || [m.titulo, m.subtitulo, m.local, m.municipio, m.resumo, ...(m.tags || []), ...(m.personagens || []).map(id => (HUB.idx.p.get(id) || {}).nome)].join(' ').toLowerCase().includes(q)));
      list.sort(st.sort === 'az' ? (a, b) => a.titulo.localeCompare(b.titulo) : (a, b) => a.ano - b.ano);
      w.body.innerHTML = `<div class="bib">
        <div class="toolbar"><input class="search" type="search" data-i18n-ph="search" value="${E(st.q)}">
          <div class="seg"><button class="${st.view === 'grid' ? 'on' : ''}" data-view="grid" data-i18n="grid"></button><button class="${st.view === 'tl' ? 'on' : ''}" data-view="tl" data-i18n="timeline"></button></div>
          <select class="sort"><option value="chrono" ${st.sort === 'chrono' ? 'selected' : ''} data-i18n="sort_chrono"></option><option value="az" ${st.sort === 'az' ? 'selected' : ''} data-i18n="sort_az"></option></select></div>
        <div class="chips"><button class="chip ${!st.tipo ? 'on' : ''}" data-tipo="" data-i18n="all"></button>${TIPOS.map(t => `<button class="chip t-${t} ${st.tipo === t ? 'on' : ''}" data-tipo="${t}"><span class="tr">${t}</span></button>`).join('')}</div>
        ${list.length ? (st.view === 'tl' ? timeline(list) : `<div class="hq-grid">${list.map(card).join('')}</div>`) : `<div class="empty" data-i18n="none"></div>`}
        <p class="fine">${E(HUB.data.colecao || '')} · ${HUB.data.mitos.length} ${E(HUB.t('myths').toLowerCase())}</p></div>`;
      const s = $('.search', w.body); s.oninput = () => { st.q = s.value; clearTimeout(st.tm); st.tm = setTimeout(() => { HUB.render('biblioteca'); const n = $('.search', w.body); n.focus(); n.setSelectionRange(n.value.length, n.value.length) }, 220) };
      $('.sort', w.body).onchange = e => { st.sort = e.target.value; HUB.render('biblioteca') };
      $$('[data-view]', w.body).forEach(b => b.onclick = () => { st.view = b.dataset.view; HUB.render('biblioteca') });
      $$('[data-tipo]', w.body).forEach(b => b.onclick = () => { st.tipo = b.dataset.tipo; HUB.render('biblioteca') });
      $$('[data-myth]', w.body).forEach(c => { const go = () => { w.arg = c.dataset.myth; HUB.render('biblioteca'); w.body.scrollTop = 0 }; c.onclick = go; c.onkeydown = e => { if (e.key === 'Enter') go() } });
    }
  });
  HUB.on('data', () => ['biblioteca', 'personagens', 'flashcards', 'grafo', 'agenda'].forEach(id => HUB.wins[id] && HUB.render(id)));
})();
