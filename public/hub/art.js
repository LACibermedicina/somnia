/* Somnia Hub — arte procedural em SVG: ícones 3D estilo "Pixar", ilustrações HQ dos mitos,
   retratos RPG dos personagens, ícones semânticos dos flashcards e bandeiras. Sem imagens externas. */
(function () {
  const A = (window.ART = {});
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- ícones 3D com rosto (Pixar) ---------- */
  const PAL = {
    biblioteca: ['#ff9f43', '#e8590c', '#ffd8a8'], personagens: ['#b197fc', '#6741d9', '#e5dbff'],
    flashcards: ['#63e6be', '#0ca678', '#c3fae8'], jogos: ['#ff8787', '#e03131', '#ffe3e3'],
    grafo: ['#74c0fc', '#1971c2', '#d0ebff'], agenda: ['#ffd43b', '#f08c00', '#fff3bf'],
    museu: ['#a9e34b', '#5c940d', '#e9fac8'], comunidade: ['#f783ac', '#c2255c', '#ffdeeb'],
    guia: ['#ffe066', '#fab005', '#fff9db'], ajuda: ['#91a7ff', '#3b5bdb', '#dbe4ff'], sobre: ['#ced4da', '#495057', '#f1f3f5']
  };
  const face = (cx, cy, s, mouth) => `
    <g class="face">
      <ellipse cx="${cx - 9 * s}" cy="${cy}" rx="${5.2 * s}" ry="${6.4 * s}" fill="#fff"/>
      <ellipse cx="${cx + 9 * s}" cy="${cy}" rx="${5.2 * s}" ry="${6.4 * s}" fill="#fff"/>
      <g class="pupils"><circle cx="${cx - 8 * s}" cy="${cy + 1 * s}" r="${3.1 * s}" fill="#1b1b2f"/><circle cx="${cx + 10 * s}" cy="${cy + 1 * s}" r="${3.1 * s}" fill="#1b1b2f"/>
      <circle cx="${cx - 6.8 * s}" cy="${cy - 0.6 * s}" r="${1.1 * s}" fill="#fff"/><circle cx="${cx + 11.2 * s}" cy="${cy - 0.6 * s}" r="${1.1 * s}" fill="#fff"/></g>
      <g class="lids"><ellipse class="lid" cx="${cx - 9 * s}" cy="${cy}" rx="${5.6 * s}" ry="${6.8 * s}"/><ellipse class="lid" cx="${cx + 9 * s}" cy="${cy}" rx="${5.6 * s}" ry="${6.8 * s}"/></g>
      ${mouth === 'o' ? `<ellipse cx="${cx + 1 * s}" cy="${cy + 11 * s}" rx="${2.6 * s}" ry="${3 * s}" fill="#5c1a1a"/>` : `<path d="M${cx - 5 * s} ${cy + 9 * s} Q${cx + 1 * s} ${cy + 15 * s} ${cx + 7 * s} ${cy + 9 * s}" stroke="#5c1a1a" stroke-width="${2.2 * s}" fill="none" stroke-linecap="round"/>`}
      <ellipse cx="${cx - 15 * s}" cy="${cy + 8 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="#ff8fa3" opacity=".55"/><ellipse cx="${cx + 17 * s}" cy="${cy + 8 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="#ff8fa3" opacity=".55"/>
    </g>`;
  const defs = (n, p) => `<defs>
    <linearGradient id="g${n}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient>
    <radialGradient id="g${n}h" cx=".35" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="g${n}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${p[2]}"/></linearGradient></defs>`;
  const BODY = {
    biblioteca: n => `<path d="M14 30 Q14 22 22 22 L50 26 L78 22 Q86 22 86 30 L86 78 Q86 84 78 84 L50 88 L22 84 Q14 84 14 78Z" fill="url(#g${n}a)"/>
      <path d="M20 28 L48 31 L48 82 L20 79Z" fill="url(#g${n}c)"/><path d="M52 31 L80 28 L80 79 L52 82Z" fill="url(#g${n}c)"/>
      <path d="M50 26 L50 88" stroke="${PAL.biblioteca[1]}" stroke-width="3"/><path d="M60 22 L60 8 L66 13 L72 8 L72 23" fill="#e03131"/>`,
    personagens: n => `<rect x="20" y="14" width="60" height="76" rx="12" fill="url(#g${n}a)"/><rect x="26" y="20" width="48" height="64" rx="8" fill="url(#g${n}c)"/>
      <path d="M34 22 L40 12 L50 20 L60 12 L66 22Z" fill="#ffd43b" stroke="#f08c00" stroke-width="2" stroke-linejoin="round"/>`,
    flashcards: n => `<rect x="30" y="12" width="56" height="70" rx="10" fill="${PAL.flashcards[1]}" transform="rotate(12 58 47)"/>
      <rect x="16" y="18" width="56" height="72" rx="10" fill="url(#g${n}a)"/><rect x="22" y="24" width="44" height="60" rx="7" fill="url(#g${n}c)"/>
      <path d="M26 32 h18 M26 38 h12" stroke="${PAL.flashcards[1]}" stroke-width="3" stroke-linecap="round"/>`,
    jogos: n => `<path d="M10 50 Q10 30 30 30 L70 30 Q90 30 90 50 L92 70 Q93 86 78 84 Q70 83 64 72 L36 72 Q30 83 22 84 Q7 86 8 70Z" fill="url(#g${n}a)"/>
      <path d="M20 44 h12 M26 38 v12" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><circle cx="74" cy="40" r="4" fill="#ffd43b"/><circle cx="82" cy="47" r="4" fill="#69db7c"/>`,
    grafo: n => `<path d="M24 30 L50 54 L78 28 M50 54 L30 80 M50 54 L76 78" stroke="${PAL.grafo[1]}" stroke-width="4"/>
      <circle cx="24" cy="28" r="10" fill="#ffd43b"/><circle cx="78" cy="26" r="10" fill="#ff8787"/><circle cx="30" cy="80" r="9" fill="#63e6be"/><circle cx="76" cy="78" r="9" fill="#b197fc"/>
      <circle cx="50" cy="54" r="26" fill="url(#g${n}a)"/>`,
    agenda: n => `<rect x="14" y="20" width="72" height="68" rx="12" fill="url(#g${n}c)" stroke="${PAL.agenda[1]}" stroke-width="2"/>
      <path d="M14 34 Q14 20 28 20 L72 20 Q86 20 86 34 L86 40 L14 40Z" fill="url(#g${n}a)"/><rect x="28" y="10" width="7" height="18" rx="3.5" fill="#868e96"/><rect x="65" y="10" width="7" height="18" rx="3.5" fill="#868e96"/>`,
    museu: n => `<path d="M10 36 L50 12 L90 36Z" fill="url(#g${n}a)"/><rect x="14" y="36" width="72" height="8" fill="${PAL.museu[1]}"/>
      <rect x="18" y="44" width="64" height="40" fill="url(#g${n}c)"/><rect x="12" y="84" width="76" height="8" rx="3" fill="${PAL.museu[1]}"/>
      <path d="M24 46 v36 M76 46 v36" stroke="${PAL.museu[0]}" stroke-width="6"/>`,
    comunidade: n => `<path d="M14 26 Q14 14 26 14 L74 14 Q86 14 86 26 L86 60 Q86 72 74 72 L42 72 L26 88 L28 72 L26 72 Q14 72 14 60Z" fill="url(#g${n}a)"/>`,
    guia: n => `<path d="M50 6 Q56 16 50 20 Q44 16 50 6Z" fill="#ff922b"/><circle cx="50" cy="54" r="34" fill="url(#g${n}a)"/>
      <path d="M22 40 Q12 30 18 20 Q26 32 32 34Z M78 40 Q88 30 82 20 Q74 32 68 34Z" fill="${PAL.guia[1]}"/>`,
    ajuda: n => `<circle cx="50" cy="50" r="38" fill="url(#g${n}a)"/>`,
    sobre: n => `<circle cx="50" cy="50" r="38" fill="url(#g${n}a)"/>`
  };
  const FACEPOS = { biblioteca: [50, 52, .9], personagens: [50, 52, 1], flashcards: [44, 58, .85], jogos: [50, 52, .85], grafo: [50, 52, .9], agenda: [50, 62, .9], museu: [50, 62, .85], comunidade: [50, 42, 1], guia: [50, 52, 1.05], ajuda: [50, 50, 1], sobre: [50, 50, 1] };
  A.icon = function (name, size) {
    const p = PAL[name] || PAL.sobre, n = name, fp = FACEPOS[name] || [50, 50, 1];
    return `<svg class="pix pix-${name}" viewBox="0 0 100 100" width="${size || 64}" height="${size || 64}" aria-hidden="true">${defs(n, p)}
      <ellipse class="shadow" cx="50" cy="95" rx="30" ry="4.5" fill="#000" opacity=".22"/>
      <g class="body">${(BODY[name] || BODY.sobre)(n)}${face(fp[0], fp[1], fp[2], name === 'jogos' || name === 'ajuda' ? 'o' : 'smile')}
      <ellipse cx="38" cy="26" rx="22" ry="12" fill="url(#g${n}h)" opacity=".9"/></g></svg>`;
  };

  /* ---------- ícones semânticos dos flashcards (badges 3D) ---------- */
  const GLY = {
    ampulheta: '<path d="M8 4h8M8 20h8M9 4c0 5 6 5 6 8s-6 3-6 8M15 4c0 5-6 5-6 8s6 3 6 8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    pergaminho: '<path d="M6 6h10a2 2 0 012 2v10H8a2 2 0 01-2-2zM6 6a2 2 0 100 4h2M9 11h6M9 14h5" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
    bussola: '<circle cx="12" cy="12" r="7.5" stroke="#fff" stroke-width="1.7" fill="none"/><path d="M12 6.5l2.2 5.5-2.2 5.5-2.2-5.5z" fill="#fff"/>',
    lua: '<path d="M15.5 4.5a8 8 0 100 15 6.5 6.5 0 010-15z" fill="#fff"/>',
    vela: '<path d="M12 3c1.6 2 1.6 3.4 0 4.6-1.6-1.2-1.6-2.6 0-4.6z" fill="#ffe066"/><rect x="9" y="9" width="6" height="11" rx="1.2" fill="#fff"/>',
    fogo: '<path d="M12 3c4 4 5 7 3.5 10.5 1-.5 1.8-1.6 2-2.6 1.7 4.4-1.6 9.1-5.5 9.1S5 17 6.5 12.5c.4 1.4 1.3 2.2 2.3 2.4C7.5 10.5 10 7 12 3z" fill="#fff"/>',
    chave: '<circle cx="8" cy="12" r="3.6" stroke="#fff" stroke-width="1.8" fill="none"/><path d="M11.5 12H20M17 12v3M19.5 12v2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    espelho: '<ellipse cx="12" cy="10" rx="5.5" ry="6.5" stroke="#fff" stroke-width="1.8" fill="none"/><path d="M12 16.5V21M9 21h6M10 7.5l3-1.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
    gota: '<path d="M12 3.5c3.5 4.5 6 7.5 6 10.5a6 6 0 01-12 0c0-3 2.5-6 6-10.5z" fill="#fff"/>',
    espada: '<path d="M17.5 3.5L20 4l.5 2.5L10 17l-3-3zM6 15l3 3M4.5 19.5l2.5-2.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    casa: '<path d="M4 11.5L12 5l8 6.5M6.5 10v9h11v-9M10.5 19v-5h3v5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
    coroa: '<path d="M4 17l1.5-9 4 4L12 6l2.5 6 4-4L20 17z" fill="#fff"/><rect x="4" y="18" width="16" height="2" rx="1" fill="#fff"/>',
    martelo: '<path d="M5 8l5-4 4 4-5 4zM10.5 10.5L19 19" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    corda: '<path d="M12 3v6M8 13a4 4 0 108 0 4 4 0 00-8 0M12 17v4" stroke="#fff" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
    lampiao: '<path d="M9 6h6l1.5 3v7l-2 2.5h-5L7.5 16V9zM12 2.5V6M10 20.5h4" stroke="#fff" stroke-width="1.7" fill="none" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="2" fill="#ffe066"/>'
  };
  const GCOL = { ampulheta: '#f08c00', pergaminho: '#a0522d', bussola: '#1971c2', lua: '#5f3dc4', vela: '#c2255c', fogo: '#e8590c', chave: '#2b8a3e', espelho: '#0c8599', gota: '#1c7ed6', espada: '#495057', casa: '#7048e8', coroa: '#e67700', martelo: '#5c677d', corda: '#862e9c', lampiao: '#d9480f' };
  A.glyph = function (k, size) {
    const c = GCOL[k] || '#495057', s = size || 30;
    return `<svg class="gly" viewBox="0 0 24 24" width="${s}" height="${s}" aria-label="${k}"><defs><radialGradient id="gl${k}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".95"/></radialGradient></defs>
      <circle cx="12" cy="12.6" r="11" fill="#000" opacity=".18"/><circle cx="12" cy="12" r="11" fill="url(#gl${k})"/><g transform="translate(2.4 2.4) scale(.8)">${GLY[k] || GLY.pergaminho}</g></svg>`;
  };
  A.GLYPHS = Object.keys(GLY);

  /* ---------- ilustrações HQ dos mitos ---------- */
  const SKY = {
    'assombração': ['#1b1035', '#5b2a86', '#f5d0fe'], 'milagre': ['#0b3d91', '#f59f00', '#fff3bf'], 'criatura': ['#06283d', '#1c7ed6', '#c5f6fa'],
    'fenômeno': ['#3b0a0a', '#e8590c', '#ffe8cc'], 'encantamento': ['#063a2e', '#20c997', '#e6fcf5'], 'história-lenda': ['#2b2118', '#c08552', '#fff4e6']
  };
  const ink = 'stroke="#111" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const MOT = {
    cemiterio: c => `<path d="M0 150 Q160 132 320 150 L320 200 L0 200Z" fill="#2b2140" ${ink}/>
      <g ${ink} fill="#6c5c8a"><path d="M40 150 v-34 h10 v-10 h8 v10 h10 v34Z"/><path d="M250 152 v-28 q14 -16 28 0 v28Z"/></g>
      <g ${ink} fill="none"><path d="M120 150 V84 M200 150 V84 M120 84 Q160 60 200 84 M132 150 V92 M144 150 V88 M156 150 V86 M168 150 V86 M180 150 V88 M188 150 V92"/></g>
      <path d="M158 150 q-16 -2 -14 -30 q2 -26 16 -30 q14 4 16 30 q2 28 -14 30Z" fill="#f8f9fa" ${ink} opacity=".92"/><path d="M152 104 q8 -8 16 0" fill="none" stroke="#111" stroke-width="2"/>
      <path d="M174 112 l18 -10 l4 8 z" fill="#fff" ${ink}/>`,
    pedra: c => `<path d="M0 160 Q90 140 170 158 T320 150 L320 200 L0 200Z" fill="#2f3e2a" ${ink}/>
      <path d="M90 160 Q100 104 160 100 Q228 104 236 160Z" fill="#7f7a6e" ${ink}/>
      <path d="M150 104 q-10 -26 6 -44 q-2 18 10 22 q4 -14 -2 -24 q22 16 10 46Z" fill="#ff922b" ${ink}/>
      <path d="M196 102 q-6 -22 6 -34 l8 10 q8 10 0 24Z" fill="#343a40" ${ink}/><circle cx="204" cy="62" r="7" fill="#e9ecef" ${ink}/><path d="M196 58 q8 -14 18 -2" fill="#adb5bd" ${ink}/>
      <path d="M40 80 q8 -6 16 0 M260 70 q8 -6 16 0" stroke="${c[2]}" stroke-width="2" fill="none"/>`,
    vulcao: c => `<path d="M0 168 L320 168 L320 200 L0 200Z" fill="#212529" ${ink}/>
      <path d="M90 168 L140 118 L180 118 L230 168Z" fill="#5c3d2e" ${ink}/>
      <path d="M140 118 q-30 -40 0 -86 q6 30 20 34 q4 -26 20 -40 q20 46 -20 92Z" fill="#ffa94d" ${ink}/><path d="M152 116 q-10 -26 6 -46 q4 22 14 24 q8 14 -6 22Z" fill="#ffe066"/>
      <g fill="#495057" ${ink}><circle cx="110" cy="56" r="7"/><circle cx="214" cy="46" r="6"/><circle cx="236" cy="80" r="5"/></g>
      <g fill="#fff" ${ink}><rect x="26" y="140" width="40" height="28"/><rect x="250" y="134" width="44" height="34"/></g>`,
    navio: c => `<path d="M0 140 Q40 132 80 140 T160 140 T240 140 T320 140 L320 200 L0 200Z" fill="#1864ab" ${ink}/>
      <path d="M190 140 Q230 30 320 40 L320 140Z" fill="#5c940d" ${ink}/><path d="M276 56 v-12 h6 v-6 h4 v6 h6 v12Z" fill="#fff" ${ink}/>
      <g fill="#868e96" ${ink}><circle cx="222" cy="96" r="9"/><circle cx="240" cy="110" r="7"/><circle cx="208" cy="118" r="8"/></g>
      <path d="M30 130 L110 130 L98 146 L42 146Z" fill="#6b4226" ${ink}/><path d="M70 130 V52 M70 58 L104 84 L70 92 M70 62 L40 88 L70 96" fill="#f1f3f5" ${ink}/><path d="M70 52 l16 6 l-16 6Z" fill="#111"/>`,
    fonte: c => `<path d="M0 150 Q160 120 320 150 L320 200 L0 200Z" fill="#2b8a3e" ${ink}/>
      <path d="M200 150 Q250 40 320 50 L320 150Z" fill="#37b24d" ${ink}/>
      <path d="M100 168 h120 v-26 h-120Z" fill="#ced4da" ${ink}/><path d="M146 142 v-38 h28 v38" fill="#adb5bd" ${ink}/><path d="M160 116 h24 v6 h-14" fill="#868e96" ${ink}/>
      <path d="M186 122 q6 10 4 22" stroke="#4dabf7" stroke-width="5" fill="none"/><g fill="#a5d8ff"><circle cx="190" cy="150" r="3"/><circle cx="198" cy="152" r="2.5"/></g>`,
    monstro: c => `<path d="M0 150 Q40 140 80 150 T160 150 T240 150 T320 150 L320 200 L0 200Z" fill="#0b7285" ${ink}/>
      <path d="M0 168 L320 168 L320 200 L0 200Z" fill="#e9c46a" ${ink}/>
      <path d="M150 168 q-30 -6 -34 -50 q0 -50 44 -56 q44 6 44 56 q-4 44 -34 50Z" fill="#5c4033" ${ink}/>
      <path d="M126 104 q-24 10 -30 40 M194 104 q24 10 30 40" stroke="#111" stroke-width="7" fill="none"/><path d="M126 104 q-24 10 -30 40 M194 104 q24 10 30 40" stroke="#5c4033" stroke-width="4" fill="none"/>
      <circle cx="146" cy="88" r="6" fill="#ffe066" ${ink}/><circle cx="174" cy="88" r="6" fill="#ffe066" ${ink}/><path d="M150 106 q10 8 20 0 M140 104 l-16 -4 M180 104 l16 -4 M140 108 l-14 2 M180 108 l14 2" stroke="#111" stroke-width="2" fill="none"/>
      <path d="M152 110 l3 6 l3 -6 l3 6 l3 -6" stroke="#fff" stroke-width="2" fill="none"/>`,
    lobo: c => `<path d="M0 160 Q120 100 220 130 T320 120 L320 200 L0 200Z" fill="#1c1c3a" ${ink}/>
      <path d="M60 140 v-24 l20 -16 l20 16 v24Z" fill="#495057" ${ink}/><rect x="74" y="122" width="12" height="18" fill="#ffd43b" stroke="#111" stroke-width="2"/>
      <path d="M200 132 l-6 -34 l14 14 l10 -4 l10 4 l14 -14 l-6 34 q-18 16 -36 0Z" fill="#343a40" ${ink}/><circle cx="212" cy="116" r="3" fill="#ffd43b"/><circle cx="230" cy="116" r="3" fill="#ffd43b"/>
      <path d="M214 128 q7 5 14 0" stroke="#fff" stroke-width="2" fill="none"/>`,
    escola: c => `<rect x="40" y="40" width="240" height="160" fill="#e9ecef" ${ink}/><path d="M40 150 h240" stroke="#111" stroke-width="3"/>
      <rect x="64" y="60" width="80" height="90" rx="40" fill="#c5f6fa" ${ink}/><path d="M104 140 q-20 -6 -18 -40 q2 -22 18 -24 q16 2 18 24 q2 34 -18 40Z" fill="#fff" opacity=".85"/><path d="M90 92 q14 -22 28 0 q-2 -18 -14 -18 q-12 0 -14 18Z" fill="#ffe066"/>
      <rect x="184" y="70" width="70" height="130" fill="#ced4da" ${ink}/><circle cx="242" cy="138" r="4" fill="#111"/>`,
    igreja: c => `<path d="M0 170 L320 170 L320 200 L0 200Z" fill="#495057" ${ink}/>
      <rect x="90" y="80" width="140" height="90" fill="#fff4e6" ${ink}/><path d="M80 82 L160 34 L240 82Z" fill="#c08552" ${ink}/><rect x="140" y="120" width="40" height="50" rx="20" fill="#5c3d2e" ${ink}/>
      <circle cx="160" cy="62" r="10" fill="#ffd43b" ${ink}/><path d="M10 160 h60 l10 -10 M250 160 h60" stroke="#111" stroke-width="3"/><path d="M0 176 h320 M0 186 h320" stroke="#adb5bd" stroke-width="2" stroke-dasharray="10 8"/>`,
    gruta: c => `<path d="M0 170 Q60 40 160 30 Q260 40 320 170 L320 200 L0 200Z" fill="#3d5a3a" ${ink}/>
      <path d="M120 170 Q130 100 160 96 Q190 100 200 170Z" fill="#111"/><path d="M146 170 q2 -30 14 -34 q12 4 14 34" fill="#ffd43b" opacity=".35"/>
      <path d="M60 120 q-6 -30 10 -44 M70 84 q-14 -8 -24 2 M70 84 q4 -16 18 -14 M250 116 q8 -30 -6 -44 M244 80 q12 -10 22 0" stroke="#2b8a3e" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    mosteiro: c => `<path d="M0 166 L320 166 L320 200 L0 200Z" fill="#343a40" ${ink}/>
      <rect x="60" y="76" width="200" height="90" fill="#e9ecef" ${ink}/><rect x="140" y="40" width="40" height="40" fill="#e9ecef" ${ink}/><path d="M132 42 L160 18 L188 42Z" fill="#c92a2a" ${ink}/>
      <path d="M152 58 q8 -10 16 0 v10 h-16Z" fill="#ffd43b" ${ink}/>
      <g fill="#495057" ${ink}><rect x="82" y="100" width="22" height="34" rx="11"/><rect x="216" y="100" width="22" height="34" rx="11"/></g>
      <path d="M150 166 q-14 -4 -12 -40 q2 -22 22 -24 q20 2 22 24 q2 36 -12 40Z" fill="#dee2e6" opacity=".8" ${ink}/><path d="M146 116 q14 -16 28 0" fill="#adb5bd" opacity=".9"/>`,
    lampiao: c => `<path d="M0 170 L320 170 L320 200 L0 200Z" fill="#495057" ${ink}/>
      <path d="M90 170 V70 M80 70 h20 l-4 -20 h-12Z" fill="#343a40" ${ink}/><path d="M84 54 l4 -8 l8 6" stroke="#ffe066" stroke-width="3" fill="none"/>
      <g ${ink} fill="#ffe066"><path d="M120 60 l6 10 l-12 -2Z"/><path d="M60 46 l10 4 l-8 6Z"/></g>
      <rect x="170" y="120" width="120" height="44" rx="8" fill="#e8590c" ${ink}/><g fill="#fff3bf" ${ink}><rect x="182" y="128" width="22" height="16"/><rect x="214" y="128" width="22" height="16"/><rect x="246" y="128" width="22" height="16"/></g>
      <circle cx="196" cy="168" r="7" fill="#212529" ${ink}/><circle cx="264" cy="168" r="7" fill="#212529" ${ink}/>`,
    corda: c => `<path d="M0 170 L320 170 L320 200 L0 200Z" fill="#5c3d2e" ${ink}/>
      <path d="M100 170 V40 H220 V58" fill="none" stroke="#6b4226" stroke-width="10"/><path d="M100 170 V40 H220 V58" fill="none" stroke="#111" stroke-width="2"/>
      <path d="M220 58 v24" stroke="#c9a227" stroke-width="5"/><path d="M220 96 v14" stroke="#c9a227" stroke-width="5" stroke-dasharray="4 4"/>
      <path d="M210 84 l20 10 M230 84 l-20 10" stroke="#e03131" stroke-width="4"/>
      <path d="M40 160 v-40 M30 130 h20" stroke="#ffd43b" stroke-width="5"/><text x="248" y="150" font-family="Bangers,Impact,sans-serif" font-size="22" fill="#fff" stroke="#111" stroke-width="1">LIBERDADE!</text>`,
    rato: c => `<rect x="30" y="50" width="260" height="150" fill="#ffe8cc" ${ink}/><rect x="30" y="50" width="260" height="30" fill="#c08552" ${ink}/>
      <text x="160" y="72" text-anchor="middle" font-family="Bangers,Impact,sans-serif" font-size="20" fill="#fff" stroke="#111" stroke-width="1">ARMAZÉM DO RATO</text>
      <g ${ink} fill="#fff"><rect x="50" y="96" width="70" height="60"/><rect x="200" y="96" width="70" height="60"/></g>
      <path d="M130 186 q20 -30 50 -14 q14 8 10 14Z" fill="#868e96" ${ink}/><circle cx="148" cy="166" r="9" fill="#adb5bd" ${ink}/><circle cx="183" cy="178" r="2" fill="#111"/><path d="M130 186 q-20 4 -28 -8" fill="none" ${ink}/>`
  };
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) };
  A.scene = function (m, opts) {
    const c = SKY[m.tipo] || SKY['história-lenda'], id = 'sc' + hash(m.id), h = hash(m.id);
    const moon = `<circle cx="${40 + h % 240}" cy="${30 + h % 20}" r="16" fill="${c[2]}" opacity=".95"/>`;
    const stars = Array.from({ length: 10 }, (_, i) => `<circle cx="${(h >> i) % 320}" cy="${(h * (i + 3)) % 90}" r="${1 + i % 2}" fill="#fff" opacity=".7"/>`).join('');
    return `<svg class="scene" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustração: ${esc(m.titulo)}">
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>
      <pattern id="${id}d" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#000" opacity=".22"/></pattern>
      <radialGradient id="${id}r" cx=".5" cy=".4" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>
      <rect width="320" height="200" fill="url(#${id}s)"/>${stars}${moon}
      ${opts && opts.burst ? `<g opacity=".18" stroke="#fff" stroke-width="2">${Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2; return `<line x1="160" y1="100" x2="${160 + Math.cos(a) * 260}" y2="${100 + Math.sin(a) * 260}"/>` }).join('')}</g>` : ''}
      ${(MOT[m.motivo] || MOT.fonte)(c)}
      <rect width="320" height="200" fill="url(#${id}d)"/><rect width="320" height="200" fill="url(#${id}r)"/>
      <rect x="1.5" y="1.5" width="317" height="197" fill="none" stroke="#111" stroke-width="3"/></svg>`;
  };

  /* ---------- retratos RPG ---------- */
  const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a1665e'];
  const RAR = { 'Lendária': ['#f59f00', '#fff3bf'], 'Épica': ['#7048e8', '#e5dbff'], 'Rara': ['#1c7ed6', '#d0ebff'], 'Comum': ['#868e96', '#f1f3f5'] };
  A.RAR = RAR;
  A.portrait = function (p) {
    const h = hash(p.id), sk = SKIN[h % SKIN.length], r = RAR[p.raridade] || RAR.Comum, id = 'pt' + h, t = p.tipo;
    const bg = `<defs><radialGradient id="${id}b" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="${r[1]}"/><stop offset="1" stop-color="${r[0]}"/></radialGradient>
      <radialGradient id="${id}s" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="200" height="200" fill="url(#${id}b)"/><g opacity=".15">${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path d="M100 90 L${100 + Math.cos(a) * 160} ${90 + Math.sin(a) * 160} L${100 + Math.cos(a + .2) * 160} ${90 + Math.sin(a + .2) * 160}Z" fill="#fff"/>` }).join('')}</g>`;
    const eyes = (y, col) => `<ellipse cx="86" cy="${y}" rx="6" ry="7" fill="#fff"/><ellipse cx="114" cy="${y}" rx="6" ry="7" fill="#fff"/><circle cx="87" cy="${y + 1}" r="3.6" fill="${col || '#1b1b2f'}"/><circle cx="115" cy="${y + 1}" r="3.6" fill="${col || '#1b1b2f'}"/><circle cx="88.3" cy="${y - .6}" r="1.2" fill="#fff"/><circle cx="116.3" cy="${y - .6}" r="1.2" fill="#fff"/>`;
    const head = (col) => `<ellipse cx="100" cy="88" rx="34" ry="38" fill="${col || sk}" stroke="#111" stroke-width="3"/>`;
    const body = (col) => `<path d="M38 200 Q40 140 100 132 Q160 140 162 200Z" fill="${col}" stroke="#111" stroke-width="3"/>`;
    const smile = `<path d="M90 106 Q100 114 110 106" stroke="#5c1a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    const sad = `<path d="M90 110 Q100 104 110 110" stroke="#5c1a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    const cheeks = `<ellipse cx="76" cy="100" rx="6" ry="3.5" fill="#ff8fa3" opacity=".5"/><ellipse cx="124" cy="100" rx="6" ry="3.5" fill="#ff8fa3" opacity=".5"/>`;
    let art = '';
    if (t === 'fera' && /ipupiara/.test(p.id)) art = `${body('#5c4033')}<path d="M58 98 Q56 44 100 40 Q144 44 142 98 Q140 136 100 138 Q60 136 58 98Z" fill="#6f4e37" stroke="#111" stroke-width="3"/>
      ${eyes(82, '#0b7285')}<path d="M86 110 l-30 -6 M86 114 l-28 4 M114 110 l30 -6 M114 114 l28 4" stroke="#111" stroke-width="2"/><ellipse cx="100" cy="108" rx="10" ry="7" fill="#3b2a20"/><path d="M90 122 l4 6 l4 -6 l4 6 l4 -6 l4 6" stroke="#fff" stroke-width="2.4" fill="none"/>`;
    else if (t === 'fera') art = `${body('#343a40')}<path d="M64 60 L58 22 L84 46 Z M136 60 L142 22 L116 46Z" fill="#495057" stroke="#111" stroke-width="3"/><ellipse cx="100" cy="86" rx="38" ry="40" fill="#495057" stroke="#111" stroke-width="3"/>
      <path d="M78 98 Q100 140 122 98 Q100 92 78 98Z" fill="#adb5bd" stroke="#111" stroke-width="2.5"/>${eyes(78, '#f59f00')}<ellipse cx="100" cy="102" rx="7" ry="5" fill="#111"/><path d="M92 116 l3 6 l3 -6 M104 116 l3 6 l3 -6" stroke="#fff" stroke-width="2" fill="none"/>`;
    else if (t === 'santo') art = `<circle cx="100" cy="78" r="56" fill="none" stroke="#ffd43b" stroke-width="7" opacity=".9"/>${body('#1c7ed6')}<path d="M54 160 Q56 60 100 46 Q144 60 146 160Z" fill="#228be6" stroke="#111" stroke-width="3"/>${head()}<path d="M70 70 Q100 40 130 70 Q128 56 100 50 Q72 56 70 70Z" fill="#fff" stroke="#111" stroke-width="2"/>${eyes(90)}${smile}${cheeks}`;
    else if (t === 'beata' || t === 'estudante') art = `${body(t === 'beata' ? '#212529' : '#f8f9fa')}${head(t === 'estudante' ? '#f1f3f5' : null)}${t === 'estudante' ? `<path d="M64 92 Q60 40 100 44 Q140 40 136 92 Q132 62 100 60 Q68 62 64 92Z M64 92 L60 150 M136 92 L140 150" fill="#ffe066" stroke="#111" stroke-width="3"/>` : `<path d="M54 170 Q52 52 100 42 Q148 52 146 170 L132 170 Q134 76 100 70 Q66 76 68 170Z" fill="#343a40" opacity=".92" stroke="#111" stroke-width="3"/><path d="M70 96 Q100 120 130 96 L130 112 Q100 132 70 112Z" fill="#495057" opacity=".55"/>`}${eyes(90, t === 'estudante' ? '#868e96' : null)}${t === 'beata' ? sad : `<path d="M92 108 h16" stroke="#5c1a1a" stroke-width="2.4"/>`}`;
    else if (t === 'bruxa') art = `${body('#5c4033')}${head()}<path d="M62 90 Q50 50 80 46 Q100 30 120 46 Q150 50 138 90 Q144 60 120 56 Q100 62 80 56 Q56 60 62 90Z" fill="#dee2e6" stroke="#111" stroke-width="2.5"/><path d="M56 170 Q64 136 100 134 Q136 136 144 170" fill="#7c5c3b" stroke="#111" stroke-width="3"/>${eyes(90)}${sad}<path d="M96 96 q4 6 8 0" stroke="#111" stroke-width="2" fill="none"/>`;
    else if (t === 'pirata') art = `${body('#7f1d1d')}${head()}<path d="M56 64 Q100 20 144 64 Q152 70 140 72 Q100 58 60 72 Q48 70 56 64Z" fill="#212529" stroke="#111" stroke-width="3"/><path d="M128 52 q20 -20 26 -6 q-10 6 -24 14" fill="#f8f9fa" stroke="#111" stroke-width="2"/>${eyes(92)}<path d="M80 112 Q100 126 120 112 Q118 132 100 134 Q82 132 80 112Z" fill="#6b4226" stroke="#111" stroke-width="2"/><path d="M90 108 Q100 114 110 108" stroke="#5c1a1a" stroke-width="2.4" fill="none"/>`;
    else if (t === 'cientista') art = `${body('#f8f9fa')}<path d="M86 132 L100 160 L114 132" fill="#1c7ed6" stroke="#111" stroke-width="2"/>${head()}<path d="M66 74 Q70 48 100 48 Q130 48 134 74 Q120 60 100 62 Q80 60 66 74Z" fill="#868e96" stroke="#111" stroke-width="2"/><g fill="none" stroke="#111" stroke-width="3"><circle cx="86" cy="90" r="10"/><circle cx="114" cy="90" r="10"/><path d="M96 90 h8"/></g>${eyes(90)}<path d="M84 106 Q100 100 116 106 Q100 114 84 106Z" fill="#495057"/>`;
    else if (t === 'soldado') art = `${body('#1864ab')}<path d="M70 150 h60" stroke="#ffd43b" stroke-width="4"/>${head()}<path d="M66 70 L68 40 L132 40 L134 70Z" fill="#1d3557" stroke="#111" stroke-width="3"/><rect x="62" y="64" width="76" height="9" rx="3" fill="#111"/><circle cx="100" cy="52" r="6" fill="#ffd43b" stroke="#111" stroke-width="2"/>${eyes(92)}${smile}${cheeks}`;
    else if (t === 'monge') art = `${body('#3b2a20')}<path d="M52 170 Q50 50 100 44 Q150 50 148 170 L130 170 Q132 82 100 76 Q68 82 70 170Z" fill="#2b1d14" stroke="#111" stroke-width="3"/>${head()}${eyes(92, '#5f3dc4')}${smile}<path d="M90 140 v20 M80 150 h20" stroke="#ffd43b" stroke-width="3"/>`;
    else if (t === 'ferreiro') art = `${body('#5c677d')}<path d="M70 140 h60 v60 h-60Z" fill="#7c5c3b" stroke="#111" stroke-width="3"/>${head()}<path d="M70 70 Q100 50 130 70" fill="none" stroke="#343a40" stroke-width="6"/><path d="M80 112 Q100 132 120 112 Q120 128 100 132 Q80 128 80 112Z" fill="#495057"/>${eyes(90)}<path d="M150 120 l18 -18 l8 8 l-18 18Z M158 114 l-26 34" stroke="#111" stroke-width="3" fill="#adb5bd"/>`;
    else if (t === 'crianca') art = `${body('#fab005')}<ellipse cx="100" cy="94" rx="38" ry="40" fill="${sk}" stroke="#111" stroke-width="3"/><path d="M62 82 Q64 52 100 50 Q136 52 138 82 L150 84 Q150 88 136 88 Q100 72 64 88Z" fill="#e03131" stroke="#111" stroke-width="3"/>${eyes(96)}<path d="M88 112 Q100 124 112 112" stroke="#5c1a1a" stroke-width="2.6" fill="#fff"/>${cheeks}`;
    else if (t === 'comerciante') art = `${body('#2b8a3e')}<path d="M76 136 h48 v64 h-48Z" fill="#fff" stroke="#111" stroke-width="2"/>${head()}<path d="M70 62 h60 v-20 h-60Z M60 62 h80" fill="#212529" stroke="#111" stroke-width="3"/>${eyes(92)}<path d="M84 106 Q100 98 116 106" stroke="#495057" stroke-width="5" fill="none"/>${smile}`;
    else if (t === 'imperador') art = `${body('#c92a2a')}<path d="M60 150 Q100 170 140 150" stroke="#ffd43b" stroke-width="5" fill="none"/>${head()}<path d="M66 60 L72 30 L86 48 L100 26 L114 48 L128 30 L134 60Z" fill="#ffd43b" stroke="#111" stroke-width="3"/><path d="M66 100 Q70 140 100 142 Q130 140 134 100 Q120 118 100 118 Q80 118 66 100Z" fill="#e9ecef" stroke="#111" stroke-width="2.5"/>${eyes(88)}`;
    else art = `${body(p.historico === 'coletivo' ? '#e8590c' : '#5f3dc4')}${p.historico === 'coletivo' ? `<circle cx="56" cy="110" r="22" fill="${SKIN[(h + 2) % 6]}" stroke="#111" stroke-width="3"/><circle cx="144" cy="110" r="22" fill="${SKIN[(h + 4) % 6]}" stroke="#111" stroke-width="3"/>` : ''}${head()}<path d="M64 76 Q66 46 100 44 Q134 46 136 76 Q118 60 100 62 Q82 60 64 76Z" fill="#3b2a20" stroke="#111" stroke-width="2.5"/>${eyes(90)}${smile}${cheeks}`;
    return `<svg class="portrait" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Retrato ilustrado: ${esc(p.nome)}">${bg}${art}<rect width="200" height="200" fill="url(#${id}s)"/></svg>`;
  };

  /* ---------- bandeiras (5 idiomas mais falados + PT) ---------- */
  A.flag = function (code) {
    const w = 'viewBox="0 0 30 20" width="30" height="20"';
    if (code === 'zh') return `<svg ${w}><rect width="30" height="20" fill="#de2910"/><path d="M5 3l.9 2.8H8.8L6.5 7.5l.9 2.8L5 8.6 2.6 10.3l.9-2.8L1.2 5.8H4.1z" fill="#ffde00"/><g fill="#ffde00"><circle cx="10" cy="2.5" r=".8"/><circle cx="12" cy="4.5" r=".8"/><circle cx="12" cy="7.5" r=".8"/><circle cx="10" cy="9.5" r=".8"/></g></svg>`;
    if (code === 'es') return `<svg ${w}><rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/><rect x="7" y="7.5" width="3" height="5" rx=".6" fill="#aa151b"/></svg>`;
    if (code === 'en') return `<svg ${w}><rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.4"/></svg>`;
    if (code === 'hi') return `<svg ${w}><rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ff9933"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width=".7"/><circle cx="15" cy="10" r=".6" fill="#000080"/></svg>`;
    return `<svg ${w}><rect width="30" height="20" fill="#009c3b"/><path d="M15 2.5L27 10 15 17.5 3 10z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.4" fill="#002776"/><path d="M10.8 9.2q4.2-1.4 8.4 1.2" stroke="#fff" stroke-width=".8" fill="none"/></svg>`;
  };

  /* ---------- mascote Lume (guia) ---------- */
  A.lume = function (size) {
    return `<svg class="lume" viewBox="0 0 120 130" width="${size || 96}" height="${(size || 96) * 130 / 120}" aria-hidden="true"><defs>
      <radialGradient id="lmb" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff9db"/><stop offset=".55" stop-color="#ffd43b"/><stop offset="1" stop-color="#f59f00"/></radialGradient>
      <radialGradient id="lmg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe066" stop-opacity=".7"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>
      <linearGradient id="lmw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f5ff"/><stop offset="1" stop-color="#a5d8ff"/></linearGradient></defs>
      <circle class="glow" cx="60" cy="70" r="58" fill="url(#lmg)"/>
      <g class="wings"><ellipse class="wl" cx="26" cy="54" rx="22" ry="13" fill="url(#lmw)" opacity=".85" transform="rotate(-25 26 54)"/><ellipse class="wr" cx="94" cy="54" rx="22" ry="13" fill="url(#lmw)" opacity=".85" transform="rotate(25 94 54)"/></g>
      <g class="bob"><path d="M54 20 Q60 4 72 8 Q62 12 62 22Z" fill="#5c940d"/><ellipse cx="60" cy="74" rx="36" ry="40" fill="url(#lmb)" stroke="#e67700" stroke-width="2"/>
      ${face(60, 70, 1.25, 'smile')}<ellipse cx="46" cy="48" rx="14" ry="8" fill="#fff" opacity=".55"/>
      <path d="M40 112 q-2 10 6 12 M80 112 q2 10 -6 12" stroke="#e67700" stroke-width="4" fill="none" stroke-linecap="round"/></g></svg>`;
  };
})();
