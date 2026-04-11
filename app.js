// ── APP.JS ────────────────────────────────────────────────────────────────────

// ── UI ────────────────────────────────────────────────────────────────────────
// Dialoghi e notifiche custom — sostituiscono alert/confirm nativi del browser

const UI = (() => {

  // ── Base sheet ────────────────────────────────────────────────────────────

  // Helpers per modal responsive
  const _isMD = () => window.innerWidth >= 768;
  const _sheetStyle = () => _isMD()
    ? `position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:9000;backdrop-filter:blur(2px);animation:uiFadeIn .15s ease`
    : `position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;z-index:9000;backdrop-filter:blur(2px);animation:uiFadeIn .15s ease`;
  const _sheetInner = () => _isMD()
    ? `background:#fff;border-radius:20px;width:100%;max-width:440px;padding:0 0 1.2rem;animation:uiFadeIn .15s ease`
    : `background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:420px;padding:0 0 calc(1.2rem + env(safe-area-inset-bottom));animation:uiSlideUp .2s cubic-bezier(.32,1,.28,1)`;

  function _sheet(contenuto) {
    const overlay = document.createElement('div');
    overlay.style.cssText = _sheetStyle();
    overlay.innerHTML = `<div style="${_sheetInner()}">${contenuto}</div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  // ── Alert ─────────────────────────────────────────────────────────────────

  function alert(msg, { titolo = null, icona = 'bi-info-circle-fill', colore = '#2563EB' } = {}) {
    return new Promise(resolve => {
      const el = _sheet(`
        <div style="padding:1.5rem 1.5rem 1rem;text-align:center">
          <div style="width:52px;height:52px;border-radius:16px;
            background:${colore}18;display:flex;align-items:center;
            justify-content:center;margin:0 auto .9rem">
            <i class="bi ${icona}" style="font-size:1.5rem;color:${colore}"></i>
          </div>
          ${titolo ? `<div style="font-size:1rem;font-weight:700;color:#1A2B4B;margin-bottom:.4rem">${titolo}</div>` : ''}
          <div style="font-size:.9rem;color:#6B7280;line-height:1.5;white-space:pre-line">${msg}</div>
        </div>
        <div style="padding:0 1.2rem">
          <button id="ui-ok" style="width:100%;padding:.85rem;background:#1A2B4B;color:#fff;
            border:none;border-radius:100px;font-family:inherit;font-size:.95rem;
            font-weight:600;cursor:pointer">OK</button>
        </div>`);
      el.querySelector('#ui-ok').onclick = () => { el.remove(); resolve(); };
      el.onclick = e => { if (e.target === el) { el.remove(); resolve(); } };
    });
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  function confirm(msg, {
    titolo = null,
    icona = 'bi-question-circle-fill',
    colore = '#1A2B4B',
    labelOk = 'Conferma',
    labelAnnulla = 'Annulla',
    pericoloso = false
  } = {}) {
    return new Promise(resolve => {
      const okBg = pericoloso ? '#DC2626' : '#1A2B4B';
      const el = _sheet(`
        <div style="padding:1.5rem 1.5rem 1rem;text-align:center">
          <div style="width:52px;height:52px;border-radius:16px;
            background:${colore}18;display:flex;align-items:center;
            justify-content:center;margin:0 auto .9rem">
            <i class="bi ${icona}" style="font-size:1.5rem;color:${colore}"></i>
          </div>
          ${titolo ? `<div style="font-size:1rem;font-weight:700;color:#1A2B4B;margin-bottom:.4rem">${titolo}</div>` : ''}
          <div style="font-size:.9rem;color:#6B7280;line-height:1.5;white-space:pre-line">${msg}</div>
        </div>
        <div style="padding:0 1.2rem;display:flex;flex-direction:column;gap:.6rem">
          <button id="ui-ok" style="width:100%;padding:.85rem;background:${okBg};color:#fff;
            border:none;border-radius:100px;font-family:inherit;font-size:.95rem;
            font-weight:600;cursor:pointer">${labelOk}</button>
          <button id="ui-ann" style="width:100%;padding:.85rem;background:#F3F4F6;color:#6B7280;
            border:none;border-radius:100px;font-family:inherit;font-size:.95rem;
            font-weight:600;cursor:pointer">${labelAnnulla}</button>
        </div>`);
      el.querySelector('#ui-ok').onclick  = () => { el.remove(); resolve(true);  };
      el.querySelector('#ui-ann').onclick = () => { el.remove(); resolve(false); };
      el.onclick = e => { if (e.target === el) { el.remove(); resolve(false); } };
    });
  }

  // ── Toast (notifica non bloccante) ────────────────────────────────────────

  function toast(msg, { tipo = 'info', durata = 3000 } = {}) {
    const map = {
      info:    { bg: '#1A2B4B', icona: 'bi-info-circle-fill' },
      ok:      { bg: '#16A34A', icona: 'bi-check-circle-fill' },
      errore:  { bg: '#DC2626', icona: 'bi-exclamation-triangle-fill' },
      warn:    { bg: '#D97706', icona: 'bi-exclamation-circle-fill' }
    };
    const { bg, icona } = map[tipo] || map.info;
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));
      left:50%;transform:translateX(-50%);
      background:${bg};color:#fff;
      padding:.65rem 1.1rem;border-radius:100px;
      font-family:inherit;font-size:.85rem;font-weight:600;
      display:flex;align-items:center;gap:.5rem;
      box-shadow:0 4px 20px rgba(0,0,0,.2);
      z-index:9500;white-space:nowrap;max-width:90vw;
      animation:uiFadeIn .2s ease`;
    el.innerHTML = `<i class="bi ${icona}"></i><span>${msg}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), durata);
  }

  return { alert, confirm, toast };
})();

// ── FMT (incluso qui per sicurezza) ──────────────────────────────────────────
const Fmt = (() => {
  function _it(n, dec) {
    const s = Math.abs(n ?? 0).toFixed(dec);
    const [i, d] = s.split('.');
    const t = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return ((n ?? 0) < 0 ? '-' : '') + t + (d ? ',' + d : '');
  }
  function num(n, dec = 2)  { return n == null || isNaN(n) ? '—' : _it(n, dec); }
  function eur(n, dec = 2)  { return n == null || isNaN(n) ? '€ —' : `€\u00a0${_it(n, dec)}`; }
  function pct(n, dec = 2)  {
    if (n == null || isNaN(n)) return '—';
    return `${n >= 0 ? '+' : ''}${_it(n, dec)}%`;
  }
  function delta(n) {
    if (n == null || isNaN(n)) return '—';
    return `${n >= 0 ? '+' : '-'}€\u00a0${_it(Math.abs(n), 2)}`;
  }
  function prezzo(n, cat) {
    if (n == null || isNaN(n)) return '—';
    const dec = cat && ['Fondi','PIR'].includes(cat) ? 4 : 2;
    return _it(n, dec);
  }
  function qty(n, cat) {
    if (n == null) return '—';
    if (!cat || ['Azioni','Certificates'].includes(cat))
      return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n);
    return _it(n, 2);
  }
  function data(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function unita(cat) {
    return ['Azioni','Certificates'].includes(cat) ? 'pz' : 'quote';
  }
  return { num, eur, pct, delta, prezzo, qty, data, unita };
})();

// ── APP ───────────────────────────────────────────────────────────────────────
const App = (() => {

  let stato = {
    dati: null, titoli: [], totali: {},
    schermata: 'home', titoloSelezionato: null,
    contoSelezionato: null,
    editMode: false, aggiornando: false, errore: null
  };

  const isMobile = () => window.innerWidth < 768;
  function oggi() { return new Date().toISOString().split('T')[0]; }

  function coloreCategoria(cat) {
    const map = {
      'Azioni':       { bg: '#EBF3FF', fg: '#2563EB' },
      'Fondi':        { bg: '#F3F0FF', fg: '#7C3AED' },
      'Certificates': { bg: '#FFF7ED', fg: '#D97706' },
      'Polizze Vita': { bg: '#FFF7ED', fg: '#D97706' },
      'PIR':          { bg: '#F0FDF4', fg: '#16A34A' }
    };
    return map[cat] || { bg: '#F3F4F6', fg: '#6B7280' };
  }

  // Mappa categorie BudgetBakers → Bootstrap Icons
  const CATEGORIA_ICONA = {
    // Entrate
    'Salary':            'bi-briefcase-fill',
    'Stipendio':         'bi-briefcase-fill',
    'Income':            'bi-arrow-up-circle-fill',
    'Transfer Income':   'bi-arrow-left-right',
    'Investment':        'bi-graph-up-arrow',
    'Bonus':             'bi-star-fill',
    'Pension':           'bi-piggy-bank-fill',
    // Uscite — casa
    'Housing':           'bi-house-fill',
    'Rent':              'bi-house-fill',
    'Mortgage':          'bi-house-fill',
    'Home':              'bi-house-fill',
    'Utilities':         'bi-lightning-charge-fill',
    'Electricity':       'bi-lightning-charge-fill',
    'Gas':               'bi-fire',
    'Water':             'bi-droplet-fill',
    'Internet':          'bi-wifi',
    'Phone':             'bi-phone-fill',
    'Mobile':            'bi-phone-fill',
    // Uscite — cibo
    'Food':              'bi-cart3',
    'Groceries':         'bi-cart3',
    'Supermarket':       'bi-cart3',
    'Restaurant':        'bi-cup-hot',
    'Bar':               'bi-cup-hot',
    'Coffee':            'bi-cup-hot',
    'Fast Food':         'bi-egg-fried',
    'Delivery':          'bi-bag-fill',
    // Uscite — trasporti
    'Transport':         'bi-car-front-fill',
    'Car':               'bi-car-front-fill',
    'Fuel':              'bi-fuel-pump-fill',
    'Benzina':           'bi-fuel-pump-fill',
    'Parking':           'bi-p-square-fill',
    'Public Transport':  'bi-bus-front-fill',
    'Train':             'bi-train-front-fill',
    'Taxi':              'bi-taxi-front-fill',
    'Flight':            'bi-airplane-fill',
    // Uscite — shopping
    'Shopping':          'bi-bag-fill',
    'Clothing':          'bi-bag-fill',
    'Electronics':       'bi-laptop-fill',
    'Online':            'bi-bag-fill',
    // Uscite — salute
    'Health':            'bi-heart-pulse-fill',
    'Pharmacy':          'bi-capsule-pill',
    'Doctor':            'bi-activity',
    // Uscite — svago
    'Entertainment':     'bi-controller',
    'Sport':             'bi-bicycle',
    'Travel':            'bi-globe',
    'Vacation':          'bi-umbrella-fill',
    'Hobby':             'bi-palette-fill',
    // Uscite — finanza
    'Finance':           'bi-bank2',
    'Insurance':         'bi-shield-fill',
    'Tax':               'bi-receipt',
    'Savings':           'bi-piggy-bank-fill',
    'Investment Expense':'bi-graph-down-arrow',
    'Investimento':      'bi-graph-up-arrow',
    'Disinvestimento':   'bi-cash-coin',
    // Trasferimento
    'Transfer':          'bi-arrow-left-right',
    'Trasferimento':     'bi-arrow-left-right',
    'Credit Card':       'bi-credit-card-fill',
    'Carta di Credito':  'bi-credit-card-fill',
  };

  // Logo titolo da ticker (Parqet logo API)
  function logoTitolo(ticker, cat) {
    if (!ticker) return null;
    const sym = ticker.split('.')[0].toUpperCase();
    return `https://assets.parqet.com/logos/symbol/${sym}?format=svg`;
  }

  function iconaMovimento(importo, desc, categoria, tipo) {
    // Trasferimento tra conti
    if (tipo === 'trasferimento') return `<i class="bi bi-arrow-left-right" style="font-size:1.1rem"></i>`;

    // Prima controlla la categoria Wallet
    if (categoria && CATEGORIA_ICONA[categoria]) {
      return `<i class="bi ${CATEGORIA_ICONA[categoria]}" style="font-size:1.1rem"></i>`;
    }

    // Fallback su descrizione
    let icon = 'bi-credit-card';
    if (importo > 0) {
      icon = /stipendio|salary|accredito/i.test(desc) ? 'bi-briefcase-fill' : 'bi-arrow-up-circle-fill';
    } else {
      if (/mutuo|affitto|casa|rent/i.test(desc))        icon = 'bi-house-fill';
      else if (/spesa|alim|supermer|conad|esselunga|lidl|carrefour/i.test(desc)) icon = 'bi-cart3';
      else if (/bolletta|luce|gas|telefon|enel|eni|tim|vodafone/i.test(desc))    icon = 'bi-lightning-charge-fill';
      else if (/amazon|zalando|ikea|acquisto|online/i.test(desc)) icon = 'bi-bag-fill';
      else if (/ristoran|bar|caffè|trattoria|mcdonald|burger/i.test(desc)) icon = 'bi-cup-hot';
      else if (/benzina|carburante|esso|shell|agip|ip /i.test(desc)) icon = 'bi-fuel-pump-fill';
      else if (/farmac|medic|doctor|asl/i.test(desc))   icon = 'bi-capsule-pill';
      else if (/add\. e\/c carta|carta n\./i.test(desc)) icon = 'bi-credit-card-fill';
      else if (/bonifico|girocon|trasfer/i.test(desc))   icon = 'bi-arrow-left-right';
      else icon = 'bi-arrow-down-circle-fill';
    }
    return `<i class="bi ${icon}" style="font-size:1.1rem"></i>`;
  }

  function sparkline(storico, w = 64, h = 22, colore = '#22C55E') {
    if (!storico || storico.length < 2) return '';
    const prezzi = storico.map(p => typeof p === 'object' ? p.prezzo : p).filter(Boolean);
    if (prezzi.length < 2) return '';
    const min = Math.min(...prezzi), max = Math.max(...prezzi), rng = max - min || 1;
    const pts = prezzi.map((p, i) => {
      const x = (i / (prezzi.length - 1)) * w;
      const y = h - ((p - min) / rng) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
      <polyline points="${pts}" fill="none" stroke="${colore}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function calcolaStoricoPatrimonio() {
    const saldo = stato.totali.saldo_conto || 0;
    const dateSet = new Set();
    stato.titoli.forEach(t => (t.storico_prezzi || []).forEach(p => dateSet.add(p.data)));

    if (dateSet.size < 3) {
      const base = stato.totali.patrimonio || 0;
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        return { data: d.toISOString().split('T')[0], valore: base };
      });
    }

    return [...dateSet].sort().slice(-90).map(data => {
      let valore = saldo;
      stato.titoli.forEach(t => {
        const qty = t.quantita ?? 1;
        const p = (t.storico_prezzi || []).filter(p => p.data <= data).sort((a,b) => b.data.localeCompare(a.data))[0];
        if (p) valore += p.prezzo * qty;
      });
      return { data, valore };
    });
  }

  function areaChart(storico, w, h) {
    if (!storico || storico.length < 2) return '';
    const valori = storico.map(p => p.valore);
    const min = Math.min(...valori), max = Math.max(...valori);
    const pad = (max - min) * 0.1 || max * 0.05 || 1;
    const minP = min - pad, maxP = max + pad, rng = maxP - minP;
    const toX = i => (i / (valori.length - 1)) * w;
    const toY = v => h - ((v - minP) / rng) * h;

    let linePath = `M ${toX(0)} ${toY(valori[0])}`;
    for (let i = 1; i < valori.length; i++) {
      const x1 = (toX(i-1) + toX(i)) / 2;
      linePath += ` C ${x1} ${toY(valori[i-1])}, ${x1} ${toY(valori[i])}, ${toX(i)} ${toY(valori[i])}`;
    }
    const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

    const n = storico.length - 1;
    const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const labels = [0, Math.floor(n/2), n].map(i => {
      const d = storico[i].data.split('-');
      return { x: toX(i), label: `${mesi[parseInt(d[1])-1]} ${d[0].slice(2)}` };
    });

    return `<svg width="${w}" height="${h+20}" viewBox="0 0 ${w} ${h+20}" preserveAspectRatio="none" style="overflow:visible">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#ag)"/>
      <path d="${linePath}" fill="none" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${toX(n)}" cy="${toY(valori[n])}" r="4" fill="#3B82F6"/>
      ${labels.map(l => `<text x="${l.x}" y="${h+16}" text-anchor="middle" font-size="10" fill="#9CA3AF" font-family="inherit">${l.label}</text>`).join('')}
    </svg>`;
  }

  // ── ERRORE ────────────────────────────────────────────────────────────────

  function renderErrore() {
    return `
    <div style="flex:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;
      justify-content:center;background:#1A2B4B;padding:2rem;text-align:center">
      <div style="width:64px;height:64px;border-radius:20px;background:rgba(220,38,38,.2);
        display:flex;align-items:center;justify-content:center;margin:0 auto 1.2rem">
        <i class="bi bi-exclamation-triangle-fill" style="font-size:1.8rem;color:#EF4444"></i>
      </div>
      <h2 style="color:#fff;font-size:1.2rem;font-weight:700;margin-bottom:.5rem">
        Errore di caricamento
      </h2>
      <p style="color:rgba(255,255,255,.5);font-size:.85rem;margin-bottom:1.8rem;
        max-width:280px;line-height:1.5">${stato.errore}</p>
      <button onclick="location.reload()"
        style="padding:.8rem 2rem;background:#2563EB;color:#fff;border:none;
        border-radius:100px;font-family:inherit;font-size:.95rem;font-weight:600;cursor:pointer">
        Riprova
      </button>
    </div>`;
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────

  function renderLogin() {
    return `
    <div style="flex:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;
      justify-content:center;background:#1A2B4B;padding:2rem;">
      <div style="text-align:center;margin-bottom:2.5rem;color:#fff">
        <div style="width:72px;height:72px;border-radius:22px;background:rgba(255,255,255,.12);
          display:flex;align-items:center;justify-content:center;margin:0 auto 1rem"><i class="bi bi-briefcase-fill" style="font-size:2rem;color:#fff"></i></div>
        <h1 style="font-size:2rem;font-weight:800;letter-spacing:-1px">Portafoglio</h1>
        <p style="font-size:.9rem;color:rgba(255,255,255,.5);margin-top:.4rem">Roberto Giacomazzi</p>
      </div>
      <div style="background:rgba(255,255,255,.06);border-radius:20px;padding:1.5rem;
        width:100%;max-width:320px;display:flex;flex-direction:column;gap:.8rem">
        <button id="btn-login" style="display:flex;align-items:center;justify-content:center;
          gap:.6rem;padding:.9rem 1.5rem;background:#fff;border:none;border-radius:100px;
          font-size:.95rem;font-weight:600;color:#1A2B4B;cursor:pointer">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Accedi con Google
        </button>
        ${Auth.isWebAuthnSupported() && Auth.hasCredentialRegistered() ? `
        <button id="btn-biometric" style="display:flex;align-items:center;justify-content:center;
          gap:.6rem;padding:.9rem 1.5rem;background:rgba(255,255,255,.1);border:none;
          border-radius:100px;font-size:.95rem;font-weight:600;color:rgba(255,255,255,.8);cursor:pointer">
          <i class="bi bi-fingerprint"></i> Usa impronta digitale
        </button>` : ''}
      </div>
    </div>`;
  }

  // ── HOME ──────────────────────────────────────────────────────────────────

  function renderHome(isDesktop = false) {
    const t = stato.totali;
    const storico = calcolaStoricoPatrimonio();
    const ultimiMov = [...(stato.dati?.conti || [])
      .flatMap(c => c.movimenti || [])]
      .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);

    if (isDesktop) {
      const chartW = 640;
      return `
      <div class="desktop-toolbar">
        <h2>Dashboard</h2>
        <div class="toolbar-actions">
          <button class="btn-secondary" data-action="aggiorna"><i class='bi bi-arrow-clockwise'></i> Aggiorna prezzi</button>
          <button class="btn-primary" id="btn-aggiungi-home">+ Aggiungi titolo</button>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="desktop-summary" style="grid-template-columns:repeat(3,1fr);display:grid;gap:.8rem;margin-bottom:1.2rem">
        <div class="summary-card dark">
          <div class="sc-label">Patrimonio totale</div>
          <div class="sc-value">${Fmt.eur(t.patrimonio)}</div>
        </div>
        <div class="summary-card">
          <div class="sc-label">Investimenti</div>
          <div class="sc-value">${Fmt.eur(t.totale_valore)}</div>
          <div class="sc-sub ${(t.gp_pct||0) >= 0 ? 'pos' : 'neg'}">${Fmt.pct(t.gp_pct)} totale</div>
        </div>
        <div class="summary-card">
          <div class="sc-label">Conto corrente</div>
          <div class="sc-value">${Fmt.eur(t.saldo_conto)}</div>
          <div class="sc-sub" style="color:#6B7280">saldo disponibile</div>
        </div>
      </div>

      <!-- Grafico + ultime transazioni -->
      <div style="display:grid;grid-template-columns:1fr 340px;gap:1rem;align-items:start">
        <div style="background:#fff;border-radius:14px;border:1px solid var(--border);padding:1.2rem">
          <p style="font-size:.9rem;font-weight:700;color:#1A2B4B;margin-bottom:1rem">Andamento del Patrimonio</p>
          <div style="width:100%;overflow:hidden">${areaChart(storico, chartW, 130)}</div>
        </div>
        <div style="background:#fff;border-radius:14px;border:1px solid var(--border);padding:1.2rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
            <p style="font-size:.9rem;font-weight:700;color:#1A2B4B">Ultime transazioni</p>
            <button class="link-btn" onclick="App.setTab('conto')">Vedi tutte</button>
          </div>
          ${ultimiMov.length === 0
            ? `<div style="text-align:center;padding:1.5rem;color:#9CA3AF;font-size:.85rem">Nessun movimento.</div>`
            : ultimiMov.map(m => `
              <div class="transazione-row">
                <div class="tx-icon ${m.importo > 0 ? 'tx-pos' : 'tx-neg'}">${iconaMovimento(m.importo, m.desc, m.categoria, m.tipo)}</div>
                <div style="flex:1;min-width:0">
                  <p class="tx-desc">${m.desc}</p>
                  <p class="tx-cat">${Fmt.data(m.data)}</p>
                </div>
                <p class="tx-importo ${m.importo > 0 ? 'pos' : 'neg'}">${m.importo > 0 ? '+' : ''}${Fmt.eur(m.importo)}</p>
              </div>`).join('')}
        </div>
      </div>`;
    }

    // ── MOBILE ────────────────────────────────────────────────────────────────
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:1.2rem 1.2rem .8rem">
      <div></div>
      <h1 style="font-size:1.1rem;font-weight:700;color:#1A2B4B">Dashboard</h1>
      <button class="icon-btn-light" data-action="aggiorna" title="Aggiorna prezzi">
        <i class="bi bi-arrow-clockwise" style="font-size:1.1rem;color:#1A2B4B"></i>
      </button>
    </div>
    <div style="padding:0 1.2rem 1.4rem">
      <p style="font-size:1.05rem;font-weight:700;color:#1A2B4B;margin-bottom:.8rem">Ciao Roberto!</p>
      <p style="font-size:.75rem;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.3rem">Patrimonio Totale</p>
      <p style="font-size:2.4rem;font-weight:800;color:#1A2B4B;letter-spacing:-1.5px;line-height:1.1">${Fmt.eur(t.patrimonio)}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;padding:0 1.2rem 1.4rem">
      <div class="home-card" onclick="App.setTab('conto')">
        <p class="home-card-label">Conti Correnti</p>
        <p class="home-card-value">${Fmt.eur(t.saldo_conto)}</p>
        <p class="home-card-sub" style="color:#6B7280">Saldo Conti</p>
      </div>
      <div class="home-card" onclick="App.setTab('portafoglio')">
        <p class="home-card-label">Investimenti</p>
        <p class="home-card-value">${Fmt.eur(t.totale_valore)}</p>
        <p class="home-card-sub ${(t.gp_pct||0) >= 0 ? 'pos' : 'neg'}">
          ${(t.gp_pct||0) >= 0 ? '▲' : '▼'} ${Fmt.pct(Math.abs(t.gp_pct||0))} totale
        </p>
      </div>
    </div>
    <div class="home-section-card" style="padding:1rem 1.2rem 1.2rem">
      <p style="font-size:.9rem;font-weight:700;color:#1A2B4B;margin-bottom:1rem">Andamento del Patrimonio</p>
      <div style="width:100%;overflow:hidden">${areaChart(storico, 320, 100)}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;padding:1rem 1.2rem">
      <button class="quick-action-btn" onclick="App.setTab('conto')">
        <div class="qa-icon" style="background:#EBF3FF">
<i class="bi bi-credit-card-fill" style="font-size:1.3rem;color:#2563EB"></i>
        </div>
        <span>Transazioni</span>
      </button>
      <button class="quick-action-btn" onclick="App.setTab('portafoglio')">
        <div class="qa-icon" style="background:#F0FDF4">
<i class="bi bi-graph-up" style="font-size:1.3rem;color:#16A34A"></i>
        </div>
        <span>Portafoglio</span>
      </button>
      <button class="quick-action-btn" id="btn-aggiungi-home">
        <div class="qa-icon" style="background:#FFF7ED">
<i class="bi bi-plus-circle-fill" style="font-size:1.3rem;color:#D97706"></i>
        </div>
        <span>Aggiungi</span>
      </button>
    </div>
    <div style="padding:0 1.2rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
        <p style="font-size:.9rem;font-weight:700;color:#1A2B4B">Ultime Transazioni</p>
        <button class="link-btn" onclick="App.setTab('conto')">Vedi tutte</button>
      </div>
      ${ultimiMov.length === 0
        ? `<div style="text-align:center;padding:1.5rem;color:#9CA3AF;font-size:.85rem">Nessun movimento. Importa un CSV dalla tua banca.</div>`
        : ultimiMov.map(m => `
          <div class="transazione-row">
            <div class="tx-icon ${m.importo > 0 ? 'tx-pos' : 'tx-neg'}">${iconaMovimento(m.importo, m.desc, m.categoria, m.tipo)}</div>
            <div style="flex:1;min-width:0">
              <p class="tx-desc">${m.desc}</p>
              <p class="tx-cat">${m.importo > 0 ? 'Entrata' : 'Uscita'}</p>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <p class="tx-importo ${m.importo > 0 ? 'pos' : 'neg'}">${m.importo > 0 ? '+' : ''}${Fmt.eur(m.importo)}</p>
              <p class="tx-data">${Fmt.data(m.data)}</p>
            </div>
          </div>`).join('')}
    </div>
    <div style="height:90px"></div>`;
  }

  // ── PORTAFOGLIO ───────────────────────────────────────────────────────────

  function renderPortafoglio(isDesktop = false) {
    const cats = [...new Set(stato.titoli.map(t => t.categoria))];
    const t = stato.totali;

    if (isDesktop) {
      return `
      <div class="desktop-toolbar">
        <h2>Portafoglio <span class="count">${stato.titoli.length}</span></h2>
        <div class="toolbar-actions">
          <button class="btn-secondary" id="btn-importa-csv"><i class='bi bi-download'></i> Importa CSV</button>
          <button class="btn-secondary" data-action="aggiorna"><i class='bi bi-arrow-clockwise'></i> Aggiorna prezzi</button>
          <button class="btn-primary" id="btn-aggiungi">+ Aggiungi</button>
        </div>
      </div>
      <div class="desktop-summary">
        <div class="summary-card dark">
          <div class="sc-label">Valore totale</div>
          <div class="sc-value">${Fmt.eur(t.totale_valore)}</div>
        </div>
        <div class="summary-card">
          <div class="sc-label">Guadagno / Perdita</div>
          <div class="sc-value ${(t.gp_eur||0) >= 0 ? 'pos' : 'neg'}">${Fmt.delta(t.gp_eur)}</div>
          <div class="sc-sub ${(t.gp_pct||0) >= 0 ? 'pos' : 'neg'}">${Fmt.pct(t.gp_pct)}</div>
        </div>
        <div class="summary-card">
          <div class="sc-label">Posizioni</div>
          <div class="sc-value">${stato.titoli.length}</div>
          <div class="sc-sub">titoli attivi</div>
        </div>
      </div>
      <div class="portfolio-table-wrap">
        ${cats.map(cat => `
          <div class="cat-label">${cat.toUpperCase()}</div>
          <table class="portfolio-table">
            <thead><tr>
              <th style="text-align:left">Titolo</th>
              <th>Qtà</th>
              <th>Carico unit.</th>
              <th>Costo totale</th>
              <th>Prezzo att.</th>
              <th>Valore att.</th>
              <th>G/P €</th>
              <th>G/P %</th>
            </tr></thead>
            <tbody>${stato.titoli.filter(x => x.categoria === cat).map(x => rigaTitolo(x, true)).join('')}</tbody>
          </table>
          <div class="table-spacer"></div>
        `).join('')}
        <div class="table-total-row">
          <span>Totale investimenti</span>
          <span>${Fmt.eur(t.totale_costo)}</span>
          <span>${Fmt.eur(t.totale_valore)}</span>
          <span class="${(t.gp_eur||0) >= 0 ? 'pos' : 'neg'}">${Fmt.delta(t.gp_eur)}</span>
          <span class="${(t.gp_pct||0) >= 0 ? 'pos' : 'neg'}">${Fmt.pct(t.gp_pct)}</span>
        </div>
      </div>`;
    }

    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.2rem .5rem">
      <h2 style="font-size:1.4rem;font-weight:800;color:#1A2B4B">Portafoglio</h2>
      <button class="icon-btn-light" id="btn-aggiungi">
        <i class="bi bi-plus-lg" style="font-size:1.1rem;color:#1A2B4B"></i>
      </button>
    </div>
    <div style="background:#fff;border-radius:16px;padding:1.2rem;margin:0 .8rem .8rem;box-shadow:0 2px 12px rgba(0,0,0,.05)">
      <p style="font-size:.7rem;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.4rem">Totale investito</p>
      <p style="font-size:1.7rem;font-weight:800;color:#1A2B4B;letter-spacing:-.8px">${Fmt.eur(t.totale_valore)}</p>
      <div style="display:flex;gap:1rem;margin-top:.5rem">
        <span class="${(t.gp_eur||0) >= 0 ? 'pos' : 'neg'}" style="font-size:.85rem;font-weight:600">${Fmt.delta(t.gp_eur)}</span>
        <span class="${(t.gp_pct||0) >= 0 ? 'pos' : 'neg'}" style="font-size:.85rem;font-weight:600">${Fmt.pct(t.gp_pct)}</span>
      </div>
    </div>
    <div style="display:flex;gap:.5rem;padding:0 .8rem .8rem">
      <button class="btn-pill" data-action="aggiorna"><i class='bi bi-arrow-clockwise'></i> Aggiorna prezzi</button>
      <button class="btn-pill" id="btn-importa-csv"><i class='bi bi-download'></i> Importa CSV</button>
    </div>
    ${cats.map(cat => `
      <p style="font-size:.7rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.1em;padding:.6rem 1.2rem .3rem">${cat}</p>
      <div style="padding:0 .8rem">${stato.titoli.filter(x => x.categoria === cat).map(x => rigaTitolo(x)).join('')}</div>
    `).join('')}
    <div style="background:#1A2B4B;color:#fff;display:flex;justify-content:space-between;padding:.9rem 1.2rem;font-size:.9rem;font-weight:700;margin-top:.5rem">
      <span>Totale investimenti</span><span>${Fmt.eur(t.totale_valore)}</span>
    </div>
    <input type="file" id="file-csv" accept=".csv,.xls,.xlsx,.txt" style="display:none">
    <div style="height:90px"></div>`;
  }

  // ── RIGA TITOLO ───────────────────────────────────────────────────────────

  function rigaTitolo(t, isDesktop = false) {
    const c   = coloreCategoria(t.categoria);
    const isG = (t._gp_eur || 0) >= 0;
    const sp  = sparkline(t.storico_prezzi, 52, 18, isG ? '#16A34A' : '#DC2626');
    const tickerLabel = t.ticker?.split('.')[0] || t.id.substring(0,3).toUpperCase();

    // Data ultimo aggiornamento prezzi
    const dataAgg = t.data_ultimo_prezzo
      ? (t.aggiornato_oggi ? 'oggi' : Fmt.data(t.data_ultimo_prezzo))
      : '—';
    const colorDataAgg = t.aggiornato_oggi ? '#16A34A' : '#D97706';

    // Valori principali
    const prezzoCarico  = t.prezzo_carico  || 0;
    const prezzoAttuale = t.prezzo_attuale || prezzoCarico;
    const costoTotale   = t._costo_totale  || 0;
    const valoreTotale  = t._valore_totale || 0;
    const gpEur         = t._gp_eur        || 0;
    const gpPct         = t._gp_pct        || 0;

    if (isDesktop) {
      return `
      <tr class="titolo-row ${stato.titoloSelezionato?.id === t.id ? 'selected' : ''}" data-id="${t.id}">
        <td>
          <div class="titolo-cell">
            <div class="ticker-badge" style="background:${c.bg};color:${c.fg}">${tickerLabel}</div>
            <div>
              <div class="titolo-nome">${t.nome}</div>
              <div class="titolo-cat" style="display:flex;align-items:center;gap:4px">
                ${t.categoria}
                ${sp ? `<span style="display:inline-flex;vertical-align:middle">${sp}</span>` : ''}
              </div>
            </div>
          </div>
        </td>
        <td class="num">${t.quantita != null ? Fmt.qty(t.quantita, t.categoria) : '—'}</td>
        <td class="num">${Fmt.prezzo(prezzoCarico, t.categoria)}</td>
        <td class="num">${Fmt.eur(costoTotale)}</td>
        <td class="num">
          <div>${Fmt.prezzo(prezzoAttuale, t.categoria)}</div>
          <div style="font-size:.7rem;color:${colorDataAgg};font-weight:600;margin-top:1px">
            agg. ${dataAgg}
          </div>
        </td>
        <td class="num bold">${Fmt.eur(valoreTotale)}</td>
        <td class="num bold ${isG ? 'pos' : 'neg'}">${Fmt.delta(gpEur)}</td>
        <td class="num ${isG ? 'pos' : 'neg'}">${Fmt.pct(gpPct)}</td>
      </tr>`;
    }

    // ── CARD MOBILE ──────────────────────────────────────────────────────────
    return `
    const logoUrl = logoTitolo(t.ticker, t.categoria);

    return `
    <div class="titolo-card-new" data-id="${t.id}" style="flex-direction:column;align-items:stretch;gap:.6rem">
      <!-- Riga 1: logo/badge + nome + valore -->
      <div style="display:flex;align-items:center;gap:.75rem">
        <div style="width:44px;height:44px;border-radius:12px;flex-shrink:0;overflow:hidden;
          background:${c.bg};display:flex;align-items:center;justify-content:center">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="${tickerLabel}"
                style="width:28px;height:28px;object-fit:contain"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <span style="font-size:.58rem;font-weight:800;color:${c.fg};display:${logoUrl ? 'none' : 'flex'};
            align-items:center;justify-content:center;width:100%;height:100%;text-align:center;padding:2px">
            ${tickerLabel}
          </span>
        </div>
        <div style="flex:1;min-width:0">
          <p style="font-size:.9rem;font-weight:700;color:#1A2B4B;line-height:1.25;word-break:break-word">${t.nome}</p>
          <p style="font-size:.72rem;color:#9CA3AF;margin-top:.15rem">
            ${t.quantita != null ? `${Fmt.qty(t.quantita, t.categoria)} ${Fmt.unita(t.categoria)} · ` : ''}${t.categoria}
          </p>
        </div>
        <div style="text-align:right;flex-shrink:0;min-width:75px">
          <p style="font-size:.9rem;font-weight:800;color:#1A2B4B">${Fmt.eur(valoreTotale)}</p>
          <p style="font-size:.75rem;font-weight:700;${isG ? 'color:#16A34A' : 'color:#DC2626'}">${Fmt.delta(gpEur)}</p>
        </div>
        <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style="flex-shrink:0;margin-left:.1rem">
          <path d="M1 1l4 4-4 4" stroke="#D1D5DB" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <!-- Riga 2: griglia dati -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);
        background:#F8F9FB;border-radius:10px;padding:.5rem 0;border:1px solid #F0F2F7">
        <div style="text-align:center;padding:.1rem .5rem;border-right:1px solid #F0F2F7">
          <p style="font-size:.58rem;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Carico</p>
          <p style="font-size:.78rem;font-weight:700;color:#1A2B4B">${Fmt.prezzo(prezzoCarico, t.categoria)}</p>
        </div>
        <div style="text-align:center;padding:.1rem .5rem;border-right:1px solid #F0F2F7">
          <p style="font-size:.58rem;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Costo tot.</p>
          <p style="font-size:.78rem;font-weight:700;color:#1A2B4B">${Fmt.eur(costoTotale)}</p>
        </div>
        <div style="text-align:center;padding:.1rem .5rem">
          <p style="font-size:.58rem;color:${colorDataAgg};text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">
            Prezzo ${dataAgg}
          </p>
          <p style="font-size:.78rem;font-weight:700;color:#1A2B4B">${Fmt.prezzo(prezzoAttuale, t.categoria)}</p>
        </div>
      </div>
    </div>`;
  }

  // ── DETTAGLIO ─────────────────────────────────────────────────────────────

  function det_row(lbl, val) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;
      padding:11px 14px;border-bottom:1px solid #F5F7FA">
      <span style="font-size:.82rem;color:#9CA3AF;font-weight:500">${lbl}</span>
      <span style="font-size:.88rem;font-weight:700;color:#1A2B4B;text-align:right">${val}</span>
    </div>`;
  }

  function det_input(id, label, value, type='text', step='any') {
    return `<div style="display:flex;align-items:center;justify-content:space-between;
      padding:11px 14px;border-bottom:1px solid #F5F7FA">
      <span style="font-size:.82rem;color:#9CA3AF;font-weight:500">${label}</span>
      <div style="display:flex;align-items:center;gap:6px">
        <input id="${id}" type="${type}" step="${step}" value="${value ?? ''}"
          style="text-align:right;border:none;outline:none;font-family:inherit;
          font-size:.88rem;font-weight:700;color:#2563EB;background:transparent;width:150px">
        <div style="width:6px;height:6px;border-radius:50%;background:#2563EB;flex-shrink:0"></div>
      </div>
    </div>`;
  }

  function det_section(title, content) {
    return `<div style="background:#fff;border-radius:16px;margin:0 12px 8px;
      overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04)">
      <div style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;
        letter-spacing:.08em;padding:10px 14px 6px;border-bottom:1px solid #F5F7FA">${title}</div>
      ${content}
    </div>`;
  }

  function renderDettaglio(t) {
    if (!t) return '';
    const c   = coloreCategoria(t.categoria);
    const isG = (t._gp_pct || 0) >= 0;
    const sp  = sparkline(t.storico_prezzi, 295, 60, isG ? '#16A34A' : '#DC2626');
    const tickerLabel = t.ticker?.split('.')[0] || t.id.substring(0,4).toUpperCase();
    const isManuale = t.fonte_prezzi === 'manuale';

    if (stato.editMode) {
      // ── MODALITÀ MODIFICA ──
      return `
      <div style="overflow-y:auto;background:#F5F7FA;padding-bottom:30px">

        <!-- Hero modifica -->
        <div style="background:#F5F7FA;padding:12px 16px 10px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:44px;height:44px;border-radius:13px;background:${c.bg};
              display:flex;align-items:center;justify-content:center;
              font-size:.62rem;font-weight:800;color:${c.fg};flex-shrink:0">${tickerLabel}</div>
            <div>
              <div style="font-size:.95rem;font-weight:700;color:#1A2B4B">${t.nome}</div>
              <div style="display:inline-flex;align-items:center;gap:4px;margin-top:3px;
                padding:.15rem .5rem;background:#EBF0FF;border-radius:6px">
                <div style="width:5px;height:5px;border-radius:50%;background:#2563EB"></div>
                <span style="font-size:.62rem;font-weight:700;color:#2563EB">Modifica attiva</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sezione Posizione -->
        ${det_section('Posizione',
          det_input('det-nome',   'Nome',               t.nome,              'text') +
          (t.quantita != null ? det_input('det-qty', 'Quantità', t.quantita, 'number') : '') +
          det_input('det-carico', 'Prezzo di carico €', t.prezzo_carico || 0, 'number', '0.0001') +
          (isManuale ? det_input('det-prezzo', 'Valore attuale €', t.prezzo_attuale || '', 'number', '0.01') : '')
        )}

        <!-- Sezione Strumento -->
        ${det_section('Strumento',
          (!isManuale ? det_input('det-ticker', 'Ticker',  t.ticker || '', 'text') : '') +
          (!isManuale ? det_input('det-isin',   'ISIN',    t.isin   || '', 'text') : '') +
          (!isManuale ? det_input('det-wkn',    'WKN',     t.wkn    || '', 'text') : '') +
          det_row('Fonte prezzi', isManuale ? 'Inserimento manuale' : t.fonte_prezzi === 'zonebourse' ? 'ZoneBourse' : 'Yahoo Finance') +
          det_input('det-note', 'Note', t.note || '', 'text')
        )}

        <!-- Info -->
        <div style="margin:0 12px 10px;padding:11px 13px;background:#EBF0FF;border-radius:13px;
          display:flex;align-items:flex-start;gap:8px">
          <i class="bi bi-info-circle-fill" style="font-size:.95rem;color:#2563EB;flex-shrink:0"></i>
          <p style="font-size:.74rem;color:#2563EB;font-weight:500;line-height:1.4">
            Modifica il <strong>prezzo di carico</strong> per ricalcolare G/P. Per registrare un acquisto usa <strong>Acquista</strong>.
          </p>
        </div>

        <!-- Elimina -->
        <button id="btn-elimina-titolo" data-id="${t.id}"
          style="display:block;width:calc(100% - 24px);margin:0 12px;padding:12px;
          background:rgba(220,38,38,.07);color:#DC2626;border:none;border-radius:14px;
          font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">
          <i class="bi bi-trash3"></i> Elimina titolo
        </button>

      </div>`;
    }

    // ── MODALITÀ SOLA LETTURA ──
    return `
    <div style="overflow-y:auto;background:#F5F7FA;padding-bottom:30px">

      <!-- Hero -->
      <div style="background:#fff;padding:14px 16px 12px;border-bottom:1px solid #F0F2F7">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:13px;background:${c.bg};
            display:flex;align-items:center;justify-content:center;
            font-size:.62rem;font-weight:800;color:${c.fg};flex-shrink:0">${tickerLabel}</div>
          <div>
            <div style="font-size:.95rem;font-weight:700;color:#1A2B4B;line-height:1.2">${t.nome}</div>
            <div style="font-size:.72rem;color:#9CA3AF;margin-top:2px">${t.categoria}</div>
          </div>
        </div>
        <div style="font-size:1.9rem;font-weight:800;color:#1A2B4B;letter-spacing:-1px">${Fmt.eur(t._valore_totale)}</div>
        <div style="margin-top:5px">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:.22rem .65rem;
            border-radius:100px;font-size:.75rem;font-weight:700;
            background:${isG ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)'};
            color:${isG ? '#16A34A' : '#DC2626'}">
            ${isG ? '▲' : '▼'} ${Fmt.eur(Math.abs(t._gp_eur || 0))} · ${Fmt.pct(t._gp_pct)}
          </span>
        </div>
        ${t.aggiornato_oggi && t.var_pct_oggi != null
          ? `<div style="font-size:.75rem;color:#9CA3AF;margin-top:6px">Oggi <span style="color:${t.var_pct_oggi >= 0 ? '#16A34A' : '#DC2626'};font-weight:600">${Fmt.pct(t.var_pct_oggi)}</span></div>`
          : `<div style="font-size:.75rem;color:#9CA3AF;margin-top:6px">Ultimo prezzo: <strong>${Fmt.data(t.data_ultimo_prezzo)}</strong>${t.var_pct_oggi != null ? ` · <span style="color:${t.var_pct_oggi >= 0 ? '#16A34A' : '#DC2626'};font-weight:600">${Fmt.pct(t.var_pct_oggi)}</span>` : ''}</div>`}
      </div>

      <!-- Sparkline -->
      ${sp ? `<div style="background:#fff;padding:10px 16px 0;border-bottom:1px solid #F0F2F7">
        ${sp}
        <div style="display:flex;justify-content:space-between;font-size:.64rem;color:#9CA3AF;padding:4px 0 10px">
          <span>6 mesi fa</span><span>3 mesi fa</span><span>Oggi</span>
        </div>
      </div>` : ''}

      <!-- Azioni rapide -->
      <div style="display:flex;gap:8px;padding:10px 12px;background:#fff;border-bottom:1px solid #F0F2F7">
        <button id="btn-acquista-titolo" data-id="${t.id}"
          style="flex:1;padding:9px 0;border-radius:12px;border:none;font-family:inherit;
          font-size:.8rem;font-weight:700;cursor:pointer;background:#F0FDF4;color:#16A34A;
          display:flex;align-items:center;justify-content:center;gap:4px">
<i class="bi bi-plus-circle"></i> Acquista
        </button>
        <button id="btn-vendi-titolo" data-id="${t.id}"
          style="flex:1;padding:9px 0;border-radius:12px;border:none;font-family:inherit;
          font-size:.8rem;font-weight:700;cursor:pointer;background:#FFF1F1;color:#DC2626;
          display:flex;align-items:center;justify-content:center;gap:4px">
<i class="bi bi-dash-circle"></i> Vendi
        </button>
        <button id="btn-storico-titolo" style="flex:1;padding:9px 0;border-radius:12px;border:none;font-family:inherit;
          font-size:.8rem;font-weight:700;cursor:pointer;background:#F0F2F7;color:#1A2B4B;
          display:flex;align-items:center;justify-content:center;gap:4px">
<i class="bi bi-clock-history"></i> Storico
        </button>
      </div>

      <!-- Posizione -->
      ${det_section('Posizione',
        det_row('Quantità',          t.quantita != null ? `${Fmt.qty(t.quantita, t.categoria)} ${Fmt.unita(t.categoria)}` : '—') +
        det_row('Prezzo di carico',  t.quantita ? Fmt.prezzo(t.prezzo_carico, t.categoria) : '—') +
        det_row('Costo totale',      Fmt.eur(t._costo_totale)) +
        det_row('Prezzo attuale',    t.prezzo_attuale ? Fmt.prezzo(t.prezzo_attuale, t.categoria) : '—') +
        det_row('Valore attuale',    Fmt.eur(t._valore_totale)) +
        `<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px">
          <span style="font-size:.82rem;color:#9CA3AF;font-weight:500">G/P totale</span>
          <span style="font-size:.88rem;font-weight:700;color:${isG ? '#16A34A' : '#DC2626'}">${Fmt.delta(t._gp_eur)} (${Fmt.pct(t._gp_pct)})</span>
        </div>`
      )}

      <!-- Strumento -->
      ${det_section('Strumento',
        det_row('Ticker',               t.ticker || '—') +
        det_row('ISIN',                 t.isin   || '—') +
        det_row('WKN',                  t.wkn    || '—') +
        det_row('Fonte prezzi',         isManuale ? 'Inserimento manuale' : t.fonte_prezzi === 'zonebourse' ? 'ZoneBourse' : 'Yahoo Finance') +
        det_row('Data acquisto',        Fmt.data(t.data_acquisto)) +
        det_row('Ultimo aggiornamento', Fmt.data(t.data_ultimo_prezzo)) +
        (t.note ? det_row('Note', t.note) : '')
      )}

      <!-- Elimina -->
      <button id="btn-elimina-titolo" data-id="${t.id}"
        style="display:block;width:calc(100% - 24px);margin:0 12px;padding:12px;
        background:rgba(220,38,38,.07);color:#DC2626;border:none;border-radius:14px;
        font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">
        <i class="bi bi-trash3"></i> Elimina titolo
      </button>

    </div>`;
  }

  // ── CONTO ─────────────────────────────────────────────────────────────────

  function renderConto() {
    const conti = stato.dati?.conti || [];
    // Seleziona il conto attivo (default: primo)
    if (!stato.contoSelezionato && conti.length > 0) stato.contoSelezionato = conti[0].id;
    const conto = conti.find(c => c.id === stato.contoSelezionato) || conti[0];
    if (!conto) return '<div style="padding:2rem;text-align:center;color:#9CA3AF">Nessun conto disponibile</div>';

    const movimenti = conto.movimenti || [];
    const movimentiReali = movimenti.filter(m => m.tipo !== 'trasferimento');
    const saldoMovimenti = movimenti.reduce((s, m) => s + (m.importo || 0), 0);
    const saldo = (conto.saldo_iniziale || 0) + saldoMovimenti;
    const ent = movimentiReali.filter(m => m.importo > 0).reduce((s, m) => s + m.importo, 0);
    const usc = movimentiReali.filter(m => m.importo < 0).reduce((s, m) => s + Math.abs(m.importo), 0);
    const saldoTotale = stato.totali.saldo_conto || 0;

    const haWallet = Wallet.isConfigurato() && conto.wallet_account_id;

    const isCarta = conto.tipo === 'carta';
    const saldoLabel = isCarta ? 'Da pagare' : 'Saldo disponibile';
    const saldoColor = isCarta && saldo < 0 ? '#DC2626' : '#1A2B4B';

    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.2rem .5rem">
      <h2 style="font-size:1.4rem;font-weight:800;color:#1A2B4B">Conti</h2>
      <button class="icon-btn-light" id="btn-aggiungi-movimento">
        <i class="bi bi-plus-lg" style="font-size:1.1rem;color:#1A2B4B"></i>
      </button>
    </div>

    <!-- Selettore conti -->
    ${conti.length > 1 ? `
    <div style="display:flex;gap:.5rem;padding:0 .8rem .6rem;overflow-x:auto">
      ${conti.map(c => `
        <button class="btn-conto-tab ${c.id === conto.id ? 'active' : ''}" data-conto-id="${c.id}"
          style="white-space:nowrap;padding:.4rem .9rem;border-radius:100px;border:1.5px solid ${c.id === conto.id ? '#1A2B4B' : '#E2E5EF'};
          background:${c.id === conto.id ? '#1A2B4B' : '#fff'};color:${c.id === conto.id ? '#fff' : '#6B7280'};
          font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer;flex-shrink:0">
          ${c.nome}
          ${c.tipo === 'carta' ? ' 💳' : ''}
        </button>`).join('')}
    </div>` : ''}

    <!-- Card saldo conto selezionato -->
    <div style="background:#fff;border-radius:16px;padding:1.2rem;margin:0 .8rem .6rem;box-shadow:0 2px 12px rgba(0,0,0,.05)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <p style="font-size:.72rem;color:#9CA3AF;margin-bottom:.2rem">${conto.nome}${isCarta ? ' — Carta di credito' : ''}</p>
          <p style="font-size:1.9rem;font-weight:800;color:${saldoColor};letter-spacing:-.8px">${Fmt.eur(saldo)}</p>
          <p style="font-size:.72rem;color:#9CA3AF;margin-top:.2rem">${saldoLabel}</p>
          ${isCarta && saldo < 0 ? `
          <div style="margin-top:.5rem;display:inline-flex;align-items:center;gap:.35rem;
            background:rgba(220,38,38,.08);color:#DC2626;padding:.25rem .6rem;border-radius:8px;font-size:.72rem;font-weight:600">
            <i class="bi bi-info-circle"></i>
            Il saldo negativo verrà azzerato all'addebito mensile dal c/c
          </div>` : ''}
          ${conto.saldo_iniziale ? `<p style="font-size:.7rem;color:#9CA3AF;margin-top:.3rem">
            saldo iniziale ${Fmt.eur(conto.saldo_iniziale)} al ${Fmt.data(conto.data_saldo_iniziale)}
          </p>` : ''}
        </div>
        <button id="btn-impostazioni-conto" title="Impostazioni conto"
          style="width:32px;height:32px;border-radius:8px;border:none;background:#F5F7FA;cursor:pointer;
          display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="bi bi-gear" style="color:#6B7280"></i>
        </button>
      </div>
      ${conti.length > 1 ? `
      <div style="display:flex;justify-content:space-between;margin-top:.8rem;padding-top:.8rem;border-top:1px solid #F0F2F7">
        <span style="font-size:.78rem;color:#9CA3AF">Totale tutti i conti</span>
        <span style="font-size:.85rem;font-weight:700;color:#1A2B4B">${Fmt.eur(saldoTotale)}</span>
      </div>` : ''}
    </div>

    <!-- Entrate/Uscite (esclusi trasferimenti) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;padding:0 .8rem .6rem">
      <div style="background:#fff;border-radius:14px;padding:.9rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.04)">
        <p style="font-size:.7rem;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">Entrate</p>
        <p style="font-size:1rem;font-weight:700;color:#16A34A">+${Fmt.eur(ent)}</p>
      </div>
      <div style="background:#fff;border-radius:14px;padding:.9rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.04)">
        <p style="font-size:.7rem;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">Uscite</p>
        <p style="font-size:1rem;font-weight:700;color:#DC2626">-${Fmt.eur(usc)}</p>
      </div>
    </div>

    <!-- Azioni -->
    <div style="display:flex;gap:.5rem;padding:0 .8rem .8rem;flex-wrap:wrap">
      <button class="btn-pill" id="btn-importa-csv"><i class='bi bi-download'></i> Importa CSV</button>
      ${Wallet.isConfigurato()
        ? `<button class="btn-pill" id="btn-wallet-sync"
            style="background:#EBF3FF;border-color:#2563EB;color:#2563EB;font-weight:600">
            <i class='bi bi-arrow-repeat'></i> Sync Wallet
          </button>`
        : `<button class="btn-pill" id="btn-wallet-setup" style="color:#9CA3AF">
            <i class='bi bi-wallet2'></i> Connetti Wallet
          </button>`}
    </div>

    <!-- Lista movimenti -->
    <p style="font-size:.7rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.1em;padding:.2rem 1.2rem .5rem">
      Movimenti (${movimenti.length})
    </p>
    <div style="padding:0 .8rem">
      ${movimenti.length === 0
        ? `<div style="text-align:center;padding:2rem;color:#9CA3AF;font-size:.85rem">
            Nessun movimento. Importa un CSV o usa Sync Wallet.
          </div>`
        : [...movimenti].sort((a,b) => b.data.localeCompare(a.data)).map(m => {
            const isTrasf = m.tipo === 'trasferimento';
            const bgIcon  = isTrasf ? 'rgba(107,114,128,.1)' : m.importo > 0 ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)';
            return `
          <div class="transazione-row tx-cliccabile" data-mov-id="${m.id}" data-conto-id="${conto.id}">
            <div class="tx-icon" style="background:${bgIcon}">${iconaMovimento(m.importo, m.desc, m.categoria, m.tipo)}</div>
            <div style="flex:1;min-width:0">
              <p class="tx-desc">${m.desc}</p>
              <p class="tx-cat">
                ${Fmt.data(m.data)}
                ${isTrasf
                  ? `<span style="margin-left:.4rem;background:#F0F2F7;color:#6B7280;font-size:.65rem;font-weight:700;padding:.1rem .4rem;border-radius:4px">⇄ Trasferimento</span>`
                  : m.categoria
                    ? `<span style="margin-left:.4rem;background:#F0F2F7;color:#6B7280;font-size:.65rem;font-weight:600;padding:.1rem .4rem;border-radius:4px">${m.categoria}</span>`
                    : ''}
              </p>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <p class="tx-importo ${isTrasf ? '' : m.importo > 0 ? 'pos' : 'neg'}" style="${isTrasf ? 'color:#6B7280' : ''}">${m.importo > 0 ? '+' : ''}${Fmt.eur(m.importo)}</p>
              <i class="bi bi-pencil" style="font-size:.7rem;color:#D1D5DB;margin-top:.2rem"></i>
            </div>
          </div>`;
          }).join('')}
    </div>
    <input type="file" id="file-csv" accept=".csv,.xls,.xlsx,.txt" style="display:none">
    <div style="height:90px"></div>`;
  }

  // ── IMPOSTAZIONI ──────────────────────────────────────────────────────────

  function renderImpostazioni() {
    const walletOk    = Wallet.isConfigurato();
    const lastSync    = Wallet.getLastSync();
    const ultimaSync  = lastSync ? Fmt.data(lastSync) : 'mai';

    return `
    <div style="padding:1.2rem 1.2rem .5rem">
      <h2 style="font-size:1.4rem;font-weight:800;color:#1A2B4B">Impostazioni</h2>
    </div>
    <div style="padding:0 .8rem">
      <p class="settings-section-label">ACCOUNT</p>
      <div class="settings-row" id="btn-logout-settings"><span>Esci</span>
        <i class="bi bi-chevron-right" style="color:#D1D5DB"></i>
      </div>

      <p class="settings-section-label" style="margin-top:.8rem">WALLET — BUDGETBAKERS</p>
      <div style="background:#fff;border-radius:14px;padding:1rem;margin-bottom:.4rem;
        box-shadow:0 1px 4px rgba(0,0,0,.05)">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem">
          <i class="bi bi-wallet2" style="color:#2563EB;font-size:1.1rem"></i>
          <span style="font-size:.9rem;font-weight:600;color:#1A2B4B">Connessione BudgetBakers</span>
          ${walletOk
            ? `<span style="margin-left:auto;font-size:.7rem;font-weight:700;color:#16A34A;
                background:#F0FDF4;padding:.15rem .5rem;border-radius:100px">
                <i class="bi bi-check-circle-fill"></i> Connesso
              </span>`
            : `<span style="margin-left:auto;font-size:.7rem;font-weight:700;color:#D97706;
                background:#FFF7ED;padding:.15rem .5rem;border-radius:100px">
                Non configurato
              </span>`}
        </div>
        <div style="margin-bottom:.7rem">
          <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;
            letter-spacing:.07em;margin-bottom:4px;display:block">API Token</label>
          <input id="wallet-token" type="password"
            placeholder="Incolla il token da BudgetBakers"
            value="${Wallet.getToken()}"
            style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;
            font-family:inherit;font-size:.85rem;color:#1A2B4B;outline:none">
        </div>
        <div style="display:flex;gap:.5rem">
          <button id="btn-wallet-verifica" style="flex:1;padding:.65rem;background:#1A2B4B;
            color:#fff;border:none;border-radius:100px;font-family:inherit;
            font-size:.82rem;font-weight:600;cursor:pointer">
            <i class="bi bi-plug"></i> Verifica e connetti
          </button>
          ${walletOk ? `<button id="btn-wallet-reset"
            style="padding:.65rem 1rem;background:#FFF1F1;color:#DC2626;border:none;
            border-radius:100px;font-family:inherit;font-size:.82rem;font-weight:600;cursor:pointer">
            <i class="bi bi-x-lg"></i>
          </button>` : ''}
        </div>
        ${walletOk ? `
        <div style="margin-top:.7rem;padding-top:.7rem;border-top:1px solid #F0F2F7">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
            <span style="font-size:.82rem;color:#9CA3AF">Conto sincronizzato</span>
            <button id="btn-wallet-cambia-conto" style="font-size:.75rem;color:#2563EB;
              background:none;border:none;cursor:pointer;font-family:inherit;font-weight:600">
              Cambia
            </button>
          </div>
          <span style="font-size:.85rem;font-weight:600;color:#1A2B4B" id="wallet-account-label">
            Caricamento…
          </span>
          <div style="font-size:.75rem;color:#9CA3AF;margin-top:.3rem">
            Ultima sincronizzazione: <strong>${ultimaSync}</strong>
          </div>
        </div>` : ''}
      </div>

      <p class="settings-section-label" style="margin-top:.8rem">DATI</p>
      <div class="settings-row" data-action="aggiorna"><span>Aggiorna prezzi ora</span>
        <i class="bi bi-chevron-right" style="color:#D1D5DB"></i>
      </div>
      <div class="settings-row" id="btn-drive-info">
        <span>File principale</span>
        <span style="font-size:.8rem;color:#9CA3AF">portafoglio.json</span>
      </div>
      <div class="settings-row" id="btn-drive-backup-info">
        <span>File di backup</span>
        <span style="font-size:.8rem;color:#9CA3AF">portafoglio-backup.json</span>
      </div>
      <div class="settings-row" id="btn-ripristina-backup" style="color:#D97706">
        <span><i class="bi bi-arrow-counterclockwise"></i> Ripristina dal backup</span>
        <i class="bi bi-chevron-right" style="color:#D1D5DB"></i>
      </div>
      <p class="settings-section-label" style="margin-top:.8rem">INFO</p>
      <div class="settings-row"><span>Versione app</span><span style="font-size:.8rem;color:#9CA3AF">2.0.0</span></div>
    </div>
    <div style="height:90px"></div>`;
  }

  // ── BOTTOM NAV ────────────────────────────────────────────────────────────

  function renderBottomNav() {
    const tabs = [
      { id: 'home',        label: 'Home',         icon: 'bi-house-fill',    iconOff: 'bi-house' },
      { id: 'portafoglio', label: 'Investimenti', icon: 'bi-graph-up',      iconOff: 'bi-graph-up' },
      { id: 'conto',       label: 'Conti',        icon: 'bi-credit-card-fill', iconOff: 'bi-credit-card' },
      { id: 'impostazioni',label: 'Altro',        icon: 'bi-grid-fill',     iconOff: 'bi-grid' }
    ];
    return `<nav style="display:flex;justify-content:space-around;background:#fff;
      padding:.6rem 0 calc(.6rem + env(safe-area-inset-bottom));
      border-top:1px solid #F3F4F6;position:fixed;bottom:0;left:0;right:0;z-index:100;
      box-shadow:0 -4px 20px rgba(0,0,0,.06)">
      ${tabs.map(tab => {
        const act = stato.schermata === tab.id;
        return `<button class="nav-tab-new" data-tab="${tab.id}">
          <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;${act ? 'background:#1A2B4B' : ''}">
            <i class="bi ${act ? tab.icon : tab.iconOff}" style="font-size:1.1rem;color:${act ? '#fff' : '#9CA3AF'}"></i>
          </div>
          <span style="font-size:.6rem;font-weight:${act ? '700' : '400'};color:${act ? '#1A2B4B' : '#9CA3AF'};margin-top:.2rem">${tab.label}</span>
        </button>`;
      }).join('')}
    </nav>`;
  }

  // ── SIDEBAR DESKTOP ───────────────────────────────────────────────────────

  function renderSidebar() {
    const t = stato.totali;
    const tabs = [
      { id: 'home',        label: 'Dashboard',    icon: 'bi-house-fill' },
      { id: 'portafoglio', label: 'Portafoglio',  icon: 'bi-graph-up' },
      { id: 'conto',       label: 'Conto',        icon: 'bi-credit-card' },
      { id: 'impostazioni',label: 'Impostazioni', icon: 'bi-gear' }
    ];
    return `<aside class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo"><i class="bi bi-briefcase-fill" style="font-size:1.1rem;color:#fff"></i></div>
        <div>
          <div class="sidebar-title">Portafoglio</div>
          <div class="sidebar-subtitle">Roberto Giacomazzi</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${tabs.map(tb => `
          <button class="sidebar-tab ${stato.schermata === tb.id ? 'active' : ''}" data-tab="${tb.id}">
            <i class="bi ${tb.icon}" style="font-size:1rem;flex-shrink:0"></i>
            ${tb.label}
            ${stato.schermata === tb.id ? '<div class="sidebar-dot"></div>' : ''}
          </button>`).join('')}
      </nav>
      <div class="sidebar-totals">
        <div class="sidebar-total-label">Patrimonio</div>
        <div class="sidebar-total-value">${Fmt.eur(t.patrimonio)}</div>
        <div class="sidebar-sep"></div>
        <div class="sidebar-mini-row"><span>Investimenti</span><span>${Fmt.eur(t.totale_valore)}</span></div>
        <div class="sidebar-mini-row"><span>Conto</span><span>${Fmt.eur(t.saldo_conto)}</span></div>
        <div style="margin-top:.8rem">
          <button id="btn-logout" style="width:100%;border-radius:8px;background:rgba(255,255,255,.08);
            color:rgba(255,255,255,.5);font-size:.8rem;border:none;cursor:pointer;
            display:flex;align-items:center;gap:.5rem;padding:.5rem .8rem;font-family:inherit">
<i class="bi bi-box-arrow-right" style="font-size:.85rem"></i> Esci
          </button>
        </div>
      </div>
    </aside>`;
  }

  // ── HISTORY API ───────────────────────────────────────────────────────────

  function pushHistory(label) { history.pushState({ pf: label }, '', location.href); }

  function initHistory() {
    history.replaceState({ pf: 'home' }, '', location.href);
    window.addEventListener('popstate', () => {
      if (stato.titoloSelezionato) {
        stato.titoloSelezionato = null; stato.editMode = false;
        pushHistory(stato.schermata); render(); return;
      }
      if (stato.schermata !== 'home') {
        stato.schermata = 'home'; stato.titoloSelezionato = null;
        pushHistory('home'); render();
      }
    });
  }

  // ── RENDER PRINCIPALE ─────────────────────────────────────────────────────

  function render() {
    const root = document.getElementById('app');
    const desktop = !isMobile();

    if (!stato.dati) {
      root.style.cssText = 'height:100vh;display:block;overflow:hidden';
      if (stato.errore) {
        root.innerHTML = renderErrore();
      } else {
        root.innerHTML = renderLogin();
        bindLogin();
      }
      return;
    }
    root.style.cssText = 'height:100vh;display:flex;overflow:hidden';

    document.getElementById('loading-bar')?.classList[stato.aggiornando ? 'add' : 'remove']('active');

    let html = '';

    if (desktop) {
      let mainContent = '';
      switch (stato.schermata) {
        case 'home':         mainContent = renderHome(true);         break;
        case 'portafoglio':  mainContent = renderPortafoglio(true); break;
        case 'conto':        mainContent = renderConto();            break;
        case 'impostazioni': mainContent = renderImpostazioni();     break;
      }
      html = `
        ${renderSidebar()}
        <div class="desktop-main">
          <div class="desktop-header-bar">
            <div>
              <span class="dh-label">Patrimonio totale</span>
              <span class="dh-value">${Fmt.eur(stato.totali.patrimonio)}</span>
            </div>
            <div class="dh-actions">
              <button class="btn-secondary" data-action="aggiorna">↻ Aggiorna</button>
              <button class="icon-btn" id="btn-logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="desktop-content ${stato.titoloSelezionato ? 'with-panel' : ''}">
            <div class="desktop-body">
              ${mainContent}
              <input type="file" id="file-csv" accept=".csv,.xls,.xlsx,.txt" style="display:none">
            </div>
            ${stato.titoloSelezionato ? `
              <div class="detail-col">
                <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:.85rem 1.2rem;border-bottom:1px solid var(--border);
                  background:#fff;flex-shrink:0">
                  <span style="font-size:.85rem;font-weight:700;color:#1A2B4B">
                    ${stato.titoloSelezionato.categoria}
                  </span>
                  <button class="btn-edit ${stato.editMode ? 'active' : ''}" id="btn-toggle-edit-panel">
                    ${stato.editMode ? 'Salva' : 'Modifica'}
                  </button>
                </div>
                ${renderDettaglio(stato.titoloSelezionato)}
              </div>` : ''}
          </div>
        </div>`;
    } else {
      let mainContent = '';
      switch (stato.schermata) {
        case 'home':         mainContent = renderHome();         break;
        case 'portafoglio':  mainContent = renderPortafoglio();  break;
        case 'conto':        mainContent = renderConto();        break;
        case 'impostazioni': mainContent = renderImpostazioni(); break;
      }

      if (stato.titoloSelezionato) {
        html = `
          <div style="flex:1;overflow-y:auto;background:#F5F7FA">
            <div style="display:flex;justify-content:space-between;align-items:center;
              padding:env(safe-area-inset-top,44px) 1.2rem 1rem;
              background:#fff;border-bottom:1px solid #F3F4F6">
              <button class="icon-btn-light" id="btn-chiudi-dettaglio">
                <i class="bi bi-chevron-left" style="font-size:1.1rem;color:#1A2B4B"></i>
              </button>
              <span style="font-size:.95rem;font-weight:700;color:#1A2B4B">${stato.titoloSelezionato.categoria}</span>
              <button class="btn-edit ${stato.editMode ? 'active' : ''}" id="btn-toggle-edit-header">
                ${stato.editMode ? 'Salva' : 'Modifica'}
              </button>
            </div>
            ${renderDettaglio(stato.titoloSelezionato)}
          </div>`;
      } else {
        html = `
          <div style="flex:1;overflow-y:auto;overflow-x:hidden;background:#F5F7FA;-webkit-overflow-scrolling:touch">
            ${mainContent}
          </div>
          ${renderBottomNav()}`;
      }
    }

    root.innerHTML = html;
    bindEvents(desktop);
  }

  // ── EVENT BINDING ─────────────────────────────────────────────────────────

  function bindLogin() {
    document.getElementById('btn-login')?.addEventListener('click', async () => {
      const r = await Auth.login(); if (r.ok) await avvia();
    });
    document.getElementById('btn-biometric')?.addEventListener('click', async () => {
      const bio = await Auth.authenticateWithBiometric();
      if (bio.ok) { const r = await Auth.login(); if (r.ok) await avvia(); }
    });
  }

  function salvaTitoloAction() {
    const t = stato.titoloSelezionato;
    if (!t) return;
    const idx = stato.dati.titoli.findIndex(x => x.id === t.id);
    if (idx < 0) return;
    const nome   = document.getElementById('det-nome')?.value;
    const qty    = parseFloat(document.getElementById('det-qty')?.value);
    const carico = parseFloat(document.getElementById('det-carico')?.value);
    const ticker = document.getElementById('det-ticker')?.value;
    const isin   = document.getElementById('det-isin')?.value;
    const wkn    = document.getElementById('det-wkn')?.value;
    const prezzo = parseFloat(document.getElementById('det-prezzo')?.value);
    const note   = document.getElementById('det-note')?.value;
    if (nome)              stato.dati.titoli[idx].nome           = nome;
    if (!isNaN(qty))       stato.dati.titoli[idx].quantita       = qty;
    if (!isNaN(carico))    stato.dati.titoli[idx].prezzo_carico  = carico;
    if (ticker !== undefined) stato.dati.titoli[idx].ticker      = ticker;
    if (isin   !== undefined) stato.dati.titoli[idx].isin        = isin;
    if (wkn    !== undefined) stato.dati.titoli[idx].wkn         = wkn;
    if (!isNaN(prezzo))    stato.dati.titoli[idx].prezzo_attuale = prezzo;
    if (note   !== undefined) stato.dati.titoli[idx].note        = note;
    aggiornaStato();
    Drive.salvaConDebounce(stato.dati);
    stato.titoloSelezionato = stato.titoli.find(x => x.id === t.id);
    stato.editMode = false;
    render();
  }

  function bindEvents(isDesktop) {
    // Tab nav
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });

    // Titoli click
    document.querySelectorAll('.titolo-card-new, .titolo-row').forEach(el => {
      el.addEventListener('click', () => openS(el.dataset.id));
    });

    // Chiudi dettaglio
    document.getElementById('btn-chiudi-dettaglio')?.addEventListener('click', () => back());

    // ── MODIFICA — gestisce sia header che panel ──────────────────────────
    ['btn-toggle-edit-header', 'btn-toggle-edit-panel'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        if (stato.editMode) salvaTitoloAction();
        else { stato.editMode = true; render(); }
      });
    });

    // Elimina titolo
    document.getElementById('btn-elimina-titolo')?.addEventListener('click', async () => {
      const titoloId = stato.titoloSelezionato?.id;
      if (!titoloId) return;
      const ok = await UI.confirm(`Vuoi eliminare "${stato.titoloSelezionato?.nome}" dal portafoglio?`, {
        titolo: 'Elimina titolo',
        icona: 'bi-trash3-fill',
        colore: '#DC2626',
        labelOk: 'Elimina',
        pericoloso: true
      });
      if (!ok) return;
      stato.dati.titoli = stato.dati.titoli.filter(t => t.id !== titoloId);
      aggiornaStato();
      Drive.salvaConDebounce(stato.dati);
      stato.titoloSelezionato = null;
      render();
    });

    // Aggiorna prezzi — lega tutti i bottoni di aggiornamento
    document.querySelectorAll('[data-action="aggiorna"]').forEach(btn => {
      btn.addEventListener('click', aggiornaPrezzi);
    });

    // Aggiungi titolo
    document.getElementById('btn-aggiungi')?.addEventListener('click', mostraFormNuovoTitolo);
    document.getElementById('btn-aggiungi-home')?.addEventListener('click', mostraFormNuovoTitolo);

    // CSV
    document.getElementById('btn-importa-csv')?.addEventListener('click', () => {
      document.getElementById('file-csv')?.click();
    });
    document.getElementById('file-csv')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const conti = stato.dati.conti || [];
      const contoId = stato.contoSelezionato || conti[0]?.id;
      const conto = conti.find(c => c.id === contoId);
      if (!conto) return;
      const result = await Import.importaFile(file, conto.movimenti);
      if (result.ok) {
        conto.movimenti.push(...result.movimenti);
        aggiornaStato(); Drive.salvaConDebounce(stato.dati);
        render();
        UI.toast(`${result.nuovi} movimenti importati${result.duplicati > 0 ? `, ${result.duplicati} duplicati saltati` : ''}`, { tipo: 'ok' });
      } else {
        await UI.alert(`Impossibile importare il file.\n\n${result.error}`, { titolo: 'Errore importazione', icona: 'bi-exclamation-triangle-fill', colore: '#DC2626' });
      }
    });

    // Click su transazione → modifica
    document.querySelectorAll('.tx-cliccabile').forEach(el => {
      el.addEventListener('click', () => {
        mostraFormEditMovimento(el.dataset.movId, el.dataset.contoId);
      });
    });

    // Selettore tab conto
    document.querySelectorAll('.btn-conto-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        stato.contoSelezionato = btn.dataset.contoId;
        render();
      });
    });

    // Impostazioni conto
    document.getElementById('btn-impostazioni-conto')?.addEventListener('click', mostraFormImpostazioniConto);

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());
    document.getElementById('btn-logout-settings')?.addEventListener('click', async () => {
      const ok = await UI.confirm('Vuoi disconnetterti dall\'app?', {
        titolo: 'Esci',
        icona: 'bi-box-arrow-right',
        labelOk: 'Esci',
        labelAnnulla: 'Rimani'
      });
      if (ok) Auth.logout();
    });

    // Acquista / Vendi titolo
    document.getElementById('btn-acquista-titolo')?.addEventListener('click', (e) => {
      const t = stato.titoloSelezionato;
      if (!t) return;
      mostraFormAcquistaVendi(t, 'acquisto');
    });
    document.getElementById('btn-vendi-titolo')?.addEventListener('click', (e) => {
      const t = stato.titoloSelezionato;
      if (!t) return;
      mostraFormAcquistaVendi(t, 'vendita');
    });

    // Aggiungi movimento
    document.getElementById('btn-aggiungi-movimento')?.addEventListener('click', mostraFormNuovoMovimento);

    // ── WALLET handlers ───────────────────────────────────────────────────

    // Pulsante "Sync Wallet" nella sezione Conto
    document.getElementById('btn-wallet-sync')?.addEventListener('click', sincronizzaWallet);

    // Pulsante "Connetti Wallet" (non ancora configurato)
    document.getElementById('btn-wallet-setup')?.addEventListener('click', () => setTab('impostazioni'));

    // Verifica token e seleziona conto
    document.getElementById('btn-wallet-verifica')?.addEventListener('click', async () => {
      const token = document.getElementById('wallet-token')?.value.trim();
      if (!token) {
        await UI.alert('Incolla il token API di BudgetBakers nel campo sopra.', { titolo: 'Token mancante', icona: 'bi-exclamation-circle-fill', colore: '#D97706' });
        return;
      }
      UI.toast('Connessione in corso…', { tipo: 'info', durata: 4000 });
      try {
        const conti = await Wallet.fetchConti(token);
        if (!conti || conti.length === 0) {
          await UI.alert('Nessun conto trovato. Verifica che l\'app Wallet sia sincronizzata.', { titolo: 'Nessun conto', icona: 'bi-exclamation-triangle-fill', colore: '#D97706' });
          return;
        }
        Wallet.salvaToken(token);
        await mostraSelezioneConto(conti);
      } catch (e) {
        await UI.alert(`Errore: ${e.message}`, { titolo: 'Connessione fallita', icona: 'bi-exclamation-triangle-fill', colore: '#DC2626' });
      }
    });

    // Reset connessione Wallet
    document.getElementById('btn-wallet-reset')?.addEventListener('click', async () => {
      const ok = await UI.confirm('Disconnettere BudgetBakers Wallet?', {
        titolo: 'Disconnetti Wallet', icona: 'bi-wallet2', colore: '#DC2626',
        labelOk: 'Disconnetti', pericoloso: true
      });
      if (!ok) return;
      localStorage.removeItem('pf_wallet_token');
      localStorage.removeItem('pf_wallet_account_id');
      localStorage.removeItem('pf_wallet_last_sync');
      render();
    });

    // Cambio conto
    document.getElementById('btn-wallet-cambia-conto')?.addEventListener('click', async () => {
      try {
        const conti = await Wallet.fetchConti(Wallet.getToken());
        await mostraSelezioneConto(conti);
      } catch (e) {
        await UI.alert(`Errore: ${e.message}`, { titolo: 'Errore', icona: 'bi-exclamation-triangle-fill', colore: '#DC2626' });
      }
    });

    // Mostra nome conto selezionato nella sezione impostazioni
    const lblConto = document.getElementById('wallet-account-label');
    if (lblConto && Wallet.isConfigurato()) {
      Wallet.fetchConti(Wallet.getToken())
        .then(conti => {
          const c = conti.find(x => x.id === Wallet.getAccountId());
          lblConto.textContent = c ? `${c.nome} (${c.valuta})` : 'Conto sconosciuto';
        })
        .catch(() => { lblConto.textContent = 'Errore caricamento'; });
    }

    // Storico titolo
    document.getElementById('btn-storico-titolo')?.addEventListener('click', async () => {
      const t = stato.titoloSelezionato;
      if (!t) return;
      const righe = (t.storico_prezzi || []).slice(-10).reverse()
        .map(p => `${Fmt.data(p.data)}: € ${Fmt.prezzo(p.prezzo, t.categoria)}`).join('\n');
      await UI.alert(
        righe || 'Nessuno storico disponibile per questo titolo.',
        { titolo: `Ultime quotazioni — ${t.nome}`, icona: 'bi-clock-history', colore: '#1A2B4B' }
      );
    });

    // Drive info
    document.getElementById('btn-drive-info')?.addEventListener('click', async () => {
      const id = localStorage.getItem('pf_drive_file_id');
      await UI.alert(
        id ? `ID file: ${id}` : 'Il file non è ancora stato salvato.',
        { titolo: 'portafoglio.json su Drive', icona: 'bi-cloud-fill', colore: '#2563EB' }
      );
    });

    document.getElementById('btn-drive-backup-info')?.addEventListener('click', async () => {
      const id = localStorage.getItem('pf_backup_file_id');
      await UI.alert(
        id ? `ID file: ${id}` : 'Nessun backup ancora creato.\nViene creato automaticamente al primo salvataggio.',
        { titolo: 'portafoglio-backup.json su Drive', icona: 'bi-cloud-check-fill', colore: '#16A34A' }
      );
    });

    document.getElementById('btn-ripristina-backup')?.addEventListener('click', async () => {
      const ok = await UI.confirm(
        'I dati attuali verranno sostituiti con l\'ultima versione di backup.\nQuesta operazione non è reversibile.',
        { titolo: 'Ripristina dal backup', icona: 'bi-arrow-counterclockwise', colore: '#D97706', labelOk: 'Ripristina', pericoloso: false }
      );
      if (!ok) return;
      try {
        const backup = await Drive.leggiBackup();
        if (!backup) {
          await UI.alert('Nessun backup disponibile su Google Drive.', { titolo: 'Backup non trovato', icona: 'bi-cloud-slash-fill', colore: '#DC2626' });
          return;
        }
        stato.dati = backup;
        aggiornaStato();
        await Drive.scrivi(stato.dati);
        render();
        UI.toast('Ripristino completato', { tipo: 'ok' });
      } catch (err) {
        await UI.alert(`Si è verificato un errore: ${err.message}`, { titolo: 'Errore ripristino', icona: 'bi-exclamation-triangle-fill', colore: '#DC2626' });
      }
    });
  }

  // ── FORM NUOVO TITOLO (3 step) ────────────────────────────────────────────

  function mostraFormNuovoTitolo() {
    // Stato interno del form
    const form = { step: 1, categoria: 'Azioni', nome: '', ticker: '', isin: '', wkn: '', fonte: 'yahoo', qty: '', prezzoUnit: '', comm: '', bollo: '', altro: '', dataAcquisto: oggi() };

    const categorie = [
      { id: 'Azioni',       icon: 'bi-graph-up-arrow', bg: '#EBF3FF', fg: '#2563EB' },
      { id: 'Fondi',        icon: 'bi-briefcase',      bg: '#F3F0FF', fg: '#7C3AED' },
      { id: 'Certificates', icon: 'bi-bank',           bg: '#FFF7ED', fg: '#D97706' },
      { id: 'Polizze Vita', icon: 'bi-shield-check',   bg: '#FFF7ED', fg: '#D97706' },
      { id: 'PIR',          icon: 'bi-leaf',           bg: '#F0FDF4', fg: '#16A34A' }
    ];

    function fontiPerCategoria(cat) {
      if (cat === 'Certificates') return [
        { val: 'zonebourse', nome: 'ZoneBourse', sub: 'Per certificati strutturati' },
        { val: 'manuale',    nome: 'Manuale',    sub: 'Aggiornamento manuale' }
      ];
      if (cat === 'Polizze Vita') return [
        { val: 'manuale', nome: 'Manuale', sub: 'Aggiornamento manuale' }
      ];
      return [
        { val: 'yahoo',   nome: 'Yahoo Finance', sub: 'Azioni, ETF, Fondi .FZ' },
        { val: 'manuale', nome: 'Manuale',        sub: 'Aggiornamento manuale' }
      ];
    }

    function calcolaCarico() {
      const qty   = parseFloat(form.qty)       || 0;
      const punit = parseFloat(form.prezzoUnit) || 0;
      const comm  = parseFloat(form.comm)       || 0;
      const bollo = parseFloat(form.bollo)      || 0;
      const altro = parseFloat(form.altro)      || 0;
      const totale = qty * punit + comm + bollo + altro;
      const carico = qty > 0 ? totale / qty : 0;
      return { totale, carico, spese: comm + bollo + altro };
    }

    function steps() {
      return `<div style="display:flex;gap:5px;padding:12px 18px 0">
        ${[1,2,3].map(i => `<div style="height:3px;border-radius:2px;flex:1;background:${i < form.step ? '#1A2B4B' : i === form.step ? '#2563EB' : '#E2E5EF'}"></div>`).join('')}
      </div>`;
    }

    function renderStep1() {
      return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0">
        <span style="font-size:1.1rem;font-weight:700;color:#1A2B4B">Nuovo titolo</span>
        <button id="fm-chiudi" style="width:28px;height:28px;border-radius:50%;background:#F0F2F7;border:none;cursor:pointer;color:#6B7280;display:flex;align-items:center;justify-content:center"><i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i></button>
      </div>
      ${steps()}
      <div style="padding:12px 18px 6px;font-size:.7rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em">Tipo di strumento</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:0 18px">
        ${categorie.map(c => `
          <div class="fm-cat" data-cat="${c.id}" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:14px;border:2px solid ${form.categoria===c.id ? c.fg : 'transparent'};background:${form.categoria===c.id ? c.bg : '#F7F8FB'};cursor:pointer">
            <div style="width:34px;height:34px;border-radius:10px;background:${c.bg};display:flex;align-items:center;justify-content:center;font-size:1rem"><i class="bi ${c.icon}" style="color:${c.fg}"></i></div>
            <span style="font-size:.65rem;font-weight:600;color:${form.categoria===c.id ? c.fg : '#6B7280'};text-align:center;line-height:1.2">${c.id}</span>
          </div>`).join('')}
      </div>
      <div style="padding:14px 18px">
        <button id="fm-next1" style="width:100%;padding:13px;background:#1A2B4B;color:#fff;border:none;border-radius:100px;font-family:inherit;font-size:.95rem;font-weight:700;cursor:pointer">
          Continua →
        </button>
      </div>`;
    }

    function renderStep2() {
      const { totale, carico, spese } = calcolaCarico();
      const fonti = fontiPerCategoria(form.categoria);
      if (!form.fonte || !fonti.find(f => f.val === form.fonte)) form.fonte = fonti[0].val;
      const isFondi = ['Fondi','PIR'].includes(form.categoria);
      const isManuale = form.fonte === 'manuale';

      return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0">
        <button id="fm-back2" style="background:none;border:none;color:#9CA3AF;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:3px"><i class="bi bi-chevron-left" style="font-size:.85rem"></i> Indietro</button>
        <span style="font-size:1rem;font-weight:700;color:#1A2B4B">${form.categoria}</span>
        <button id="fm-chiudi" style="width:28px;height:28px;border-radius:50%;background:#F0F2F7;border:none;cursor:pointer;color:#6B7280;display:flex;align-items:center;justify-content:center"><i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i></button>
      </div>
      ${steps()}
      <div style="padding:10px 18px 0;overflow-y:auto;max-height:460px">

        <!-- Identificazione strumento -->
        <div style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Identificazione</div>

        <div style="margin-bottom:8px">
          <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">Nome</label>
          <input id="fm-nome" placeholder="${isFondi ? 'es. Fondo Emerging Markets' : 'es. STMicroelectronics NV'}"
            value="${form.nome}"
            style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none">
        </div>

        ${!isManuale ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">Ticker</label>
            <input id="fm-ticker" placeholder="${isFondi ? 'es. 0P0001SB0C.FZ' : 'es. STMPA.PA'}" value="${form.ticker}"
              style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none">
          </div>
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">ISIN</label>
            <input id="fm-isin" placeholder="es. FR0000130809" value="${form.isin}"
              style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none">
          </div>
        </div>
        <div style="margin-bottom:8px">
          <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">WKN <span style="font-weight:400;text-transform:none;letter-spacing:0">(opzionale)</span></label>
          <input id="fm-wkn" placeholder="es. 893647" value="${form.wkn}"
            style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none">
        </div>` : ''}

        <!-- Operazione -->
        <div style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin:10px 0 6px">Operazione</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">${isFondi ? 'Quote' : 'Quantità'}</label>
            <input id="fm-qty" type="number" step="any" placeholder="0" value="${form.qty}"
              style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none;text-align:center">
          </div>
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">Prezzo unit. €</label>
            <input id="fm-punit" type="number" step="any" placeholder="0,00" value="${form.prezzoUnit}"
              style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none;text-align:center">
          </div>
        </div>

        <div style="margin-bottom:8px">
          <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">Data acquisto</label>
          <input id="fm-data" type="date" value="${form.dataAcquisto}"
            style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none">
        </div>

        <!-- Costi aggiuntivi (sempre visibili) -->
        <div style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin:10px 0 6px">Costi aggiuntivi</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:8px">
          <div>
            <label style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Commissioni €</label>
            <input id="fm-comm" type="number" step="any" placeholder="0,00" value="${form.comm}"
              style="width:100%;padding:10px 8px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.8rem;color:#1A2B4B;outline:none;text-align:center">
          </div>
          <div>
            <label style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Bollo €</label>
            <input id="fm-bollo" type="number" step="any" placeholder="0,00" value="${form.bollo}"
              style="width:100%;padding:10px 8px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.8rem;color:#1A2B4B;outline:none;text-align:center">
          </div>
          <div>
            <label style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Altro €</label>
            <input id="fm-altro" type="number" step="any" placeholder="0,00" value="${form.altro}"
              style="width:100%;padding:10px 8px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.8rem;color:#1A2B4B;outline:none;text-align:center">
          </div>
        </div>

        <!-- Carico calcolato -->
        <div style="background:linear-gradient(135deg,#1A2B4B 0%,#2563EB 100%);border-radius:14px;padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:.62rem;font-weight:700;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.08em">Carico medio</div>
            <div class="carico-live" style="font-size:1.1rem;font-weight:800;color:#fff;margin-top:2px;font-family:inherit">${carico > 0 ? '€ ' + carico.toFixed(4).replace('.',',') : '—'}</div>
            <div style="font-size:.62rem;color:rgba(255,255,255,.5);margin-top:1px">per ${['Azioni','Certificates'].includes(form.categoria) ? 'azione' : 'quota'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.62rem;color:rgba(255,255,255,.55);font-weight:600">Totale pagato</div>
            <div style="font-size:.95rem;font-weight:700;color:rgba(255,255,255,.9);margin-top:2px;font-family:inherit">${totale > 0 ? '€ ' + totale.toFixed(2).replace('.',',') : '—'}</div>
          </div>
        </div>

        <!-- Fonte prezzi -->
        ${fonti.length > 1 ? `
        <div style="margin-bottom:10px">
          <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;display:block">Fonte prezzi</label>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${fonti.map(f => `
              <div class="fm-fonte" data-fonte="${f.val}" style="display:flex;align-items:center;gap:9px;padding:10px 12px;border:1.5px solid ${form.fonte===f.val ? '#2563EB' : '#E2E5EF'};border-radius:12px;cursor:pointer;background:${form.fonte===f.val ? '#EBF0FF' : '#fff'}">
                <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${form.fonte===f.val ? '#2563EB' : '#D1D5DB'};background:${form.fonte===f.val ? '#2563EB' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${form.fonte===f.val ? '<div style="width:5px;height:5px;border-radius:50%;background:#fff"></div>' : ''}
                </div>
                <div>
                  <div style="font-size:.82rem;font-weight:600;color:#1A2B4B">${f.nome}</div>
                  <div style="font-size:.68rem;color:#9CA3AF">${f.sub}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}

      </div>
      <div style="padding:10px 18px 14px">
        <button id="fm-next2" style="width:100%;padding:13px;background:#1A2B4B;color:#fff;border:none;border-radius:100px;font-family:inherit;font-size:.95rem;font-weight:700;cursor:pointer">Continua →</button>
        <span id="fm-chiudi2" style="display:block;text-align:center;margin-top:8px;font-size:.8rem;color:#9CA3AF;font-weight:500;cursor:pointer">Annulla</span>
      </div>`;
    }

    function renderStep3() {
      const { totale, carico, spese } = calcolaCarico();
      const isAz = ['Azioni','Certificates'].includes(form.categoria);
      const cat = categorie.find(c => c.id === form.categoria);
      return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0">
        <button id="fm-back3" style="background:none;border:none;color:#9CA3AF;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:3px"><i class="bi bi-chevron-left" style="font-size:.85rem"></i> Indietro</button>
        <span style="font-size:1rem;font-weight:700;color:#1A2B4B">Riepilogo</span>
        <button id="fm-chiudi" style="width:28px;height:28px;border-radius:50%;background:#F0F2F7;border:none;cursor:pointer;color:#6B7280;display:flex;align-items:center;justify-content:center"><i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i></button>
      </div>
      ${steps()}
      <div style="padding:12px 18px 0;overflow-y:auto;max-height:460px">

        <!-- Badge titolo -->
        <div style="display:flex;align-items:center;gap:10px;background:#F7F8FB;border-radius:14px;padding:12px;margin-bottom:14px">
          <div style="width:40px;height:40px;border-radius:12px;background:${cat?.bg||'#EBF3FF'};display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:800;color:${cat?.fg||'#2563EB'};flex-shrink:0">
            ${(form.ticker?.split('.')[0] || form.nome.split('.')[0] || form.categoria.substring(0,3)).toUpperCase().substring(0,4)}
          </div>
          <div>
            <div style="font-size:.9rem;font-weight:700;color:#1A2B4B">${form.nome || '—'}</div>
            <div style="font-size:.72rem;color:#9CA3AF;margin-top:2px">${form.categoria} · ${form.fonte === 'yahoo' ? 'Yahoo Finance' : form.fonte === 'zonebourse' ? 'ZoneBourse' : 'Manuale'}</div>
          </div>
        </div>

        ${[
          ['Data acquisto',     form.dataAcquisto ? Fmt.data(form.dataAcquisto) : '—'],
          ['Quantità',          `${form.qty || '—'} ${isAz ? 'pz' : 'quote'}`],
          ['Prezzo unitario',   form.prezzoUnit ? `€ ${parseFloat(form.prezzoUnit).toFixed(2).replace('.',',')}` : '—'],
          ...(form.ticker ? [['Ticker', form.ticker]] : []),
          ...(form.isin   ? [['ISIN',   form.isin]]   : []),
          ...(form.wkn    ? [['WKN',    form.wkn]]    : []),
          ...(parseFloat(form.comm)  > 0 ? [['Commissioni banca',  `€ ${parseFloat(form.comm).toFixed(2).replace('.',',')}`]] : []),
          ...(parseFloat(form.bollo) > 0 ? [['Bollo / tasse',      `€ ${parseFloat(form.bollo).toFixed(2).replace('.',',')}`]] : []),
          ...(parseFloat(form.altro) > 0 ? [['Altre spese',        `€ ${parseFloat(form.altro).toFixed(2).replace('.',',')}`]] : []),
          ['Totale pagato',     totale > 0 ? `€ ${totale.toFixed(2).replace('.',',')}` : '—'],
        ].map(([lbl, val]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #F0F2F7">
            <span style="font-size:.82rem;color:#9CA3AF;font-weight:500">${lbl}</span>
            <span style="font-size:.88rem;font-weight:700;color:#1A2B4B;font-family:monospace">${val}</span>
          </div>`).join('')}

        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
          <span style="font-size:.9rem;font-weight:700;color:#1A2B4B">Carico medio calcolato</span>
          <span style="font-size:1rem;font-weight:800;color:#2563EB;font-family:monospace">${carico > 0 ? '€ ' + carico.toFixed(4).replace('.',',') : '—'}</span>
        </div>

        ${carico > 0 ? `
        <div style="padding:10px 12px;background:#F0FDF4;border-radius:12px;display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
          <i class="bi bi-check-circle-fill" style="font-size:.95rem;color:#16A34A;flex-shrink:0"></i>
          <p style="font-size:.75rem;color:#16A34A;font-weight:500;line-height:1.4">G/P calcolato su <strong>€ ${carico.toFixed(4).replace('.',',')} </strong> per ${isAz ? 'azione' : 'quota'}, inclusi tutti i costi.</p>
        </div>` : ''}

      </div>
      <div style="padding:10px 18px 14px">
        <button id="fm-salva" style="width:100%;padding:13px;background:#1A2B4B;color:#fff;border:none;border-radius:100px;font-family:inherit;font-size:.95rem;font-weight:700;cursor:pointer">✓ Aggiungi al portafoglio</button>
        <span id="fm-chiudi2" style="display:block;text-align:center;margin-top:8px;font-size:.8rem;color:#9CA3AF;font-weight:500;cursor:pointer">Annulla</span>
      </div>`;
    }

    function chiudi() { document.getElementById('modal-nuovo')?.remove(); }

    function aggiornaDatiStep2() {
      const get = id => document.getElementById(id);
      if (get('fm-nome'))   form.nome       = get('fm-nome').value;
      if (get('fm-ticker')) form.ticker      = get('fm-ticker').value;
      if (get('fm-isin'))   form.isin        = get('fm-isin').value;
      if (get('fm-wkn'))    form.wkn         = get('fm-wkn').value;
      if (get('fm-qty'))    form.qty         = get('fm-qty').value;
      if (get('fm-punit'))  form.prezzoUnit  = get('fm-punit').value;
      if (get('fm-data'))   form.dataAcquisto = get('fm-data').value;
      if (get('fm-comm'))   form.comm        = get('fm-comm').value;
      if (get('fm-bollo'))  form.bollo       = get('fm-bollo').value;
      if (get('fm-altro'))  form.altro       = get('fm-altro').value;
    }

    function renderModal() {
      let contenuto = '';
      if (form.step === 1) contenuto = renderStep1();
      else if (form.step === 2) contenuto = renderStep2();
      else contenuto = renderStep3();

      const existing = document.getElementById('modal-nuovo');
      if (existing) {
        existing.querySelector('.modal-sheet').innerHTML = contenuto;
      } else {
        document.body.insertAdjacentHTML('beforeend', `
          <div id="modal-nuovo" style="position:fixed;inset:0;background:rgba(0,0,0,.5);
            display:flex;align-items:${window.innerWidth>=768?'center':'flex-end'};justify-content:center;z-index:1000">
            <div class="modal-sheet" style="background:#fff;border-radius:${window.innerWidth>=768?'20px':'24px 24px 0 0'};
              width:100%;max-width:480px;margin:0 auto;
              padding-bottom:${window.innerWidth>=768?'0':'env(safe-area-inset-bottom)'}">
              ${contenuto}
            </div>
          </div>`);
      }
      bindModal();
    }

    function bindModal() {
      // Chiudi
      document.querySelectorAll('#fm-chiudi, #fm-chiudi2').forEach(b => b.onclick = chiudi);

      // Step 1 — selezione categoria
      document.querySelectorAll('.fm-cat').forEach(chip => {
        chip.onclick = () => { form.categoria = chip.dataset.cat; form.fonte = ''; renderModal(); };
      });
      document.getElementById('fm-next1')?.addEventListener('click', () => { form.step = 2; renderModal(); });

      // Step 2 — dati
      document.getElementById('fm-back2')?.addEventListener('click', () => { form.step = 1; renderModal(); });
      document.querySelectorAll('.fm-fonte').forEach(opt => {
        opt.onclick = () => { aggiornaDatiStep2(); form.fonte = opt.dataset.fonte; renderModal(); };
      });
      // Ricalcola carico in tempo reale
      ['fm-qty','fm-punit','fm-comm','fm-bollo','fm-altro'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
          form.qty        = document.getElementById('fm-qty')?.value   || '';
          form.prezzoUnit = document.getElementById('fm-punit')?.value || '';
          form.comm       = document.getElementById('fm-comm')?.value  || '';
          form.bollo      = document.getElementById('fm-bollo')?.value || '';
          form.altro      = document.getElementById('fm-altro')?.value || '';
          const { totale, carico } = calcolaCarico();
          const box = document.querySelector('#modal-nuovo .carico-live');
          if (box) box.textContent = carico > 0 ? '€ ' + carico.toFixed(4).replace('.',',') : '—';
        });
      });
      document.getElementById('fm-next2')?.addEventListener('click', async () => {
        aggiornaDatiStep2();
        if (!form.nome.trim()) {
          await UI.alert('Inserisci il nome del titolo prima di continuare.', { titolo: 'Campo obbligatorio', icona: 'bi-exclamation-circle-fill', colore: '#D97706' });
          return;
        }
        if (form.fonte !== 'manuale' && !form.ticker.trim() && !form.isin.trim()) {
          await UI.alert('Inserisci almeno il Ticker o l\'ISIN per il recupero automatico dei prezzi.', { titolo: 'Campo obbligatorio', icona: 'bi-exclamation-circle-fill', colore: '#D97706' });
          return;
        }
        form.step = 3; renderModal();
      });

      // Step 3 — salva
      document.getElementById('fm-back3')?.addEventListener('click', () => { form.step = 2; renderModal(); });
      document.getElementById('fm-salva')?.addEventListener('click', () => {
        const { carico } = calcolaCarico();
        const qty = parseFloat(form.qty) || null;
        stato.dati.titoli.push({
          id:                `titolo-${Date.now()}`,
          nome:              form.nome.trim(),
          categoria:         form.categoria,
          ticker:            form.fonte !== 'manuale' ? (form.ticker.trim() || null) : null,
          isin:              form.isin.trim() || null,
          wkn:               form.wkn.trim()  || null,
          fonte_prezzi:      form.fonte,
          quantita:          qty,
          prezzo_carico:     carico,
          data_acquisto:     form.dataAcquisto || oggi(),
          prezzo_attuale:    null,
          data_ultimo_prezzo: null,
          storico_prezzi:    [],
          note:              ''
        });
        aggiornaStato();
        Drive.salvaConDebounce(stato.dati);
        chiudi();
        render();
      });
    }

    renderModal();
  }

  // ── FORM ACQUISTA / VENDI ────────────────────────────────────────────────

  function mostraFormAcquistaVendi(t, tipo) {
    const isAcquisto = tipo === 'acquisto';
    const c = coloreCategoria(t.categoria);
    const tickerLabel = t.ticker?.split('.')[0] || t.id.substring(0,4).toUpperCase();

    const html = `
    <div id="modal-av" style="position:fixed;inset:0;background:rgba(0,0,0,.5);
      display:flex;align-items:${window.innerWidth>=768?'center':'flex-end'};justify-content:center;z-index:1000">
      <div style="background:#fff;border-radius:${window.innerWidth>=768?'20px':'24px 24px 0 0'};width:100%;max-width:480px;
        margin:0 auto;padding-bottom:${window.innerWidth>=768?'0':'env(safe-area-inset-bottom)'}">

        <!-- Handle (solo mobile) -->
        ${window.innerWidth>=768?'':'<div style="width:36px;height:4px;background:#E2E5EF;border-radius:2px;margin:10px auto 0"></div>'}

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0">
          <span style="font-size:1rem;font-weight:700;color:#1A2B4B">
            ${isAcquisto ? '<i class="bi bi-graph-up-arrow"></i> Acquisto' : '<i class="bi bi-graph-down-arrow"></i> Vendita'}
          </span>
          <button id="av-chiudi" style="width:28px;height:28px;border-radius:50%;background:#F0F2F7;border:none;cursor:pointer;color:#6B7280;display:flex;align-items:center;justify-content:center"><i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i></button>
        </div>

        <!-- Titolo info -->
        <div style="display:flex;align-items:center;gap:9px;margin:12px 18px;
          background:#F7F8FB;border-radius:13px;padding:11px 13px">
          <div style="width:36px;height:36px;border-radius:10px;background:${c.bg};
            display:flex;align-items:center;justify-content:center;
            font-size:.6rem;font-weight:800;color:${c.fg};flex-shrink:0">${tickerLabel}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600;color:#1A2B4B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.nome}</div>
            <div style="font-size:.72rem;color:#9CA3AF;margin-top:1px">
              Posizione attuale: ${t.quantita ? Fmt.qty(t.quantita, t.categoria) + ' ' + Fmt.unita(t.categoria) : '—'} · carico ${Fmt.prezzo(t.prezzo_carico, t.categoria)}
            </div>
          </div>
        </div>

        <!-- Campi -->
        <div style="padding:0 18px">
          <div style="margin-bottom:11px">
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">Data operazione</label>
            <input id="av-data" type="date" value="${oggi()}"
              style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:11px">
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">Quantità</label>
              <input id="av-qty" type="number" step="any" placeholder="0"
                style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none;text-align:center">
            </div>
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;display:block">Prezzo unit. €</label>
              <input id="av-prezzo" type="number" step="any" placeholder="0,00"
                style="width:100%;padding:11px 12px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.9rem;color:#1A2B4B;outline:none;text-align:center">
            </div>
          </div>
          ${isAcquisto ? `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:11px">
            <div>
              <label style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Commissioni €</label>
              <input id="av-comm" type="number" step="any" placeholder="0,00" value="0"
                style="width:100%;padding:10px 8px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.8rem;color:#1A2B4B;outline:none;text-align:center">
            </div>
            <div>
              <label style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Bollo €</label>
              <input id="av-bollo" type="number" step="any" placeholder="0,00" value="0"
                style="width:100%;padding:10px 8px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.8rem;color:#1A2B4B;outline:none;text-align:center">
            </div>
            <div>
              <label style="font-size:.6rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Altro €</label>
              <input id="av-altro" type="number" step="any" placeholder="0,00" value="0"
                style="width:100%;padding:10px 8px;border:1.5px solid #E2E5EF;border-radius:12px;font-family:inherit;font-size:.8rem;color:#1A2B4B;outline:none;text-align:center">
            </div>
          </div>` : ''}
        </div>

        <!-- CTA -->
        <div style="padding:4px 18px 14px">
          <button id="av-salva" style="width:100%;padding:13px;background:${isAcquisto ? '#16A34A' : '#DC2626'};
            color:#fff;border:none;border-radius:100px;font-family:inherit;
            font-size:.95rem;font-weight:700;cursor:pointer">
            ${isAcquisto ? '<i class="bi bi-check-lg"></i> Registra acquisto' : '<i class="bi bi-check-lg"></i> Registra vendita'}
          </button>
          <span id="av-chiudi2" style="display:block;text-align:center;margin-top:8px;
            font-size:.8rem;color:#9CA3AF;font-weight:500;cursor:pointer">Annulla</span>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    const chiudi = () => document.getElementById('modal-av')?.remove();
    document.getElementById('av-chiudi').onclick  = chiudi;
    document.getElementById('av-chiudi2').onclick = chiudi;

    document.getElementById('av-salva').onclick = async () => {
      const qty    = parseFloat(document.getElementById('av-qty')?.value);
      const prezzo = parseFloat(document.getElementById('av-prezzo')?.value);
      const data   = document.getElementById('av-data')?.value;

      if (isNaN(qty) || qty <= 0 || isNaN(prezzo)) {
        await UI.alert('Inserisci una quantità maggiore di zero e un prezzo valido.', { titolo: 'Dati non validi', icona: 'bi-exclamation-circle-fill', colore: '#D97706' });
        return;
      }

      const idx = stato.dati.titoli.findIndex(x => x.id === t.id);
      if (idx < 0) return;

      const comm  = parseFloat(document.getElementById('av-comm')?.value)  || 0;
      const bollo = parseFloat(document.getElementById('av-bollo')?.value) || 0;
      const altro = parseFloat(document.getElementById('av-altro')?.value) || 0;

      const qtyAttuale    = stato.dati.titoli[idx].quantita    || 0;
      const caricoAttuale = stato.dati.titoli[idx].prezzo_carico || 0;

      if (isAcquisto) {
        const costoAttuale = qtyAttuale * caricoAttuale;
        const costoNuovo   = qty * prezzo + comm + bollo + altro;
        const nuovaQty     = qtyAttuale + qty;
        const nuovoCarico  = nuovaQty > 0 ? (costoAttuale + costoNuovo) / nuovaQty : 0;
        stato.dati.titoli[idx].quantita     = nuovaQty;
        stato.dati.titoli[idx].prezzo_carico = nuovoCarico;
      } else {
        const nuovaQty = qtyAttuale - qty;
        if (nuovaQty < 0) {
          await UI.alert('La quantità venduta supera la posizione attuale.', { titolo: 'Quantità non valida', icona: 'bi-exclamation-circle-fill', colore: '#DC2626' });
          return;
        }
        stato.dati.titoli[idx].quantita = nuovaQty;
      }

      // Registra movimento sul conto investimenti
      const contoInvId = stato.dati.meta?.conto_investimenti_id || stato.dati.conti?.[0]?.id;
      const contoInv = (stato.dati.conti || []).find(c => c.id === contoInvId);
      if (contoInv) {
        const importoMov = isAcquisto
          ? -(qty * prezzo + comm + bollo + altro)   // uscita: pagato per acquisto
          : +(qty * prezzo - comm - bollo - altro);   // entrata: incassato da vendita
        contoInv.movimenti.push({
          id:        `mov-inv-${Date.now()}`,
          data,
          desc:      `${isAcquisto ? 'Acquisto' : 'Vendita'} ${t.nome} (${qty} ${t.quantita != null ? 'pz' : 'quote'} × ${Fmt.prezzo(prezzo, t.categoria)})`,
          categoria: isAcquisto ? 'Investimento' : 'Disinvestimento',
          importo:   importoMov,
          importato: false,
          fonte:     'portafoglio'
        });
      }

      aggiornaStato();
      Drive.salvaConDebounce(stato.dati);
      stato.titoloSelezionato = stato.titoli.find(x => x.id === t.id);
      chiudi();
      render();
    };
  }

  // ── FORM NUOVO MOVIMENTO ──────────────────────────────────────────────────

  function mostraFormNuovoMovimento() {
    const conti = stato.dati?.conti || [];
    const contoAttivo = stato.contoSelezionato || conti[0]?.id;
    const html = `
    <div class="modal-overlay" id="modal-mov">
      <div class="modal">
        <h3>Nuovo movimento</h3>
        ${conti.length > 1 ? `
        <label>Conto
          <select id="m-conto">
            ${conti.map(c => `<option value="${c.id}" ${c.id === contoAttivo ? 'selected' : ''}>${c.nome}</option>`).join('')}
          </select>
        </label>` : ''}
        <label>Descrizione *<input id="m-desc" placeholder="es. Stipendio"></label>
        <label>Data<input id="m-data" type="date" value="${oggi()}"></label>
        <label>Categoria<input id="m-cat" placeholder="es. Stipendio, Spesa, Bollette"></label>
        <label>Tipo
          <select id="m-tipo"><option value="1">Entrata (+)</option><option value="-1">Uscita (–)</option></select>
        </label>
        <label>Importo €<input id="m-importo" type="number" step="0.01" placeholder="0.00"></label>
        <div class="modal-actions">
          <button class="btn-primary" id="m-salva">Aggiungi</button>
          <button class="btn-secondary" id="m-annulla">Annulla</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('m-annulla').onclick = () => document.getElementById('modal-mov').remove();
    document.getElementById('m-salva').onclick = async () => {
      const desc    = document.getElementById('m-desc').value.trim();
      const importo = parseFloat(document.getElementById('m-importo').value);
      const tipo    = parseFloat(document.getElementById('m-tipo').value);
      const cat     = document.getElementById('m-cat')?.value.trim() || '';
      const contoId = document.getElementById('m-conto')?.value || contoAttivo;
      if (!desc || isNaN(importo)) {
        await UI.alert('Compila la descrizione e l\'importo prima di salvare.', { titolo: 'Campi obbligatori', icona: 'bi-exclamation-circle-fill', colore: '#D97706' });
        return;
      }
      const conto = stato.dati.conti.find(c => c.id === contoId);
      if (!conto) return;
      conto.movimenti.push({
        id: `mov-${Date.now()}`,
        data: document.getElementById('m-data').value,
        desc,
        categoria: cat,
        importo: Math.abs(importo) * tipo
      });
      aggiornaStato(); Drive.salvaConDebounce(stato.dati);
      document.getElementById('modal-mov').remove(); render();
      UI.toast('Movimento aggiunto', { tipo: 'ok' });
    };
  }

  // ── MODIFICA / CANCELLA MOVIMENTO ─────────────────────────────────────────

  function mostraFormEditMovimento(movId, contoId) {
    const conto = stato.dati.conti.find(c => c.id === contoId);
    const m = conto?.movimenti.find(x => x.id === movId);
    if (!m) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,.55);
      display:flex;align-items:${_isMD()?'center':'flex-end'};justify-content:center;z-index:9000;
      backdrop-filter:blur(2px);animation:uiFadeIn .15s ease`;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:${_isMD()?'20px':'24px 24px 0 0'};width:100%;max-width:420px;
        padding-bottom:${_isMD()?'1.2rem':'calc(1.2rem + env(safe-area-inset-bottom))'};animation:uiSlideUp .2s cubic-bezier(.32,1,.28,1)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:1.2rem 1.2rem .8rem">
          <span style="font-size:1rem;font-weight:700;color:#1A2B4B">Modifica movimento</span>
          <button id="em-chiudi" style="width:28px;height:28px;border-radius:50%;background:#F0F2F7;border:none;cursor:pointer">
            <i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i>
          </button>
        </div>
        <div style="padding:0 1.2rem;display:flex;flex-direction:column;gap:.7rem">
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Descrizione</label>
            <input id="em-desc" value="${m.desc || ''}"
              style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Data</label>
              <input id="em-data" type="date" value="${m.data || oggi()}"
                style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
            </div>
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Importo €</label>
              <input id="em-importo" type="number" step="0.01" value="${Math.abs(m.importo || 0)}"
                style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none;text-align:right">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Tipo</label>
              <select id="em-tipo" style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
                <option value="1" ${m.importo >= 0 ? 'selected' : ''}>Entrata (+)</option>
                <option value="-1" ${m.importo < 0 ? 'selected' : ''}>Uscita (–)</option>
              </select>
            </div>
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Categoria</label>
              <input id="em-cat" value="${m.categoria || ''}" placeholder="opzionale"
                style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
            </div>
          </div>

          <!-- Toggle Trasferimento -->
          <div id="em-trasf-box" style="display:flex;align-items:flex-start;gap:.8rem;padding:.8rem;
            border-radius:12px;cursor:pointer;
            background:${m.tipo === 'trasferimento' ? 'rgba(59,130,246,.08)' : '#F8F9FB'};
            border:1.5px solid ${m.tipo === 'trasferimento' ? '#2563EB' : '#F0F2F7'}">
            <input type="checkbox" id="em-trasferimento" ${m.tipo === 'trasferimento' ? 'checked' : ''}
              style="width:17px;height:17px;margin-top:2px;cursor:pointer;accent-color:#2563EB;flex-shrink:0">
            <div>
              <div style="font-size:.82rem;font-weight:700;color:#1A2B4B">Trasferimento tra conti</div>
              <div style="font-size:.72rem;color:#6B7280;margin-top:2px;line-height:1.4">
                Es. "ADD. E/C CARTA" o pagamento della carta di credito.<br>
                Viene escluso dal calcolo del patrimonio per evitare il doppio conteggio.
              </div>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:.5rem;padding-top:.3rem">
            <button id="em-salva" style="width:100%;padding:.85rem;background:#1A2B4B;color:#fff;border:none;border-radius:100px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">Salva modifiche</button>
            <button id="em-elimina" style="width:100%;padding:.85rem;background:rgba(220,38,38,.08);color:#DC2626;border:none;border-radius:100px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">
              <i class="bi bi-trash3"></i> Elimina movimento
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const chiudi = () => overlay.remove();
    overlay.querySelector('#em-chiudi').onclick = chiudi;
    overlay.onclick = e => { if (e.target === overlay) chiudi(); };

    overlay.querySelector('#em-salva').onclick = () => {
      const desc       = overlay.querySelector('#em-desc').value.trim();
      const importo    = parseFloat(overlay.querySelector('#em-importo').value);
      const tipoSign   = parseFloat(overlay.querySelector('#em-tipo').value);
      const cat        = overlay.querySelector('#em-cat').value.trim();
      const data       = overlay.querySelector('#em-data').value;
      const isTrasf    = overlay.querySelector('#em-trasferimento').checked;
      if (!desc || isNaN(importo)) { UI.alert('Compila tutti i campi.', { titolo: 'Attenzione', colore: '#D97706' }); return; }
      const idx = conto.movimenti.findIndex(x => x.id === movId);
      if (idx >= 0) {
        conto.movimenti[idx] = {
          ...conto.movimenti[idx],
          desc, data, categoria: cat,
          importo: Math.abs(importo) * tipoSign,
          tipo: isTrasf ? 'trasferimento' : undefined
        };
        // Rimuovi tipo se non è trasferimento
        if (!isTrasf) delete conto.movimenti[idx].tipo;
      }
      aggiornaStato(); Drive.salvaConDebounce(stato.dati);
      chiudi(); render();
      UI.toast('Movimento aggiornato', { tipo: 'ok' });
    };

    overlay.querySelector('#em-elimina').onclick = async () => {
      const ok = await UI.confirm(`Eliminare il movimento "${m.desc}"?`, {
        titolo: 'Elimina movimento', icona: 'bi-trash3-fill',
        colore: '#DC2626', labelOk: 'Elimina', pericoloso: true
      });
      if (!ok) return;
      conto.movimenti = conto.movimenti.filter(x => x.id !== movId);
      aggiornaStato(); Drive.salvaConDebounce(stato.dati);
      chiudi(); render();
      UI.toast('Movimento eliminato', { tipo: 'ok' });
    };
  }

  // ── IMPOSTAZIONI CONTO (saldo iniziale, wallet, nuovo conto) ─────────────

  function mostraFormImpostazioniConto() {
    const conti = stato.dati?.conti || [];
    const contoId = stato.contoSelezionato || conti[0]?.id;
    const conto = conti.find(c => c.id === contoId) || conti[0];
    if (!conto) return;

    const walletConti = Wallet.isConfigurato();

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,.55);
      display:flex;align-items:${_isMD()?'center':'flex-end'};justify-content:center;z-index:9000;
      backdrop-filter:blur(2px);animation:uiFadeIn .15s ease`;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;
        padding-bottom:calc(1.2rem + env(safe-area-inset-bottom));animation:uiSlideUp .2s cubic-bezier(.32,1,.28,1)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:1.2rem 1.2rem .8rem">
          <span style="font-size:1rem;font-weight:700;color:#1A2B4B">Impostazioni — ${conto.nome}</span>
          <button id="ic-chiudi" style="width:28px;height:28px;border-radius:50%;background:#F0F2F7;border:none;cursor:pointer">
            <i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i>
          </button>
        </div>
        <div style="padding:0 1.2rem;overflow-y:auto;max-height:70vh;display:flex;flex-direction:column;gap:.8rem">

          <!-- Nome conto -->
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Nome conto</label>
            <input id="ic-nome" value="${conto.nome}"
              style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
          </div>

          <!-- Tipo conto -->
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Tipo</label>
            <select id="ic-tipo" style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
              <option value="corrente" ${conto.tipo === 'corrente' ? 'selected' : ''}>Conto corrente</option>
              <option value="carta" ${conto.tipo === 'carta' ? 'selected' : ''}>Carta di credito</option>
              <option value="risparmio" ${conto.tipo === 'risparmio' ? 'selected' : ''}>Conto risparmio</option>
              <option value="altro" ${conto.tipo === 'altro' ? 'selected' : ''}>Altro</option>
            </select>
          </div>

          <!-- Giacenza iniziale -->
          <div style="background:#F8F9FB;border-radius:14px;padding:1rem">
            <p style="font-size:.78rem;font-weight:700;color:#1A2B4B;margin-bottom:.6rem">
              <i class="bi bi-bank" style="color:#2563EB"></i> Giacenza iniziale
            </p>
            <p style="font-size:.75rem;color:#6B7280;margin-bottom:.7rem">
              Imposta il saldo reale del conto in una data di riferimento. L'app calcolerà il saldo attuale sommando i movimenti successivi.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
              <div>
                <label style="font-size:.62rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Saldo iniziale €</label>
                <input id="ic-saldo" type="number" step="0.01" value="${conto.saldo_iniziale || 0}"
                  style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none;text-align:right">
              </div>
              <div>
                <label style="font-size:.62rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:block">Data riferimento</label>
                <input id="ic-data-saldo" type="date" value="${conto.data_saldo_iniziale || oggi()}"
                  style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
              </div>
            </div>
          </div>

          <!-- Collegamento Wallet -->
          ${walletConti ? `
          <div style="background:#F8F9FB;border-radius:14px;padding:1rem">
            <p style="font-size:.78rem;font-weight:700;color:#1A2B4B;margin-bottom:.4rem">
              <i class="bi bi-wallet2" style="color:#2563EB"></i> Collegamento BudgetBakers
            </p>
            <p style="font-size:.75rem;color:#6B7280;margin-bottom:.6rem">
              Incolla l'ID del conto Wallet da sincronizzare con questo conto.
            </p>
            <input id="ic-wallet-id" value="${conto.wallet_account_id || ''}"
              placeholder="es. 71806ebc-e336-4612-a947-..."
              style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.85rem;outline:none;font-family:monospace">
            <button id="ic-scegli-wallet" style="margin-top:.5rem;width:100%;padding:.6rem;background:#EBF3FF;color:#2563EB;border:none;border-radius:10px;font-family:inherit;font-size:.82rem;font-weight:600;cursor:pointer">
              <i class="bi bi-list-ul"></i> Scegli dalla lista conti Wallet
            </button>
          </div>` : ''}

          <!-- Conto investimenti -->
          <div style="display:flex;align-items:center;justify-content:space-between;background:#F8F9FB;border-radius:14px;padding:.8rem 1rem">
            <div>
              <p style="font-size:.82rem;font-weight:600;color:#1A2B4B">Conto investimenti</p>
              <p style="font-size:.72rem;color:#9CA3AF">Acquisti/vendite titoli usano questo conto</p>
            </div>
            <input type="checkbox" id="ic-investimenti" ${stato.dati.meta.conto_investimenti_id === conto.id ? 'checked' : ''}
              style="width:18px;height:18px;cursor:pointer;accent-color:#2563EB">
          </div>

          <button id="ic-salva" style="width:100%;padding:.85rem;background:#1A2B4B;color:#fff;border:none;border-radius:100px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">
            Salva impostazioni
          </button>

          ${conti.length > 1 ? `
          <button id="ic-elimina-conto" style="width:100%;padding:.85rem;background:rgba(220,38,38,.08);color:#DC2626;border:none;border-radius:100px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">
            <i class="bi bi-trash3"></i> Elimina questo conto
          </button>` : ''}

          <button id="ic-nuovo-conto" style="width:100%;padding:.85rem;background:#F0FDF4;color:#16A34A;border:none;border-radius:100px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">
            <i class="bi bi-plus-circle"></i> Aggiungi nuovo conto
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const chiudi = () => overlay.remove();
    overlay.querySelector('#ic-chiudi').onclick = chiudi;
    overlay.onclick = e => { if (e.target === overlay) chiudi(); };

    // Scegli conto Wallet dalla lista
    overlay.querySelector('#ic-scegli-wallet')?.addEventListener('click', async () => {
      try {
        const walletContiLista = await Wallet.fetchConti(Wallet.getToken());
        const opzioni = walletContiLista.map(wc =>
          `<div class="wallet-conto-sel" data-wallet-id="${wc.id}"
            style="padding:10px 14px;border:1.5px solid #E2E5EF;border-radius:12px;cursor:pointer;margin-bottom:6px">
            <div style="font-size:.85rem;font-weight:600;color:#1A2B4B">${wc.nome}</div>
            <div style="font-size:.72rem;color:#9CA3AF">${wc.tipo} · ${wc.valuta}</div>
            <div style="font-size:.65rem;color:#9CA3AF;font-family:monospace;margin-top:2px">${wc.id}</div>
          </div>`
        ).join('');
        const sel = document.createElement('div');
        sel.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,.7);display:flex;align-items:${_isMD()?'center':'flex-end'};justify-content:center;z-index:9100;backdrop-filter:blur(2px)`;
        sel.innerHTML = `<div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding:1.2rem;max-height:60vh;overflow-y:auto;padding-bottom:calc(1.2rem + env(safe-area-inset-bottom))">
          <p style="font-size:.95rem;font-weight:700;color:#1A2B4B;margin-bottom:.8rem">Seleziona conto Wallet</p>
          ${opzioni}
        </div>`;
        document.body.appendChild(sel);
        sel.querySelectorAll('.wallet-conto-sel').forEach(el => {
          el.onclick = () => {
            overlay.querySelector('#ic-wallet-id').value = el.dataset.walletId;
            sel.remove();
          };
        });
        sel.onclick = e => { if (e.target === sel) sel.remove(); };
      } catch (e) {
        await UI.alert('Errore nel recupero dei conti Wallet: ' + e.message, { colore: '#DC2626' });
      }
    });

    overlay.querySelector('#ic-salva').onclick = () => {
      const idx = stato.dati.conti.findIndex(c => c.id === conto.id);
      if (idx < 0) return;
      stato.dati.conti[idx].nome              = overlay.querySelector('#ic-nome').value.trim() || conto.nome;
      stato.dati.conti[idx].tipo              = overlay.querySelector('#ic-tipo').value;
      stato.dati.conti[idx].saldo_iniziale    = parseFloat(overlay.querySelector('#ic-saldo').value) || 0;
      stato.dati.conti[idx].data_saldo_iniziale = overlay.querySelector('#ic-data-saldo').value;
      const walletId = overlay.querySelector('#ic-wallet-id')?.value.trim();
      if (walletId !== undefined) stato.dati.conti[idx].wallet_account_id = walletId;
      if (overlay.querySelector('#ic-investimenti')?.checked) {
        stato.dati.meta.conto_investimenti_id = conto.id;
      }
      aggiornaStato(); Drive.salvaConDebounce(stato.dati);
      chiudi(); render();
      UI.toast('Impostazioni conto salvate', { tipo: 'ok' });
    };

    overlay.querySelector('#ic-elimina-conto')?.addEventListener('click', async () => {
      const ok = await UI.confirm(`Eliminare il conto "${conto.nome}" e tutti i suoi movimenti?`, {
        titolo: 'Elimina conto', icona: 'bi-trash3-fill', colore: '#DC2626',
        labelOk: 'Elimina', pericoloso: true
      });
      if (!ok) return;
      stato.dati.conti = stato.dati.conti.filter(c => c.id !== conto.id);
      stato.contoSelezionato = stato.dati.conti[0]?.id || null;
      aggiornaStato(); Drive.salvaConDebounce(stato.dati);
      chiudi(); render();
    });

    overlay.querySelector('#ic-nuovo-conto').onclick = () => {
      chiudi();
      mostraFormNuovoConto();
    };
  }

  // ── NUOVO CONTO ───────────────────────────────────────────────────────────

  function mostraFormNuovoConto() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,.55);
      display:flex;align-items:${_isMD()?'center':'flex-end'};justify-content:center;z-index:9000;
      backdrop-filter:blur(2px);animation:uiFadeIn .15s ease`;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:${_isMD()?'20px':'24px 24px 0 0'};width:100%;max-width:420px;
        padding-bottom:${_isMD()?'1.2rem':'calc(1.2rem + env(safe-area-inset-bottom))'};animation:uiSlideUp .2s cubic-bezier(.32,1,.28,1)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:1.2rem 1.2rem .8rem">
          <span style="font-size:1rem;font-weight:700;color:#1A2B4B">Nuovo conto</span>
          <button id="nc-chiudi" style="width:28px;height:28px;border-radius:50%;background:#F0F2F7;border:none;cursor:pointer">
            <i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i>
          </button>
        </div>
        <div style="padding:0 1.2rem;display:flex;flex-direction:column;gap:.7rem">
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Nome *</label>
            <input id="nc-nome" placeholder="es. Carta di Credito"
              style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
          </div>
          <div>
            <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Tipo</label>
            <select id="nc-tipo" style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
              <option value="corrente">Conto corrente</option>
              <option value="carta">Carta di credito</option>
              <option value="risparmio">Conto risparmio</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Saldo iniziale €</label>
              <input id="nc-saldo" type="number" step="0.01" placeholder="0.00"
                style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none;text-align:right">
            </div>
            <div>
              <label style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;display:block">Data</label>
              <input id="nc-data-saldo" type="date" value="${oggi()}"
                style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E5EF;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none">
            </div>
          </div>
          <button id="nc-salva" style="width:100%;padding:.85rem;background:#1A2B4B;color:#fff;border:none;border-radius:100px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer">
            Crea conto
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const chiudi = () => overlay.remove();
    overlay.querySelector('#nc-chiudi').onclick = chiudi;
    overlay.onclick = e => { if (e.target === overlay) chiudi(); };

    overlay.querySelector('#nc-salva').onclick = async () => {
      const nome = overlay.querySelector('#nc-nome').value.trim();
      if (!nome) {
        await UI.alert('Inserisci un nome per il conto.', { titolo: 'Campo obbligatorio', colore: '#D97706' });
        return;
      }
      const nuovoConto = {
        id:                  `conto-${Date.now()}`,
        nome,
        tipo:                overlay.querySelector('#nc-tipo').value,
        wallet_account_id:   '',
        saldo_iniziale:      parseFloat(overlay.querySelector('#nc-saldo').value) || 0,
        data_saldo_iniziale: overlay.querySelector('#nc-data-saldo').value,
        movimenti:           []
      };
      stato.dati.conti.push(nuovoConto);
      stato.contoSelezionato = nuovoConto.id;
      aggiornaStato(); Drive.salvaConDebounce(stato.dati);
      chiudi(); render();
      UI.toast(`Conto "${nome}" creato`, { tipo: 'ok' });
    };
  }

  // ── AGGIORNA PREZZI ───────────────────────────────────────────────────────

  // ── SINCRONIZZAZIONE WALLET ───────────────────────────────────────────────

  async function sincronizzaWallet() {
    if (!Wallet.isConfigurato()) { setTab('impostazioni'); return; }

    const contiDaSinc = (stato.dati.conti || []).filter(c => c.wallet_account_id);
    if (contiDaSinc.length === 0) {
      await UI.alert(
        'Nessun conto ha un ID Wallet configurato.\nVai in Impostazioni conto → Collegamento BudgetBakers.',
        { titolo: 'Nessun conto collegato', icona: 'bi-wallet2', colore: '#D97706' }
      );
      return;
    }

    UI.toast(`Sincronizzazione ${contiDaSinc.length} conto/i in corso…`, { tipo: 'info', durata: 6000 });
    try {
      let totNuovi = 0, totDupl = 0;
      for (const conto of contiDaSinc) {
        const result = await Wallet.sincronizzaConto(conto, conto.movimenti);
        if (result.nuovi > 0) {
          conto.movimenti.push(...result.movimenti);
          totNuovi += result.nuovi;
          totDupl  += result.duplicati;
        }
      }
      aggiornaStato();
      Drive.salvaConDebounce(stato.dati);
      render();
      if (totNuovi > 0) {
        UI.toast(`${totNuovi} movimenti importati${totDupl > 0 ? `, ${totDupl} già presenti` : ''}`, { tipo: 'ok' });
      } else {
        UI.toast('Nessun nuovo movimento da sincronizzare', { tipo: 'info' });
      }
    } catch (e) {
      await UI.alert(`Errore durante la sincronizzazione:\n${e.message}`, {
        titolo: 'Sync Wallet fallita', icona: 'bi-exclamation-triangle-fill', colore: '#DC2626'
      });
    }
  }

  // ── SELEZIONE CONTO WALLET ────────────────────────────────────────────────

  async function mostraSelezioneConto(conti) {
    return new Promise(resolve => {
      const opzioni = conti.map(c =>
        `<div class="wallet-conto" data-id="${c.id}"
          style="display:flex;justify-content:space-between;align-items:center;
          padding:11px 14px;border:1.5px solid ${Wallet.getAccountId() === c.id ? '#2563EB' : '#E2E5EF'};
          border-radius:12px;cursor:pointer;margin-bottom:6px;
          background:${Wallet.getAccountId() === c.id ? '#EBF0FF' : '#fff'}">
          <div>
            <div style="font-size:.88rem;font-weight:600;color:#1A2B4B">${c.nome}</div>
            <div style="font-size:.72rem;color:#9CA3AF;margin-top:2px">${c.tipo || ''} · ${c.valuta}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.88rem;font-weight:700;color:#1A2B4B">
              ${c.valuta} ${typeof c.saldo === 'number' ? c.saldo.toFixed(2).replace('.',',') : '—'}
            </div>
            ${Wallet.getAccountId() === c.id
              ? `<div style="font-size:.65rem;color:#2563EB;font-weight:700">✓ Selezionato</div>`
              : ''}
          </div>
        </div>`
      ).join('');

      const overlay = document.createElement('div');
      overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,.55);
        display:flex;align-items:${_isMD()?'center':'flex-end'};justify-content:center;z-index:9000;
        backdrop-filter:blur(2px);animation:uiFadeIn .15s ease`;
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:420px;
          padding:0 0 calc(1.2rem + env(safe-area-inset-bottom));
          animation:uiSlideUp .2s cubic-bezier(.32,1,.28,1)">
          <div style="padding:1.2rem 1.2rem .8rem;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:1rem;font-weight:700;color:#1A2B4B">Seleziona conto</span>
            <button id="wc-chiudi" style="width:28px;height:28px;border-radius:50%;
              background:#F0F2F7;border:none;cursor:pointer">
              <i class="bi bi-x" style="font-size:1rem;color:#6B7280"></i>
            </button>
          </div>
          <div style="padding:0 1.2rem;max-height:50vh;overflow-y:auto">${opzioni}</div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelectorAll('.wallet-conto').forEach(el => {
        el.addEventListener('click', () => {
          Wallet.salvaAccountId(el.dataset.id);
          overlay.remove();
          render();
          UI.toast('Conto selezionato', { tipo: 'ok' });
          resolve();
        });
      });
      overlay.querySelector('#wc-chiudi').onclick = () => { overlay.remove(); resolve(); };
      overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); resolve(); } };
    });
  }

  async function aggiornaPrezzi() {
    if (stato.aggiornando) return;
    stato.aggiornando = true; render();
    try {
      const risultati = await Prezzi.aggiornaTutti(stato.dati.titoli);
      stato.dati.titoli = Prezzi.applicaPrezzi(stato.dati.titoli, risultati);
      stato.dati.meta.ultimo_aggiornamento_prezzi = new Date().toISOString();
      aggiornaStato();
      // Rinnova il token se scaduto prima di scrivere su Drive
      await Auth.ensureValidToken();
      await Drive.scrivi(stato.dati);
    } catch (err) {
      console.error('Errore aggiornamento prezzi:', err);
    } finally {
      stato.aggiornando = false; render();
    }
  }

  // ── CALCOLI ───────────────────────────────────────────────────────────────

  function aggiornaStato() {
    stato.titoli = Prezzi.calcolaPortafoglio(stato.dati.titoli);
    stato.totali = Prezzi.calcolaTotali(stato.titoli, stato.dati.conti);
  }

  // ── AVVIO ─────────────────────────────────────────────────────────────────

  async function avvia() {
    initHistory();
    render(); // schermata di caricamento
    try {
      let dati = await Drive.leggi();
      if (!dati) { dati = Drive.portafoglioVuoto(); await Drive.scrivi(dati); }
      stato.dati = dati;
      aggiornaStato();
      const ultimoAgg = stato.dati.meta?.ultimo_aggiornamento_prezzi?.split('T')[0];
      if (ultimoAgg !== oggi()) {
        await aggiornaPrezzi(); // gestisce i propri render interni
      } else {
        render(); // dati già aggiornati, mostra subito
      }
    } catch (err) {
      stato.errore = err.message;
      console.error('Errore avvio:', err);
      render(); // mostra schermata errore
    }
  }

  async function reset() {
    stato = { dati: null, titoli: [], totali: {}, schermata: 'home',
              titoloSelezionato: null, contoSelezionato: null,
              editMode: false, aggiornando: false, errore: null };
    render();
  }

  function setTab(tab) {
    stato.schermata = tab; stato.titoloSelezionato = null;
    stato.editMode = false; pushHistory(tab); render();
  }

  function openS(id) {
    stato.titoloSelezionato = stato.titoli.find(t => t.id === id) || null;
    stato.editMode = false; pushHistory('dettaglio'); render();
  }

  function back() { stato.titoloSelezionato = null; stato.editMode = false; render(); }

  async function chiediRegistrazioneBiometrica() {
    return UI.confirm('Vuoi usare l\'impronta digitale per accedere più rapidamente la prossima volta?', {
      titolo: 'Accesso biometrico',
      icona: 'bi-fingerprint',
      colore: '#2563EB',
      labelOk: 'Attiva',
      labelAnnulla: 'Non ora'
    });
  }

  return { avvia, reset, render, setTab, openS, back, chiediRegistrazioneBiometrica, get stato() { return stato; } };
})();
