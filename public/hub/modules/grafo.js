/* Grafo de relações mito ↔ personagem com arrastar e soltar (curadores criam vínculos soltando um personagem sobre um mito) */
(function () {
  const { E, $ } = HUB;
  const COL = { 'assombração': '#7048e8', 'milagre': '#f59f00', 'criatura': '#1c7ed6', 'fenômeno': '#e8590c', 'encantamento': '#12b886', 'história-lenda': '#a0522d' };

  function build(w) {
    const M = HUB.data.mitos, P = HUB.data.personagens, W = w.body.clientWidth || 900, H = (w.body.clientHeight || 600) - 40;
    const nodes = [], idx = {};
    M.forEach((m, i) => { const a = i / M.length * Math.PI * 2; const n = { id: 'm:' + m.id, t: 'm', ref: m, x: W / 2 + Math.cos(a) * W * .3, y: H / 2 + Math.sin(a) * H * .3, r: 26 }; nodes.push(n); idx[n.id] = n });
    P.forEach(p => { const ms = (p.mitos || []).map(id => idx['m:' + id]).filter(Boolean); const cx = ms.length ? ms.reduce((s, n) => s + n.x, 0) / ms.length : W / 2, cy = ms.length ? ms.reduce((s, n) => s + n.y, 0) / ms.length : H / 2; const n = { id: 'p:' + p.id, t: 'p', ref: p, x: cx + (Math.random() - .5) * 80, y: cy + (Math.random() - .5) * 80, r: 17 }; nodes.push(n); idx[n.id] = n });
    const links = []; P.forEach(p => (p.mitos || []).forEach(m => { if (idx['m:' + m]) links.push([idx['p:' + p.id], idx['m:' + m]]) }));
    return { nodes, links, idx, W, H };
  }
  function tick(g) {
    const { nodes, links, W, H } = g;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const a = nodes[i], b = nodes[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const min = a.r + b.r + 26; if (d < min * 2.2) { const f = (min * 2.2 - d) / d * .04; dx *= f; dy *= f; if (!a.fix) { a.x -= dx; a.y -= dy } if (!b.fix) { b.x += dx; b.y += dy } } }
    links.forEach(([a, b]) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 90) / d * .02; if (!a.fix) { a.x += dx * f; a.y += dy * f } if (!b.fix) { b.x -= dx * f; b.y -= dy * f } });
    nodes.forEach(n => { if (n.fix) return; n.x += (W / 2 - n.x) * .002; n.y += (H / 2 - n.y) * .002; n.x = Math.max(n.r, Math.min(W - n.r, n.x)); n.y = Math.max(n.r, Math.min(H - n.r, n.y)) });
  }
  function draw(w) {
    const g = w.state.g, svg = $('svg.graph', w.body); if (!svg) return;
    $('.links', svg).innerHTML = g.links.map(([a, b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${w.state.hl && (a.id === w.state.hl || b.id === w.state.hl) ? 'hl' : ''}"/>`).join('');
    g.nodes.forEach(n => { const el = svg.querySelector(`[data-n="${CSS.escape(n.id)}"]`); if (el) el.setAttribute('transform', `translate(${n.x} ${n.y})`) });
  }

  HUB.mod('grafo', {
    title: 'grafo', w: 1000, h: 680,
    destroy(w) { cancelAnimationFrame(w.state.raf) },
    render(w) {
      if (!HUB.data) { w.body.innerHTML = `<div class="empty" data-i18n="loading"></div>`; return }
      cancelAnimationFrame(w.state.raf);
      w.body.innerHTML = `<div class="gwrap"><p class="ghelp">🕸️ <span data-i18n="graph_help"></span></p><svg class="graph" width="100%" height="100%"><g class="links"></g><g class="nodes"></g></svg></div>`;
      const g = w.state.g = build(w); if (w.arg) { w.state.hl = 'm:' + w.arg; w.arg = undefined }
      const svg = $('svg.graph', w.body);
      $('.nodes', svg).innerHTML = g.nodes.map(n => n.t === 'm'
        ? `<g class="gn gm ${w.state.hl === n.id ? 'hl' : ''}" data-n="${E(n.id)}"><circle r="${n.r}" fill="${COL[n.ref.tipo] || '#495057'}"/><circle r="${n.r - 6}" fill="#fff" opacity=".18"/><text y="${n.r + 15}" class="tr">${E(n.ref.titulo)}</text><text class="yr" y="5">${n.ref.ano}</text></g>`
        : `<g class="gn gp" data-n="${E(n.id)}"><clipPath id="cp-${E(n.ref.id)}"><circle r="${n.r}"/></clipPath><circle r="${n.r + 2.5}" fill="${(ART.RAR[n.ref.raridade] || ART.RAR.Comum)[0]}"/><g clip-path="url(#cp-${E(n.ref.id)})"><g transform="translate(${-n.r} ${-n.r}) scale(${n.r * 2 / 200})">${ART.portrait(n.ref).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></g><text y="${n.r + 13}" class="small tr">${E(n.ref.nome)}</text></g>`).join('');
      let dragN = null, moved = false, steps = 0;
      const pt = e => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } };
      svg.addEventListener('pointerdown', e => { const el = e.target.closest('.gn'); if (!el) return; dragN = g.idx[el.dataset.n]; dragN.fix = true; moved = false; svg.setPointerCapture(e.pointerId); steps = Math.min(steps, 60) });
      svg.addEventListener('pointermove', e => { if (!dragN) return; const p = pt(e); dragN.x = p.x; dragN.y = p.y; moved = true; draw(w) });
      svg.addEventListener('pointerup', async e => {
        if (!dragN) return; const n = dragN; dragN = null; n.fix = false;
        if (!moved) { if (n.t === 'm') HUB.open('biblioteca', n.ref.id); else HUB.open('personagens', n.ref.id); return }
        if (n.t === 'p') {
          const target = g.nodes.find(m => m.t === 'm' && Math.hypot(m.x - n.x, m.y - n.y) < m.r + 6);
          if (target && !(n.ref.mitos || []).includes(target.ref.id)) {
            if (!HUB.data.curador) { HUB.toast('Somente curadores (admin ou historiador verificado) criam vínculos.'); return }
            try {
              const p = { ...n.ref, mitos: [...(n.ref.mitos || []), target.ref.id] }, m = { ...target.ref, personagens: [...(target.ref.personagens || []), n.ref.id] };
              delete p.origem; delete m.origem;
              await HUB.api('PUT', '/api/mitos/item?t=char&id=' + encodeURIComponent(n.ref.id), p);
              await HUB.api('PUT', '/api/mitos/item?t=myth&id=' + encodeURIComponent(target.ref.id), m);
              HUB.toast(`Vínculo criado: ${n.ref.nome} → ${target.ref.titulo}`); await HUB.loadData();
            } catch (err) { HUB.toast(err.message) }
          }
        }
      });
      const loop = () => { if (steps++ < 400 || dragN) { tick(g); draw(w) } w.state.raf = requestAnimationFrame(loop) };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { for (let i = 0; i < 300; i++) tick(g); draw(w) } else loop();
    }
  });
  HUB.on('resize', id => { if (id === 'grafo') HUB.render('grafo') });
})();
