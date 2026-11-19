/* Cartas RPG dos personagens (frente: retrato e atributos; verso: biografia e mitos vinculados) */
(function () {
  const { E, $, $$ } = HUB;
  const ATTR = ['misterio', 'coragem', 'fe', 'astucia', 'assombro'];
  const HIST = { historico: 'historic', lenda: 'legend', coletivo: 'collective', devocao: 'devotion', cronica: 'chronicle', incerto: 'uncertain' };

  HUB.rpgCard = function (p, opts) {
    const r = ART.RAR[p.raridade] || ART.RAR.Comum, o = opts || {};
    const bars = ATTR.map(a => `<div class="attr ${o.pick ? 'pickable' : ''}" data-attr="${a}"><span data-i18n="${a}"></span><i style="--v:${(p.atributos || {})[a] || 0}"></i><b>${(p.atributos || {})[a] || 0}</b></div>`).join('');
    return `<div class="rpg ${o.flipped ? 'flipped' : ''} ${o.cls || ''}" data-char="${E(p.id)}" style="--rar:${r[0]};--rar2:${r[1]}" tabindex="0">
      <div class="rpg-in">
        <div class="rpg-face rpg-front">
          <div class="rpg-head"><span class="rpg-name tr">${E(p.nome)}</span><span class="rpg-rar tr">${E(p.raridade)}</span></div>
          <div class="rpg-art">${ART.portrait(p)}<span class="rpg-class tr">${E(p.classe)}</span></div>
          <div class="rpg-attrs">${bars}</div>
          <div class="rpg-skill"><b data-i18n="ability"></b>: <span class="tr">${E(p.habilidade || '')}</span></div>
        </div>
        <div class="rpg-face rpg-back">
          <div class="rpg-head"><span class="rpg-name tr">${E(p.nome)}</span></div>
          <p class="rpg-role tr">${E(p.papel)}</p><span class="badge" data-i18n="${HIST[p.historico] || 'legend'}"></span>
          <p class="rpg-bio tr">${E(p.bio || '')}</p>
          <div class="rpg-myths"><b data-i18n="myths"></b>${(p.mitos || []).map(id => { const m = HUB.idx.m.get(id); return m ? `<button class="chip" data-open="biblioteca" data-arg="${E(id)}"><span class="tr">${E(m.titulo)}</span></button>` : '' }).join('')}</div>
          <p class="fine" data-i18n="attrs"></p>
        </div>
      </div></div>`;
  };

  HUB.mod('personagens', {
    title: 'personagens', w: 1060, h: 700,
    render(w) {
      if (!HUB.data) { w.body.innerHTML = `<div class="empty" data-i18n="loading"></div>`; return }
      const st = w.state; st.rar = st.rar || ''; st.q = st.q || '';
      const focus = w.arg; w.arg = undefined;
      const q = st.q.toLowerCase(), RS = ['Lendária', 'Épica', 'Rara', 'Comum'];
      const list = HUB.data.personagens.filter(p => (!st.rar || p.raridade === st.rar) && (!q || [p.nome, p.classe, p.papel, p.bio].join(' ').toLowerCase().includes(q)))
        .sort((a, b) => RS.indexOf(a.raridade) - RS.indexOf(b.raridade) || a.nome.localeCompare(b.nome));
      w.body.innerHTML = `<div class="chars">
        <div class="toolbar"><input class="search" type="search" data-i18n-ph="search" value="${E(st.q)}">
          <div class="chips"><button class="chip ${!st.rar ? 'on' : ''}" data-rar="" data-i18n="all"></button>${RS.map(r => `<button class="chip ${st.rar === r ? 'on' : ''}" data-rar="${r}" style="--c:${ART.RAR[r][0]}">${r}</button>`).join('')}</div></div>
        <div class="rpg-grid">${list.map(p => HUB.rpgCard(p, { flipped: false, cls: p.id === focus ? 'focus' : '' })).join('') || `<div class="empty" data-i18n="none"></div>`}</div></div>`;
      $$('.rpg', w.body).forEach(c => { const f = e => { if (e.target.closest('[data-open]')) return; c.classList.toggle('flipped'); HUB.beep('pop') }; c.onclick = f; c.onkeydown = e => { if (e.key === 'Enter') f(e) } });
      $$('[data-rar]', w.body).forEach(b => b.onclick = () => { st.rar = b.dataset.rar; HUB.render('personagens') });
      const s = $('.search', w.body); s.oninput = () => { st.q = s.value; clearTimeout(st.tm); st.tm = setTimeout(() => { HUB.render('personagens'); const n = $('.search', w.body); n.focus(); n.setSelectionRange(n.value.length, n.value.length) }, 220) };
      if (focus) { const el = $(`.rpg[data-char="${focus}"]`, w.body); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60) }
    }
  });
})();
