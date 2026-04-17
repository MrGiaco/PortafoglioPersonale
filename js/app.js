/* =============================================
   PORTAFOGLIO PERSONALE — app.js
   Logica principale: navigazione, modali,
   toast, report, service worker
   ============================================= */

// =============================================
// DIALOG (confirm/alert custom, sostituisce nativi)
// =============================================

const Dialog = (() => {

  function _render(html) {
    let overlay = document.getElementById('dialogOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dialogOverlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = html;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    return overlay;
  }

  function _close(overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function confirm(msg, okLabel, cancelLabel) {
    okLabel     = okLabel     || 'Conferma';
    cancelLabel = cancelLabel || 'Annulla';
    return new Promise(resolve => {
      const overlay = _render(
        '<div class="dialog-box">' +
          '<div class="dialog-body">' + msg + '</div>' +
          '<div class="dialog-footer">' +
            '<button class="btn btn--ghost dialog-cancel">' + cancelLabel + '</button>' +
            '<button class="btn btn--primary dialog-ok">' + okLabel + '</button>' +
          '</div>' +
        '</div>'
      );
      overlay.querySelector('.dialog-ok').onclick     = () => { _close(overlay); resolve(true);  };
      overlay.querySelector('.dialog-cancel').onclick = () => { _close(overlay); resolve(false); };
    });
  }

  function confirmDanger(msg, okLabel, cancelLabel) {
    okLabel     = okLabel     || 'Elimina';
    cancelLabel = cancelLabel || 'Annulla';
    return new Promise(resolve => {
      const overlay = _render(
        '<div class="dialog-box">' +
          '<div class="dialog-body">' + msg + '</div>' +
          '<div class="dialog-footer">' +
            '<button class="btn btn--ghost dialog-cancel">' + cancelLabel + '</button>' +
            '<button class="btn btn--danger dialog-ok">' + okLabel + '</button>' +
          '</div>' +
        '</div>'
      );
      overlay.querySelector('.dialog-ok').onclick     = () => { _close(overlay); resolve(true);  };
      overlay.querySelector('.dialog-cancel').onclick = () => { _close(overlay); resolve(false); };
    });
  }

  function alert(msg) {
    return new Promise(resolve => {
      const overlay = _render(
        '<div class="dialog-box">' +
          '<div class="dialog-body">' + msg + '</div>' +
          '<div class="dialog-footer">' +
            '<button class="btn btn--primary dialog-ok" style="width:100%">OK</button>' +
          '</div>' +
        '</div>'
      );
      overlay.querySelector('.dialog-ok').onclick = () => { _close(overlay); resolve(); };
    });
  }

  return { confirm, confirmDanger, alert };

})();

// =============================================
// APP
// =============================================

const App = (() => {

  const SECTIONS = ['dashboard', 'conto', 'carta', 'investimenti', 'dettaglio', 'report', 'impostazioni'];
  let currentSection = 'dashboard';

  const $ = id => document.getElementById(id);

  // ---- Init (chiamato dopo unlock) ----
  // =============================================
  // SWIPE TO DELETE
  // =============================================
  function initSwipe() {
    let startX = 0, startY = 0, currentRow = null;

    document.addEventListener('touchstart', function(e) {
      if (!e.target.closest('.swipe-row')) {
        document.querySelectorAll('.swipe-row.open').forEach(function(r){ r.classList.remove('open'); });
      }
      var target = e.target.closest('.swipe-row');
      if (!target) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentRow = target;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!currentRow) return;
      var dy = Math.abs(e.touches[0].clientY - startY);
      var dx = Math.abs(e.touches[0].clientX - startX);
      if (dy > dx) { currentRow = null; }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (!currentRow) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (dx < -30) {
        document.querySelectorAll('.swipe-row.open').forEach(function(r){
          if (r !== currentRow) r.classList.remove('open');
        });
        currentRow.classList.add('open');
      } else if (dx > 30) {
        currentRow.classList.remove('open');
      }
      currentRow = null;
    }, { passive: true });
  }

  async function init() {
    const el = $('dashDate');
    if (el) el.textContent = new Date().toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // Carica dati locali
    initSwipe();
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

    // Topbar e tabbar: nascoste nel dettaglio (ha la propria topbar)
    const topbar = document.querySelector('.topbar');
    const tabbar = document.querySelector('.tab-bar');
    const isDettaglio = section === 'dettaglio';
    if (topbar) topbar.style.display = isDettaglio ? 'none' : '';
    if (tabbar) tabbar.style.display = isDettaglio ? 'none' : '';

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

    // FAB icona contestuale (nascosto nel dettaglio)
    const fabIcons = {
      dashboard:    'plus',
      conto:        'plus',
      carta:        'plus',
      investimenti: 'plus',
      report:       'download',
      impostazioni: '',
    };
    const fab = $('fabBtn');
    if (fab) {
      fab.classList.toggle('hidden', section === 'impostazioni' || section === 'dettaglio');
      fab.innerHTML = `<i class="ti ti-${fabIcons[section] || 'plus'}"></i>`;
    }

    // Chiudi sidebar su mobile
    closeSidebar();

    // Azioni specifiche per sezione
    if (section === 'report')        Report.render();
    if (section === 'impostazioni')  renderImpostazioni();
    if (section === 'investimenti')  Portfolio.renderInvestimenti();
    if (section === 'conto')         Portfolio.renderConto();
    if (section === 'carta')         Portfolio.renderCarta();
    if (section === 'dashboard')     Portfolio.renderDashboard();

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

    const si = $('contoSaldoIniziale');
    if (si) si.value = Portfolio.getData().conto.saldoIniziale || 0;
  }

  // ---- Toast ----
  function showToast(msg, type = 'info', duration = 3500) {
    const icons = {
      success: 'circle-check',
      error:   'circle-x',
      warning: 'alert-triangle',
      info:    'info-circle',
    };
    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<i class="ti ti-${icons[type] || icons.info}"></i><span>${msg}</span>`;
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

  async function importDaBanca() {
    try {
      const result = await Portfolio.importDaBanca();
      Portfolio.renderAll();
      Charts.updateAll();
      Drive.save(Portfolio.getData());

      let msg = `Importati ${result.importatiConto} movimenti conto, ${result.importatiCarta} spese carta.`;
      if (result.duplicati > 0)  msg += ` (${result.duplicati} duplicati ignorati)`;
      if (result.catNuove.length > 0) msg += ` · Nuove categorie: ${result.catNuove.join(', ')}`;
      showToast(msg, 'success', 6000);

      // Mostra report righe scartate se presenti
      if (result.scartate && result.scartate.length > 0) {
        _mostraReportScartate(result.scartate);
      }
    } catch(e) {
      // già gestito in portfolio.js
    }
  }

  function _mostraReportScartate(scartate) {
    // Separa duplicati dagli errori veri
    const errori    = scartate.filter(function(r){ return r.motivo !== 'Duplicato (già presente)'; });
    const duplicati = scartate.filter(function(r){ return r.motivo === 'Duplicato (già presente)'; });

    let html = '<div style="text-align:left">';
    html += '<div style="font-size:13px;font-weight:700;margin-bottom:12px">';
    html += scartate.length + ' righe non importate';
    html += '</div>';

    if (errori.length > 0) {
      html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:6px">Errori (' + errori.length + ')</div>';
      html += '<div style="max-height:200px;overflow-y:auto;margin-bottom:12px">';
      errori.forEach(function(r) {
        html += '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">';
        html += '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(r.desc) + '</div>';
        if (r.data) html += '<div style="color:var(--text-muted)">' + r.data + '</div>';
        html += '<div style="color:var(--danger);margin-top:2px"><i class="ti ti-alert-triangle"></i> ' + escHtml(r.motivo) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (duplicati.length > 0) {
      html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:6px">Duplicati ignorati (' + duplicati.length + ')</div>';
      html += '<div style="max-height:150px;overflow-y:auto">';
      duplicati.forEach(function(r) {
        html += '<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">';
        html += '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(r.desc) + '</div>';
        if (r.data) html += '<div style="color:var(--text-muted)">' + r.data + (r.importo != null ? ' · ' + r.importo.toFixed(2) + ' €' : '') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    Dialog.alert(html);
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }


  async function cancellaTitoli() {
    const data = Portfolio.getData();
    const n = (data.investimenti.titoli || []).length;
    if (n === 0) { showToast('Nessun titolo da cancellare', 'info'); return; }
    const ok = await Dialog.confirmDanger(
      '<i class="ti ti-trending-up" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Cancella tutti i titoli</strong><br>' +
      '<span style="font-size:13px;color:var(--text-muted)">Verranno eliminati ' + n + ' titoli dal portafoglio. Questa azione non può essere annullata.</span>',
      'Cancella', 'Annulla'
    );
    if (!ok) return;
    Portfolio.cancellaTitoli();
    showToast('Titoli eliminati', 'success');
  }

  async function importTitoli() {
    try {
      const result = await Portfolio.importTitoliDaCSV();
      Portfolio.renderAll();
      Charts.updateAll();
      Drive.save(Portfolio.getData());

      // Aggiorna quotazioni per i nuovi titoli
      setTimeout(() => Quotes.refreshAll(), 800);

      // Toast rapido
      const nMov = result.importati.reduce(function(s, t) { return s + (t.nMovimenti || 0); }, 0);
      showToast(
        result.importati.length + ' titoli importati' +
        (result.duplicati.length > 0 ? ' · ' + result.duplicati.length + ' già presenti' : '') +
        (result.scartati.length  > 0 ? ' · ' + result.scartati.length  + ' ignorati'     : ''),
        'success', 5000
      );

      // Mostra riepilogo dettagliato
      _mostraReportImportTitoli(result);
    } catch(e) {
      // già gestito in portfolio.js
    }
  }

  function _mostraReportImportTitoli(result) {
    const imp = result.importati   || [];
    const sca = result.scartati   || [];
    const dup = result.duplicati  || [];

    let html = '<div style="text-align:left">';

    if (imp.length > 0) {
      html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:6px">Importati (' + imp.length + ')</div>';
      html += '<div style="max-height:180px;overflow-y:auto;margin-bottom:12px">';
      imp.forEach(function(t) {
        const qta = t.quantita % 1 === 0 ? Math.round(t.quantita) : t.quantita.toFixed(3);
        html += '<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">';
        html += '<div style="font-weight:600">' + escHtml(t.nome) + '</div>';
        html += '<div style="color:var(--text-muted)">' + t.tipo + ' · ' + qta + ' unità · PMC ' + t.pmc.toFixed(4) + ' €</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (dup.length > 0) {
      html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:6px">Già presenti (' + dup.length + ')</div>';
      html += '<div style="max-height:120px;overflow-y:auto;margin-bottom:12px">';
      dup.forEach(function(t) {
        html += '<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">';
        html += '<div style="font-weight:600">' + escHtml(t.nome) + '</div>';
        html += '<div style="color:var(--text-muted)">' + t.motivo + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (sca.length > 0) {
      html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:6px">Ignorati (' + sca.length + ')</div>';
      html += '<div style="max-height:120px;overflow-y:auto">';
      sca.forEach(function(t) {
        html += '<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">';
        html += '<div style="font-weight:600">' + escHtml(t.nome) + '</div>';
        html += '<div style="color:var(--text-muted)">' + t.motivo + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (imp.length === 0 && sca.length === 0 && dup.length === 0) {
      html += '<div style="color:var(--text-muted);font-size:13px">Nessun titolo trovato nel file.</div>';
    }

    html += '</div>';
    Dialog.alert(html);
  }

  async function cancellaMovimentiConto() {
    const data = Portfolio.getData();
    const n = (data.conto.movimenti || []).length;
    if (n === 0) { showToast('Nessun movimento da cancellare', 'info'); return; }
    const ok = await Dialog.confirmDanger(
      '<i class="ti ti-building-bank" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Cancella movimenti conto</strong><br>' +
      '<span style="font-size:13px;color:var(--text-muted)">Verranno eliminati ' + n + ' movimenti. Il saldo iniziale rimarrà invariato. Questa azione non può essere annullata.</span>',
      'Cancella', 'Annulla'
    );
    if (!ok) return;
    Portfolio.cancellaMovimentiConto();
    showToast('Movimenti conto eliminati', 'success');
  }

  async function cancellaSpeseCarta() {
    const data = Portfolio.getData();
    const n = (data.carta.spese || []).length;
    if (n === 0) { showToast('Nessuna spesa da cancellare', 'info'); return; }
    const ok = await Dialog.confirmDanger(
      '<i class="ti ti-credit-card" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Cancella spese carta</strong><br>' +
      '<span style="font-size:13px;color:var(--text-muted)">Verranno eliminate ' + n + ' spese. I dati della carta rimarranno invariati. Questa azione non può essere annullata.</span>',
      'Cancella', 'Annulla'
    );
    if (!ok) return;
    Portfolio.cancellaSpeseCarta();
    showToast('Spese carta eliminate', 'success');
  }

  async function resetApp() {
    const ok = await Dialog.confirmDanger(
      '<i class="ti ti-alert-triangle" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Reimposta app</strong><br><span style="font-size:13px;color:var(--text-muted)">Tutti i dati locali verranno cancellati. I dati su Drive non vengono eliminati.</span>',
      'Reimposta', 'Annulla'
    );
    if (!ok) return;
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
    exportData, importData, importDaBanca, resetApp,
    cancellaMovimentiConto, cancellaSpeseCarta,
    cancellaTitoli, importTitoli,
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
    // Se si chiude il wizard titolo senza salvare, ripristina il titolo originale
    if (current === 'nuovoTitolo' && typeof Portfolio !== 'undefined') {
      const editing = Portfolio.getEditingTitolo();
      if (editing) {
        Portfolio.restoreEditingTitolo();
      }
      // Reset anche del flag nuovoAcquisto
      Portfolio.resetNuovoAcquisto();
    }
    // Rollback modifica movimento conto se chiuso senza salvare
    if (current === 'nuovoMovimento' && typeof Portfolio !== 'undefined') {
      Portfolio.restoreEditingMovimento();
    }
    // Rollback modifica spesa carta se chiusa senza salvare
    if (current === 'nuovaSpesaCarta' && typeof Portfolio !== 'undefined') {
      Portfolio.restoreEditingSpesaCarta();
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
      Portfolio.populateCategorieSelect('movCategoria', 'altro');
      Portfolio.setMovTipo('entrata');
    }

    if (id === 'nuovaSpesaCarta') {
      const el = $('cartaData'); if (el) el.value = today;
      const imp = $('cartaImporto'); if (imp) imp.value = '';
      const desc = $('cartaDescrizione'); if (desc) desc.value = '';
      Portfolio.populateCategorieSelect('cartaCategoria', 'shopping');
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

    if (id === 'impostazioniConto') {
      const si = $('contoSaldoIniziale');
      if (si) si.value = Portfolio.getData().conto.saldoIniziale || 0;
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
