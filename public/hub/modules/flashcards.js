/* Flashcards em 4 quadrantes (padrão acadêmico e simbólico) com repetição espaçada simples (caixas de Leitner, local) */
(function () {
  const { E, $, $$ } = HUB;
  const BOX_DAYS = [0, 1, 3, 7, 16];
  const key = () => 'leitner-' + (HUB.me ? HUB.me.id : 'visitante');

  HUB.infographic = function (m) {
    const f = m.flashcard; if (!f) return `<div class="empty">Este mito ainda não tem flashcard.</div>`;
    const fontes = (m.fontes || []).map(k => HUB.data.fontes[k]).filter(Boolean);
    return `<div class="ig">
      <header class="ig-head"><h2 class="tr">${E(m.titulo.toUpperCase())}</h2><span>| SUPORTE COGNITIVO, FONTES E SIMBOLOGIA</span></header>
      <div class="ig-grid">
        <section class="q qb"><h3><span class="qn">B</span><span data-i18n="b_title"></span></h3>
          <ol class="steps">${(f.b.etapas || []).map((s, i) => `<li><span class="sn">${i + 1}</span>${ART.glyph(s.ic, 34)}<div><b class="tr">${E(s.t)}</b><p class="tr">${E(s.d)}</p></div></li>`).join('<li class="arrow" aria-hidden="true">→</li>')}</ol>
          <div class="crit">⚡ <span class="tr">${E(f.b.critico)}</span></div></section>
        <section class="q qc"><h3><span class="qn">C</span><span data-i18n="c_title"></span></h3>
          <ul class="cog">
            <li>${ART.glyph('lua', 28)}<div><b data-i18n="c1"></b><p class="tr">${E(f.c.manifestacao)}</p></div></li>
            <li>${ART.glyph('bussola', 28)}<div><b data-i18n="c2"></b><p class="tr">${E(f.c.contexto)}</p></div></li>
            <li>${ART.glyph('ampulheta', 28)}<div><b data-i18n="c3"></b><p class="tr">${E(f.c.inflexao)}</p></div></li>
            <li class="keyline">${ART.glyph('chave', 28)}<div><b data-i18n="c4"></b><p class="tr">${E(f.c.chave)}</p></div></li></ul></section>
        <section class="q qd"><h3><span class="qn">D</span><span data-i18n="d_title"></span></h3>
          <div class="flow"><div class="node entry tr">${E(f.d.entrada)}</div>
            <div class="fork"><div class="branch"><div class="node lit tr">${E(f.d.literal.rotulo)}</div><ul>${f.d.literal.itens.map(i => `<li class="tr">${E(i)}</li>`).join('')}</ul></div>
            <div class="branch"><div class="node sym tr">${E(f.d.simbolica.rotulo)}</div><ul>${f.d.simbolica.itens.map(i => `<li class="tr">${E(i)}</li>`).join('')}</ul></div></div>
            <div class="node cross">🔀 <span class="tr">${E(f.d.cruzamento)}</span></div></div></section>
        <section class="q qe"><h3><span class="qn">E</span><span data-i18n="e_title"></span></h3>
          <b data-i18n="key_points"></b><ul class="kp">${f.e.pontos.map(p => `<li class="tr">${E(p)}</li>`).join('')}</ul>
          <b data-i18n="refs"></b><ol class="refs">${fontes.map(s => `<li>${E(s.t)}${s.tipo === 'primaria' ? ' <em>[fonte primária]</em>' : ''}</li>`).join('')}</ol></section>
      </div>
      <footer class="ig-foot"><b data-i18n="glossary"></b>: ${(f.e.glossario || []).map(g => `<span><b>${E(g[0])}</b> — <span class="tr">${E(g[1])}</span></span>`).join(' · ')}</footer></div>`;
  };

  function front(m) {
    const f = m.flashcard || {};
    return `<div class="fc-front"><header class="ig-head"><h2 class="tr">${E(m.titulo.toUpperCase())}</h2><span>| FLASHCARD DE REVISÃO</span></header>
      <div class="fc-body"><div class="fc-art">${ART.scene(m)}</div>
        <div class="fc-side-info"><div class="fc-q"><small data-i18n="q_trigger"></small><p class="tr">${E(f.pergunta || m.subtitulo)}</p></div>
          <dl class="fc-meta"><dt data-i18n="place"></dt><dd class="tr">${E(m.local)}</dd><dt data-i18n="era"></dt><dd class="tr">${E(m.epoca)}</dd><dt data-i18n="type"></dt><dd class="tr">${E(m.tipo)}</dd></dl>
          <div class="fc-chars">${(m.personagens || []).map(id => HUB.idx.p.get(id)).filter(Boolean).map(p => `<span class="fc-av" title="${E(p.nome)}">${ART.portrait(p)}</span>`).join('')}</div>
          <p class="fc-tap">👆 <span data-i18n="flip"></span> → <span data-i18n="backside"></span>: 4 quadrantes</p></div></div></div>`;
  }

  HUB.mod('flashcards', {
    title: 'flashcards', w: 1080, h: 740,
    render(w) {
      if (!HUB.data) { w.body.innerHTML = `<div class="empty" data-i18n="loading"></div>`; return }
      const st = w.state, L = HUB.store.get(key(), {}), now = Date.now();
      const all = HUB.data.mitos.filter(m => m.flashcard);
      if (w.arg) { st.deck = w.arg; st.i = 0; st.flip = false; w.arg = undefined }
      st.deck = st.deck || ''; const deck = st.deck ? all.filter(m => m.id === st.deck) : all.slice().sort((a, b) => ((L[a.id] || {}).due || 0) - ((L[b.id] || {}).due || 0));
      st.i = Math.min(st.i || 0, Math.max(0, deck.length - 1)); const m = deck[st.i];
      const due = all.filter(x => !L[x.id] || (L[x.id].due || 0) <= now).length;
      w.tools.innerHTML = `<button class="tbtn" data-act="print" title="${E(HUB.t('print'))}">🖨️</button>`;
      w.body.innerHTML = `<div class="fc">
        <div class="toolbar"><select class="deck"><option value="" data-i18n="deck_all"></option>${all.map(x => `<option value="${E(x.id)}" ${st.deck === x.id ? 'selected' : ''}>${E(x.titulo)}</option>`).join('')}</select>
          <span class="pill">📚 ${due} <span data-i18n="due"></span></span><div class="grow"></div>
          ${HUB.data.curador && HUB.ai && m ? `<button class="btn ghost" data-act="ai">✨ <span data-i18n="gen_ai"></span></button>` : ''}
          <button class="btn ghost" data-act="prev" ${st.i <= 0 ? 'disabled' : ''}>◀</button><span class="pill">${deck.length ? st.i + 1 : 0}/${deck.length}</span><button class="btn ghost" data-act="next" ${st.i >= deck.length - 1 ? 'disabled' : ''}>▶</button></div>
        ${m ? `<div class="fc-stage ${st.flip ? 'flipped' : ''}"><div class="fc-card"><div class="fc-side a">${front(m)}</div><div class="fc-side b">${HUB.infographic(m)}</div></div></div>
        <div class="fc-actions"><button class="btn" data-act="flip">🔄 <span data-i18n="flip"></span></button>
          <span class="grow"></span><button class="btn bad" data-grade="0">✖ <span data-i18n="wrong"></span></button><button class="btn mid" data-grade="1">◐ <span data-i18n="hard"></span></button><button class="btn good" data-grade="2">✔ <span data-i18n="easy"></span></button></div>` : `<div class="empty" data-i18n="none"></div>`}</div>`;
      const go = d => { st.i = Math.max(0, Math.min(deck.length - 1, st.i + d)); st.flip = false; HUB.render('flashcards') };
      $('.deck', w.body).onchange = e => { st.deck = e.target.value; st.i = 0; st.flip = false; HUB.render('flashcards') };
      const on = (a, fn) => { const b = $(`[data-act=${a}]`, w.el); if (b) b.onclick = fn };
      on('prev', () => go(-1)); on('next', () => go(1));
      on('flip', () => { st.flip = !st.flip; $('.fc-stage', w.body).classList.toggle('flipped', st.flip); HUB.beep('pop') });
      const stage = $('.fc-stage', w.body); if (stage) stage.onclick = e => { if (e.target.closest('a,button')) return; st.flip = !st.flip; stage.classList.toggle('flipped', st.flip) };
      $$('[data-grade]', w.body).forEach(b => b.onclick = () => {
        const g = +b.dataset.grade, cur = L[m.id] || { box: 0 }; cur.box = g === 0 ? 0 : Math.min(4, cur.box + (g === 2 ? 2 : 1)); cur.due = now + BOX_DAYS[cur.box] * 864e5 + (g === 0 ? 60000 : 0); L[m.id] = cur;
        HUB.store.set(key(), L); HUB.beep(g ? 'win' : 'lose'); if (!st.deck) { st.i = 0 } else go(0); st.flip = false; HUB.render('flashcards');
      });
      on('print', () => { if (!m) return; const wnd = window.open('', '_blank'); if (!wnd) return HUB.toast('Permita pop-ups para imprimir.'); const css = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join(''); wnd.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${E(m.titulo)}</title>${css}</head><body class="print">${HUB.infographic(m)}</body></html>`); wnd.document.close(); setTimeout(() => wnd.print(), 600) });
      on('ai', async () => {
        const b = $('[data-act=ai]', w.body); b.disabled = true; b.textContent = '…';
        try { const r = await HUB.api('POST', '/api/mitos/flashcard', { id: m.id }); const nm = { ...m, flashcard: r.flashcard }; delete nm.origem; await HUB.api('PUT', '/api/mitos/item?t=myth&id=' + encodeURIComponent(m.id), nm); HUB.toast('Flashcard gerado e salvo.'); await HUB.loadData() }
        catch (e) { HUB.toast(e.message) } finally { b.disabled = false }
      });
    }
  });
})();
