/* =============================================
   PORTAFOGLIO PERSONALE — portfolio.js
   Logica: Conto Corrente, Carta, Investimenti
   ============================================= */

const Portfolio = (() => {

  // =============================================
  // STRUTTURA DATI
  // =============================================

  let data = {
    conto: {
      saldo:      0,
      movimenti:  [],   // { id, data, tipo:'entrata'|'uscita', descrizione, importo, categoria, note }
    },
    carta: {
      holder:       '',
      lastDigits:   '0000',
      expiry:       '',
      plafond:      5000,
      giornoAddebito: 15,
      spese:        [],  // { id, data, descrizione, importo, categoria, addebitoData }
    },
    investimenti: {
      titoli: [],  // vedi schema sotto
      /* Schema titolo:
        { id, tipo:'azione'|'fondo'|'certificate'|'pir'|'polizza',
          nome, ticker?, codeZB?,
          dataAcquisto, quantita, prezzoAcquisto,
          prezzoAttuale, change, changePct, currency,
          note, venduto: false,
          operazioni: [{ data, tipo:'acquisto'|'vendita', quantita, prezzo }]
        }
      */
    },
    impostazioni: {
      ultimoAggiornamento: null,
    },
  };

  // Stato UI
  let movTipo      = 'entrata';
  let activeTab    = 'azioni';
  let dettaglioId  = null;

  const $ = id => document.getElementById(id);
  const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // =============================================
  // LOAD / GET / SAVE
  // =============================================

  function loadData(incoming) {
    if (!incoming) return;
    // Merge sicuro
    if (incoming.conto)        data.conto        = { ...data.conto,        ...incoming.conto };
    if (incoming.carta)        data.carta        = { ...data.carta,        ...incoming.carta };
    if (incoming.investimenti) data.investimenti = { ...data.investimenti, ...incoming.investimenti };
    if (incoming.impostazioni) data.impostazioni = { ...data.impostazioni, ...incoming.impostazioni };
    renderAll();
  }

  function getData() { return JSON.parse(JSON.stringify(data)); }

  function getTitoli() { return data.investimenti.titoli.filter(t => !t.venduto); }

  function updateQuote(id, quote) {
    const t = data.investimenti.titoli.find(t => t.id === id);
    if (!t || !quote) return;
    t.prezzoAttuale = quote.price;
    t.change        = quote.change;
    t.changePct     = quote.changePct;
    t.currency      = quote.currency || 'EUR';
  }

  function saveAndSync() {
    Drive.save(getData());
  }

  // =============================================
  // RENDER GENERALE
  // =============================================

  function renderAll() {
    renderDashboard();
    renderConto();
    renderCarta();
    renderInvestimenti();
  }

  // =============================================
  // DASHBOARD
  // =============================================

  function renderDashboard() {
    // Data
    const el = $('dashDate');
    if (el) el.textContent = new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    // Patrimonio totale
    const saldoConto  = data.conto.saldo;
    const totInv      = getTotaleInvestimenti();
    const totale      = saldoConto + totInv;

    setEl('patrimonioTotale', formatEur(totale));
    setEl('summaryContoValue', formatEur(saldoConto));
    setEl('summaryInvValue', formatEur(totInv));

    // Debito carta (spese non ancora addebitate)
    const debitoCarta = getDebitoCarta();
    setEl('summaryCreditValue', formatEur(debitoCarta));

    // Ultime 5 transazioni
    renderUltimeTransazioni();
  }

  function renderUltimeTransazioni() {
    const container = $('lastTransazioni');
    if (!container) return;
    const all = [...data.conto.movimenti]
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 5);
    container.innerHTML = all.length
      ? all.map(m => transactionHTML(m)).join('')
      : emptyState('bi-inbox', 'Nessuna transazione');
  }

  // =============================================
  // CONTO CORRENTE
  // =============================================

  function renderConto() {
    // Saldo
    setEl('contoSaldo', formatEur(data.conto.saldo));

    // Entrate/uscite mese corrente
    const now    = new Date();
    const meseMov = data.conto.movimenti.filter(m => {
      const d = new Date(m.data);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const entrate = meseMov.filter(m => m.tipo === 'entrata').reduce((s, m) => s + m.importo, 0);
    const uscite  = meseMov.filter(m => m.tipo === 'uscita').reduce((s, m) => s + m.importo, 0);
    setEl('contoEntrate', formatEur(entrate));
    setEl('contoUscite', formatEur(uscite));

    filterMovimenti();
  }

  let _contoFilterTipo = '';
  let _contoFilterMese = '';

  function setContoFilter(tipo, btn) {
    _contoFilterTipo = tipo;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    filterMovimenti();
  }

  function setContoFilterMonth(btn) {
    const now = new Date();
    _contoFilterMese = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    filterMovimenti();
  }

  function filterMovimenti() {
    const search = ($('contoSearch')?.value || '').toLowerCase();
    const tipo   = _contoFilterTipo;
    const mese   = _contoFilterMese;

    let list = [...data.conto.movimenti];
    if (search) list = list.filter(m => m.descrizione.toLowerCase().includes(search) || (m.note||'').toLowerCase().includes(search));
    if (tipo)   list = list.filter(m => m.tipo === tipo);
    if (mese)   list = list.filter(m => m.data.startsWith(mese));

    list.sort((a, b) => new Date(b.data) - new Date(a.data));

    const container = $('contoMovimenti');
    if (!container) return;
    container.innerHTML = list.length
      ? list.map(m => transactionHTML(m, true)).join('')
      : emptyState('bi-bank2', 'Nessun movimento trovato');
  }

  function setMovTipo(tipo) {
    movTipo = tipo;
    $('movTipoEntrata')?.classList.toggle('active', tipo === 'entrata');
    $('movTipoUscita')?.classList.toggle('active', tipo === 'uscita');
  }

  function saveMovimento() {
    const data_m   = $('movData')?.value;
    const desc     = $('movDescrizione')?.value?.trim();
    const importo  = parseFloat($('movImporto')?.value);
    const cat      = $('movCategoria')?.value;
    const note     = $('movNote')?.value?.trim();

    if (!data_m || !desc || isNaN(importo) || importo <= 0) {
      App.showToast('Compila tutti i campi obbligatori', 'warning');
      return;
    }

    const mov = { id: uid(), data: data_m, tipo: movTipo, descrizione: desc, importo, categoria: cat, note };
    data.conto.movimenti.push(mov);

    // Aggiorna saldo
    data.conto.saldo = movTipo === 'entrata'
      ? data.conto.saldo + importo
      : data.conto.saldo - importo;

    Modals.close();
    renderConto();
    renderDashboard();
    Charts.updateAll();
    saveAndSync();
    App.showToast(`Movimento ${movTipo} salvato`, 'success');
  }

  function deleteMovimento(id) {
    const idx = data.conto.movimenti.findIndex(m => m.id === id);
    if (idx === -1) return;
    const mov = data.conto.movimenti[idx];
    // Ripristina saldo
    data.conto.saldo = mov.tipo === 'entrata'
      ? data.conto.saldo - mov.importo
      : data.conto.saldo + mov.importo;
    data.conto.movimenti.splice(idx, 1);
    renderConto();
    renderDashboard();
    Charts.updateAll();
    saveAndSync();
    App.showToast('Movimento eliminato', 'info');
  }

  // =============================================
  // CARTA DI CREDITO
  // =============================================

  function renderCarta() {
    // Visualizzazione carta
    setEl('ccLastDigits', data.carta.lastDigits || '0000');
    setEl('ccHolder',     data.carta.holder     || '—');
    setEl('ccExpiry',     data.carta.expiry      || '—');

    // Stats
    const now  = new Date();
    const mese = data.carta.spese.filter(s => {
      const d = new Date(s.data);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totMese = mese.reduce((s, sp) => s + sp.importo, 0);
    setEl('cartaSpeseMese', formatEur(totMese));

    // Prossima scadenza addebito
    const oggi  = new Date();
    const giorno = data.carta.giornoAddebito || 15;
    let prossima = new Date(oggi.getFullYear(), oggi.getMonth(), giorno);
    if (prossima <= oggi) prossima = new Date(oggi.getFullYear(), oggi.getMonth() + 1, giorno);
    setEl('cartaScadenza', prossima.toLocaleDateString('it-IT'));

    // Plafond
    const pct = data.carta.plafond > 0 ? Math.min(100, (totMese / data.carta.plafond) * 100) : 0;
    setEl('cartaPlafond', `${pct.toFixed(1)}%`);

    filterSpese();
  }

  function filterSpese() {
    const search = ($('cartaSearch')?.value || '').toLowerCase();
    const mese   = $('cartaFilterMonth')?.value || '';

    let list = [...data.carta.spese];
    if (search) list = list.filter(s => s.descrizione.toLowerCase().includes(search));
    if (mese)   list = list.filter(s => s.data.startsWith(mese));
    list.sort((a, b) => new Date(b.data) - new Date(a.data));

    const container = $('cartaMovimenti');
    if (!container) return;
    container.innerHTML = list.length
      ? list.map(s => cartaSpesaHTML(s)).join('')
      : emptyState('bi-credit-card', 'Nessuna spesa trovata');
  }

  function saveSpesaCarta() {
    const data_s  = $('cartaData')?.value;
    const desc    = $('cartaDescrizione')?.value?.trim();
    const importo = parseFloat($('cartaImporto')?.value);
    const cat     = $('cartaCategoria')?.value;
    const addebito = $('cartaAddebito')?.value;

    if (!data_s || !desc || isNaN(importo) || importo <= 0) {
      App.showToast('Compila tutti i campi obbligatori', 'warning');
      return;
    }

    const spesa = { id: uid(), data: data_s, descrizione: desc, importo, categoria: cat, addebitoData: addebito };
    data.carta.spese.push(spesa);

    Modals.close();
    renderCarta();
    saveAndSync();
    App.showToast('Spesa carta salvata', 'success');
  }

  function deleteSpesaCarta(id) {
    const idx = data.carta.spese.findIndex(s => s.id === id);
    if (idx === -1) return;
    data.carta.spese.splice(idx, 1);
    renderCarta();
    saveAndSync();
    App.showToast('Spesa eliminata', 'info');
  }

  function saveImpostazioniCarta() {
    data.carta.holder         = $('ccHolderInput')?.value?.trim()  || '';
    data.carta.lastDigits     = $('ccLastInput')?.value?.trim()    || '0000';
    data.carta.expiry         = $('ccExpiryInput')?.value?.trim()  || '';
    data.carta.plafond        = parseFloat($('ccPlafondInput')?.value) || 5000;
    data.carta.giornoAddebito = parseInt($('ccGiornoAddebito')?.value) || 15;
    Modals.close();
    renderCarta();
    saveAndSync();
    App.showToast('Impostazioni carta salvate', 'success');
  }

  function getDebitoCarta() {
    // Spese non ancora addebitate al conto
    const oggi = new Date().toISOString().slice(0, 10);
    return data.carta.spese
      .filter(s => !s.addebitoData || s.addebitoData > oggi)
      .reduce((s, sp) => s + sp.importo, 0);
  }

  // =============================================
  // INVESTIMENTI
  // =============================================

  function showTab(tab, btn) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active'); t.classList.add('hidden'); });
    if (btn) btn.classList.add('active');
    const tc = $(`tab-${tab}`);
    if (tc) { tc.classList.add('active'); tc.classList.remove('hidden'); }
    renderTitoliTab(tab);
    renderInvSummary();
  }

  function renderInvestimenti() {
    renderTitoliTab(activeTab);
    renderInvSummary();
  }

  function renderInvSummary() {
    const titoli = getTitoli();
    const valoreAttuale = titoli.reduce((s, t) => s + (t.prezzoAttuale || t.prezzoAcquisto) * t.quantita, 0);
    const costoTotale   = titoli.reduce((s, t) => s + t.prezzoAcquisto * t.quantita, 0);
    const pl            = valoreAttuale - costoTotale;
    const rend          = costoTotale > 0 ? (pl / costoTotale) * 100 : 0;

    setEl('invValoreAttuale', formatEur(valoreAttuale));
    setEl('invCostoTotale',   formatEur(costoTotale));
    setEl('invPL',            formatEurSigned(pl));
    setEl('invRendimento',    formatPctSigned(rend));

    const plEl = $('invPL');
    if (plEl) plEl.className = `inv-summary-value ${pl >= 0 ? 'text-success' : 'text-danger'}`;
    const rendEl = $('invRendimento');
    if (rendEl) rendEl.className = `inv-summary-value ${rend >= 0 ? 'text-success' : 'text-danger'}`;
  }

  function renderTitoliTab(tab) {
    const tipoMap = {
      azioni:       'azione',
      fondi:        'fondo',
      certificates: 'certificate',
      pir:          'pir',
      polizze:      'polizza',
    };
    const tipo      = tipoMap[tab];
    const container = $(`lista${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (!container) return;

    const lista = getTitoli().filter(t => t.tipo === tipo);
    container.innerHTML = lista.length
      ? lista.map(t => titoloHTML(t)).join('')
      : emptyState('bi-graph-up', 'Nessun titolo in questa categoria');
  }

  function getTotaleInvestimenti() {
    return getTitoli().reduce((s, t) => s + (t.prezzoAttuale || t.prezzoAcquisto) * t.quantita, 0);
  }

  // ---- Selettore tipo a card ----
  function setTipoCard(el) {
    document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const tipo = el.dataset.tipo;
    // Mostra/nasconde campo Zonebourse o Yahoo
    const zbG = document.getElementById('titoloZBGroup');
    const yhG = document.getElementById('titoloYahooGroup');
    if (tipo === 'certificate') {
      if (zbG) zbG.style.display = '';
      if (yhG) yhG.style.display = 'none';
    } else {
      if (zbG) zbG.style.display = 'none';
      if (yhG) yhG.style.display = '';
    }
  }

  // ---- Calcolo costo di carico live ----
  function calcCostoCarico() {
    const q  = parseFloat($('titoloQuantita')?.value)       || 0;
    const p  = parseFloat($('titoloPrezzoAcquisto')?.value) || 0;
    const k  = parseFloat($('titoloCambio')?.value)         || 1;
    const c  = parseFloat($('titoloCommissioni')?.value)    || 0;
    const t  = parseFloat($('titoloTasse')?.value)          || 0;
    const r  = parseFloat($('titoloRateo')?.value)          || 0;
    const val = $('titoloValuta')?.value || 'EUR';

    const cv    = q * p * k;
    const oneri = c + t + r;
    const tot   = cv + oneri;
    const pmc   = q > 0 ? tot / q : 0;

    const fmtVal = (n) => new Intl.NumberFormat('it-IT', {
      style: 'currency', currency: val,
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(n);

    setEl('costoControvalore', fmtVal(cv));
    setEl('costoOneri',        fmtVal(oneri));
    setEl('costoQty',          q % 1 === 0 ? q : q.toFixed(3));
    setEl('costoTotale',       fmtVal(tot));
    setEl('costoPmc',          fmtVal(pmc));
  }

  function saveTitolo() {
    const tipoEl  = document.querySelector('.tipo-card.active');
    const tipo    = tipoEl?.dataset.tipo || 'azione';
    const nome    = $('titoloNome')?.value?.trim();
    const ticker  = $('titoloTicker')?.value?.trim().toUpperCase();
    const codeZB  = $('titoloCodeZB')?.value?.trim();
    const isin    = $('titoloIsin')?.value?.trim().toUpperCase();
    const wkn     = $('titoloWkn')?.value?.trim();
    const mercato = $('titoloMercato')?.value;
    const valuta  = $('titoloValuta')?.value || 'EUR';
    const dataAcq = $('titoloDataAcquisto')?.value;
    const quantita= parseFloat($('titoloQuantita')?.value);
    const prezzo  = parseFloat($('titoloPrezzoAcquisto')?.value);
    const cambio  = parseFloat($('titoloCambio')?.value) || 1;
    const comm    = parseFloat($('titoloCommissioni')?.value) || 0;
    const tasse   = parseFloat($('titoloTasse')?.value) || 0;
    const rateo   = parseFloat($('titoloRateo')?.value) || 0;
    const addebito= $('titoloAddebitoConto')?.checked;
    const note    = $('titoloNote')?.value?.trim();

    if (!nome || !dataAcq || isNaN(quantita) || isNaN(prezzo) || quantita <= 0 || prezzo <= 0) {
      App.showToast('Compila tutti i campi obbligatori', 'warning');
      return;
    }

    const cv     = quantita * prezzo * cambio;
    const oneri  = comm + tasse + rateo;
    const costoTot = cv + oneri;
    const pmc    = quantita > 0 ? costoTot / quantita : prezzo;

    const titolo = {
      id:             uid(),
      tipo,
      nome,
      ticker:         tipo !== 'certificate' ? ticker : null,
      codeZB:         tipo === 'certificate' ? codeZB : null,
      isin,
      wkn,
      mercato,
      valuta,
      dataAcquisto:   dataAcq,
      quantita,
      prezzoAcquisto: prezzo,
      cambio,
      commissioni:    comm,
      tasse,
      rateo,
      costoTotale:    costoTot,
      pmc,
      prezzoAttuale:  prezzo,
      change:         0,
      changePct:      0,
      currency:       valuta,
      note,
      venduto:        false,
      operazioni:     [{ data: dataAcq, tipo: 'acquisto', quantita, prezzo, cambio, comm, tasse, rateo, costoTot }],
    };

    data.investimenti.titoli.push(titolo);

    if (addebito) {
      const mov = {
        id:          uid(),
        data:        dataAcq,
        tipo:        'uscita',
        descrizione: `Acquisto ${nome}`,
        importo:     costoTot,
        categoria:   'investimento',
        note:        `${quantita} × ${formatEur(prezzo)} | Comm: ${formatEur(comm)} | PMC: ${formatEur(pmc)}`,
      };
      data.conto.movimenti.push(mov);
      data.conto.saldo -= costoTot;
    }

    Modals.close();
    renderAll();
    Charts.updateAll();
    saveAndSync();
    App.showToast(`${nome} aggiunto al portafoglio`, 'success');

    setTimeout(() => Quotes.fetchQuote(titolo).then(q => {
      if (q) { updateQuote(titolo.id, q); renderInvestimenti(); }
    }), 500);
  }

  // ---- Dettaglio Titolo ----
  function apriDettaglio(id) {
    const t = data.investimenti.titoli.find(t => t.id === id);
    if (!t) return;
    dettaglioId = id;

    setEl('detTitoloNome', t.nome);

    const valoreAttuale = (t.prezzoAttuale || t.prezzoAcquisto) * t.quantita;
    const costoPosizione = t.prezzoAcquisto * t.quantita;
    const pl  = valoreAttuale - costoPosizione;
    const rend = costoPosizione > 0 ? (pl / costoPosizione) * 100 : 0;

    $('detTitoloBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-row"><span>Tipo</span><strong>${tipoLabel(t.tipo)}</strong></div>
        <div class="detail-row"><span>Ticker / Codice</span><strong>${t.ticker || t.codeZB || '—'}</strong></div>
        <div class="detail-row"><span>Data acquisto</span><strong>${formatDate(t.dataAcquisto)}</strong></div>
        <div class="detail-row"><span>Quantità</span><strong>${t.quantita}</strong></div>
        <div class="detail-row"><span>Prezzo acquisto</span><strong>${formatEur(t.prezzoAcquisto)}</strong></div>
        <div class="detail-row"><span>Prezzo attuale</span><strong>${formatEur(t.prezzoAttuale || t.prezzoAcquisto)}</strong></div>
        <div class="detail-row"><span>Var. giornaliera</span>
          <strong class="${t.changePct >= 0 ? 'text-success' : 'text-danger'}">
            ${Quotes.formatPct(t.changePct || 0)}
          </strong>
        </div>
        <div class="detail-row"><span>Valore posizione</span><strong>${formatEur(valoreAttuale)}</strong></div>
        <div class="detail-row"><span>Costo posizione</span><strong>${formatEur(costoPosizione)}</strong></div>
        <div class="detail-row"><span>Guadagno/Perdita</span>
          <strong class="${pl >= 0 ? 'text-success' : 'text-danger'}">${formatEurSigned(pl)}</strong>
        </div>
        <div class="detail-row"><span>Rendimento</span>
          <strong class="${rend >= 0 ? 'text-success' : 'text-danger'}">${formatPctSigned(rend)}</strong>
        </div>
        ${t.note ? `<div class="detail-row"><span>Note</span><strong>${t.note}</strong></div>` : ''}
      </div>
      <h4 style="margin:16px 0 8px;font-size:13px;color:var(--text-secondary)">Storico Operazioni</h4>
      <div class="transaction-list">
        ${(t.operazioni || []).map(op => `
          <div class="transaction-item">
            <div class="transaction-icon ${op.tipo === 'acquisto' ? 'summary-card__icon--blue' : 'summary-card__icon--green'}">
              <i class="bi ${op.tipo === 'acquisto' ? 'bi-cart-plus' : 'bi-cash-coin'}"></i>
            </div>
            <div class="transaction-body">
              <div class="transaction-desc">${op.tipo === 'acquisto' ? 'Acquisto' : 'Vendita'}</div>
              <div class="transaction-meta">${formatDate(op.data)} · ${op.quantita} × ${formatEur(op.prezzo)}</div>
            </div>
            <div class="transaction-amount">${formatEur(op.quantita * op.prezzo)}</div>
          </div>
        `).join('') || '<p style="padding:16px;color:var(--text-muted)">Nessuna operazione</p>'}
      </div>
    `;

    Modals.open('dettaglioTitolo');
  }

  // ---- Vendi Titolo ----
  function vendeTitolo() {
    if (!dettaglioId) return;
    const t = data.investimenti.titoli.find(t => t.id === dettaglioId);
    if (!t) return;

    const prezzoVendita = t.prezzoAttuale || t.prezzoAcquisto;
    const importoTot    = prezzoVendita * t.quantita;

    // Registra operazione
    t.operazioni.push({ data: new Date().toISOString().slice(0, 10), tipo: 'vendita', quantita: t.quantita, prezzo: prezzoVendita });
    t.venduto = true;

    // Registra entrata conto
    const mov = {
      id:          uid(),
      data:        new Date().toISOString().slice(0, 10),
      tipo:        'entrata',
      descrizione: `Vendita ${t.nome}`,
      importo:     importoTot,
      categoria:   'investimento',
      note:        `${t.quantita} × ${formatEur(prezzoVendita)}`,
    };
    data.conto.movimenti.push(mov);
    data.conto.saldo += importoTot;

    Modals.close();
    renderAll();
    Charts.updateAll();
    saveAndSync();
    App.showToast(`${t.nome} venduto: ${formatEur(importoTot)} accreditati sul conto`, 'success');
  }

  // =============================================
  // HTML HELPERS
  // =============================================

  function transactionHTML(m, showDelete = false) {
    const isPos  = m.tipo === 'entrata';
    const icon   = catIcon(m.categoria);
    const color  = isPos ? 'summary-card__icon--green' : 'summary-card__icon--red';
    const amount = isPos ? `+${formatEur(m.importo)}` : `-${formatEur(m.importo)}`;
    const cls    = isPos ? 'transaction-amount--positive' : 'transaction-amount--negative';
    return `
      <div class="transaction-item">
        <div class="transaction-icon ${color}"><i class="bi ${icon}"></i></div>
        <div class="transaction-body">
          <div class="transaction-desc">${escHtml(m.descrizione)}</div>
          <div class="transaction-meta">${formatDate(m.data)} · ${catLabel(m.categoria)}</div>
        </div>
        <div class="transaction-amount ${cls}">${amount}</div>
        ${showDelete ? `
        <div class="transaction-actions">
          <button class="action-btn" onclick="Portfolio.deleteMovimento('${m.id}')" title="Elimina">
            <i class="bi bi-trash3"></i>
          </button>
        </div>` : ''}
      </div>`;
  }

  function cartaSpesaHTML(s) {
    return `
      <div class="transaction-item">
        <div class="transaction-icon summary-card__icon--purple"><i class="bi ${catIcon(s.categoria)}"></i></div>
        <div class="transaction-body">
          <div class="transaction-desc">${escHtml(s.descrizione)}</div>
          <div class="transaction-meta">${formatDate(s.data)} · ${catLabel(s.categoria)}${s.addebitoData ? ` · Addebito: ${formatDate(s.addebitoData)}` : ''}</div>
        </div>
        <div class="transaction-amount transaction-amount--negative">-${formatEur(s.importo)}</div>
        <div class="transaction-actions">
          <button class="action-btn" onclick="Portfolio.deleteSpesaCarta('${s.id}')" title="Elimina">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>`;
  }

  function titoloHTML(t) {
    const prezzo   = t.prezzoAttuale || t.prezzoAcquisto;
    const valore   = prezzo * t.quantita;
    const costo    = t.prezzoAcquisto * t.quantita;
    const pl       = valore - costo;
    const plPct    = costo > 0 ? (pl / costo) * 100 : 0;
    const varClass = Quotes.getChangeClass(t.changePct || 0);
    const plClass  = pl >= 0 ? 'titolo-var--pos' : 'titolo-var--neg';
    const varIcon  = Quotes.getChangeIcon(t.changePct || 0);

    return `
      <div class="titolo-item" onclick="Portfolio.apriDettaglio('${t.id}')">
        <div>
          <div class="titolo-nome">${escHtml(t.nome)}</div>
          <div class="titolo-ticker">${t.ticker || t.codeZB || tipoLabel(t.tipo)}</div>
        </div>
        <div class="titolo-val">${formatEur(prezzo)}</div>
        <div class="titolo-var ${varClass}">
          <i class="bi ${varIcon}"></i> ${Quotes.formatPct(t.changePct || 0)}
        </div>
        <div class="titolo-val">${formatEur(valore)}</div>
        <div class="titolo-var ${plClass}">${formatPctSigned(plPct)}</div>
        <div class="titolo-actions" onclick="event.stopPropagation()">
          <button class="action-btn" onclick="Portfolio.apriDettaglio('${t.id}')" title="Dettaglio">
            <i class="bi bi-info-circle"></i>
          </button>
        </div>
      </div>`;
  }

  function emptyState(icon, msg) {
    return `<div class="empty-state"><i class="bi ${icon}"></i><p>${msg}</p></div>`;
  }

  // =============================================
  // UTILITY
  // =============================================

  function setEl(id, val) { const e = $(id); if (e) e.textContent = val; }

  function formatEur(n) {
    return new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', minimumFractionDigits:2, maximumFractionDigits:2 }).format(n || 0);
  }

  function formatEurSigned(n) {
    const s = formatEur(Math.abs(n));
    return n >= 0 ? `+${s}` : `-${s}`;
  }

  function formatPctSigned(n) {
    return `${n >= 0 ? '+' : ''}${(n || 0).toFixed(2)}%`;
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('it-IT');
  }

  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function tipoLabel(tipo) {
    const m = { azione:'Azione', fondo:'Fondo', certificate:'Certificate', pir:'PIR', polizza:'Polizza Vita' };
    return m[tipo] || tipo;
  }

  function catLabel(cat) {
    const m = {
      stipendio:'Stipendio', investimento:'Investimento', affitto:'Affitto',
      utenze:'Utenze', spesa:'Spesa', trasporti:'Trasporti',
      salute:'Salute', svago:'Svago', shopping:'Shopping',
      ristoranti:'Ristoranti', viaggi:'Viaggi', abbonamenti:'Abbonamenti',
      carburante:'Carburante', altro:'Altro',
    };
    return m[cat] || cat || '—';
  }

  function catIcon(cat) {
    const m = {
      stipendio:'bi-briefcase-fill', investimento:'bi-graph-up-arrow',
      affitto:'bi-house-fill', utenze:'bi-lightning-charge-fill',
      spesa:'bi-cart-fill', trasporti:'bi-car-front-fill',
      salute:'bi-heart-pulse-fill', svago:'bi-controller',
      shopping:'bi-bag-fill', ristoranti:'bi-cup-hot-fill',
      viaggi:'bi-airplane-fill', abbonamenti:'bi-collection-fill',
      carburante:'bi-fuel-pump-fill', altro:'bi-three-dots',
    };
    return m[cat] || 'bi-arrow-left-right';
  }

  // CSS helpers
  const style = document.createElement('style');
  style.textContent = `
    .detail-grid { display:flex; flex-direction:column; gap:8px; }
    .detail-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-light); font-size:14px; }
    .detail-row span { color:var(--text-secondary); }
    .text-success { color:var(--success) !important; }
    .text-danger  { color:var(--danger)  !important; }
  `;
  document.head.appendChild(style);

  // ---- API pubblica ----
  return {
    loadData, getData, getTitoli, updateQuote,
    renderAll, renderDashboard, renderConto, renderCarta, renderInvestimenti,
    filterMovimenti, filterSpese, setContoFilter, setContoFilterMonth,
    setMovTipo, saveMovimento, deleteMovimento,
    saveSpesaCarta, deleteSpesaCarta, saveImpostazioniCarta,
    showTab, setTipoCard, onTitoloTipoChange: setTipoCard,
    calcCostoCarico, saveTitolo,
    apriDettaglio, vendeTitolo,
    formatEur, formatDate,
  };

})();
