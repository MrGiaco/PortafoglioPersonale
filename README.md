/* =============================================
   PORTAFOGLIO PERSONALE — app.js
   Logica principale: navigazione, modali,
   toast, report, service worker
   ============================================= */

// =============================================
// APP
// =============================================

const App = (() => {

  const SECTIONS = ['dashboard', 'conto', 'carta', 'investimenti', 'report', 'impostazioni'];
  let currentSection = 'dashboard';

  const $ = id => document.getElementById(id);

  // ---- Init (chiamato dopo unlock) ----
  async function init() {
    const el = $('dashDate');
    if (el) el.textContent = new Date().toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // Carica dati locali
    Drive.loadLocal();

    // Tenta connessione automatica Drive (disabilitata, carica solo locale)
    await Drive.tryAutoConnect();

    // Inizializza grafici
    Charts.init();

    // Popola anni report
    populateReportAnni();

    // Aggiornamento quotazioni automatico
    setTimeout(() => Quotes.refreshAll(), 2000);

    // Hash navigation
    handleHash();

    // Aggiornamento periodico ogni 5 minuti
    setInterval(() => {
      if (!Auth.isLocked()) Quotes.refreshAll();
    }, 5 * 60 * 1000);
  }

  // ---- Navigazione ----
  function navigate(section) {
    if (!SECTIONS.includes(section)) return;
    currentSection = section;

    // Sezioni
    SECTIONS.forEach(s => {
      const el = $(`section-${s}`);
      if (el) {
        el.classList.toggle('active', s === section);
        el.classList.toggle('hidden', s !== section);
      }
    });

    // Nav items sidebar + tab bar
    document.querySelectorAll('[data-section]').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    // Topbar: saluto su dashboard, titolo sulle altre
    const greeting = $('topbarGreeting');
    const titleEl  = $('topbarTitle');
    const isDash   = section === 'dashboard';
    greeting?.classList.toggle('hidden', !isDash);
    titleEl?.classList.toggle('hidden', isDash);
    const titles = {
      conto:         'Conto Corrente',
      carta:         'Carta di Credito',
      investimenti:  'Investimenti',
      report:        'Report',
      impostazioni:  'Impostazioni',
    };
    if (titleEl) titleEl.textContent = titles[section] || '';

    // FAB icona contestuale
    const fabIcons = {
      dashboard:    'bi-plus-lg',
      conto:        'bi-plus-lg',
      carta:        'bi-plus-lg',
      investimenti: 'bi-plus-lg',
      report:       'bi-download',
      impostazioni: '',
    };
    const fab = $('fabBtn');
    if (fab) {
      fab.classList.toggle('hidden', section === 'impostazioni');
      fab.innerHTML = `<i class="bi ${fabIcons[section] || 'bi-plus-lg'}"></i>`;
    }

    // Chiudi sidebar su mobile
    closeSidebar();

    // Azioni specifiche per sezione
    if (section === 'report')        Report.render();
    if (section === 'impostazioni')  renderImpostazioni();
    if (section === 'investimenti')  Portfolio.renderInvestimenti();

    // Aggiorna hash URL
    window.location.hash = section;
  }

  function handleHash() {
    const hash = window.location.hash.replace('#', '');
    if (SECTIONS.includes(hash)) navigate(hash);
    else navigate('dashboard');
  }

  // ---- FAB contestuale per sezione ----
  function fabAction() {
    const fabMap = {
      dashboard:    'nuovoMovimento',
      conto:        'nuovoMovimento',
      carta:        'nuovaSpesaCarta',
      investimenti: 'nuovoTitolo',
      report:       null,
      impostazioni: null,
    };
    const modalId = fabMap[currentSection];
    if (modalId) {
      Modals.open(modalId);
    } else if (currentSection === 'report') {
      Report.export();
    }
  }

  // ---- Sidebar ----
  function toggleSidebar() {
    const sidebar = $('sidebar');
    const overlay = $('sidebarOverlay');
    const isOpen  = sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open', !isOpen);
    overlay?.classList.toggle('hidden', isOpen);
  }

  function closeSidebar() {
    $('sidebar')?.classList.remove('open');
    $('sidebarOverlay')?.classList.add('hidden');
  }

  // ---- Impostazioni ----
  function renderImpostazioni() {
    const bioEnabled = localStorage.getItem('pp_bio_enabled') === 'true';
    const bioLabel   = $('bioToggleLabel');
    if (bioLabel) bioLabel.textContent = bioEnabled ? 'Disabilita Biometria' : 'Abilita Biometria';

    const last = $('lastQuoteUpdate');
    const ts   = localStorage.getItem('pp_last_quote_ts');
    if (last && ts) last.textContent = `Ultimo aggiornamento: ${new Date(parseInt(ts)).toLocaleString('it-IT')}`;

    const d = Portfolio.getData().carta;
    const fields = {
      ccHolderInput:    d.holder,
      ccLastInput:      d.lastDigits,
      ccExpiryInput:    d.expiry,
      ccPlafondInput:   d.plafond,
      ccGiornoAddebito: d.giornoAddebito,
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = $(id); if (el) el.value = val || '';
    });
  }

  // ---- Toast ----
  function showToast(msg, type = 'info', duration = 3500) {
    const icons = {
      success: 'bi-check-circle-fill',
      error:   'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info:    'bi-info-circle-fill',
    };
    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = '.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ---- Loading ----
  function showLoading(show) {
    $('loadingSpinner')?.classList.toggle('hidden', !show);
  }

  // ---- Export / Import dati ----
  function exportData() {
    Drive.exportBackup(Portfolio.getData());
    showToast('Backup esportato', 'success');
  }

  async function importData() {
    try {
      await Drive.importBackup();
      Portfolio.renderAll();
      Charts.updateAll();
    } catch (e) {
      // già gestito in drive.js
    }
  }

  // ---- Reset app ----
  function resetApp() {
    if (!confirm('Sei sicuro di voler cancellare tutti i dati locali? Questa azione è irreversibile.')) return;
    const keysToKeep = ['pp_pin_hash', 'pp_bio_enabled', 'pp_bio_cred_id'];
    Object.keys(localStorage).forEach(k => {
      if (!keysToKeep.includes(k)) localStorage.removeItem(k);
    });
    showToast('App reimpostata. Ricaricamento...', 'info');
    setTimeout(() => location.reload(), 1500);
  }

  // ---- API pubblica ----
  return {
    init, navigate, toggleSidebar, closeSidebar,
    showToast, showLoading,
    exportData, importData, resetApp,
    fabAction,
  };

})();

// =============================================
// MODALS
// =============================================

const Modals = (() => {

  const $ = id => document.getElementById(id);
  let current = null;

  function open(id) {
    const overlay = $('modalOverlay');
    if (!overlay) return;

    if (current) close();

    prefill(id);

    overlay.classList.remove('hidden');
    const modal = $(`modal-${id}`);
    if (modal) modal.classList.remove('hidden');
    current = id;

    document.body.style.overflow = 'hidden';
  }

  function close() {
    const overlay = $('modalOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    if (current) {
      const modal = $(`modal-${current}`);
      if (modal) modal.classList.add('hidden');
    }
    current = null;
    document.body.style.overflow = '';
  }

  function closeOnOverlay(e) {
    if (e.target.id === 'modalOverlay') close();
  }

  function prefill(id) {
    const today = new Date().toISOString().slice(0, 10);

    if (id === 'nuovoMovimento') {
      const el = $('movData'); if (el) el.value = today;
      const imp = $('movImporto'); if (imp) imp.value = '';
      const desc = $('movDescrizione'); if (desc) desc.value = '';
      const note = $('movNote'); if (note) note.value = '';
      Portfolio.setMovTipo('entrata');
    }

    if (id === 'nuovaSpesaCarta') {
      const el = $('cartaData'); if (el) el.value = today;
      const imp = $('cartaImporto'); if (imp) imp.value = '';
      const desc = $('cartaDescrizione'); if (desc) desc.value = '';
      const d = Portfolio.getData().carta;
      const giorno = d.giornoAddebito || 15;
      const now = new Date();
      let addebito = new Date(now.getFullYear(), now.getMonth(), giorno);
      if (addebito <= now) addebito = new Date(now.getFullYear(), now.getMonth() + 1, giorno);
      const adEl = $('cartaAddebito'); if (adEl) adEl.value = addebito.toISOString().slice(0, 10);
    }

    if (id === 'nuovoTitolo') {
      const today2 = new Date().toISOString().slice(0, 10);
      const el = $('titoloDataAcquisto'); if (el) el.value = today2;
      ['titoloNome','titoloTicker','titoloCodeZB','titoloIsin','titoloWkn','titoloNote'].forEach(f => {
        const e = $(f); if (e) e.value = '';
      });
      ['titoloQuantita','titoloPrezzoAcquisto'].forEach(f => {
        const e = $(f); if (e) e.value = '';
      });
      const cambio = $('titoloCambio'); if (cambio) cambio.value = '1';
      ['titoloCommissioni','titoloTasse','titoloRateo'].forEach(f => {
        const e = $(f); if (e) e.value = '0';
      });
      const valuta = $('titoloValuta'); if (valuta) valuta.value = 'EUR';
      const mercato = $('titoloMercato'); if (mercato) mercato.value = 'MIL';
      Portfolio.wizardReset();
      Portfolio.calcCostoCarico();
      const addebito = $('titoloAddebitoConto'); if (addebito) addebito.checked = true;
    }

    if (id === 'impostazioniCarta') {
      const d = Portfolio.getData().carta;
      const map = {
        ccHolderInput:    d.holder,
        ccLastInput:      d.lastDigits,
        ccExpiryInput:    d.expiry,
        ccPlafondInput:   d.plafond,
        ccGiornoAddebito: d.giornoAddebito,
      };
      Object.entries(map).forEach(([k, v]) => {
        const e = $(k); if (e) e.value = v || '';
      });
    }
  }

  return { open, close, closeOnOverlay };

})();

// =============================================
// REPORT
// =============================================

const Report = (() => {

  const $ = id => document.getElementById(id);

  function render() {
    const anno = $('reportAnno')?.value || new Date().getFullYear();
    Charts.renderEntrateUscite(anno);
    Charts.renderCategorie(anno);
    renderTable(anno);
  }

  function renderTable(anno) {
    const container = $('reportTable');
    if (!container) return;

    const data      = Portfolio.getData();
    const movimenti = (data.conto.movimenti || []).filter(m => m.data?.startsWith(String(anno)));
    const spese     = (data.carta.spese     || []).filter(s => s.data?.startsWith(String(anno)));

    const mesi = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(anno, i, 1);
      return {
        label: d.toLocaleDateString('it-IT', { month: 'long' }),
        ym:    `${anno}-${String(i + 1).padStart(2, '0')}`,
      };
    });

    const header = `
      <div class="report-row report-row--header">
        <span>Mese</span>
        <span>Entrate</span>
        <span>Uscite</span>
        <span>Carta</span>
        <span>Saldo</span>
      </div>`;

    const rows = mesi.map(({ label, ym }) => {
      const entrate = movimenti.filter(m => m.data?.startsWith(ym) && m.tipo === 'entrata').reduce((s, m) => s + m.importo, 0);
      const uscite  = movimenti.filter(m => m.data?.startsWith(ym) && m.tipo === 'uscita').reduce((s, m) => s + m.importo, 0);
      const cartaM  = spese.filter(s => s.data?.startsWith(ym)).reduce((s, sp) => s + sp.importo, 0);
      const saldo   = entrate - uscite - cartaM;
      const cls     = saldo >= 0 ? 'color:var(--success)' : 'color:var(--danger)';
      return `
        <div class="report-row">
          <span style="font-weight:700;text-transform:capitalize">${label}</span>
          <span style="color:var(--success)">${Portfolio.formatEur(entrate)}</span>
          <span style="color:var(--danger)">${Portfolio.formatEur(uscite)}</span>
          <span style="color:var(--danger)">${Portfolio.formatEur(cartaM)}</span>
          <span style="${cls};font-weight:700">${Portfolio.formatEur(saldo)}</span>
        </div>`;
    });

    container.innerHTML = header + rows.join('');
  }

  function exportCSV() {
    const anno = $('reportAnno')?.value || new Date().getFullYear();
    const data = Portfolio.getData();
    const rows = [['Data','Tipo','Descrizione','Categoria','Importo','Note']];

    (data.conto.movimenti || [])
      .filter(m => m.data?.startsWith(String(anno)))
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .forEach(m => rows.push([m.data, m.tipo, m.descrizione, m.categoria, m.importo, m.note || '']));

    (data.carta.spese || [])
      .filter(s => s.data?.startsWith(String(anno)))
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .forEach(s => rows.push([s.data, 'spesa-carta', s.descrizione, s.categoria, -s.importo, s.addebitoData || '']));

    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `portafoglio_${anno}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('CSV esportato', 'success');
  }

  return { render, exportCSV, export: exportCSV };

})();

// =============================================
// UTILITY GLOBALI
// =============================================

function populateReportAnni() {
  const sel = document.getElementById('reportAnno');
  if (!sel) return;
  const now = new Date().getFullYear();
  sel.innerHTML = '';
  for (let y = now; y >= now - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if (y === now) opt.selected = true;
    sel.appendChild(opt);
  }
}

// =============================================
// SERVICE WORKER
// =============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/PortafoglioPersonale/sw.js')
      .then(reg => {
        console.log('SW registrato:', reg.scope);
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data?.type === 'SYNC_QUOTES') Quotes.refreshAll();
        });
      })
      .catch(err => console.warn('SW non registrato:', err));
  });
}

// =============================================
// KEYBOARD SHORTCUTS
// =============================================

document.addEventListener('keydown', e => {
  if (Auth.isLocked()) return;
  if (e.key === 'Escape') Modals.close();
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    Drive.sync();
  }
});

// =============================================
// HASH CHANGE
// =============================================

window.addEventListener('hashchange', () => {
  if (!Auth.isLocked()) {
    const hash = location.hash.replace('#', '');
    App.navigate(hash);
  }
});
