/* =============================================
   PORTAFOGLIO PERSONALE — portfolio.js
   Conto Corrente, Carta, Investimenti
   ============================================= */

const Portfolio = (() => {

  // =============================================
  // STRUTTURA DATI
  // =============================================

  let data = {
    conto: { saldoIniziale: 0, saldo: 0, movimenti: [] },
    carta: { holder:'', lastDigits:'0000', expiry:'', plafond:5000, giornoAddebito:15, spese:[] },
    investimenti: { titoli:[] },
    impostazioni: { ultimoAggiornamento: null },
  };

  let movTipo     = 'entrata';
  let activeTab   = 'azioni';
  let dettaglioId = null;
  let _detChart   = null;
  let _detPeriod  = '1M';
  let wizardStep  = 1;
  const wizardTot = 3;

  const $ = id => document.getElementById(id);
  const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

  // =============================================
  // UTILITY FORMATO
  // =============================================

  function formatEur(n, decimals) {
    var dec = (decimals === undefined) ? 2 : decimals;
    return new Intl.NumberFormat('it-IT', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: dec, maximumFractionDigits: dec,
      useGrouping: true,
    }).format(n || 0);
  }

  function formatEurSigned(n) {
    var s = formatEur(Math.abs(n));
    return n >= 0 ? '+' + s : '-' + s;
  }

  function formatPct(n) {
    var sign = (n || 0) >= 0 ? '+' : '';
    return sign + (n || 0).toFixed(2) + '%';
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('it-IT');
  }

  function formatNum(n) {
    return new Intl.NumberFormat('it-IT', { useGrouping: true }).format(n || 0);
  }

  // =============================================
  // UTILITY DOM / TESTO
  // =============================================

  function setEl(id, val) { var e = $(id); if (e) e.textContent = val; }

  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function tipoLabel(tipo) {
    var m = { azione:'Azione', fondo:'Fondo', certificate:'Certificate', pir:'PIR', polizza:'Polizza Vita' };
    return m[tipo] || tipo;
  }

  function tipoColor(tipo) {
    var m = {
      azione:      { bg:'#EFF6FF', fg:'#1E3A8A' },
      fondo:       { bg:'#F5F3FF', fg:'#7C3AED' },
      certificate: { bg:'#FFFBEB', fg:'#D97706' },
      pir:         { bg:'#F0FDF4', fg:'#16A34A' },
      polizza:     { bg:'#FEF2F2', fg:'#DC2626' },
    };
    return m[tipo] || { bg:'#EFF6FF', fg:'#1E3A8A' };
  }

  function avatarLetters(nome) {
    return (nome || '').split(' ').slice(0,3).map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,3);
  }

  // =============================================
  // SISTEMA CATEGORIE (statiche + custom dinamiche)
  // =============================================

  // Categorie built-in dell'app
  var CATEGORIE_BUILTIN = {
    stipendio:    { label:'Stipendio',         icon:'bi-briefcase-fill' },
    investimento: { label:'Investimento',      icon:'bi-graph-up-arrow' },
    affitto:      { label:'Affitto',           icon:'bi-house-fill' },
    utenze:       { label:'Utenze',            icon:'bi-lightning-charge-fill' },
    spesa:        { label:'Spesa alimentare',  icon:'bi-cart-fill' },
    trasporti:    { label:'Trasporti',         icon:'bi-car-front-fill' },
    salute:       { label:'Salute',            icon:'bi-heart-pulse-fill' },
    svago:        { label:'Svago',             icon:'bi-controller' },
    shopping:     { label:'Shopping',          icon:'bi-bag-fill' },
    ristoranti:   { label:'Ristoranti',        icon:'bi-cup-hot-fill' },
    viaggi:       { label:'Viaggi',            icon:'bi-airplane-fill' },
    abbonamenti:  { label:'Abbonamenti',       icon:'bi-collection-fill' },
    carburante:   { label:'Carburante',        icon:'bi-fuel-pump-fill' },
    altro:        { label:'Altro',             icon:'bi-three-dots' },
  };

  // Mapping categorie banca → chiave app
  var MAPPING_BANCA = {
    'stipendi e pensioni':               'stipendio',
    'investimenti, bdr e salvadanaio':   'investimento',
    'disinvestimenti, bdr e salvadanaio':'investimento',
    'interessi e cedole':                'investimento',
    'affitto':                           'affitto',
    'domiciliazioni e utenze':           'utenze',
    'generi alimentari e supermercato':  'spesa',
    'trasporti':                         'trasporti',
    'prelievi':                          'trasporti',
    'salute':                            'salute',
    'tempo libero varie':                'svago',
    'ristoranti e bar':                  'ristoranti',
    'viaggi e vacanze':                  'viaggi',
    'abbonamenti':                       'abbonamenti',
    'carburanti':                        'carburante',
    'hi-tech e informatica':             'hi_tech',
    'cellulare':                         'cellulare',
    'abbigliamento e accessori':         'abbigliamento',
    'casa varie':                        'casa',
    'polizze':                           'polizze',
    'bonifici in uscita':                'bonifici_out',
    'bonifici ricevuti':                 'bonifici_in',
    'rimborsi spese e storni':           'rimborsi',
    'imposte, bolli e commissioni':      'imposte',
    'imposte sul reddito e tasse varie': 'imposte',
    'addebito mia carta di credito':     'carta_addebito',
    'giroconto in entrata':              'giroconto_in',
    'valore insieme':                    'altro',
    'altre uscite':                      'altro',
    'entrate':                           'altro',
  };

  // Categorie custom predefinite (per banca, non presenti nelle builtin)
  var CATEGORIE_CUSTOM_DEFAULT = {
    hi_tech:        { label:'Hi-Tech & Informatica', icon:'bi-laptop-fill' },
    cellulare:      { label:'Cellulare',             icon:'bi-phone-fill' },
    abbigliamento:  { label:'Abbigliamento',         icon:'bi-bag-heart-fill' },
    casa:           { label:'Casa',                  icon:'bi-tools' },
    polizze:        { label:'Polizze',               icon:'bi-shield-fill-check' },
    bonifici_out:   { label:'Bonifici in uscita',    icon:'bi-send-fill' },
    bonifici_in:    { label:'Bonifici ricevuti',     icon:'bi-inbox-fill' },
    rimborsi:       { label:'Rimborsi',              icon:'bi-arrow-counterclockwise' },
    imposte:        { label:'Imposte e Tasse',       icon:'bi-bank2' },
    carta_addebito: { label:'Addebito Carta',        icon:'bi-credit-card-fill' },
    giroconto_in:   { label:'Giroconto',             icon:'bi-arrow-left-right' },
  };

  function getCategorieCustom() {
    return data.impostazioni.categorie_custom || {};
  }

  function getCategoria(key) {
    if (CATEGORIE_BUILTIN[key]) return CATEGORIE_BUILTIN[key];
    var custom = getCategorieCustom();
    if (custom[key]) return custom[key];
    if (CATEGORIE_CUSTOM_DEFAULT[key]) return CATEGORIE_CUSTOM_DEFAULT[key];
    return { label: key, icon: 'bi-three-dots' };
  }

  function catLabel(cat) {
    return getCategoria(cat).label || cat || '—';
  }

  function catIcon(cat) {
    return getCategoria(cat).icon || 'bi-three-dots';
  }

  // Aggiunge una categoria custom se non esiste già
  function addCategoriaCustom(key, label, icon) {
    if (CATEGORIE_BUILTIN[key] || CATEGORIE_CUSTOM_DEFAULT[key]) return false; // già esiste
    if (!data.impostazioni.categorie_custom) data.impostazioni.categorie_custom = {};
    if (data.impostazioni.categorie_custom[key]) return false; // già aggiunta
    data.impostazioni.categorie_custom[key] = { label: label, icon: icon || 'bi-tag-fill' };
    return true;
  }

  // Popola dinamicamente le select di categoria nei modal
  function populateCategorieSelect(selectId, defaultKey) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var tutte = Object.assign({}, CATEGORIE_BUILTIN, CATEGORIE_CUSTOM_DEFAULT, getCategorieCustom());
    sel.innerHTML = Object.keys(tutte).map(function(k) {
      var isSelected = k === (defaultKey || 'altro') ? ' selected' : '';
      return '<option value="' + k + '"' + isSelected + '>' + tutte[k].label + '</option>';
    }).join('');
  }

  // =============================================
  // IMPORT DA FILE BANCA
  // =============================================

  async function importDaBanca() {
    return new Promise(function(resolve, reject) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.onchange = async function(e) {
        var file = e.target.files[0];
        if (!file) { reject('Nessun file'); return; }
        try {
          var result = await _parseBancaFile(file);
          resolve(result);
        } catch(err) {
          App.showToast('Errore lettura file banca: ' + err.message, 'error');
          reject(err);
        }
      };
      input.click();
    });
  }

  async function _parseBancaFile(file) {
    // Legge il file XLSX con SheetJS (CDN già disponibile se incluso, altrimenti fallback CSV)
    var buffer = await file.arrayBuffer();

    if (typeof XLSX === 'undefined') {
      throw new Error('Libreria XLSX non caricata. Aggiungila nell\'index.html.');
    }

    var wb   = XLSX.read(buffer, { type:'array', cellDates:true });
    var ws   = wb.Sheets[wb.SheetNames[0]];

    // Forza lettura di tutto il foglio ignorando il range definito dal file
    // (alcuni export bancari limitano !ref alle prime righe visibili)
    var fullRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:J400');
    fullRange.e.r = Math.max(fullRange.e.r, 5000);
    ws['!ref'] = XLSX.utils.encode_range(fullRange);

    var rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

    // Trova la riga header (contiene "Data" e "Operazione")
    var headerIdx = -1;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r && r[0] && String(r[0]).trim() === 'Data' && r[1] && String(r[1]).trim() === 'Operazione') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) throw new Error('Formato file non riconosciuto (header non trovato)');

    var dataRows = rows.slice(headerIdx + 1).filter(function(r) {
      return r && r[0] && r[0] !== 'Data'; // escludi righe vuote e header ripetuto
    });

    var importatiConto = 0, importatiCarta = 0, duplicati = 0, catNuove = [];
    var oggi = new Date().toISOString().slice(0,10);

    dataRows.forEach(function(r) {
      // Colonne: 0=Data, 1=Operazione, 2=Dettagli, 3=Conto, 4=Contabilizzazione, 5=Categoria, 6=Valuta, 7=Importo
      var dataCella = r[0];
      if (!dataCella) return;

      var dataStr;
      if (dataCella instanceof Date) {
        dataStr = dataCella.toISOString().slice(0,10);
      } else {
        var d = new Date(String(dataCella));
        if (isNaN(d.getTime())) return;
        dataStr = d.toISOString().slice(0,10);
      }

      var operazione    = String(r[1] || '').trim();
      var dettagli      = String(r[2] || '').trim();
      var contoOCarta   = String(r[3] || '').trim().toLowerCase();
      var catBanca      = String(r[5] || '').trim().toLowerCase();
      var importoRaw    = r[7];

      // Parsing importo robusto: gestisce numeri, stringhe con virgola/punto, null
      var importo = null;
      if (importoRaw != null && importoRaw !== '') {
        var s = String(importoRaw).trim().replace(/\s/g, '');
        // Formato italiano: 1.234,56 → 1234.56
        if (/^\-?[\d\.]+,\d{1,2}$/.test(s)) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          // Formato con punto decimale: rimuovi separatori migliaia
          s = s.replace(/,(?=\d{3})/g, '');
        }
        var parsed = parseFloat(s);
        if (!isNaN(parsed)) importo = parsed;
      }

      var desc = operazione || dettagli || 'Movimento';

      // Mappa categoria banca → chiave app
      var catKey = MAPPING_BANCA[catBanca] || null;

      if (!catKey) {
        catKey = catBanca.replace(/[^a-z0-9]/g, '_').slice(0, 30) || 'altro';
        var iconMap = {
          'spesa':'bi-cart-fill', 'aliment':'bi-cart-fill',
          'ristor':'bi-cup-hot-fill', 'bar':'bi-cup-hot-fill',
          'viagg':'bi-airplane-fill', 'hotel':'bi-building-fill',
          'salut':'bi-heart-pulse-fill', 'farm':'bi-capsule-pill',
          'sport':'bi-trophy-fill', 'svago':'bi-controller',
          'tech':'bi-laptop-fill', 'infor':'bi-laptop-fill',
          'abbig':'bi-bag-heart-fill', 'moda':'bi-bag-heart-fill',
          'assic':'bi-shield-fill-check', 'poliz':'bi-shield-fill-check',
          'tassa':'bi-bank2', 'impost':'bi-bank2',
          'carb':'bi-fuel-pump-fill', 'benzin':'bi-fuel-pump-fill',
          'bonif':'bi-send-fill', 'trasfer':'bi-arrow-left-right',
        };
        var autoIcon = 'bi-tag-fill';
        Object.keys(iconMap).forEach(function(k) {
          if (catBanca.indexOf(k) !== -1) autoIcon = iconMap[k];
        });
        var catLabelNuova = r[5] ? String(r[5]).trim() : catKey;
        var aggiunta = addCategoriaCustom(catKey, catLabelNuova, autoIcon);
        if (aggiunta) catNuove.push(catLabelNuova);
      }

      var isCartaDiCredito = contoOCarta.indexOf('carta') !== -1;

      if (isCartaDiCredito) {
        var importoCarta = importo != null ? Math.abs(importo) : 0;
        // Dedup: data + descrizione + importo
        var isDup = data.carta.spese.some(function(s) {
          return s.data === dataStr && s.descrizione === desc && s.importo === importoCarta;
        });
        if (isDup) { duplicati++; return; }
        data.carta.spese.push({
          id: uid(), data: dataStr, descrizione: desc,
          importo: importoCarta, categoria: catKey,
          addebitoData: '', note: dettagli !== desc ? dettagli : '',
        });
        importatiCarta++;
      } else {
        // Determina tipo dal segno dell'importo
        var tipo;
        if (importo != null) {
          tipo = importo >= 0 ? 'entrata' : 'uscita';
        } else {
          var entrataCat = ['stipendio','investimento','bonifici_in','rimborsi','giroconto_in'];
          tipo = entrataCat.indexOf(catKey) !== -1 ? 'entrata' : 'uscita';
        }
        var importoConto = importo != null ? Math.abs(importo) : 0;
        // Dedup: data + descrizione + importo
        var isDupC = data.conto.movimenti.some(function(m) {
          return m.data === dataStr && m.descrizione === desc && m.importo === importoConto;
        });
        if (isDupC) { duplicati++; return; }
        var mov = {
          id: uid(), data: dataStr, tipo: tipo, descrizione: desc,
          importo: importoConto, categoria: catKey,
          note: dettagli !== desc ? dettagli.slice(0, 120) : '',
        };
        data.conto.movimenti.push(mov);
        data.conto.saldo = tipo === 'entrata'
          ? data.conto.saldo + importoConto
          : data.conto.saldo - importoConto;
        importatiConto++;
      }
    });

    return { importatiConto, importatiCarta, duplicati, catNuove };
  }



  function emptyState(icon, msg) {
    return '<div class="empty-state"><i class="bi ' + icon + '"></i><p>' + msg + '</p></div>';
  }

  // =============================================
  // LOAD / GET / SAVE
  // =============================================

  function loadData(incoming) {
    if (!incoming) return;
    if (incoming.conto)        data.conto        = Object.assign({ saldoIniziale: 0 }, data.conto,        incoming.conto);
    if (incoming.carta)        data.carta        = Object.assign({}, data.carta,        incoming.carta);
    if (incoming.investimenti) data.investimenti = Object.assign({}, data.investimenti, incoming.investimenti);
    if (incoming.impostazioni) data.impostazioni = Object.assign({}, data.impostazioni, incoming.impostazioni);
    renderAll();
  }

  function getData() { return JSON.parse(JSON.stringify(data)); }

  // Saldo reale = saldo iniziale + movimenti
  function getSaldoConto() {
    return (data.conto.saldoIniziale || 0) + (data.conto.saldo || 0);
  }

  function saveSaldoIniziale(valore) {
    data.conto.saldoIniziale = valore;
    renderConto(); renderDashboard(); Charts.updateAll(); saveAndSync();
    App.showToast('Saldo iniziale salvato', 'success');
  }
  function getTitoli() { return data.investimenti.titoli.filter(function(t){ return !t.venduto; }); }

  function updateQuote(id, quote) {
    var t = data.investimenti.titoli.find(function(t){ return t.id === id; });
    if (!t || !quote) return;
    t.prezzoAttuale = quote.price;
    t.change        = quote.change;
    t.changePct     = quote.changePct;
    t.currency      = quote.currency || 'EUR';
  }

  function saveAndSync() { Drive.save(getData()); }

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
    var el = $('dashDate');
    if (el) el.textContent = new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    var saldoConto = getSaldoConto();
    var totInv     = getTotaleInvestimenti();
    var totale     = saldoConto + totInv;
    var debitoCarta = getDebitoCarta();

    setEl('patrimonioTotale',  formatEur(totale));
    setEl('summaryContoValue', formatEur(saldoConto));
    setEl('summaryInvValue',   formatEur(totInv));
    setEl('summaryCreditValue',formatEur(debitoCarta));

    renderUltimeTransazioni();
  }

  function renderUltimeTransazioni() {
    var container = $('lastTransazioni');
    if (!container) return;
    var all = data.conto.movimenti.slice().sort(function(a,b){ return new Date(b.data)-new Date(a.data); }).slice(0,5);
    container.innerHTML = all.length ? all.map(function(m){ return transactionHTML(m, false); }).join('') : emptyState('bi-inbox','Nessuna transazione');
  }

  function getTotaleInvestimenti() {
    return getTitoli().reduce(function(s,t){ return s + (t.prezzoAttuale || t.prezzoAcquisto) * t.quantita; }, 0);
  }

  // =============================================
  // CONTO CORRENTE
  // =============================================

  var _contoFilterTipo = '';
  var _contoFilterMese = '';

  function renderConto() {
    setEl('contoSaldo', formatEur(getSaldoConto()));
    var now = new Date();
    var meseMov = data.conto.movimenti.filter(function(m){
      var d = new Date(m.data);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    var entrate = meseMov.filter(function(m){ return m.tipo === 'entrata'; }).reduce(function(s,m){ return s+m.importo; }, 0);
    var uscite  = meseMov.filter(function(m){ return m.tipo === 'uscita';  }).reduce(function(s,m){ return s+m.importo; }, 0);
    setEl('contoEntrate', formatEur(entrate));
    setEl('contoUscite',  formatEur(uscite));
    filterMovimenti();
  }

  function setContoFilter(tipo, btn) {
    _contoFilterTipo = tipo;
    _contoFilterMese = '';
    document.querySelectorAll('.filter-pill').forEach(function(p){ p.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    filterMovimenti();
  }

  function setContoFilterMonth(btn) {
    var now = new Date();
    _contoFilterMese = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    _contoFilterTipo = '';
    document.querySelectorAll('.filter-pill').forEach(function(p){ p.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    filterMovimenti();
  }

  function filterMovimenti() {
    var search = ($('contoSearch') ? $('contoSearch').value : '').toLowerCase();
    var tipo   = _contoFilterTipo;
    var mese   = _contoFilterMese;
    var list   = data.conto.movimenti.slice();
    if (search) list = list.filter(function(m){ return m.descrizione.toLowerCase().includes(search) || (m.note||'').toLowerCase().includes(search); });
    if (tipo)   list = list.filter(function(m){ return m.tipo === tipo; });
    if (mese)   list = list.filter(function(m){ return m.data.startsWith(mese); });
    list.sort(function(a,b){ return new Date(b.data)-new Date(a.data); });
    var container = $('contoMovimenti');
    if (!container) return;
    container.innerHTML = list.length ? list.map(function(m){ return transactionHTML(m, true); }).join('') : emptyState('bi-bank2','Nessun movimento trovato');
  }

  function setMovTipo(tipo) {
    movTipo = tipo;
    var eBtn = $('movTipoEntrata'), uBtn = $('movTipoUscita');
    if (eBtn) eBtn.classList.toggle('active', tipo === 'entrata');
    if (uBtn) uBtn.classList.toggle('active', tipo === 'uscita');
    var title = $('movHeroTitle'), icon = $('movHeroIcon');
    if (title) title.textContent = tipo === 'entrata' ? 'Nuova Entrata' : 'Nuova Uscita';
    if (icon)  icon.innerHTML    = tipo === 'entrata' ? '<i class="bi bi-arrow-down-circle-fill"></i>' : '<i class="bi bi-arrow-up-circle-fill"></i>';
  }

  function saveMovimento() {
    var data_m  = $('movData')        ? $('movData').value        : '';
    var desc    = $('movDescrizione') ? $('movDescrizione').value.trim() : '';
    var importo = parseFloat($('movImporto') ? $('movImporto').value : '');
    var cat     = $('movCategoria')   ? $('movCategoria').value   : 'altro';
    var note    = $('movNote')        ? $('movNote').value.trim() : '';
    if (!data_m || !desc || isNaN(importo) || importo <= 0) { App.showToast('Compila tutti i campi obbligatori','warning'); return; }
    var mov = { id:uid(), data:data_m, tipo:movTipo, descrizione:desc, importo:importo, categoria:cat, note:note };
    data.conto.movimenti.push(mov);
    data.conto.saldo = movTipo === 'entrata' ? data.conto.saldo + importo : data.conto.saldo - importo;
    Modals.close();
    renderConto(); renderDashboard(); Charts.updateAll(); saveAndSync();
    App.showToast('Movimento ' + movTipo + ' salvato','success');
  }

  function deleteMovimento(id) {
    var idx = data.conto.movimenti.findIndex(function(m){ return m.id === id; });
    if (idx === -1) return;
    var mov = data.conto.movimenti[idx];
    data.conto.saldo = mov.tipo === 'entrata' ? data.conto.saldo - mov.importo : data.conto.saldo + mov.importo;
    data.conto.movimenti.splice(idx, 1);
    renderConto(); renderDashboard(); Charts.updateAll(); saveAndSync();
    App.showToast('Movimento eliminato','info');
  }

  function editMovimento(id) {
    var mov = data.conto.movimenti.find(function(m){ return m.id === id; });
    if (!mov) return;
    data.conto.saldo = mov.tipo === 'entrata' ? data.conto.saldo - mov.importo : data.conto.saldo + mov.importo;
    data.conto.movimenti = data.conto.movimenti.filter(function(m){ return m.id !== id; });
    Modals.open('nuovoMovimento');
    setTimeout(function(){
      if ($('movData'))        $('movData').value        = mov.data;
      if ($('movDescrizione')) $('movDescrizione').value = mov.descrizione;
      if ($('movImporto'))     $('movImporto').value     = mov.importo;
      if ($('movNote'))        $('movNote').value        = mov.note || '';
      populateCategorieSelect('movCategoria', mov.categoria);
      setMovTipo(mov.tipo);
    }, 50);
    renderConto(); renderDashboard();
  }

  // =============================================
  // CARTA DI CREDITO
  // =============================================

  function renderCarta() {
    setEl('ccLastDigits', data.carta.lastDigits || '0000');
    setEl('ccHolder',     data.carta.holder     || '—');
    setEl('ccExpiry',     data.carta.expiry      || '—');
    var now  = new Date();
    var mese = data.carta.spese.filter(function(s){
      var d = new Date(s.data);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    var totMese = mese.reduce(function(s,sp){ return s+sp.importo; }, 0);
    setEl('cartaSpeseMese', formatEur(totMese));
    var giorno   = data.carta.giornoAddebito || 15;
    var prossima = new Date(now.getFullYear(), now.getMonth(), giorno);
    if (prossima <= now) prossima = new Date(now.getFullYear(), now.getMonth()+1, giorno);
    setEl('cartaScadenza', prossima.toLocaleDateString('it-IT'));
    var pct = data.carta.plafond > 0 ? Math.min(100, (totMese / data.carta.plafond) * 100) : 0;
    setEl('cartaPlafond', pct.toFixed(1) + '%');
    filterSpese();
  }

  function filterSpese() {
    var search = ($('cartaSearch') ? $('cartaSearch').value : '').toLowerCase();
    var mese   = $('cartaFilterMonth') ? $('cartaFilterMonth').value : '';
    var list   = data.carta.spese.slice();
    if (search) list = list.filter(function(s){ return s.descrizione.toLowerCase().includes(search); });
    if (mese)   list = list.filter(function(s){ return s.data.startsWith(mese); });
    list.sort(function(a,b){ return new Date(b.data)-new Date(a.data); });
    var container = $('cartaMovimenti');
    if (!container) return;
    container.innerHTML = list.length ? list.map(cartaSpesaHTML).join('') : emptyState('bi-credit-card','Nessuna spesa trovata');
  }

  function saveSpesaCarta() {
    var data_s  = $('cartaData')        ? $('cartaData').value        : '';
    var desc    = $('cartaDescrizione') ? $('cartaDescrizione').value.trim() : '';
    var importo = parseFloat($('cartaImporto') ? $('cartaImporto').value : '');
    var cat     = $('cartaCategoria')   ? $('cartaCategoria').value   : 'altro';
    var addebito= $('cartaAddebito')    ? $('cartaAddebito').value    : '';
    if (!data_s || !desc || isNaN(importo) || importo <= 0) { App.showToast('Compila tutti i campi obbligatori','warning'); return; }
    data.carta.spese.push({ id:uid(), data:data_s, descrizione:desc, importo:importo, categoria:cat, addebitoData:addebito });
    Modals.close(); renderCarta(); saveAndSync();
    App.showToast('Spesa carta salvata','success');
  }

  function deleteSpesaCarta(id) {
    data.carta.spese = data.carta.spese.filter(function(s){ return s.id !== id; });
    renderCarta(); saveAndSync();
    App.showToast('Spesa eliminata','info');
  }

  function editSpesaCarta(id) {
    var spesa = data.carta.spese.find(function(s){ return s.id === id; });
    if (!spesa) return;
    data.carta.spese = data.carta.spese.filter(function(s){ return s.id !== id; });
    Modals.open('nuovaSpesaCarta');
    setTimeout(function(){
      if ($('cartaData'))        $('cartaData').value        = spesa.data;
      if ($('cartaDescrizione')) $('cartaDescrizione').value = spesa.descrizione;
      if ($('cartaImporto'))     $('cartaImporto').value     = spesa.importo;
      if ($('cartaAddebito'))    $('cartaAddebito').value    = spesa.addebitoData || '';
      populateCategorieSelect('cartaCategoria', spesa.categoria);
    }, 50);
    renderCarta();
  }

  function saveImpostazioniCarta() {
    data.carta.holder         = $('ccHolderInput')    ? $('ccHolderInput').value.trim()  : '';
    data.carta.lastDigits     = $('ccLastInput')      ? $('ccLastInput').value.trim()    : '0000';
    data.carta.expiry         = $('ccExpiryInput')    ? $('ccExpiryInput').value.trim()  : '';
    data.carta.plafond        = parseFloat($('ccPlafondInput')    ? $('ccPlafondInput').value    : '5000') || 5000;
    data.carta.giornoAddebito = parseInt($('ccGiornoAddebito')    ? $('ccGiornoAddebito').value  : '15')   || 15;
    Modals.close(); renderCarta(); saveAndSync();
    App.showToast('Impostazioni carta salvate','success');
  }

  function getDebitoCarta() {
    var oggi = new Date().toISOString().slice(0,10);
    return data.carta.spese.filter(function(s){ return !s.addebitoData || s.addebitoData > oggi; }).reduce(function(s,sp){ return s+sp.importo; }, 0);
  }

  // =============================================
  // INVESTIMENTI
  // =============================================

  function showTab(tab, btn) {
    activeTab = tab;
    document.querySelectorAll('.inv-tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(t){ t.classList.remove('active'); t.classList.add('hidden'); });
    if (btn) btn.classList.add('active');
    var tc = $('tab-' + tab);
    if (tc) { tc.classList.add('active'); tc.classList.remove('hidden'); }
    renderTitoliTab(tab);
    renderInvSummary();
  }

  function renderInvestimenti() {
    renderTitoliTab(activeTab);
    renderInvSummary();
  }

  function renderInvSummary() {
    var titoli        = getTitoli();
    var valoreAttuale = titoli.reduce(function(s,t){ return s+(t.prezzoAttuale||t.prezzoAcquisto)*t.quantita; }, 0);
    var costoTotale   = titoli.reduce(function(s,t){ return s+(t.pmc||t.prezzoAcquisto)*t.quantita; }, 0);
    var pl            = valoreAttuale - costoTotale;
    var rend          = costoTotale > 0 ? (pl/costoTotale)*100 : 0;
    setEl('invValoreAttuale', formatEur(valoreAttuale));
    setEl('invCostoTotale',   formatEur(costoTotale));
    setEl('invPL',            formatEurSigned(pl));
    setEl('invRendimento',    formatPct(rend));
    var plEl   = $('invPL');      if (plEl)   plEl.className   = 'inv-sum-val ' + (pl   >= 0 ? 'inv-pl-pos' : 'inv-pl-neg');
    var rendEl = $('invRendimento'); if (rendEl) rendEl.className = 'inv-sum-val ' + (rend >= 0 ? 'inv-pl-pos' : 'inv-pl-neg');
  }

  function renderTitoliTab(tab) {
    var tipoMap = { azioni:'azione', fondi:'fondo', certificates:'certificate', pir:'pir', polizze:'polizza' };
    var tipo    = tipoMap[tab];
    var listId  = 'lista' + tab.charAt(0).toUpperCase() + tab.slice(1);
    var container = $(listId);
    if (!container) return;
    var lista = getTitoli().filter(function(t){ return t.tipo === tipo; });
    container.innerHTML = lista.length ? lista.map(titoloCardHTML).join('') : emptyState('bi-graph-up','Nessun titolo in questa categoria');
  }

  function titoloCardHTML(t) {
    var prezzo = t.prezzoAttuale || t.prezzoAcquisto;
    var pmc    = t.pmc || t.prezzoAcquisto;
    var valore = prezzo * t.quantita;
    var costo  = pmc * t.quantita;
    var pl     = valore - costo;
    var plPct  = costo > 0 ? (pl/costo)*100 : 0;
    var dayPos = (t.changePct||0) >= 0;
    var isPos  = pl >= 0;
    var col    = tipoColor(t.tipo);
    var av     = avatarLetters(t.nome);
    var ticker = t.ticker || t.codeZB || tipoLabel(t.tipo);
    var logoSrc= 'icons/titoli/' + (t.ticker || t.codeZB || '') + '.png';

    return '<div class="titolo-card-new" onclick="Portfolio.openTitoloSheet(\'' + t.id + '\')">' +
      '<div class="tc-top">' +
        '<div class="tc-avatar" style="background:' + col.bg + ';color:' + col.fg + ';position:relative;overflow:hidden">' +
          '<img src="' + logoSrc + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:11px" ' +
            'onerror="this.style.display=\'none\'" />' +
          '<span>' + escHtml(av) + '</span>' +
        '</div>' +
        '<div class="tc-info">' +
          '<div class="tc-nome">' + escHtml(t.nome) + '</div>' +
          '<div class="tc-sub">' + escHtml(ticker) + ' · ' + formatNum(t.quantita) + ' ' + (t.tipo==='azione'?'az.':'quote') + '</div>' +
        '</div>' +
        '<div class="tc-price-box">' +
          '<div class="tc-price">' + formatEur(prezzo, 4) + '</div>' +
          '<div class="tc-chg ' + (dayPos?'pos':'neg') + '">' +
            '<i class="bi bi-arrow-' + (dayPos?'up':'down') + '-right"></i> ' + formatPct(t.changePct||0) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="tc-stats">' +
        '<div class="tc-stat"><div class="tc-stat-label">Valore</div><div class="tc-stat-val">' + formatEur(valore) + '</div></div>' +
        '<div class="tc-stat"><div class="tc-stat-label">PMC</div><div class="tc-stat-val">' + formatEur(pmc,4) + '</div></div>' +
        '<div class="tc-stat"><div class="tc-stat-label">P&amp;L</div><div class="tc-stat-val ' + (isPos?'pos':'neg') + '">' + formatEurSigned(pl) + '</div></div>' +
        '<div class="tc-stat"><div class="tc-stat-label">Rend.</div><div class="tc-stat-val ' + (isPos?'pos':'neg') + '">' + formatPct(plPct) + '</div></div>' +
      '</div>' +
    '</div>';
  }

  // ---- Bottom Sheet ----
  function openTitoloSheet(id) {
    var t = data.investimenti.titoli.find(function(x){ return x.id === id; });
    if (!t) return;
    var overlay = $('titoloSheetOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'titoloSheetOverlay';
      overlay.className = 'sheet-overlay';
      overlay.onclick = function(e){ if (e.target === overlay) closeTitoloSheet(); };
      document.body.appendChild(overlay);
    }
    overlay.innerHTML =
      '<div class="sheet" onclick="event.stopPropagation()">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title">' + escHtml(t.nome) + '</div>' +
        '<div class="sheet-item" onclick="Portfolio.apriDettaglio(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#EFF6FF;color:#1E3A8A"><i class="bi bi-bar-chart-line"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Dettaglio</div><div class="sheet-item-sub">Grafico storico, operazioni e statistiche</div></div>' +
          '<i class="bi bi-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
        '<div class="sheet-item" onclick="Portfolio.editTitolo(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#F4F6FB;color:#64748B"><i class="bi bi-pencil"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Modifica titolo</div><div class="sheet-item-sub">Modifica dati e operazioni</div></div>' +
          '<i class="bi bi-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
        (!t.ticker && !t.codeZB ?
        '<div class="sheet-item" onclick="Portfolio.aggiornaValoreManuale(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#F0FDF4;color:#16A34A"><i class="bi bi-pencil-square"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Aggiorna valore</div><div class="sheet-item-sub">Inserisci manualmente il valore attuale</div></div>' +
          '<i class="bi bi-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' : '') +
        '<div class="sheet-item" onclick="Portfolio.nuovoAcquisto(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#F0FDF4;color:#16A34A"><i class="bi bi-plus-circle"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Nuovo acquisto</div><div class="sheet-item-sub">Aggiungi quote alla posizione esistente</div></div>' +
          '<i class="bi bi-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
        '<div class="sheet-item" onclick="Portfolio.vendeTitoloById(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#FEF2F2;color:#DC2626"><i class="bi bi-cash-coin"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Vendi</div><div class="sheet-item-sub">Registra una vendita parziale o totale</div></div>' +
          '<i class="bi bi-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
      '</div>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function aggiornaValoreManuale(id) {
    var t = data.investimenti.titoli.find(function(x){ return x.id === id; });
    if (!t) return;
    var valoreAttuale = formatEur(t.prezzoAttuale || t.pmc, 2);

    // Crea dialog con input
    var overlay = document.getElementById('dialogOverlay');
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="dialog-box">' +
        '<div class="dialog-body">' +
          '<i class="bi bi-pencil-square" style="color:var(--primary);font-size:24px;display:block;margin-bottom:10px"></i>' +
          '<strong>' + escHtml(t.nome) + '</strong>' +
          '<span style="font-size:13px;color:var(--text-muted);display:block;margin:6px 0 14px">Valore attuale: ' + valoreAttuale + '</span>' +
          '<input id="dialogValoreInput" type="number" step="0.01" min="0" ' +
            'placeholder="Nuovo valore (€)" ' +
            'style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;font-family:inherit;outline:none;box-sizing:border-box" ' +
            'value="' + (t.prezzoAttuale || t.pmc || '') + '" />' +
        '</div>' +
        '<div class="dialog-footer">' +
          '<button class="btn btn--ghost dialog-cancel">Annulla</button>' +
          '<button class="btn btn--primary dialog-ok">Salva</button>' +
        '</div>' +
      '</div>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus sull'input
    setTimeout(function() {
      var inp = document.getElementById('dialogValoreInput');
      if (inp) { inp.focus(); inp.select(); }
    }, 100);

    overlay.querySelector('.dialog-cancel').onclick = function() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };
    overlay.querySelector('.dialog-ok').onclick = function() {
      var inp = document.getElementById('dialogValoreInput');
      var nuovo = parseFloat(inp ? inp.value : '');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (isNaN(nuovo) || nuovo < 0) {
        App.showToast('Valore non valido', 'warning');
        return;
      }
      t.prezzoAttuale = nuovo;
      t.change = 0; t.changePct = 0;
      renderInvestimenti(); renderDashboard(); Charts.updateAll(); saveAndSync();
      App.showToast(t.nome + ': valore aggiornato a ' + formatEur(nuovo), 'success');
    };

    // Conferma con Enter
    overlay.querySelector('#dialogValoreInput') && overlay.querySelector('#dialogValoreInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') overlay.querySelector('.dialog-ok').click();
    });
  }

  function closeTitoloSheet() {
    var overlay = $('titoloSheetOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ---- Wizard ----
  var wizardSubs = [
    'Seleziona il tipo di strumento',
    'Dati identificativi del titolo',
    'Acquisto e costo di carico',
  ];
  var tipoHints = {
    azione:      'Le azioni quotate su Borsa Italiana usano il suffisso .MI nel ticker (es. ENI.MI).',
    fondo:       'Per i fondi usa il codice ISIN o il ticker Yahoo Finance (es. VEUR.AS).',
    certificate: 'I certificates usano il codice Zonebourse. Il ticker Yahoo potrebbe non essere disponibile.',
    pir:         'I PIR sono fondi con agevolazioni fiscali italiane. Usa il ticker o il codice ISIN.',
    polizza:     'Le polizze vita non hanno quotazioni automatiche. Il valore viene aggiornato manualmente.',
  };

  function wizardGoTo(n) {
    wizardStep = n;
    document.querySelectorAll('.wizard-content').forEach(function(el){ el.classList.remove('active'); el.classList.add('hidden'); });
    var sc = $('wstep' + n);
    if (sc) { sc.classList.remove('hidden'); sc.classList.add('active'); }
    for (var i = 1; i <= wizardTot; i++) {
      var s = $('ws' + i); if (!s) continue;
      s.classList.remove('active','done');
      if (i < n) s.classList.add('done');
      else if (i === n) s.classList.add('active');
      if (i < wizardTot) { var l = $('wl' + i); if (l) l.classList.toggle('done', i < n); }
    }
    var sub = $('wizardSub'); if (sub) sub.textContent = wizardSubs[n-1];
    var counter = $('wizardCounter'); if (counter) counter.textContent = 'Passo ' + n + ' di ' + wizardTot;
    var back = $('wizardBack'); if (back) back.style.display = n > 1 ? 'inline-flex' : 'none';
    var next = $('wizardNext');
    if (next) next.innerHTML = n === wizardTot
      ? '<i class="bi bi-check-lg"></i> Aggiungi'
      : 'Avanti <i class="bi bi-chevron-right"></i>';
  }

  function wizardNext() { if (wizardStep < wizardTot) wizardGoTo(wizardStep+1); else saveTitolo(); }
  function wizardPrev() { if (wizardStep > 1) wizardGoTo(wizardStep-1); }

  function wizardReset() {
    wizardStep = 1;
    wizardGoTo(1);
    document.querySelectorAll('.tipo-card').forEach(function(c){ c.classList.remove('active'); });
    var first = document.querySelector('.tipo-card');
    if (first) { first.classList.add('active'); setTipoCard(first); }
  }

  function setTipoCard(el) {
    if (!el) return;
    document.querySelectorAll('.tipo-card').forEach(function(c){ c.classList.remove('active'); });
    el.classList.add('active');
    var tipo = el.dataset.tipo;
    var hint = $('tipoHint'); if (hint) hint.textContent = tipoHints[tipo] || '';
    var zbG = $('titoloZBGroup'), yhG = $('titoloYahooGroup');
    if (tipo === 'certificate') { if (zbG) zbG.style.display=''; if (yhG) yhG.style.display='none'; }
    else { if (zbG) zbG.style.display='none'; if (yhG) yhG.style.display=''; }
  }

  function calcCostoCarico() {
    var q = parseFloat($('titoloQuantita')      ? $('titoloQuantita').value      : '') || 0;
    var p = parseFloat($('titoloPrezzoAcquisto')? $('titoloPrezzoAcquisto').value: '') || 0;
    var k = parseFloat($('titoloCambio')        ? $('titoloCambio').value        : '') || 1;
    var c = parseFloat($('titoloCommissioni')   ? $('titoloCommissioni').value   : '') || 0;
    var t = parseFloat($('titoloTasse')         ? $('titoloTasse').value         : '') || 0;
    var r = parseFloat($('titoloRateo')         ? $('titoloRateo').value         : '') || 0;
    var val = $('titoloValuta') ? $('titoloValuta').value : 'EUR';
    var cv = q*p*k, oneri = c+t+r, tot = cv+oneri, pmc = q>0 ? tot/q : 0;
    function fmtV(n){ return new Intl.NumberFormat('it-IT',{style:'currency',currency:val,minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}).format(n||0); }
    setEl('costoControvalore', fmtV(cv));
    setEl('costoOneri',        fmtV(oneri));
    setEl('costoQty',          q%1===0 ? String(q) : q.toFixed(3));
    setEl('costoTotale',       fmtV(tot));
    setEl('costoPmc',          fmtV(pmc));
  }

  function saveTitolo() {
    var tipoEl  = document.querySelector('.tipo-card.active');
    var tipo    = tipoEl ? tipoEl.dataset.tipo : 'azione';
    var nome    = $('titoloNome')          ? $('titoloNome').value.trim()          : '';
    var ticker  = $('titoloTicker')        ? $('titoloTicker').value.trim().toUpperCase() : '';
    var codeZB  = $('titoloCodeZB')        ? $('titoloCodeZB').value.trim()        : '';
    var isin    = $('titoloIsin')          ? $('titoloIsin').value.trim().toUpperCase() : '';
    var wkn     = $('titoloWkn')           ? $('titoloWkn').value.trim()           : '';
    var mercato = $('titoloMercato')       ? $('titoloMercato').value              : 'MIL';
    var valuta  = $('titoloValuta')        ? $('titoloValuta').value               : 'EUR';
    var dataAcq = $('titoloDataAcquisto')  ? $('titoloDataAcquisto').value         : '';
    var quantita= parseFloat($('titoloQuantita')       ? $('titoloQuantita').value       : '');
    var prezzo  = parseFloat($('titoloPrezzoAcquisto') ? $('titoloPrezzoAcquisto').value : '');
    var cambio  = parseFloat($('titoloCambio')         ? $('titoloCambio').value         : '') || 1;
    var comm    = parseFloat($('titoloCommissioni')    ? $('titoloCommissioni').value    : '') || 0;
    var tasse   = parseFloat($('titoloTasse')          ? $('titoloTasse').value          : '') || 0;
    var rateo   = parseFloat($('titoloRateo')          ? $('titoloRateo').value          : '') || 0;
    var addebito= $('titoloAddebitoConto') ? $('titoloAddebitoConto').checked      : true;
    var note    = $('titoloNote')          ? $('titoloNote').value.trim()           : '';

    if (!nome || !dataAcq || isNaN(quantita) || isNaN(prezzo) || quantita<=0 || prezzo<=0) {
      App.showToast('Compila tutti i campi obbligatori','warning'); return;
    }
    var cv      = quantita * prezzo * cambio;
    var oneri   = comm + tasse + rateo;
    var costoTot= cv + oneri;
    var pmc     = quantita > 0 ? costoTot/quantita : prezzo;

    var titolo = {
      id: uid(), tipo: tipo, nome: nome,
      ticker: tipo !== 'certificate' ? ticker : null,
      codeZB: tipo === 'certificate' ? codeZB : null,
      isin: isin, wkn: wkn, mercato: mercato, valuta: valuta,
      dataAcquisto: dataAcq, quantita: quantita,
      prezzoAcquisto: prezzo, cambio: cambio,
      commissioni: comm, tasse: tasse, rateo: rateo,
      costoTotale: costoTot, pmc: pmc,
      prezzoAttuale: prezzo, change: 0, changePct: 0,
      currency: valuta, note: note, venduto: false,
      operazioni: [{ data:dataAcq, tipo:'acquisto', quantita:quantita, prezzo:prezzo, cambio:cambio, comm:comm, tasse:tasse, rateo:rateo, costoTot:costoTot }],
    };
    // Se stiamo modificando, rimuovi il vecchio titolo e ripristina saldo
    if (_editingTitolo) {
      data.investimenti.titoli = data.investimenti.titoli.filter(function(x){ return x.id !== _editingTitolo.id; });
      if (_editingTitolo.costoTotale) {
        data.conto.saldo += _editingTitolo.costoTotale;
        data.conto.movimenti = data.conto.movimenti.filter(function(m){
          return !(m.descrizione === 'Acquisto ' + _editingTitolo.nome && m.data === _editingTitolo.dataAcquisto);
        });
      }
      titolo.id = _editingTitolo.id; // mantieni stesso ID
      titolo.operazioni = _editingTitolo.operazioni || titolo.operazioni; // mantieni storico operazioni
      _editingTitolo = null;
    }

    data.investimenti.titoli.push(titolo);

    if (addebito) {
      var mov = { id:uid(), data:dataAcq, tipo:'uscita', descrizione:'Acquisto '+nome, importo:costoTot, categoria:'investimento', note:quantita+' × '+formatEur(prezzo,4)+' | Comm: '+formatEur(comm)+' | PMC: '+formatEur(pmc,4) };
      data.conto.movimenti.push(mov);
      data.conto.saldo -= costoTot;
    }
    Modals.close(); renderAll(); Charts.updateAll(); saveAndSync();
    App.showToast(nome + ' aggiunto al portafoglio','success');
    setTimeout(function(){
      Quotes.fetchQuote(titolo).then(function(q){ if(q){ updateQuote(titolo.id,q); renderInvestimenti(); } });
    }, 500);
  }

  var _editingTitolo = null; // titolo in corso di modifica

  function editTitolo(id) {
    var t = data.investimenti.titoli.find(function(x){ return x.id===id; });
    if (!t) return;
    dettaglioId = id;
    _editingTitolo = JSON.parse(JSON.stringify(t)); // salva copia originale

    Modals.open('nuovoTitolo');
    setTimeout(function(){
      document.querySelectorAll('.tipo-card').forEach(function(c){ c.classList.toggle('active', c.dataset.tipo===t.tipo); });
      setTipoCard(document.querySelector('.tipo-card[data-tipo="'+t.tipo+'"]') || document.querySelector('.tipo-card'));
      var fields = {
        titoloNome:t.nome, titoloTicker:t.ticker||'', titoloCodeZB:t.codeZB||'',
        titoloIsin:t.isin||'', titoloWkn:t.wkn||'', titoloNote:t.note||'',
        titoloDataAcquisto:t.dataAcquisto, titoloQuantita:t.quantita,
        titoloPrezzoAcquisto:t.prezzoAcquisto, titoloCambio:t.cambio||1,
        titoloCommissioni:t.commissioni||0, titoloTasse:t.tasse||0, titoloRateo:t.rateo||0
      };
      Object.keys(fields).forEach(function(k){ var el=$(k); if(el) el.value=fields[k]||''; });
      var v=$('titoloValuta'); if(v) v.value=t.valuta||'EUR';
      var m=$('titoloMercato'); if(m) m.value=t.mercato||'MIL';
      wizardGoTo(2); calcCostoCarico();
    }, 80);
  }

  function nuovoAcquisto(id) {
    var t = data.investimenti.titoli.find(function(x){ return x.id===id; });
    if (!t) return;
    Modals.open('nuovoTitolo');
    setTimeout(function(){
      document.querySelectorAll('.tipo-card').forEach(function(c){ c.classList.toggle('active', c.dataset.tipo===t.tipo); });
      setTipoCard(document.querySelector('.tipo-card[data-tipo="'+t.tipo+'"]') || document.querySelector('.tipo-card'));
      if($('titoloNome'))    $('titoloNome').value    = t.nome;
      if($('titoloTicker'))  $('titoloTicker').value  = t.ticker||'';
      if($('titoloCodeZB'))  $('titoloCodeZB').value  = t.codeZB||'';
      if($('titoloIsin'))    $('titoloIsin').value     = t.isin||'';
      if($('titoloWkn'))     $('titoloWkn').value      = t.wkn||'';
      if($('titoloMercato')) $('titoloMercato').value  = t.mercato||'MIL';
      if($('titoloValuta'))  $('titoloValuta').value   = t.valuta||'EUR';
      if($('titoloDataAcquisto')) $('titoloDataAcquisto').value = new Date().toISOString().slice(0,10);
      wizardGoTo(3); calcCostoCarico();
    }, 80);
  }

  function vendeTitoloById(id) { dettaglioId = id; vendeTitolo(); }

  // ---- Dettaglio ----
  function getEditingTitolo() { return _editingTitolo; }

  function getDettaglioId() { return dettaglioId; }

  function restoreEditingTitolo() {
    if (!_editingTitolo) return;
    // Ripristina il titolo originale se non è già presente
    var exists = data.investimenti.titoli.find(function(x){ return x.id === _editingTitolo.id; });
    if (!exists) data.investimenti.titoli.push(_editingTitolo);
    _editingTitolo = null;
    renderInvestimenti();
  }

  function apriDettaglio(id) {
    var t = data.investimenti.titoli.find(function(x){ return x.id===id; });
    if (!t) return;
    dettaglioId = id;
    _detPeriod  = '1M';

    var prezzo = t.prezzoAttuale || t.prezzoAcquisto;
    var pmc    = t.pmc || t.prezzoAcquisto;
    var valore = prezzo * t.quantita;
    var costo  = pmc * t.quantita;
    var pl     = valore - costo;
    var plPct  = costo > 0 ? (pl/costo)*100 : 0;
    var dayPos = (t.changePct||0) >= 0;
    var isPos  = pl >= 0;
    var col    = tipoColor(t.tipo);
    var ticker = t.ticker || t.codeZB || '';

    // Logo
    var logoWrap = $('detLogoWrap'), logoImg = $('detLogoImg'), logoFb = $('detLogoFallback');
    if (logoWrap) { logoWrap.style.background=col.bg; logoWrap.style.color=col.fg; }
    if (logoImg && logoFb) {
      logoFb.style.display='block'; logoFb.textContent=avatarLetters(t.nome);
      logoImg.src = 'icons/titoli/' + ticker + '.png';
      logoImg.onload  = function(){ logoImg.style.display='block'; logoFb.style.display='none'; };
      logoImg.onerror = function(){ logoImg.style.display='none';  logoFb.style.display='block'; };
    }

    setEl('detTitoloNome', t.nome);
    setEl('detTitoloSub', (ticker||'—') + ' · ' + (t.mercato||'Borsa Italiana') + ' · ' + formatNum(t.quantita) + (t.tipo==='azione' ? ' az.' : ' quote'));
    setEl('detPrezzo', formatEur(prezzo, 4));

    var chgBadge = $('detChgBadge');
    if (chgBadge) { chgBadge.textContent = (dayPos?'+':'') + formatEur(t.change||0,4) + ' (' + formatPct(t.changePct||0) + ') oggi'; chgBadge.className='det-chg-badge '+(dayPos?'pos':'neg'); }
    var tipoBadge = $('detTipoBadge'); if (tipoBadge) tipoBadge.textContent = tipoLabel(t.tipo);

    var statsGrid = $('detStatsGrid');
    if (statsGrid) {
      var stats = [
        { label:'Valore pos.', val:formatEur(valore),       cls:'' },
        { label:'P&L tot.',    val:formatEurSigned(pl),     cls:isPos?'pos':'neg' },
        { label:'Rendimento',  val:formatPct(plPct),        cls:isPos?'pos':'neg' },
        { label:'PMC',         val:formatEur(pmc,4),        cls:'' },
        { label:'Costo tot.',  val:formatEur(costo),        cls:'' },
        { label:'Var. giorn.', val:formatPct(t.changePct||0), cls:dayPos?'pos':'neg' },
      ];
      statsGrid.innerHTML = stats.map(function(s){
        return '<div class="det-stat-item"><div class="det-stat-label">'+s.label+'</div><div class="det-stat-val '+s.cls+'">'+s.val+'</div></div>';
      }).join('');
    }

    var infoGrid = $('detInfoGrid');
    if (infoGrid) {
      var rows = [ {label:'ISIN',val:t.isin||'—'},{label:'WKN',val:t.wkn||'—'},{label:'Valuta',val:t.valuta||'EUR'},{label:'Data acquisto',val:formatDate(t.dataAcquisto)},{label:'Commissioni',val:formatEur(t.commissioni||0)},{label:'Tasse / Bolli',val:formatEur(t.tasse||0)} ];
      infoGrid.innerHTML = rows.map(function(r){ return '<div class="det-info-item"><div class="det-info-label">'+r.label+'</div><div class="det-info-val">'+escHtml(r.val)+'</div></div>'; }).join('');
    }

    renderDetOperazioni(t);
    Modals.open('dettaglioTitolo');
    setTimeout(function(){ loadDetChart(t, _detPeriod); }, 200);
  }

  function renderDetOperazioni(t) {
    var container = $('detOperazioni'); if (!container) return;
    var ops = (t.operazioni||[]).slice().reverse();
    if (!ops.length) { container.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Nessuna operazione registrata</div>'; return; }
    container.innerHTML = ops.map(function(op, idx){
      var isAcq = op.tipo==='acquisto';
      var totOp = op.costoTot || (op.quantita*op.prezzo);
      var realIdx = ops.length-1-idx;
      return '<div class="det-op-item">' +
        '<div class="det-op-icon" style="background:'+(isAcq?'var(--primary-light)':'var(--danger-light)')+';color:'+(isAcq?'var(--primary-mid)':'var(--danger)')+'"><i class="bi bi-cart-'+(isAcq?'plus':'dash')+'"></i></div>' +
        '<div class="det-op-body"><div class="det-op-tipo">'+(isAcq?'Acquisto':'Vendita')+'</div><div class="det-op-meta">'+formatDate(op.data)+' · '+formatNum(op.quantita)+' × '+formatEur(op.prezzo,4)+(op.comm?' · Comm. '+formatEur(op.comm):'')+' </div></div>' +
        '<div><div class="det-op-amt '+(isAcq?'neg':'pos')+'">'+(isAcq?'-':'+')+formatEur(totOp)+'</div>' +
        '<div style="display:flex;gap:4px;justify-content:flex-end;margin-top:4px">' +
          '<button class="det-op-btn" onclick="Portfolio.deleteOperazione(\''+t.id+'\','+realIdx+')" title="Elimina"><i class="bi bi-trash3"></i></button>' +
        '</div></div>' +
      '</div>';
    }).join('');
  }

  async function deleteOperazione(titoloId, opIdx) {
    var t = data.investimenti.titoli.find(function(x){ return x.id===titoloId; });
    if (!t || !t.operazioni[opIdx]) return;
    var ok = await Dialog.confirmDanger(
      '<i class="bi bi-trash3-fill" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Elimina operazione</strong><br><span style="font-size:13px;color:var(--text-muted)">Questa azione non può essere annullata.</span>',
      'Elimina', 'Annulla'
    );
    if (!ok) return;
    t.operazioni.splice(opIdx,1);
    renderDetOperazioni(t); saveAndSync();
    App.showToast('Operazione eliminata','info');
  }

  function loadDetChart(t, period) {
    var loading = $('detChartLoading'); if (loading) loading.style.display='flex';
    if (_detChart) { _detChart.destroy(); _detChart=null; }
    Quotes.fetchHistory(t, period).then(function(history){
      if (loading) loading.style.display='none';
      var canvas = $('detChart'); if (!canvas) return;
      var pmc    = t.pmc || t.prezzoAcquisto;
      var labels = history.map(function(p){ return new Date(p.date+'T00:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'}); });
      var values = history.map(function(p){ return p.close; });
      if (!values.length) return;
      var first=values[0], last=values[values.length-1];
      var color  = last>=first ? '#16A34A' : '#DC2626';
      var bgAlpha= last>=first ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.06)';
      var ctx    = canvas.getContext('2d');
      var grad   = ctx.createLinearGradient(0,0,0,140);
      grad.addColorStop(0, bgAlpha); grad.addColorStop(1,'rgba(255,255,255,0)');
      _detChart = new Chart(canvas, {
        type:'line',
        data:{ labels:labels, datasets:[
          { label:'Prezzo', data:values, borderColor:color, backgroundColor:grad, borderWidth:2, pointRadius:0, pointHoverRadius:5, tension:0.3, fill:true },
          { label:'PMC', data:Array(values.length).fill(pmc), borderColor:'rgba(148,163,184,.6)', borderWidth:1.5, borderDash:[4,4], pointRadius:0, fill:false },
        ]},
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:true, position:'bottom', labels:{ usePointStyle:true, font:{ size:11, family:'Plus Jakarta Sans' }, padding:12 }},
            tooltip:{ mode:'index', intersect:false, callbacks:{ label:function(ctx){ return ctx.dataset.label+': '+formatEur(ctx.parsed.y,4); }}}},
          scales:{ x:{ grid:{display:false}, ticks:{ maxTicksLimit:6, font:{size:10,family:'Plus Jakarta Sans'}}}, y:{ grid:{color:'#F1F5F9'}, ticks:{ callback:function(v){ return formatEur(v,2); }, font:{size:10,family:'Plus Jakarta Sans'}}}}
        },
      });
    });
  }

  function setDetPeriod(period, btn) {
    _detPeriod = period;
    document.querySelectorAll('.det-pp').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var t = data.investimenti.titoli.find(function(x){ return x.id===dettaglioId; });
    if (t) loadDetChart(t, period);
  }

  // ---- Vendi ----
  function vendeTitolo() {
    if (!dettaglioId) return;
    var t = data.investimenti.titoli.find(function(x){ return x.id===dettaglioId; });
    if (!t) return;
    var prezzoVendita = t.prezzoAttuale || t.prezzoAcquisto;
    var importoTot    = prezzoVendita * t.quantita;
    t.operazioni.push({ data:new Date().toISOString().slice(0,10), tipo:'vendita', quantita:t.quantita, prezzo:prezzoVendita, costoTot:importoTot });
    t.venduto = true;
    var mov = { id:uid(), data:new Date().toISOString().slice(0,10), tipo:'entrata', descrizione:'Vendita '+t.nome, importo:importoTot, categoria:'investimento', note:t.quantita+' × '+formatEur(prezzoVendita,4) };
    data.conto.movimenti.push(mov);
    data.conto.saldo += importoTot;
    Modals.close(); renderAll(); Charts.updateAll(); saveAndSync();
    App.showToast(t.nome+' venduto: '+formatEur(importoTot)+' accreditati sul conto','success');
  }

  // =============================================
  // HTML HELPERS
  // =============================================

  function transactionHTML(m, showActions) {
    var isPos  = m.tipo==='entrata';
    var icon   = catIcon(m.categoria);
    var color  = isPos ? 'summary-card__icon--green' : 'summary-card__icon--red';
    var amount = isPos ? '+'+formatEur(m.importo) : '-'+formatEur(m.importo);
    var cls    = isPos ? 'transaction-amount--positive' : 'transaction-amount--negative';
    return '<div class="transaction-item">' +
      '<div class="transaction-icon '+color+'"><i class="bi '+icon+'"></i></div>' +
      '<div class="transaction-body"><div class="transaction-desc">'+escHtml(m.descrizione)+'</div><div class="transaction-meta">'+formatDate(m.data)+' · '+catLabel(m.categoria)+'</div></div>' +
      '<div class="transaction-amount '+cls+'">'+amount+'</div>' +
      (showActions ? '<div class="transaction-actions"><button class="action-btn" onclick="Portfolio.editMovimento(\''+m.id+'\')" title="Modifica"><i class="bi bi-pencil"></i></button><button class="action-btn" onclick="Portfolio.deleteMovimento(\''+m.id+'\')" title="Elimina"><i class="bi bi-trash3"></i></button></div>' : '') +
    '</div>';
  }

  function cartaSpesaHTML(s) {
    return '<div class="transaction-item">' +
      '<div class="transaction-icon summary-card__icon--purple"><i class="bi '+catIcon(s.categoria)+'"></i></div>' +
      '<div class="transaction-body"><div class="transaction-desc">'+escHtml(s.descrizione)+'</div><div class="transaction-meta">'+formatDate(s.data)+' · '+catLabel(s.categoria)+(s.addebitoData?' · Addebito: '+formatDate(s.addebitoData):'')+' </div></div>' +
      '<div class="transaction-amount transaction-amount--negative">-'+formatEur(s.importo)+'</div>' +
      '<div class="transaction-actions"><button class="action-btn" onclick="Portfolio.editSpesaCarta(\''+s.id+'\')" title="Modifica"><i class="bi bi-pencil"></i></button><button class="action-btn" onclick="Portfolio.deleteSpesaCarta(\''+s.id+'\')" title="Elimina"><i class="bi bi-trash3"></i></button></div>' +
    '</div>';
  }

  // ---- API pubblica ----
  return {
    loadData, getData, getTitoli, updateQuote, getSaldoConto, saveSaldoIniziale,
    renderAll, renderDashboard, renderConto, renderCarta, renderInvestimenti,
    filterMovimenti, filterSpese, setContoFilter, setContoFilterMonth,
    setMovTipo, saveMovimento, deleteMovimento, editMovimento,
    saveSpesaCarta, deleteSpesaCarta, editSpesaCarta, saveImpostazioniCarta,
    showTab, setTipoCard, calcCostoCarico, saveTitolo, editTitolo, nuovoAcquisto,
    wizardNext, wizardPrev, wizardReset,
    openTitoloSheet, closeTitoloSheet, aggiornaValoreManuale,
    apriDettaglio, vendeTitolo, vendeTitoloById,
    setDetPeriod, getDettaglioId, deleteOperazione,
    getEditingTitolo, restoreEditingTitolo,
    formatEur, formatDate,
    populateCategorieSelect, importDaBanca,
    catLabel, catIcon, CATEGORIE_BUILTIN, CATEGORIE_CUSTOM_DEFAULT,
  };

})();
