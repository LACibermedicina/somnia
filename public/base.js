/* Somnia — suporte a BASE_PATH (homologação em /teste/). Injetado pelo servidor só quando BASE_PATH está definido.
   Prefixa URLs absolutas ("/api/...", "/uploads/...") em fetch, EventSource, XHR, window.open e atributos src/href criados dinamicamente. */
(function () {
  var B = window.SOMNIA_BASE || ''; if (!B) return;
  var fix = function (u) { return (typeof u === 'string' && u.charAt(0) === '/' && u.charAt(1) !== '/' && u.indexOf(B + '/') !== 0 && u !== B) ? B + u : u; };
  window.SOMNIA_URL = fix;
  var f = window.fetch; window.fetch = function (u, o) { return f.call(this, typeof u === 'string' ? fix(u) : u, o); };
  var ES = window.EventSource; if (ES) { window.EventSource = function (u, o) { return new ES(fix(u), o); }; window.EventSource.prototype = ES.prototype; }
  var xo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (m, u) { arguments[1] = fix(u); return xo.apply(this, arguments); };
  var wo = window.open; window.open = function (u) { arguments[0] = fix(u); return wo.apply(this, arguments); };
  var attrs = ['src', 'href', 'action', 'poster'];
  var walk = function (el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < attrs.length; i++) { var v = el.getAttribute && el.getAttribute(attrs[i]); if (v && fix(v) !== v) el.setAttribute(attrs[i], fix(v)); }
    if (el.children) for (var j = 0; j < el.children.length; j++) walk(el.children[j]);
  };
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { if (m.type === 'attributes') walk(m.target); else m.addedNodes.forEach(walk); });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: attrs });
})();
