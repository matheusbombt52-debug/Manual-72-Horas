/*!
 * Notificações de compras (prova social) — Manual das 72 Horas
 * ---------------------------------------------------------------------------
 * Arquivo único, sem dependências. O CSS é injetado automaticamente.
 * Isolado do resto da página: nada do site existente é alterado por ele.
 *
 * COMO USAR (já incluído no index.html, DESATIVADO até haver endpoint)
 *   <script src="notificacoes-compras.js" defer></script>
 *   <script>
 *     window.addEventListener('DOMContentLoaded', function () {
 *       SalesNotifications.init({ mode: 'live', endpoint: 'https://SEU-DOMINIO/api/notificacoes-publicas' });
 *     });
 *   </script>
 *
 * MODOS
 *   live  Exibe SOMENTE compras reais devolvidas pelo seu endpoint. Sem
 *         endpoint, com endpoint fora do ar ou sem itens válidos, NADA aparece.
 *         Nunca recorre a dados de exemplo.
 *   demo  Dados fictícios, sempre com a etiqueta "DEMONSTRAÇÃO". Só roda se
 *         init() receber allowDemo:true (usado apenas na página de exemplo e
 *         na demo). No site público o index.html NÃO passa allowDemo, então
 *         mode:'demo' é ignorado e o componente volta ao modo live.
 *
 * CONTRATO DO ENDPOINT (GET, JSON) — devolva um array, ou { "items": [...] }
 *   [
 *     {
 *       "id": "ped_8f3a21",                    // ID único e opaco da transação
 *       "firstName": "Mariana",                // apenas o PRIMEIRO nome
 *       "lastInitial": "S",                    // opcional: só a inicial do sobrenome
 *       "city": "Campinas",                    // opcional
 *       "state": "SP",                         // opcional: sigla da UF
 *       "plan": "Plano Premium",               // Plano Básico | Plano Premium | Oferta Premium com desconto
 *       "status": "approved",                  // só approved/paid/confirmed entram
 *       "purchasedAt": "2026-11-16T14:32:00Z", // ISO 8601, data da confirmação
 *       "authorized": true                     // consentimento p/ exibir nome e local
 *     }
 *   ]
 *
 * REGRAS
 *   - Status pendente, recusado, reembolsado etc. é descartado (nunca vira "venda").
 *   - authorized != true  -> exibição anônima: "Uma pessoa adquiriu o Plano Premium".
 *   - Plano não reconhecido -> item descartado (nunca mostra plano errado).
 *   - InitiateCheckout NÃO é compra: o endpoint só deve listar pagamentos aprovados.
 *   - Cada ID aparece uma única vez por visita; compras antigas (> maxAgeHours) são ignoradas.
 *
 * PRIVACIDADE
 *   - O componente lê SOMENTE os campos acima; qualquer outro é ignorado.
 *   - Do sobrenome só a 1ª letra é usada. Não envie e-mail, telefone, CPF,
 *     endereço nem valor. Faça o filtro de consentimento também no servidor.
 *   - Textos entram na página via textContent (sem HTML), evitando injeção.
 *
 * API
 *   Posição: padrão canto superior direito (position:'top-right', top:60 abaixo do
 *   banner do site). Para o canto inferior esquerdo use position:'bottom-left'.
 *   SalesNotifications.init(opcoes) -> instância
 *   instancia.showNext() | push(item) | pause() | resume() | dismiss() | destroy()
 */
(function (global, doc) {
  'use strict';

  var UFS = ('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO').split(' ');

  /* Dados FICTÍCIOS, apenas para testar o visual (modo "demo"). */
  var DEMO_DATA = [
    { id: 'demo-01', gender: 'f', firstName: 'Mariana', lastInitial: 'S',  city: 'Campinas',               state: 'SP', plan: 'Plano Premium' },
    { id: 'demo-02', gender: 'm', firstName: 'Carlos', lastInitial: 'M',   city: 'Belo Horizonte',         state: 'MG', plan: 'Plano Básico' },
    { id: 'demo-03', gender: 'f', firstName: 'Fernanda', lastInitial: 'L', city: 'Curitiba',               state: 'PR', plan: 'Oferta Premium com desconto' },
    { id: 'demo-04', gender: 'm', firstName: 'Rafael', lastInitial: 'C',   city: 'Salvador',               state: 'BA', plan: 'Plano Premium' },
    { id: 'demo-05', gender: 'f', firstName: 'Patrícia', lastInitial: 'A', city: 'Porto Alegre',           state: 'RS', plan: 'Plano Básico' },
    { id: 'demo-06', gender: 'm', firstName: 'Thiago', lastInitial: 'R',   city: 'Goiânia',                state: 'GO', plan: 'Plano Premium' },
    { id: 'demo-07', gender: 'f', firstName: 'Juliana', lastInitial: 'P',  city: 'Recife',                 state: 'PE', plan: 'Plano Premium', anon: true },
    { id: 'demo-08', gender: 'm', firstName: 'Eduardo', lastInitial: 'F',  city: 'Florianópolis',          state: 'SC', plan: 'Plano Básico' },
    { id: 'demo-09', gender: 'f', firstName: 'Camila', lastInitial: 'T',   city: 'Fortaleza',              state: 'CE', plan: 'Oferta Premium com desconto' },
    { id: 'demo-10', gender: 'm', firstName: 'Bruno', lastInitial: 'N',    city: 'Ribeirão Preto',         state: 'SP', plan: 'Plano Premium' },
    { id: 'demo-11', gender: 'f', firstName: 'Luciana', lastInitial: 'B',  city: 'Londrina',               state: 'PR', plan: 'Plano Básico' },
    { id: 'demo-12', gender: 'm', firstName: 'André', lastInitial: 'G',    city: 'Belém',                  state: 'PA', plan: 'Plano Premium' },
    { id: 'demo-13', gender: 'f', firstName: 'Renata', lastInitial: 'O',   city: 'Uberlândia',             state: 'MG', plan: 'Plano Premium' },
    { id: 'demo-14', gender: 'm', firstName: 'Marcelo', lastInitial: 'V',  city: 'São José do Rio Preto',  state: 'SP', plan: 'Plano Básico' },
    { id: 'demo-15', gender: 'f', firstName: 'Aline', lastInitial: 'D',    city: 'Vitória',                state: 'ES', plan: 'Plano Premium' },
    { id: 'demo-16', gender: 'm', firstName: 'Diego', lastInitial: 'H',    city: 'Manaus',                 state: 'AM', plan: 'Plano Premium' }
  ];

  var DEFAULTS = {
    mode: 'live',               // 'live' | 'demo'
    endpoint: '',               // URL da API (modo live)
    pollInterval: 60000,        // ms entre consultas à API (0 = consulta única)
    displayDuration: 5000,      // ms que cada notificação fica visível
    initialDelay: 10000,        // ms até a primeira notificação (dá tempo de ler a faixa vermelha do topo)
    minInterval: 12000,         // ms mínimos entre uma notificação e a próxima
    maxInterval: 20000,         // ms máximos entre uma notificação e a próxima
    maxPerSession: 6,           // limite por visita (evita incomodar)
    maxAgeHours: 72,            // modo live: ignora compras mais antigas que isso
    position: 'top-right',      // 'top-right' | 'bottom-left'
    top: 60,                    // px do topo (top-right; abaixo do banner fixo do site)
    right: 20,                  // px da borda direita (top-right)
    bottom: 20,                 // px da borda inferior (bottom-left)
    left: 20,                   // px da borda esquerda (bottom-left)
    showDemoBadge: true,        // false esconde a etiqueta DEMONSTRAÇÃO (só afeta o modo demo)
    mobileBottomOffset: 0,      // px extras no celular (ex.: 84 se houver barra fixa de CTA)
    rememberDismiss: true,      // lembra o "fechar" durante a sessão
    zIndex: 9990,
    allowDemo: false,           // true só em página de teste/demo
    demoData: null,             // substitui a lista de exemplo (modo demo)
    onShow: null                // function (item) {}
  };

  var CSS = [
    '.sn-root{position:fixed;left:var(--sn-left,20px);bottom:calc(var(--sn-bottom,20px) + env(safe-area-inset-bottom,0px));',
    'width:min(264px,calc(100vw - 40px));z-index:9990;pointer-events:none;',
    'font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}',
    '.sn-card{position:relative;display:flex;align-items:flex-start;gap:9px;box-sizing:border-box;width:100%;',
    'padding:9px 28px 10px 14px;background:#fff;color:#24352C;border:1px solid rgba(36,53,44,.08);border-radius:10px;overflow:hidden;',
    'box-shadow:0 1px 2px rgba(36,53,44,.06),0 8px 20px -10px rgba(36,53,44,.22);pointer-events:auto;',
    'opacity:0;transform:translate3d(-14px,18px,0) scale(.97);will-change:transform,opacity;',
    'transition:opacity .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1)}',
    '.sn-card.sn-in{opacity:1;transform:none}',
    '.sn-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#F2B632}',
    '.sn-card.sn-out{opacity:0;transform:translate3d(-10px,10px,0) scale(.98);',
    'transition:opacity .32s ease-in,transform .32s ease-in}',
    '.sn-icon{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;',
    'background:#E7F4EC;color:#28764B;margin-top:1px}',
    '.sn-icon svg{width:13px;height:13px}',
    '.sn-body{min-width:0;flex:1}',
    '.sn-text{margin:0;font-size:12px;line-height:1.35;color:#24352C}',
    '.sn-title{margin:0;font-size:12.5px;font-weight:700;line-height:1.35;color:#1B2A22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sn-text strong{font-weight:650;color:#1B2A22}',
    '.sn-ok{white-space:nowrap}',
    '.sn-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin:3px 0 0;font-size:10.5px;line-height:1.2;color:#6B7A71}',
    '.sn-badge{display:inline-block;padding:1px 6px;border-radius:99px;background:#FFF0C2;color:#7A5A00;',
    'font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}',
    '.sn-dot{width:5px;height:5px;border-radius:50%;background:#28764B;flex:none}',
    '.sn-close{position:absolute;top:4px;right:4px;display:grid;place-items:center;width:22px;height:22px;padding:0;',
    'border:0;border-radius:8px;background:transparent;color:#93A199;cursor:pointer;transition:background .2s,color .2s}',
    '.sn-close:hover{background:#F1F4F2;color:#24352C}',
    '.sn-close:focus-visible{outline:2px solid #244C38;outline-offset:1px}',
    '.sn-close svg{width:11px;height:11px}',
    '.sn-progress{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(40,118,75,.1)}',
    '.sn-progress i{display:block;height:100%;background:#28764B;opacity:.55;transform-origin:left center;',
    'animation:sn-shrink linear forwards}',
    '.sn-card.sn-paused .sn-progress i{animation-play-state:paused}',
    '@keyframes sn-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}',
    '@media (max-width:640px){',
    '.sn-root{left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(12px + var(--sn-mobile-offset,0px) + env(safe-area-inset-bottom,0px));',
    'width:min(236px,calc(100vw - 24px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)))}',
    '.sn-card{padding:8px 26px 9px 12px;gap:8px;border-radius:9px}',
    '.sn-icon{width:22px;height:22px}.sn-icon svg{width:12px;height:12px}',
    '.sn-text{font-size:11.5px}.sn-title{font-size:12px}.sn-meta{font-size:10px}}',
    '@media (prefers-reduced-motion:reduce){',
    '.sn-card,.sn-card.sn-out{transition:opacity .2s linear;transform:none}',
    '.sn-progress i{animation-duration:inherit}}',
    '.sn-root.sn-tr{left:auto;bottom:auto;top:calc(var(--sn-top,60px) + env(safe-area-inset-top,0px));right:calc(var(--sn-right,20px) + env(safe-area-inset-right,0px))}',
    '.sn-tr .sn-card{transform:translate3d(16px,-12px,0) scale(.97)}',
    '.sn-tr .sn-card.sn-in{transform:none}',
    '.sn-tr .sn-card.sn-out{transform:translate3d(10px,-8px,0) scale(.98)}',
    '@media (max-width:640px){.sn-root.sn-tr{left:auto;bottom:auto;top:calc(var(--sn-top-m,52px) + env(safe-area-inset-top,0px));right:calc(12px + env(safe-area-inset-right,0px))}}',
    '@media (prefers-reduced-motion:reduce){.sn-tr .sn-card,.sn-tr .sn-card.sn-in,.sn-tr .sn-card.sn-out{transform:none}}',
    '@media print{.sn-root{display:none!important}}'
  ].join('');

  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var STORE_KEY = 'sn_dismissed_v1';

  var current = null; // instância única

  /* ------------------------------ utilitários ------------------------------ */
  function clean(v, max) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function titleCase(s) { return s ? s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1).toLocaleLowerCase('pt-BR') : s; }
  function rand(min, max) { return Math.round(min + Math.random() * Math.max(0, max - min)); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function el(tag, cls) { var e = doc.createElement(tag); if (cls) e.className = cls; return e; }
  function txt(s) { return doc.createTextNode(s); }
  function strong(s) { var e = el('strong'); e.textContent = s; return e; }
  function safeStore(op, v) {
    try { return op === 'get' ? global.sessionStorage.getItem(STORE_KEY) : global.sessionStorage.setItem(STORE_KEY, v); } catch (e) { return null; }
  }

  function timeAgo(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 0) return '';
    if (m < 1) return 'agora mesmo';
    if (m < 60) return 'há ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return 'há ' + h + (h === 1 ? ' hora' : ' horas');
    var d = Math.round(h / 24);
    return 'há ' + d + (d === 1 ? ' dia' : ' dias');
  }

  var PLANS = [   /* ordem importa: a oferta é testada antes do Premium */
    { label: 'Oferta Premium com desconto', art: 'a', re: /oferta|desconto/ },
    { label: 'Plano Premium',               art: 'o', re: /premium/ },
    { label: 'Plano Básico',                art: 'o', re: /basico|basic/ }
  ];
  var OK_STATUS = ['approved', 'paid', 'confirmed', 'aprovado', 'pago', 'confirmado'];

  function matchPlan(v) {
    var t = clean(v, 80).toLowerCase().normalize ? clean(v, 80).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : clean(v, 80).toLowerCase();
    for (var i = 0; i < PLANS.length; i++) if (PLANS[i].re.test(t)) return PLANS[i];
    return null;
  }

  /* Lê SOMENTE os campos permitidos; devolve null se o item não puder ser exibido. */
  function normalize(raw, mode, maxAgeHours) {
    if (!raw || typeof raw !== 'object') return null;
    var plan = matchPlan(raw.plan);
    if (!plan) return null;
    var item = { id: clean(raw.id, 80), plan: plan, demo: mode === 'demo', anonymous: false,
                 gender: raw.gender === 'f' || raw.gender === 'm' ? raw.gender : '' };

    var authorized = mode === 'demo' ? raw.anon !== true : raw.authorized === true;
    if (mode === 'live') {
      if (!item.id) return null;
      if (OK_STATUS.indexOf(clean(raw.status, 20).toLowerCase()) === -1) return null;   // só pagamento aprovado
      var t = Date.parse(raw.purchasedAt);
      if (isNaN(t) || t > Date.now() + 60000 || (Date.now() - t) > maxAgeHours * 3600000) return null;
      item.time = t;
    }

    var name = titleCase(clean(raw.firstName, 40).split(' ')[0]);
    if (!authorized || !name) { item.anonymous = true; return item; }
    var ini = clean(raw.lastInitial || raw.lastName, 60).charAt(0);
    item.firstName = name;
    item.lastInitial = /[A-Za-z\u00C0-\u00FF]/.test(ini) ? ini.toLocaleUpperCase('pt-BR') : '';
    var city = clean(raw.city, 60), state = clean(raw.state, 2).toUpperCase();
    item.place = city && UFS.indexOf(state) !== -1 ? city + ', ' + state : '';
    return item;
  }

  /* -------------------------------- instância ------------------------------- */
  function create(userOpts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in (userOpts || {})) o[k] = userOpts[k];
    if (o.mode === 'demo' && o.allowDemo !== true) {   // demo nunca roda no site público
      o.mode = 'live';
      if (global.console) console.warn('[SalesNotifications] mode:"demo" ignorado (falta allowDemo:true). Usando modo live.');
    }
    if (o.mode !== 'demo') o.mode = 'live';

    var self = {};
    var styleEl, root, card = null;
    var pool = [], seen = {}, demoQueue = [], shownCount = 0;
    var dismissed = false, destroyed = false, paused = false;
    var nextTimer = 0, pollTimer = 0;
    var hide = null; // { id, left, start, fn }

    /* ---- estilos e container ---- */
    if (!doc.getElementById('sn-styles')) {
      styleEl = el('style'); styleEl.id = 'sn-styles'; styleEl.textContent = CSS; doc.head.appendChild(styleEl);
    }
    root = el('div', 'sn-root');
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-atomic', 'true');
    if (o.position !== 'bottom-left') root.className += ' sn-tr';
    root.style.setProperty('--sn-top', o.top + 'px');
    root.style.setProperty('--sn-right', o.right + 'px');
    root.style.setProperty('--sn-left', o.left + 'px');
    root.style.setProperty('--sn-bottom', o.bottom + 'px');
    root.style.setProperty('--sn-mobile-offset', o.mobileBottomOffset + 'px');
    root.style.zIndex = o.zIndex;
    doc.body.appendChild(root);

    if (o.rememberDismiss && safeStore('get') === '1') dismissed = true;

    /* ---- seleção do próximo item ---- */
    function nextDemo() {
      if (!demoQueue.length) {
        var src = (o.demoData && o.demoData.length ? o.demoData : DEMO_DATA)
          .map(function (r) { return normalize(r, 'demo'); }).filter(Boolean);
        var f = shuffle(src.filter(function (i) { return i.gender === 'f'; }));
        var m = shuffle(src.filter(function (i) { return i.gender === 'm'; }));
        var rest = shuffle(src.filter(function (i) { return !i.gender; }));
        var useF = Math.random() < .5;
        while (f.length || m.length) {            // alterna feminino/masculino
          var a = useF ? f : m, b = useF ? m : f;
          var pick = a.length ? a.shift() : b.shift();
          if (pick) demoQueue.push(pick);
          useF = !useF;
        }
        demoQueue = demoQueue.concat(rest);
      }
      return demoQueue.shift() || null;
    }
    function nextLive() {
      pool.sort(function (a, b) { return b.time - a.time; });
      for (var i = 0; i < pool.length; i++) {
        if (!seen[pool[i].id]) {
          var it = pool.splice(i, 1)[0];
          seen[it.id] = true;
          return it;
        }
      }
      return null;
    }
    function pickNext() { return o.mode === 'demo' ? nextDemo() : nextLive(); }

    /* ---- dados reais ---- */
    function add(raw) {
      var it = normalize(raw, 'live', o.maxAgeHours);
      if (!it || seen[it.id]) return false;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === it.id) return false;
      pool.push(it);
      return true;
    }
    function fetchLive() {
      if (o.mode !== 'live' || !o.endpoint || typeof global.fetch !== 'function') return;
      global.fetch(o.endpoint, { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          var list = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);
          list.forEach(add);
        })
        .catch(function () { /* silencioso: sem dados reais, nada é exibido */ });
    }

    /* ---- exibição ---- */
    function buildCard(item) {
      var c = el('div', 'sn-card');
      var icon = el('div', 'sn-icon'); icon.innerHTML = CHECK_SVG;           // SVG estático, sem dados externos
      var body = el('div', 'sn-body');

      var action = el('p', 'sn-text');
      action.appendChild(txt((item.anonymous ? 'Uma pessoa adquiriu ' : 'Adquiriu ') + item.plan.art + ' '));
      action.appendChild(strong(item.plan.label));

      var meta = el('p', 'sn-meta');
      meta.appendChild(el('span', 'sn-dot'));
      var when = item.demo ? '' : timeAgo(item.time);
      var ok = el('span', 'sn-ok'); ok.textContent = 'Compra confirmada' + (when ? ' · ' + when : ''); meta.appendChild(ok);
      if (item.demo && o.showDemoBadge !== false) { var b = el('span', 'sn-badge'); b.textContent = 'DEMONSTRAÇÃO'; meta.appendChild(b); }

      if (!item.anonymous) {
        var title = el('p', 'sn-title');
        title.textContent = item.firstName + (item.lastInitial ? ' ' + item.lastInitial + '.' : '') + (item.place ? ' • ' + item.place : '');
        body.appendChild(title);
      }
      body.appendChild(action); body.appendChild(meta);

      var close = el('button', 'sn-close');
      close.type = 'button'; close.setAttribute('aria-label', 'Fechar notificações'); close.innerHTML = CLOSE_SVG;
      close.addEventListener('click', function () { self.dismiss(); });

      var bar = el('div', 'sn-progress'); var fill = el('i'); fill.style.animationDuration = o.displayDuration + 'ms'; bar.appendChild(fill);

      c.appendChild(icon); c.appendChild(body); c.appendChild(close); c.appendChild(bar);
      c.addEventListener('mouseenter', holdOn); c.addEventListener('mouseleave', holdOff);
      c.addEventListener('focusin', holdOn);    c.addEventListener('focusout', holdOff);
      return c;
    }

    function startHide(ms) {
      hide = { left: ms, start: Date.now(), id: setTimeout(closeCard, ms) };
    }
    function holdOn() {
      if (!hide || !hide.id) return;
      clearTimeout(hide.id); hide.id = 0; hide.left -= Date.now() - hide.start;
      if (card) card.classList.add('sn-paused');
    }
    function holdOff() {
      if (!hide || hide.id || paused || doc.hidden || !card) return;
      hide.start = Date.now(); hide.id = setTimeout(closeCard, Math.max(300, hide.left));
      card.classList.remove('sn-paused');
    }

    function closeCard(afterClose) {
      if (hide) { clearTimeout(hide.id); hide = null; }
      var c = card; card = null;
      if (!c) { if (typeof afterClose === 'function') afterClose(); return; }
      c.classList.remove('sn-in'); c.classList.add('sn-out');
      setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); if (!destroyed && !dismissed) scheduleNext(rand(o.minInterval, o.maxInterval)); }, 340);
    }

    function show(item) {
      if (card) return;
      card = buildCard(item);
      root.appendChild(card);
      void card.offsetWidth;                       // força o início da transição
      card.classList.add('sn-in');
      shownCount++;
      startHide(o.displayDuration);
      if (typeof o.onShow === 'function') { try { o.onShow(item); } catch (e) {} }
    }

    function scheduleNext(ms) {
      clearTimeout(nextTimer);
      if (destroyed || dismissed || shownCount >= o.maxPerSession) return;
      nextTimer = setTimeout(tick, ms);
    }
    function tick() {
      if (destroyed || dismissed || shownCount >= o.maxPerSession) return;
      if (paused || doc.hidden || card) { scheduleNext(2000); return; }
      var item = pickNext();
      if (!item) { scheduleNext(o.mode === 'live' ? Math.max(5000, o.minInterval) : 3000); return; }
      show(item);
    }

    /* ---- API pública ---- */
    self.showNext = function () {
      if (destroyed || dismissed || card) return;
      var item = pickNext(); if (item) show(item);
    };
    self.push = function (raw) { if (o.mode === 'live') add(raw); };
    self.pause = function () { paused = true; holdOn(); };
    self.resume = function () { paused = false; holdOff(); };
    self.dismiss = function () {
      dismissed = true; clearTimeout(nextTimer);
      if (o.rememberDismiss) safeStore('set', '1');
      closeCard();
    };
    self.destroy = function () {
      destroyed = true; clearTimeout(nextTimer); clearInterval(pollTimer);
      if (hide) clearTimeout(hide.id);
      doc.removeEventListener('visibilitychange', onVis);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (current === self) current = null;
    };

    function onVis() { if (doc.hidden) self.pause(); else self.resume(); }
    doc.addEventListener('visibilitychange', onVis);

    /* ---- início ---- */
    if (o.mode === 'demo' && global.console) console.info('[SalesNotifications] MODO DEMO: exibindo dados fictícios rotulados como "DEMONSTRAÇÃO".');
    if (o.mode === 'live') {
      fetchLive();
      if (o.pollInterval > 0) pollTimer = setInterval(fetchLive, o.pollInterval);
    }
    scheduleNext(o.initialDelay);
    return self;
  }

  global.SalesNotifications = {
    init: function (opts) {
      if (current) current.destroy();
      current = create(opts);
      return current;
    }
  };
})(window, document);
