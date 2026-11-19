/* Jogos: Duelo de Cartas (estilo trunfo com os personagens), Quiz dos Mitos e acesso à Loja do Somnia */
(function () {
  const { E, $, $$ } = HUB;
  const ATTR = ['misterio', 'coragem', 'fe', 'astucia', 'assombro'];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };

  function newDuel() { const s = shuffle(HUB.data.personagens), h = Math.floor(s.length / 2); return { you: s.slice(0, h), cpu: s.slice(h, h * 2), turn: 'you', round: 1, max: 12, last: null, reveal: false } }
  function duel(w) {
    const st = w.state; if (!st.duel) st.duel = newDuel(); const d = st.duel;
    const over = !d.you.length || !d.cpu.length || d.round > d.max;
    if (over) {
      const r = d.you.length > d.cpu.length ? 'win' : d.you.length < d.cpu.length ? 'lose' : 'tie';
      return `<div class="duel-over ${r}"><div class="big">${r === 'win' ? '🏆' : r === 'lose' ? '🔮' : '🤝'}</div><h2 data-i18n="${r}"></h2><p><span data-i18n="score"></span>: ${d.you.length} × ${d.cpu.length}</p><button class="btn" data-act="newduel" data-i18n="new_game"></button></div>`;
    }
    const a = d.you[0], b = d.cpu[0];
    return `<div class="duel">
      <div class="duel-score"><span><b data-i18n="you"></b> ${d.you.length}</span><span class="rd">${d.round}/${d.max}</span><span><b data-i18n="cpu"></b> ${d.cpu.length}</span></div>
      <p class="duel-msg">${d.last ? `<b data-i18n="${d.last.r}"></b> <span class="tr">${E(HUB.t(d.last.a))}</span>: ${d.last.va} × ${d.last.vb}` : `<span data-i18n="choose_attr"></span>`}</p>
      <div class="duel-table">${HUB.rpgCard(a, { pick: d.turn === 'you' && !d.reveal, cls: 'duel-a' })}
        <div class="vs">VS</div>
        ${d.reveal ? HUB.rpgCard(b, { cls: 'duel-b' }) : `<div class="rpg back-only"><div class="rpg-in"><div class="rpg-face cardback">${ART.icon('personagens', 120)}<b>SOMNIA</b></div></div></div>`}</div>
      ${d.reveal ? `<div class="center"><button class="btn" data-act="nextround" data-i18n="next"></button></div>` : d.turn === 'cpu' ? `<p class="center"><span data-i18n="cpu"></span> …</p>` : ''}</div>`;
  }
  function play(w, attr) {
    const d = w.state.duel, a = d.you[0], b = d.cpu[0], va = a.atributos[attr] || 0, vb = b.atributos[attr] || 0;
    const r = va > vb ? 'win' : va < vb ? 'lose' : 'tie'; d.last = { r, a: attr, va, vb }; d.reveal = true; HUB.beep(r === 'win' ? 'win' : r === 'lose' ? 'lose' : 'pop');
    HUB.render('jogos'); const sel = $(`.duel-a .attr[data-attr=${attr}]`, w.body), sel2 = $(`.duel-b .attr[data-attr=${attr}]`, w.body); if (sel) sel.classList.add('hl'); if (sel2) sel2.classList.add('hl');
  }
  function nextRound(w) {
    const d = w.state.duel, a = d.you.shift(), b = d.cpu.shift();
    if (d.last.r === 'win') { d.you.push(a, b); d.turn = 'you' } else if (d.last.r === 'lose') { d.cpu.push(b, a); d.turn = 'cpu' } else { d.you.push(a); d.cpu.push(b) }
    d.round++; d.reveal = false; d.last = null; HUB.render('jogos');
    if (d.turn === 'cpu' && d.you.length && d.cpu.length && d.round <= d.max) setTimeout(() => { if (!HUB.wins.jogos) return; const c = d.cpu[0]; const best = ATTR.reduce((x, y) => (c.atributos[y] || 0) > (c.atributos[x] || 0) ? y : x, ATTR[0]); play(w, best) }, 900);
  }

  function newQuiz() {
    const M = HUB.data.mitos, P = HUB.data.personagens, qs = [];
    for (const m of shuffle(M).slice(0, 4)) { const opts = shuffle([m, ...shuffle(M.filter(x => x.id !== m.id && x.epoca !== m.epoca)).slice(0, 3)]); qs.push({ q: `Em que época se passa "${m.titulo}"?`, opts: opts.map(x => x.epoca), ok: m.epoca, mid: m.id }) }
    for (const p of shuffle(P.filter(x => (x.mitos || []).length)).slice(0, 3)) { const m = HUB.idx.m.get(p.mitos[0]); if (!m) continue; const opts = shuffle([m, ...shuffle(M.filter(x => !p.mitos.includes(x.id))).slice(0, 3)]); qs.push({ q: `${p.nome} é personagem de qual mito?`, opts: opts.map(x => x.titulo), ok: m.titulo, mid: m.id }) }
    for (const m of shuffle(M).slice(0, 3)) { const opts = shuffle([m, ...shuffle(M.filter(x => x.local !== m.local)).slice(0, 3)]); qs.push({ q: `Onde se passa "${m.titulo}"?`, opts: opts.map(x => x.local), ok: m.local, mid: m.id }) }
    return { qs: shuffle(qs), i: 0, pts: 0, ans: null };
  }
  function quiz(w) {
    const st = w.state; if (!st.quiz) st.quiz = newQuiz(); const z = st.quiz;
    if (z.i >= z.qs.length) return `<div class="duel-over win"><div class="big">🎓</div><h2><span data-i18n="score"></span>: ${z.pts}/${z.qs.length}</h2><button class="btn" data-act="newquiz" data-i18n="new_game"></button></div>`;
    const q = z.qs[z.i];
    return `<div class="quiz"><div class="duel-score"><span>${z.i + 1}/${z.qs.length}</span><span>⭐ ${z.pts}</span></div><h3 class="tr">${E(q.q)}</h3>
      <div class="opts">${q.opts.map((o, i) => `<button class="opt ${z.ans != null ? (o === q.ok ? 'ok' : i === z.ans ? 'no' : '') : ''}" data-opt="${i}" ${z.ans != null ? 'disabled' : ''}><span class="tr">${E(o)}</span></button>`).join('')}</div>
      ${z.ans != null ? `<p class="center"><b data-i18n="${q.opts[z.ans] === q.ok ? 'correct' : 'incorrect'}"></b> <button class="btn ghost" data-open="biblioteca" data-arg="${E(q.mid)}" data-i18n="read_more"></button> <button class="btn" data-act="nextq" data-i18n="next"></button></p>` : ''}</div>`;
  }

  HUB.mod('jogos', {
    title: 'jogos', w: 980, h: 720,
    render(w) {
      if (!HUB.data) { w.body.innerHTML = `<div class="empty" data-i18n="loading"></div>`; return }
      const st = w.state; st.tab = st.tab || 'duel';
      w.body.innerHTML = `<div class="games"><div class="seg big">
        <button class="${st.tab === 'duel' ? 'on' : ''}" data-tab="duel">⚔️ <span data-i18n="duel"></span></button>
        <button class="${st.tab === 'quiz' ? 'on' : ''}" data-tab="quiz">❓ <span data-i18n="quiz"></span></button>
        <button data-open="museu" data-arg="loja">🛒 <span data-i18n="store"></span></button></div>
        <div class="game-area">${st.tab === 'duel' ? duel(w) : quiz(w)}</div></div>`;
      $$('[data-tab]', w.body).forEach(b => b.onclick = () => { st.tab = b.dataset.tab; HUB.render('jogos') });
      $$('.pickable', w.body).forEach(el => el.onclick = e => { e.stopPropagation(); play(w, el.dataset.attr) });
      const on = (a, fn) => { const b = $(`[data-act=${a}]`, w.body); if (b) b.onclick = fn };
      on('nextround', () => nextRound(w)); on('newduel', () => { st.duel = newDuel(); HUB.render('jogos') });
      on('newquiz', () => { st.quiz = newQuiz(); HUB.render('jogos') }); on('nextq', () => { st.quiz.i++; st.quiz.ans = null; HUB.render('jogos') });
      $$('[data-opt]', w.body).forEach(b => b.onclick = () => { const z = st.quiz, i = +b.dataset.opt; z.ans = i; if (z.qs[z.i].opts[i] === z.qs[z.i].ok) { z.pts++; HUB.beep('win') } else HUB.beep('lose'); HUB.render('jogos') });
    }
  });
})();
