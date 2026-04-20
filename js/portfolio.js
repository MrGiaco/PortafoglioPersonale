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
  let _nuovoAcquistoId   = null; // ID titolo a cui aggiungere nuovo acquisto (PMC ponderata)
  let _editingMovimento  = null; // copia del movimento in modifica (rollback se modal chiuso)
  let _editingSpesaCarta = null; // copia della spesa carta in modifica (rollback se modal chiuso)

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
    stipendio:    { label:'Stipendio',         icon:'briefcase',        color:'ic-blue'   },
    investimento: { label:'Investimento',      icon:'trending-up',        color:'ic-teal'   },
    affitto:      { label:'Affitto',           icon:'home',            color:'ic-indigo' },
    utenze:       { label:'Utenze',            icon:'bolt', color:'ic-yellow' },
    spesa:        { label:'Spesa alimentare',  icon:'shopping-cart',          color:'ic-green'  },
    trasporti:    { label:'Trasporti',         icon:'train',      color:'ic-sky'    },
    salute:       { label:'Salute',            icon:'heartbeat',      color:'ic-pink'   },
    svago:        { label:'Svago',             icon:'device-gamepad-2',            color:'ic-purple' },
    shopping:     { label:'Shopping',          icon:'shopping-bag',        color:'ic-pink'   },
    ristoranti:   { label:'Ristoranti',        icon:'coffee',          color:'ic-orange' },
    viaggi:       { label:'Viaggi',            icon:'plane',         color:'ic-sky'    },
    abbonamenti:  { label:'Abbonamenti',       icon:'rotate-clockwise',  color:'ic-purple' },
    carburante:   { label:'Carburante',        icon:'gas-station',        color:'ic-amber'  },
    altro:        { label:'Altro',             icon:'circle-filled',           color:'ic-slate'  },
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
    hi_tech:        { label:'Hi-Tech & Informatica', icon:'device-laptop',        color:'ic-blue'   },
    cellulare:      { label:'Cellulare',             icon:'device-mobile',         color:'ic-blue'   },
    abbigliamento:  { label:'Abbigliamento',         icon:'scissors',           color:'ic-pink'   },
    casa:           { label:'Casa',                  icon:'hammer',             color:'ic-amber'  },
    polizze:        { label:'Polizze',               icon:'shield-check',  color:'ic-teal'   },
    bonifici_out:   { label:'Bonifici in uscita',    icon:'send',          color:'ic-red'    },
    bonifici_in:    { label:'Bonifici ricevuti',     icon:'login-2',  color:'ic-green'  },
    rimborsi:       { label:'Rimborsi',              icon:'arrow-back-up',  color:'ic-green'  },
    imposte:        { label:'Imposte e Tasse',       icon:'building-bank',              color:'ic-slate'  },
    carta_addebito: { label:'Addebito Carta',        icon:'credit-card',   color:'ic-indigo' },
    giroconto_in:   { label:'Giroconto',             icon:'arrows-left-right',   color:'ic-sky'    },
  };

  function getCategorieCustom() {
    return data.impostazioni.categorie_custom || {};
  }

  function getCategoria(key) {
    if (CATEGORIE_BUILTIN[key]) return CATEGORIE_BUILTIN[key];
    var custom = getCategorieCustom();
    if (custom[key]) return custom[key];
    if (CATEGORIE_CUSTOM_DEFAULT[key]) return CATEGORIE_CUSTOM_DEFAULT[key];
    return { label: key, icon: 'dots' };
  }

  function catLabel(cat) {
    return getCategoria(cat).label || cat || '—';
  }

  function catIcon(cat) {
    return getCategoria(cat).icon || 'circle-filled';
  }

  function catColor(cat) {
    return getCategoria(cat).color || 'ic-slate';
  }

  // Aggiunge una categoria custom se non esiste già
  function addCategoriaCustom(key, label, icon) {
    if (CATEGORIE_BUILTIN[key] || CATEGORIE_CUSTOM_DEFAULT[key]) return false; // già esiste
    if (!data.impostazioni.categorie_custom) data.impostazioni.categorie_custom = {};
    if (data.impostazioni.categorie_custom[key]) return false; // già aggiunta
    data.impostazioni.categorie_custom[key] = { label: label, icon: icon || 'tag' };
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
      input.multiple = true; // selezione multipla: file conto + file carte insieme
      input.onchange = async function(e) {
        var files = Array.from(e.target.files || []);
        if (!files.length) { reject('Nessun file'); return; }
        try {
          var totale = { importatiConto: 0, importatiCarta: 0, duplicati: 0, catNuove: [], scartate: [] };
          for (var i = 0; i < files.length; i++) {
            var result = await _parseQualsiasiBancaFile(files[i]);
            totale.importatiConto += result.importatiConto || 0;
            totale.importatiCarta += result.importatiCarta || 0;
            totale.duplicati      += result.duplicati      || 0;
            result.catNuove.forEach(function(c){ if (totale.catNuove.indexOf(c) === -1) totale.catNuove.push(c); });
            totale.scartate = totale.scartate.concat(result.scartate || []);
          }
          resolve(totale);
        } catch(err) {
          App.showToast('Errore lettura file: ' + err.message, 'error');
          reject(err);
        }
      };
      input.click();
    });
  }

  // Riconosce il formato del file (conto o carte) e delega al parser corretto
  async function _parseQualsiasiBancaFile(file) {
    var buffer = await file.arrayBuffer();
    if (typeof XLSX === 'undefined') throw new Error('Libreria XLSX non caricata.');
    var wb = XLSX.read(buffer, { type:'array', cellDates:true });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var fullRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:J400');
    fullRange.e.r = Math.max(fullRange.e.r, 5000);
    ws['!ref'] = XLSX.utils.encode_range(fullRange);
    var rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

    for (var i = 0; i < Math.min(rows.length, 20); i++) {
      var r = rows[i];
      if (!r) continue;
      var c0 = String(r[0] || '').trim();
      var c1 = String(r[1] || '').trim();
      if (c0 === 'Data' && c1 === 'Operazione') {
        return _parseBancaRows(rows, i);
      }
      if (c0 === 'Data contabile' && c1 === 'Data valuta') {
        return _parseCarteRows(rows, i);
      }
    }
    throw new Error('Formato non riconosciuto. Usa il file conto corrente o movimenti carta Intesa.');
  }

  // Parser file conto corrente Intesa Sanpaolo
  function _parseBancaRows(rows, headerIdx) {
    var dataRows = rows.slice(headerIdx + 1).filter(function(r) {
      return r && r[0] && r[0] !== 'Data'; // escludi righe vuote e header ripetuto
    });

    var importatiConto = 0, importatiCarta = 0, duplicati = 0, catNuove = [];
    var scartate = []; // righe non importate con motivo
    var oggi = new Date().toISOString().slice(0,10);

    dataRows.forEach(function(r, rowIdx) {
      // Colonne: 0=Data, 1=Operazione, 2=Dettagli, 3=Conto, 4=Contabilizzazione, 5=Categoria, 6=Valuta, 7=Importo
      var dataCella = r[0];
      var descRaw   = String(r[1] || r[2] || '').trim() || '—';

      if (!dataCella) {
        scartate.push({ riga: rowIdx+1, desc: descRaw, motivo: 'Data mancante' });
        return;
      }

      var dataStr;
      if (dataCella instanceof Date) {
        dataStr = dataCella.toISOString().slice(0,10);
      } else {
        var d = new Date(String(dataCella));
        if (isNaN(d.getTime())) {
          scartate.push({ riga: rowIdx+1, desc: descRaw, motivo: 'Data non valida: ' + String(dataCella) });
          return;
        }
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

      if (importo === null) {
        scartate.push({ riga: rowIdx+1, desc: descRaw, data: dataStr, motivo: 'Importo non leggibile: ' + String(importoRaw) });
        return;
      }

      // Usa operazione come descrizione principale;
      // se i dettagli aggiungono info utili (es. codice fondo), li appende
      var desc = operazione || dettagli || 'Movimento';
      if (dettagli && operazione && dettagli !== operazione) {
        // Tronca dettagli a 60 char per non appesantire la descrizione
        var detShort = dettagli.length > 60 ? dettagli.slice(0, 60) + '…' : dettagli;
        desc = operazione + ' — ' + detShort;
      }

      // Mappa categoria banca → chiave app
      var catKey = MAPPING_BANCA[catBanca] || null;

      if (!catKey) {
        catKey = catBanca.replace(/[^a-z0-9]/g, '_').slice(0, 30) || 'altro';
        var iconMap = {
          'spesa':'shopping-cart', 'aliment':'shopping-cart',
          'ristor':'coffee', 'bar':'coffee',
          'viagg':'plane', 'hotel':'building',
          'salut':'heartbeat', 'farm':'pill',
          'sport':'trophy', 'svago':'device-gamepad-2',
          'tech':'device-laptop', 'infor':'device-laptop',
          'abbig':'shopping-bag', 'moda':'shopping-bag',
          'assic':'shield-check', 'poliz':'shield-check',
          'tassa':'building-bank', 'impost':'building-bank',
          'carb':'gas-station', 'benzin':'gas-station',
          'bonif':'send', 'trasfer':'arrows-left-right',
        };
        var autoIcon = 'tag';
        Object.keys(iconMap).forEach(function(k) {
          if (catBanca.indexOf(k) !== -1) autoIcon = iconMap[k];
        });
        var catLabelNuova = r[5] ? String(r[5]).trim() : catKey;
        var aggiunta = addCategoriaCustom(catKey, catLabelNuova, autoIcon);
        if (aggiunta) catNuove.push(catLabelNuova);
      }

      // Logica Intesa Sanpaolo: la colonna "Contabilizzazione" (r[4]) discrimina
      // con certezza tra spese carta in sospeso e movimenti già addebitati sul conto.
      //
      // Contabilizzazione = NO → spesa carta di credito non ancora addebitata
      //   (verrà pagata con il prossimo "Addebito Saldo E/c Carta")
      // Contabilizzazione = SI → movimento già addebitato sul conto corrente
      //   (stipendi, bonifici, POS diretti, prelievi, addebito mensile carta, ecc.)
      var contabilizzazione = String(r[4] || '').trim().toUpperCase();
      var isCartaDiCredito  = contabilizzazione === 'NO';

      if (isCartaDiCredito) {
        var importoCarta = Math.abs(importo);
        // Dedup: data + descrizione + importo
        var isDup = data.carta.spese.some(function(s) {
          return s.data === dataStr && s.descrizione === desc && s.importo === importoCarta;
        });
        if (isDup) {
          duplicati++;
          scartate.push({ riga: rowIdx+1, desc: desc, data: dataStr, importo: importoCarta, motivo: 'Duplicato (già presente)' });
          return;
        }
        data.carta.spese.push({
          id: uid(), data: dataStr, descrizione: desc,
          importo: importoCarta, categoria: catKey,
          addebitoData: '', note: dettagli !== desc ? dettagli : '',
        });
        importatiCarta++;
      } else {
        // Determina tipo dal segno dell'importo
        var tipo = importo >= 0 ? 'entrata' : 'uscita';
        var importoConto = Math.abs(importo);
        // Dedup: data + descrizione + importo
        var isDupC = data.conto.movimenti.some(function(m) {
          return m.data === dataStr && m.descrizione === desc && m.importo === importoConto;
        });
        if (isDupC) {
          duplicati++;
          scartate.push({ riga: rowIdx+1, desc: desc, data: dataStr, importo: importoConto, motivo: 'Duplicato (già presente)' });
          return;
        }
        var mov = {
          id: uid(), data: dataStr, tipo: tipo, descrizione: desc,
          importo: importoConto, categoria: catKey,
          note: dettagli !== desc ? dettagli.slice(0, 120) : '',
        };
        data.conto.movimenti.push(mov);
        importatiConto++;
      }
    });

    return { importatiConto, importatiCarta, duplicati, catNuove, scartate };
  }

  // =============================================
  // PARSER FILE MOVIMENTI CARTA DI CREDITO INTESA
  // Colonne: Data contabile | Data valuta | Descrizione | Accrediti in valuta | Accrediti | Addebiti in valuta | Addebiti
  // =============================================
  function _parseCarteRows(rows, headerIdx) {
    var dataRows = rows.slice(headerIdx + 1).filter(function(r) {
      return r && (r[0] || r[1]) && r[2]; // almeno una data e una descrizione
    });

    var importatiCarta = 0, duplicati = 0, catNuove = [];
    var scartate = [];

    // Mapping descrizione → categoria (case-insensitive, cerca sottostringa)
    var MAPPING_CARTE = [
      { keys: ['iperstaroil','eni','agip','tamoil','q8','shell','esso','totalerg','ip ',
               'bc longare','b c longare','castegnero','costantin','geff srl','autolovisetto',
               'desideri carburanti'], cat: 'carburante' },
      { keys: ['iliad','tim ','wind','vodafone','fastweb'], cat: 'cellulare' },
      { keys: ['amazon','amzn','pay.amazon'], cat: 'svago' },
      { keys: ['anthropic','claude.ai','openai','chatgp','msdeals'], cat: 'hi_tech' },
      { keys: ['google ','google one','google play'], cat: 'hi_tech' },
      { keys: ['paypal *openai','paypal *use ai'], cat: 'hi_tech' },
      { keys: ['camst','bierstube','ristoran','trattoria','pizzeria','osteria',
               'vecia botte','monterosso','ristorazione','tavola'], cat: 'ristoranti' },
      { keys: ['hotel','resort','guadalupe','alloggio'], cat: 'viaggi' },
      { keys: ['farmacia','freato'], cat: 'salute' },
      { keys: ['unipol','prima assicurazioni','allianz','generali','axa'], cat: 'polizze' },
      { keys: ['pendin gomme','manutenzione','autolovisetto','jolly joker'], cat: 'manutenzione_veicoli' },
      { keys: ['paypal *ticketone','ticketone','spazio roma'], cat: 'svago' },
      { keys: ['paypal *paga in 3','paypal *alipay','paypal *etsy'], cat: 'svago' },
      { keys: ['aliexpress'], cat: 'spesa' },
      { keys: ['famila','supermercato','coop','esselunga','eurospin'], cat: 'spesa' },
      { keys: ['pittarello','zanuso','carrera','cosmo spa','pagliarusco',
               'porcarola','abbigliamento'], cat: 'abbigliamento' },
      { keys: ['autosalmaso','baciliero','studio scortegagna','sede provinciale'], cat: 'altro' },
    ];

    function _catDaDesc(desc) {
      var d = desc.toLowerCase();
      for (var i = 0; i < MAPPING_CARTE.length; i++) {
        var entry = MAPPING_CARTE[i];
        for (var j = 0; j < entry.keys.length; j++) {
          if (d.indexOf(entry.keys[j]) !== -1) return entry.cat;
        }
      }
      return 'altro';
    }

    function _excelDateToStr(val) {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      var n = parseInt(val, 10);
      if (!isNaN(n) && n > 40000) {
        // Serial Excel: giorni dal 30/12/1899
        var d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
        return d.toISOString().slice(0, 10);
      }
      // Stringa già in formato leggibile
      var d2 = new Date(String(val));
      if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
      return null;
    }

    dataRows.forEach(function(r, rowIdx) {
      // r[0]=Data contabile, r[1]=Data valuta, r[2]=Descrizione
      // r[3]=Accrediti in valuta (vuoto), r[4]=Accrediti, r[5]=Addebiti in valuta (vuoto), r[6]=Addebiti
      var dataValuta    = _excelDateToStr(r[1]) || _excelDateToStr(r[0]);
      var desc          = String(r[2] || '').trim();
      var accreditoRaw  = r[4];
      var addebitoRaw   = r[6];

      if (!dataValuta) {
        scartate.push({ riga: rowIdx+1, desc: desc, motivo: 'Data non valida' });
        return;
      }
      if (!desc) {
        scartate.push({ riga: rowIdx+1, desc: '—', data: dataValuta, motivo: 'Descrizione mancante' });
        return;
      }

      // Determina importo: addebito (spesa) o accredito (rimborso)
      var importo = null;
      var isRimborso = false;
      if (addebitoRaw != null && addebitoRaw !== '') {
        var v = parseFloat(String(addebitoRaw).replace(',', '.'));
        if (!isNaN(v) && v > 0) importo = v;
      }
      if (importo === null && accreditoRaw != null && accreditoRaw !== '') {
        var v2 = parseFloat(String(accreditoRaw).replace(',', '.'));
        if (!isNaN(v2) && v2 > 0) { importo = v2; isRimborso = true; }
      }
      if (importo === null) {
        scartate.push({ riga: rowIdx+1, desc: desc, data: dataValuta, motivo: 'Importo non leggibile' });
        return;
      }

      var catKey = _catDaDesc(desc);

      // Dedup case-insensitive: confronta con spese carta già presenti
      var descUpper = desc.toUpperCase();
      var isDup = data.carta.spese.some(function(s) {
        return s.data === dataValuta &&
               s.descrizione.toUpperCase() === descUpper &&
               Math.abs(s.importo - importo) < 0.01;
      });
      if (isDup) {
        duplicati++;
        return; // non aggiunge a scartate — è normale per le spese recenti già nel file conto
      }

      if (isRimborso) {
        // Rimborso carta: va nel conto come entrata (storni, rimborsi Amazon ecc.)
        // Lo ignoriamo nella sezione carta — è già un movimento del conto
        // oppure lo tracciamo come spesa negativa nella carta
        // Scelta: lo aggiungiamo comunque come spesa carta con importo negativo indicativo
        // ma lo marchiamo nella nota
        data.carta.spese.push({
          id: uid(), data: dataValuta,
          descrizione: desc,
          importo: importo,
          categoria: 'rimborsi',
          addebitoData: '',
          note: 'Rimborso / accredito carta',
        });
      } else {
        data.carta.spese.push({
          id: uid(), data: dataValuta,
          descrizione: desc,
          importo: importo,
          categoria: catKey,
          addebitoData: '',
          note: '',
        });
      }
      importatiCarta++;
    });

    return { importatiConto: 0, importatiCarta, duplicati, catNuove, scartate };
  }


  function emptyState(icon, msg) {
    return '<div class="empty-state"><i class="ti ti-' + icon + '"></i><p>' + msg + '</p></div>';
  }

  // =============================================
  // LOAD / GET / SAVE
  // =============================================

  function loadData(incoming) {
    if (!incoming) return;
    if (incoming.conto) {
      data.conto = Object.assign({ saldoIniziale: 0 }, data.conto, incoming.conto);
      data.conto.saldo = 0; // campo legacy — il saldo si ricalcola dai movimenti
    }
    if (incoming.carta)        data.carta        = Object.assign({}, data.carta,        incoming.carta);
    if (incoming.investimenti) data.investimenti = Object.assign({}, data.investimenti, incoming.investimenti);
    if (incoming.impostazioni) data.impostazioni = Object.assign({}, data.impostazioni, incoming.impostazioni);
    renderAll();
  }

  function getData() { return JSON.parse(JSON.stringify(data)); }

  // Saldo reale = saldo iniziale + movimenti
  function getSaldoConto() {
    var delta = data.conto.movimenti.reduce(function(s, m) {
      return m.tipo === 'entrata' ? s + m.importo : s - m.importo;
    }, 0);
    return (data.conto.saldoIniziale || 0) + delta;
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
    t.dayHigh       = quote.dayHigh   || 0;
    t.dayLow        = quote.dayLow    || 0;
    t.prevClose     = quote.prevClose || 0;
    t.currency      = quote.currency  || 'EUR';
    t.lastUpdate    = quote.marketTime || Date.now();
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

    var saldoConto  = getSaldoConto();
    var totInv      = getTotaleInvestimenti();
    var debitoCarta = getDebitoCarta();
    var totale      = saldoConto + totInv - debitoCarta;

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
    container.innerHTML = all.length ? all.map(function(m){ return transactionHTML(m, false); }).join('') : emptyState('inbox','Nessuna transazione');
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
    container.innerHTML = list.length ? list.map(function(m){ return transactionHTML(m, true); }).join('') : emptyState('building-bank','Nessun movimento trovato');
  }

  function setMovTipo(tipo) {
    movTipo = tipo;
    var eBtn = $('movTipoEntrata'), uBtn = $('movTipoUscita');
    if (eBtn) eBtn.classList.toggle('active', tipo === 'entrata');
    if (uBtn) uBtn.classList.toggle('active', tipo === 'uscita');
    var title = $('movHeroTitle'), icon = $('movHeroIcon');
    if (title) title.textContent = tipo === 'entrata' ? 'Nuova Entrata' : 'Nuova Uscita';
    if (icon)  icon.innerHTML    = tipo === 'entrata' ? '<i class="ti ti-circle-arrow-down"></i>' : '<i class="ti ti-circle-arrow-up"></i>';
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
    _editingMovimento = null; // salvataggio riuscito, niente rollback
    Modals.close();
    renderConto(); renderDashboard(); Charts.updateAll(); saveAndSync();
    App.showToast('Movimento ' + movTipo + ' salvato','success');
  }

  async function confirmDeleteMovimento(id) {
    var mov = data.conto.movimenti.find(function(m){ return m.id === id; });
    if (!mov) return;
    var ok = await Dialog.confirmDanger(
      '<i class="ti ti-trash" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Elimina movimento</strong><br>' +
      '<span style="font-size:13px;color:var(--text-muted)">' + escHtml(mov.descrizione) + ' — ' + formatEur(mov.importo) + '</span>',
      'Elimina', 'Annulla'
    );
    if (!ok) {
      // Richiudi swipe
      var row = document.getElementById('swipe-mov-' + id);
      if (row) row.classList.remove('open');
      return;
    }
    deleteMovimento(id);
  }

  async function confirmDeleteSpesaCarta(id) {
    var spesa = data.carta.spese.find(function(s){ return s.id === id; });
    if (!spesa) return;
    var ok = await Dialog.confirmDanger(
      '<i class="ti ti-trash" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Elimina spesa</strong><br>' +
      '<span style="font-size:13px;color:var(--text-muted)">' + escHtml(spesa.descrizione) + ' — ' + formatEur(spesa.importo) + '</span>',
      'Elimina', 'Annulla'
    );
    if (!ok) {
      var row = document.getElementById('swipe-spesa-' + id);
      if (row) row.classList.remove('open');
      return;
    }
    deleteSpesaCarta(id);
  }

  function deleteMovimento(id) {
    var idx = data.conto.movimenti.findIndex(function(m){ return m.id === id; });
    if (idx === -1) return;
    data.conto.movimenti.splice(idx, 1);
    renderConto(); renderDashboard(); Charts.updateAll(); saveAndSync();
    App.showToast('Movimento eliminato','info');
  }

  function editMovimento(id) {
    var mov = data.conto.movimenti.find(function(m){ return m.id === id; });
    if (!mov) return;
    _editingMovimento = JSON.parse(JSON.stringify(mov)); // salva copia per rollback
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

  function restoreEditingMovimento() {
    if (!_editingMovimento) return;
    var m = _editingMovimento;
    data.conto.movimenti.push(m);
    _editingMovimento = null;
    renderConto(); renderDashboard();
  }

  // =============================================
  // CARTA DI CREDITO
  // =============================================

  function renderCarta() {
    setEl('ccLastDigits', data.carta.lastDigits || '0000');
    setEl('ccHolder',     data.carta.holder     || '—');
    setEl('ccExpiry',     (data.carta.expiry && data.carta.expiry.trim()) ? data.carta.expiry.trim() : '—');
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
    container.innerHTML = list.length ? list.map(cartaSpesaHTML).join('') : emptyState('credit-card','Nessuna spesa trovata');
  }

  function saveSpesaCarta() {
    var data_s  = $('cartaData')        ? $('cartaData').value        : '';
    var desc    = $('cartaDescrizione') ? $('cartaDescrizione').value.trim() : '';
    var importo = parseFloat($('cartaImporto') ? $('cartaImporto').value : '');
    var cat     = $('cartaCategoria')   ? $('cartaCategoria').value   : 'altro';
    var addebito= $('cartaAddebito')    ? $('cartaAddebito').value    : '';
    if (!data_s || !desc || isNaN(importo) || importo <= 0) { App.showToast('Compila tutti i campi obbligatori','warning'); return; }
    data.carta.spese.push({ id:uid(), data:data_s, descrizione:desc, importo:importo, categoria:cat, addebitoData:addebito });
    _editingSpesaCarta = null; // salvataggio riuscito, niente rollback
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
    _editingSpesaCarta = JSON.parse(JSON.stringify(spesa)); // salva copia per rollback
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

  function restoreEditingSpesaCarta() {
    if (!_editingSpesaCarta) return;
    data.carta.spese.push(_editingSpesaCarta);
    _editingSpesaCarta = null;
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

  // ---- Configurazione sezioni ----
  var SEZIONI_INV = [
    { key: 'azione',      label: 'Azioni',        icon: 'trending-up',   colore: '#2563EB' },
    { key: 'fondo',       label: 'Fondi',          icon: 'chart-pie',    colore: '#7C3AED' },
    { key: 'certificate', label: 'Certificates',   icon: 'award',        colore: '#D97706' },
    { key: 'pir',         label: 'PIR',            icon: 'shield-check', colore: '#16A34A' },
    { key: 'polizza',     label: 'Polizze',        icon: 'umbrella',     colore: '#DC2626' },
  ];

  function _sezioneCollapsed(key) {
    var stored = localStorage.getItem('inv_collapsed_' + key);
    return stored === 'true';  // default: aperto
  }

  function toggleSezione(key) {
    var body = document.getElementById('invSez-' + key);
    var icon = document.getElementById('invSezIcon-' + key);
    var hdr  = document.querySelector('#isez-' + key + ' .isez-hdr');
    if (!body) return;
    var isNowCollapsed = !body.classList.contains('collapsed');
    body.classList.toggle('collapsed', isNowCollapsed);
    if (icon) icon.style.transform = isNowCollapsed ? 'rotate(-90deg)' : '';
    if (hdr)  hdr.style.borderRadius = isNowCollapsed ? '14px' : '14px 14px 0 0';
    localStorage.setItem('inv_collapsed_' + key, isNowCollapsed);
  }

  function renderInvestimenti() {
    renderInvSummary();
    var container = $('invSezioni');
    if (!container) return;

    var titoli = getTitoli();
    var html = '';

    SEZIONI_INV.forEach(function(sez) {
      var lista = titoli.filter(function(t){ return t.tipo === sez.key; });
      if (!lista.length) return;

      var valSez   = lista.reduce(function(s,t){ return s + (t.prezzoAttuale||t.prezzoAcquisto)*t.quantita; }, 0);
      var costSez  = lista.reduce(function(s,t){ return s + (t.pmc||t.prezzoAcquisto)*t.quantita; }, 0);
      var plSez    = valSez - costSez;
      var plPctSez = costSez > 0 ? (plSez/costSez)*100 : 0;
      var posS     = plSez >= 0;
      var collapsed = _sezioneCollapsed(sez.key);

      // Header sezione con bordo sinistro colorato
      html += '<div class="isez" id="isez-' + sez.key + '">' +
        '<div class="isez-hdr" onclick="Portfolio.toggleSezione(\'' + sez.key + '\')" style="border-left-color:' + sez.colore + ';border-radius:' + (collapsed ? '14px' : '14px 14px 0 0') + '">' +
          '<div class="isez-left">' +
            '<div class="isez-ico" style="color:' + sez.colore + '">' +
              '<i class="ti ti-' + sez.icon + '" style="font-size:20px"></i>' +
            '</div>' +
            '<div>' +
              '<div class="isez-title">' + sez.label + '</div>' +
              '<div class="isez-sub">' + lista.length + ' ' + (lista.length === 1 ? 'titolo' : 'titoli') + ' · ' + formatEur(valSez) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="isez-right">' +
            '<span class="isez-pl ' + (posS?'pos':'neg') + '">' + formatPct(plPctSez) + '</span>' +
            '<i class="ti ti-chevron-down isez-chev" id="invSezIcon-' + sez.key + '" style="' + (collapsed ? 'transform:rotate(-90deg)' : '') + '"></i>' +
          '</div>' +
        '</div>' +
        '<div class="isez-body' + (collapsed ? ' collapsed' : '') + '" id="invSez-' + sez.key + '">' +
          '<div class="itc-list" style="border-left-color:' + sez.colore + '">' +
            lista.map(titoloCardHTML).join('') +
          '</div>' +
          '<div class="isez-subtotal" style="border-left-color:' + sez.colore + '">' +
            '<span class="isez-sub-lbl">Subtotale ' + sez.label + '</span>' +
            '<div class="isez-sub-right">' +
              '<div class="isez-sub-item"><div class="isez-sub-item-lbl">Valore</div><div class="isez-sub-item-val">' + formatEur(valSez) + '</div></div>' +
              '<div class="isez-sub-item"><div class="isez-sub-item-lbl">P&L</div><div class="isez-sub-item-val ' + (posS?'pos':'neg') + '">' + formatEurSigned(plSez) + ' (' + formatPct(plPctSez) + ')</div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    });

    container.innerHTML = html;
    setTimeout(function(){ _renderSparklines(); }, 50);
  }

  // ---- showTab mantenuto per compatibilità (non più usato) ----
  function showTab(tab, btn) { renderInvestimenti(); }

  function renderInvSummary() {
    var titoli        = getTitoli();
    var valoreAttuale = titoli.reduce(function(s,t){ return s+(t.prezzoAttuale||t.prezzoAcquisto)*t.quantita; }, 0);
    var costoTotale   = titoli.reduce(function(s,t){ return s+(t.pmc||t.prezzoAcquisto)*t.quantita; }, 0);
    var pl            = valoreAttuale - costoTotale;
    var rend          = costoTotale > 0 ? (pl/costoTotale)*100 : 0;
    var isPos         = pl >= 0;

    setEl('invValoreAttuale', formatEur(valoreAttuale));
    setEl('invCostoTotale',   formatEur(costoTotale));
    setEl('invPL',            formatEurSigned(pl));
    setEl('invRendimento',    formatPct(rend));

    var badge = $('invRendimentoBadge');
    if (badge) {
      badge.innerHTML = (isPos?'▲':'▼') + ' ' + formatPct(rend) + ' rendimento';
      badge.className = 'inv-hero-badge' + (isPos ? '' : ' neg');
    }
    var plEl = $('invPL');
    if (plEl) plEl.style.color = isPos ? 'rgba(134,239,172,1)' : 'rgba(252,165,165,1)';

    // Mini totali conto + carta nella hero
    var saldoConto  = getSaldoConto();
    var debitoCarta = getDebitoCarta();
    var patrimTot   = saldoConto + valoreAttuale - debitoCarta;
    setEl('invMiniConto',  formatEur(saldoConto));
    setEl('invMiniCarta',  formatEur(debitoCarta));
    setEl('invMiniPatrim', formatEur(patrimTot));
  }

  function titoloCardHTML(t) {
    var prezzo  = t.prezzoAttuale || t.prezzoAcquisto;
    var pmc     = t.pmc || t.prezzoAcquisto;
    var valore  = prezzo * t.quantita;
    var costo   = pmc * t.quantita;
    var pl      = valore - costo;
    var plPct   = costo > 0 ? (pl/costo)*100 : 0;
    var isPos   = pl >= 0;
    var col     = tipoColor(t.tipo);
    var av      = avatarLetters(t.nome);
    var ticker  = t.ticker || t.codeZB || '';
    var logoSrc = t.ticker ? 'icons/titoli/' + t.ticker + '.png' : '';
    var hasQuote = !!(t.ticker || t.codeZB);

    var dayChgPct = 0, dayChg = 0, dayLabel = 'oggi';
    if (!hasQuote) {
      dayChgPct = pmc > 0 ? ((prezzo-pmc)/pmc)*100 : 0;
      dayChg    = prezzo - pmc;
      dayLabel  = 'vs PMC';
    } else {
      dayChgPct = t.changePct || 0;
      dayChg    = t.change    || 0;
    }
    var dayPos  = dayChgPct >= 0;
    var qtyLabel = t.tipo === 'azione' ? 'azioni' : 'quote';
    var qtyFmt   = t.quantita % 1 === 0 ? String(Math.round(t.quantita)) : t.quantita.toFixed(3);

    var dayChgTot = dayChg * t.quantita;
    var lastUpd   = t.lastUpdate ? _formatLastUpdateFull(t.lastUpdate) : null;
    var updSource = hasQuote ? (t.codeZB ? 'ZoneBourse' : 'Yahoo Finance') : null;
    var isRecent  = t.lastUpdate && (Date.now() - t.lastUpdate < 5*60*1000);

    return '<div class="itc" onclick="Portfolio.apriDettaglio(\'' + t.id + '\')">' +
      '<div class="itc-name-row">' + escHtml(t.nome) + '</div>' +
      '<div class="itc-top">' +
        '<div class="itc-logo" style="background:' + col.bg + ';color:' + col.fg + '">' +
          (logoSrc ? '<img src="' + logoSrc + '" onload="this.nextElementSibling.style.display=\'none\'" onerror="this.style.display=\'none\'" />' : '') +
          '<span>' + escHtml(av) + '</span>' +
        '</div>' +
        '<div class="itc-meta">' +
          '<div class="itc-ticker">' + escHtml(ticker || tipoLabel(t.tipo)) + ' &nbsp; ' + qtyFmt + ' ' + qtyLabel + '</div>' +
        '</div>' +
        '<div class="itc-price-col">' +
          '<div class="itc-price">' + formatEur(prezzo, 2) + '</div>' +
          '<div class="itc-daypill ' + (dayPos?'pos':'neg') + '">' + (dayPos?'▲':'▼') + ' ' + formatPct(dayChgPct) + '</div>' +
        '</div>' +
      '</div>' +
      (hasQuote ? '<canvas id="sp_' + t.id + '" class="itc-spark"></canvas>' : '<div class="itc-spark-manual"><i class="ti ti-minus"></i> aggiornamento manuale</div>') +
      '<div class="itc-divider"></div>' +
      '<div class="itc-bottom">' +
        '<div class="itc-stat">' +
          '<div class="itc-stat-lbl">Valore</div>' +
          '<div class="itc-stat-val">' + formatEur(valore) + '</div>' +
          '<div class="itc-stat-sub">Carico ' + formatEur(pmc * t.quantita) + '</div>' +
        '</div>' +
        '<div class="itc-stat" style="text-align:right">' +
          '<div class="itc-stat-lbl">P&amp;L totale</div>' +
          '<div class="itc-stat-val ' + (isPos?'pos':'neg') + '">' + formatEurSigned(pl) + ' &nbsp;' + formatPct(plPct) + '</div>' +
        '</div>' +
      '</div>' +
      (hasQuote ?
        '<div class="itc-bottom" style="margin-top:5px">' +
          '<div class="itc-stat">' +
            (lastUpd ? '<div class="itc-upd"><span class="itc-upd-dot ' + (isRecent?'fresh':'stale') + '"></span>' + updSource + ' &nbsp; ' + lastUpd + '</div>' : '') +
          '</div>' +
          '<div class="itc-stat" style="text-align:right">' +
            '<div class="itc-stat-lbl">Guadagno/perdita oggi</div>' +
            '<div class="itc-stat-val ' + (dayPos?'pos':'neg') + '">' + formatEurSigned(dayChgTot) + ' &nbsp;' + formatPct(dayChgPct) + '</div>' +
          '</div>' +
        '</div>'
      : '') +
    '</div>';
  }

  // Disegna sparkline intraday su ogni card
  function _renderSparklines() {
    getTitoli().filter(function(t){ return !!(t.ticker || t.codeZB); }).forEach(function(t) {
      var canvas = document.getElementById('sp_' + t.id);
      if (!canvas) return;
      var colorLine = (t.changePct || 0) >= 0 ? '#15803d' : '#b91c1c';
      Quotes.fetchIntraday(t).then(function(data) {
        if (!data || !data.length) return;
        _drawSparkline(canvas, data.map(function(p){ return p.close; }), colorLine, null);
      });
    });
  }

  function _drawSparkline(canvas, values, color, refLine) {
    if (!canvas || !values.length) return;
    var W = canvas.offsetWidth || 150;
    var H = 64;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var pad = 6;
    var range = max - min || 1;

    function xOf(i)  { return pad + (i / (values.length - 1)) * (W - pad*2); }
    function yOf(v)  { return pad + (1 - (v - min) / range) * (H - pad*2); }

    // Gradiente riempimento
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '30');
    grad.addColorStop(1, color + '00');

    // Area
    ctx.beginPath();
    ctx.moveTo(xOf(0), H);
    ctx.lineTo(xOf(0), yOf(values[0]));
    values.forEach(function(v, i){ ctx.lineTo(xOf(i), yOf(v)); });
    ctx.lineTo(xOf(values.length-1), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Linea
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(values[0]));
    values.forEach(function(v, i){ ctx.lineTo(xOf(i), yOf(v)); });
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Linea di riferimento (prezzo apertura o PMC)
    if (refLine != null && refLine >= min && refLine <= max) {
      var yRef = yOf(refLine);
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.moveTo(pad, yRef);
      ctx.lineTo(W - pad, yRef);
      ctx.strokeStyle = color + '70';
      ctx.lineWidth   = 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Punto finale
    var lastX = xOf(values.length-1);
    var lastY = yOf(values[values.length-1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
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
          '<div class="sheet-icon" style="background:#EFF6FF;color:#1E3A8A"><i class="ti ti-chart-line"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Dettaglio</div><div class="sheet-item-sub">Grafico storico, operazioni e statistiche</div></div>' +
          '<i class="ti ti-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
        '<div class="sheet-item" onclick="Portfolio.editTitolo(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#F4F6FB;color:#64748B"><i class="ti ti-pencil"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Modifica titolo</div><div class="sheet-item-sub">Modifica dati e operazioni</div></div>' +
          '<i class="ti ti-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
        (!t.ticker && !t.codeZB ?
        '<div class="sheet-item" onclick="Portfolio.aggiornaValoreManuale(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#F0FDF4;color:#16A34A"><i class="ti ti-edit"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Aggiorna valore</div><div class="sheet-item-sub">Inserisci manualmente il valore attuale</div></div>' +
          '<i class="ti ti-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' : '') +
        '<div class="sheet-item" onclick="Portfolio.nuovoAcquisto(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#F0FDF4;color:#16A34A"><i class="ti ti-circle-plus"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Nuovo acquisto</div><div class="sheet-item-sub">Aggiungi quote alla posizione esistente</div></div>' +
          '<i class="ti ti-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
        '<div class="sheet-item" onclick="Portfolio.vendeTitoloById(\'' + t.id + '\'); Portfolio.closeTitoloSheet()">' +
          '<div class="sheet-icon" style="background:#FEF2F2;color:#DC2626"><i class="ti ti-cash"></i></div>' +
          '<div class="sheet-item-body"><div class="sheet-item-title">Vendi</div><div class="sheet-item-sub">Registra una vendita parziale o totale</div></div>' +
          '<i class="ti ti-chevron-right" style="color:#CBD5E1;font-size:14px"></i>' +
        '</div>' +
      '</div>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function aggiornaValoreManuale(id) {
    var t = data.investimenti.titoli.find(function(x){ return x.id === id; });
    if (!t) return;
    var valoreAttuale = formatEur(t.prezzoAttuale || t.pmc, 2);
    var hasCodice = !!t.codeZB;

    // FIX: usa Dialog._render() invece di accedere direttamente a #dialogOverlay
    // (che potrebbe non esistere ancora al primo utilizzo).
    // Usiamo il meccanismo interno di Dialog che crea l'overlay se mancante.
    var overlay = document.getElementById('dialogOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dialogOverlay';
      overlay.className = 'dialog-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML =
      '<div class="dialog-box">' +
        '<div class="dialog-body">' +
          '<i class="ti ti-edit" style="color:var(--primary);font-size:24px;display:block;margin-bottom:10px"></i>' +
          '<strong>' + escHtml(t.nome) + '</strong>' +
          '<span style="font-size:13px;color:var(--text-muted);display:block;margin:6px 0 14px">Valore attuale: ' + valoreAttuale + '</span>' +
          '<input id="dialogValoreInput" type="number" step="0.01" min="0" ' +
            'placeholder="Nuovo valore (€)" ' +
            'style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:10px" ' +
            'value="' + (t.prezzoAttuale || t.pmc || '') + '" />' +
          '<label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">' +
            'Codice Zonebourse <span style="font-weight:400">(per aggiornamento automatico)</span>' +
          '</label>' +
          '<input id="dialogCodeZBInput" type="text" ' +
            'placeholder="Es. 184320628" ' +
            'style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box" ' +
            'value="' + (t.codeZB || '') + '" />' +
          (hasCodice ? '<span style="font-size:11px;color:var(--success);display:block;margin-top:4px"><i class="ti ti-circle-check"></i> Aggiornamento automatico attivo</span>' :
            '<span style="font-size:11px;color:var(--text-muted);display:block;margin-top:4px">Lascia vuoto per aggiornamento solo manuale</span>') +
        '</div>' +
        '<div class="dialog-footer">' +
          '<button class="btn btn--ghost dialog-cancel">Annulla</button>' +
          '<button class="btn btn--primary dialog-ok">Salva</button>' +
        '</div>' +
      '</div>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    setTimeout(function() {
      var inp = document.getElementById('dialogValoreInput');
      if (inp) { inp.focus(); inp.select(); }
    }, 100);

    overlay.querySelector('.dialog-cancel').onclick = function() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };
    overlay.querySelector('.dialog-ok').onclick = function() {
      var inp    = document.getElementById('dialogValoreInput');
      var inpZB  = document.getElementById('dialogCodeZBInput');
      var nuovo  = parseFloat(inp ? inp.value : '');
      var codice = inpZB ? inpZB.value.trim() : '';
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (isNaN(nuovo) || nuovo < 0) { App.showToast('Valore non valido', 'warning'); return; }
      t.prezzoAttuale = nuovo;
      t.change = 0; t.changePct = 0;
      if (codice) t.codeZB = codice;
      else if (t.codeZB && !codice) t.codeZB = null;
      renderInvestimenti(); renderDashboard(); Charts.updateAll(); saveAndSync();
      var msg = t.nome + ': valore aggiornato a ' + formatEur(nuovo);
      if (codice) msg += ' · Zonebourse collegato';
      App.showToast(msg, 'success');
    };

    var inp = overlay.querySelector('#dialogValoreInput');
    if (inp) inp.addEventListener('keydown', function(e) {
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
      ? '<i class="ti ti-check"></i> Aggiungi'
      : 'Avanti <i class="ti ti-chevron-right"></i>';
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
    var zbLabel = zbG ? zbG.querySelector('label') : null;
    if (tipo === 'certificate') {
      // Certificates: solo codeZB (obbligatorio)
      if (zbG) { zbG.style.display=''; if (zbLabel) zbLabel.textContent = 'Codice Zonebourse'; }
      if (yhG) yhG.style.display='none';
    } else if (tipo === 'polizza') {
      // Polizze: nessun codice (aggiornamento manuale)
      if (zbG) zbG.style.display='none';
      if (yhG) yhG.style.display='none';
    } else {
      // Azioni, fondi, PIR: Yahoo principale, ZB opzionale
      if (yhG) yhG.style.display='';
      if (zbG) { zbG.style.display=''; if (zbLabel) zbLabel.textContent = 'Codice Zonebourse (opzionale)'; }
    }
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
    // CASO 1: nuovo acquisto su titolo esistente → aggiorna PMC ponderata
    if (_nuovoAcquistoId) {
      var existing = data.investimenti.titoli.find(function(x){ return x.id === _nuovoAcquistoId; });
      if (existing) {
        // Calcolo PMC ponderata: (vecchio_costo_tot + nuovo_costo_tot) / (vecchia_qty + nuova_qty)
        var vecchioQty    = existing.quantita;
        var vecchioCosto  = existing.pmc * vecchioQty;
        var nuovaQtyTot   = vecchioQty + quantita;
        var nuovoCostoTot = vecchioCosto + costoTot;
        existing.quantita    = nuovaQtyTot;
        existing.pmc         = nuovaQtyTot > 0 ? nuovoCostoTot / nuovaQtyTot : existing.pmc;
        existing.costoTotale = (existing.costoTotale || 0) + costoTot;
        existing.operazioni  = existing.operazioni || [];
        existing.operazioni.push({ data:dataAcq, tipo:'acquisto', quantita:quantita, prezzo:prezzo, cambio:cambio, comm:comm, tasse:tasse, rateo:rateo, costoTot:costoTot });
        if (addebito) {
          var movAcq = { id:uid(), data:dataAcq, tipo:'uscita', descrizione:'Acquisto '+nome, importo:costoTot, categoria:'investimento', note:quantita+' × '+formatEur(prezzo,4)+' | Comm: '+formatEur(comm)+' | PMC: '+formatEur(existing.pmc,4) };
          data.conto.movimenti.push(movAcq);
        }
        _nuovoAcquistoId = null;
        Modals.close(); renderAll(); Charts.updateAll(); saveAndSync();
        App.showToast(nome + ': acquisto aggiunto, PMC aggiornata a ' + formatEur(existing.pmc, 4), 'success');
        return;
      }
      _nuovoAcquistoId = null; // titolo non trovato, crea nuovo
    }

    // CASO 2: modifica titolo esistente → sostituisce con nuovi dati
    if (_editingTitolo) {
      data.investimenti.titoli = data.investimenti.titoli.filter(function(x){ return x.id !== _editingTitolo.id; });
      if (_editingTitolo.costoTotale) {
        data.conto.movimenti = data.conto.movimenti.filter(function(m){
          return !(m.descrizione === 'Acquisto ' + _editingTitolo.nome && m.data === _editingTitolo.dataAcquisto);
        });
      }
      titolo.id = _editingTitolo.id; // mantieni stesso ID
      titolo.operazioni = _editingTitolo.operazioni || titolo.operazioni; // mantieni storico operazioni
      _editingTitolo = null;
    }

    // CASO 3: nuovo titolo
    data.investimenti.titoli.push(titolo);

    if (addebito) {
      var mov = { id:uid(), data:dataAcq, tipo:'uscita', descrizione:'Acquisto '+nome, importo:costoTot, categoria:'investimento', note:quantita+' × '+formatEur(prezzo,4)+' | Comm: '+formatEur(comm)+' | PMC: '+formatEur(pmc,4) };
      data.conto.movimenti.push(mov);
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
    _nuovoAcquistoId = id; // segnala che stiamo aggiungendo a un titolo esistente
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
    _detPeriod  = '1G';

    var prezzo  = t.prezzoAttuale || t.prezzoAcquisto;
    var pmc     = t.pmc || t.prezzoAcquisto;
    var valore  = prezzo * t.quantita;
    var costo   = pmc * t.quantita;
    var pl      = valore - costo;
    var plPct   = costo > 0 ? (pl/costo)*100 : 0;
    var isPos   = pl >= 0;
    var col     = tipoColor(t.tipo);
    var av      = avatarLetters(t.nome);
    var ticker  = t.ticker || t.codeZB || '';
    var logoSrc = t.ticker ? 'icons/titoli/' + t.ticker + '.png' : '';
    var dayPos  = (t.changePct||0) >= 0;
    var qtyFmt  = t.quantita % 1 === 0 ? String(Math.round(t.quantita)) : t.quantita.toFixed(3);
    var qtyLabel= t.tipo === 'azione' ? 'azioni' : 'quote';
    var hasQuote= !!(t.ticker || t.codeZB);
    var dayChgPct = hasQuote ? (t.changePct||0) : (pmc > 0 ? ((prezzo-pmc)/pmc)*100 : 0);
    var dayChg    = hasQuote ? (t.change||0)    : (prezzo-pmc);

    // ---- Popola sezione statica nel DOM ----
    setEl('detTopbarTicker', escHtml(ticker || tipoLabel(t.tipo)));
    setEl('detTopbarMkt', t.mercato || '—');

    // Logo hero
    var heroLogo = $('detHeroLogo');
    if (heroLogo) {
      heroLogo.style.background = col.bg;
      heroLogo.style.color      = col.fg;
      if (logoSrc) {
        heroLogo.innerHTML = '<img src="' + logoSrc + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:11px" onerror="this.remove()" /><span id="detHeroAv">' + escHtml(av) + '</span>';
      } else {
        heroLogo.innerHTML = '<span id="detHeroAv">' + escHtml(av) + '</span>';
      }
    }

    // Prezzo e variazione
    setEl('detPrice', formatEur(prezzo, 2));
    var pill = $('detChgPill');
    if (pill) {
      pill.className = 'det-chg-pill ' + (dayPos ? 'pos' : 'neg');
      pill.textContent = (dayPos ? '▲' : '▼') + ' ' + formatEurSigned(dayChg) + ' · ' + formatPct(dayChgPct);
    }

    setEl('detHeroName', escHtml(t.nome));
    setEl('detHeroSub', qtyFmt + ' ' + qtyLabel + ' · PMC ' + formatEur(pmc,2) + ' · ' + formatDate(t.dataAcquisto));

    var luEl = $('detLastUpdate');
    if (luEl) {
      if (t.lastUpdate) {
        luEl.textContent = 'Aggiornato ' + _formatLastUpdate(t.lastUpdate);
        luEl.style.display = '';
      } else {
        luEl.style.display = 'none';
      }
    }

    // Bottoni periodo
    var periodRow = $('detPeriodRow');
    if (periodRow) {
      periodRow.innerHTML = ['1G','1S','1M','1A','5A','Max'].map(function(p) {
        return '<button class="det-pt' + (p === _detPeriod ? ' active' : '') + '" onclick="Portfolio.setDetPeriod(\'' + p + '\',this)">' + p + '</button>';
      }).join('');
    }

    // Card posizione
    setEl('detValPos', formatEur(valore));
    setEl('detValPosSub', qtyFmt + ' × ' + formatEur(prezzo, 2));
    setEl('detPMC', formatEur(pmc, 4));
    var plEl = $('detPL');
    if (plEl) {
      plEl.className = 'det-pl-val ' + (isPos ? 'pos' : 'neg');
      plEl.innerHTML = formatEurSigned(pl) + '<span class="det-pl-pct"> (' + formatPct(plPct) + ')</span>';
    }
    setEl('detInv', formatEur(costo));

    // Range giornaliero
    var rw = $('detRangeWrap');
    if (rw) {
      if (t.dayHigh && t.dayLow) {
        rw.style.display = '';
        setEl('detRangeMin', 'Min ' + formatEur(t.dayLow, 2));
        setEl('detRangeCur', formatEur(prezzo, 2));
        setEl('detRangeMax', 'Max ' + formatEur(t.dayHigh, 2));
        var dot = $('detRangeDot');
        if (dot) {
          var pct = ((prezzo - t.dayLow) / (t.dayHigh - t.dayLow)) * 100;
          dot.style.left = Math.min(100, Math.max(0, pct)) + '%';
        }
      } else {
        rw.style.display = 'none';
      }
    }

    // Card andamento: label date
    var ccFtrL = $('detChCaricoFtrL');
    if (ccFtrL) ccFtrL.textContent = formatDate(t.dataAcquisto);
    var cPct = $('detChCaricoPct');
    if (cPct) { cPct.className = 'det-ch-pct ' + (isPos?'pos':'neg'); cPct.textContent = formatPct(plPct); }

    // Card dati
    setEl('detIsin',    escHtml(t.isin    || '—'));
    setEl('detMercato', escHtml(t.mercato || '—'));
    setEl('detWkn',     escHtml(t.wkn     || '—'));
    setEl('detValuta',  escHtml(t.valuta  || 'EUR'));
    setEl('detComm',    formatEur(t.commissioni || 0));
    setEl('detTasse',   formatEur(t.tasse || 0));

    // Operazioni
    renderDetOperazioni(t);

    // Reset scroll
    var scroll = $('detScroll');
    if (scroll) scroll.scrollTop = 0;

    // Naviga alla sezione dettaglio (gestisce topbar/tabbar/FAB)
    App.navigate('dettaglio');

    // Grafici (dopo transizione navigate)
    setTimeout(function() {
      _loadDetMainChart(t, _detPeriod);
      _loadDetSmallCharts(t);
    }, 80);
  }

    function _formatLastUpdateFull(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString('it-IT', {day:'numeric', month:'short', year:'numeric'}) + '   ' +
           d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
  }

  function _formatLastUpdate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var diffMin = Math.floor((now - d) / 60000);
    var timeStr = d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
    if (diffMin < 1) return 'adesso · ' + timeStr;
    if (diffMin < 60) return diffMin + ' min fa · ' + timeStr;
    var dateStr = d.toLocaleDateString('it-IT', {day:'numeric', month:'short'});
    return dateStr + ' · ' + timeStr;
  }

  function openDettaglioMenu(id) {
    // Se non viene passato id usa dettaglioId corrente
    if (!id) id = dettaglioId;
    var t = data.investimenti.titoli.find(function(x){ return x.id===id; });
    if (!t) return;
    var existing = $('detMenuOverlay');
    if (existing) existing.remove();
    var menu = document.createElement('div');
    menu.id = 'detMenuOverlay';
    menu.style.cssText = 'position:fixed;inset:0;z-index:10100;background:rgba(0,0,0,.4);display:flex;align-items:flex-end';
    menu.onclick = function(e){ if(e.target===menu) menu.remove(); };
    menu.innerHTML =
      '<div style="background:var(--bg-card);border-radius:20px 20px 0 0;width:100%;padding:8px 0 32px">' +
        '<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:10px auto 16px"></div>' +
        '<div class="sheet-item" onclick="Portfolio.editTitolo(\''+t.id+'\');document.getElementById(\'detMenuOverlay\').remove()">' +
          '<i class="ti ti-edit"></i><span>Modifica titolo</span>' +
        '</div>' +
        (t.tipo==='polizza'||!t.ticker&&!t.codeZB ?
          '<div class="sheet-item" onclick="Portfolio.aggiornaValoreManuale(\''+t.id+'\');document.getElementById(\'detMenuOverlay\').remove()">' +
            '<i class="ti ti-pencil"></i><span>Aggiorna valore</span>' +
          '</div>' : '') +
        '<div class="sheet-item" onclick="Portfolio.nuovoAcquisto(\''+t.id+'\');document.getElementById(\'detMenuOverlay\').remove()">' +
          '<i class="ti ti-circle-plus"></i><span>Nuovo acquisto</span>' +
        '</div>' +
        '<div class="sheet-item" onclick="Portfolio.vendeTitoloById(\''+t.id+'\');document.getElementById(\'detMenuOverlay\').remove()">' +
          '<i class="ti ti-cash"></i><span>Registra vendita</span>' +
        '</div>' +
        '<div class="sheet-item" style="color:var(--danger)" onclick="Portfolio.eliminaTitolo(\''+t.id+'\');document.getElementById(\'detMenuOverlay\').remove()">' +
          '<i class="ti ti-trash"></i><span>Elimina titolo</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(menu);
  }

  function chiudiDettaglio() {
    if (_detChart) { _detChart.destroy(); _detChart = null; }
    App.navigate('investimenti');
  }

  function _loadDetMainChart(t, period) {
    var canvas  = document.getElementById('detMainChart');
    var loading = document.getElementById('detChartLoading');
    if (!canvas) return;
    if (loading) loading.style.display = 'flex';
    if (_detChart) { _detChart.destroy(); _detChart = null; }

    var fetchFn;
    if (period === '1G') {
      fetchFn = Quotes.fetchIntraday(t);
    } else {
      var map = { '1S':'5d', '1M':'1mo', '1A':'1y', '5A':'5y', 'Max':'max' };
      fetchFn = Quotes.fetchHistory(t, map[period] || '1mo');
    }

    fetchFn.then(function(history) {
      if (loading) loading.style.display = 'none';
      if (!canvas || !history.length) return;
      var pmc    = t.pmc || t.prezzoAcquisto;
      var labels = history.map(function(p){ return p.time || new Date(p.date+'T00:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'}); });
      var values = history.map(function(p){ return p.close; });

      // Aggiorna footer
      var ftrL = document.getElementById('detChartFtrLeft');
      if (ftrL) ftrL.textContent = labels[0] || '';

      var ctx  = canvas.getContext('2d');
      // Gradiente bianco su sfondo blu
      var grad = ctx.createLinearGradient(0, 0, 0, 160);
      grad.addColorStop(0, 'rgba(255,255,255,0.20)');
      grad.addColorStop(1, 'rgba(255,255,255,0.00)');

      _detChart = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: [
          {
            label: 'Prezzo',
            data: values,
            borderColor: '#ffffff',
            backgroundColor: grad,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#fff',
            tension: 0.35,
            fill: true,
          },
          {
            label: 'PMC',
            data: Array(values.length).fill(pmc),
            borderColor: 'rgba(255,255,255,0.35)',
            borderWidth: 1.5,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
          }
        ]},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15,23,42,0.85)',
              titleColor: '#f8fafc',
              bodyColor: '#cbd5e1',
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
              callbacks: { label: function(c) { return c.dataset.label + ': ' + formatEur(c.parsed.y, 2); } }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: 'rgba(255,255,255,0.45)',
                font: { size: 10, weight: '500' },
                maxTicksLimit: 5,
                maxRotation: 0,
              }
            },
            y: {
              position: 'right',
              grid: { color: 'rgba(255,255,255,0.10)' },
              border: { display: false },
              ticks: {
                color: 'rgba(255,255,255,0.55)',
                font: { size: 10, weight: '600' },
                callback: function(v) { return formatEur(v, 2); },
                maxTicksLimit: 4,
              }
            }
          },
          interaction: { mode: 'index', intersect: false },
        },
      });
    });
  }

  function _loadDetSmallCharts(t) {
    var pmc    = t.pmc || t.prezzoAcquisto;
    var isPos  = (t.prezzoAttuale||t.prezzoAcquisto) >= pmc;
    var colorC = isPos ? '#15803d' : '#b91c1c';

    // Dal carico
    var cvCarico = document.getElementById('detChCarico');
    if (cvCarico) {
      Quotes.fetchSincePMC(t).then(function(data) {
        if (!data.length) return;
        _drawSparkline(cvCarico, data.map(function(p){ return p.close; }), colorC, pmc);
      });
    }

    // 52 settimane
    var cv52 = document.getElementById('detCh52');
    var pct52el = document.getElementById('det52pct');
    var ftr52L  = document.getElementById('det52ftrL');
    if (cv52 && t.ticker) {
      Quotes.fetchHistory(t, '1y').then(function(data) {
        if (!data.length) return;
        var vals = data.map(function(p){ return p.close; });
        var col52 = vals[vals.length-1] >= vals[0] ? '#15803d' : '#b91c1c';
        var pctV  = vals[0] > 0 ? ((vals[vals.length-1]-vals[0])/vals[0])*100 : 0;
        if (pct52el) { pct52el.textContent = formatPct(pctV); pct52el.className = 'det-ch-pct ' + (pctV>=0?'pos':'neg'); }
        if (ftr52L && data[0]) ftr52L.textContent = new Date(data[0].date+'T00:00:00').toLocaleDateString('it-IT',{month:'short',year:'2-digit'});
        _drawSparkline(cv52, vals, col52, null);
      });
    }
  }

  async function deleteOperazione(titoloId, opIdx) {
    var t = data.investimenti.titoli.find(function(x){ return x.id===titoloId; });
    if (!t || !t.operazioni[opIdx]) return;
    var ok = await Dialog.confirmDanger(
      '<i class="ti ti-trash-filled" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Elimina operazione</strong><br><span style="font-size:13px;color:var(--text-muted)">Questa azione non può essere annullata.</span>',
      'Elimina', 'Annulla'
    );
    if (!ok) return;
    t.operazioni.splice(opIdx, 1);

    // Ricalcola quantita, costoTotale e PMC dalle operazioni rimanenti
    var qtaTot   = 0;
    var costoTot = 0;
    t.operazioni.forEach(function(op) {
      if (op.tipo === 'acquisto') {
        qtaTot   += op.quantita;
        costoTot += op.costoTot || (op.quantita * op.prezzo);
      } else if (op.tipo === 'vendita') {
        qtaTot   -= op.quantita;
      }
    });
    t.quantita    = Math.max(0, qtaTot);
    t.costoTotale = costoTot;
    t.pmc         = t.quantita > 0 ? costoTot / t.quantita : t.prezzoAcquisto;

    renderDetOperazioni(t);
    renderInvestimenti();
    saveAndSync();
    App.showToast('Operazione eliminata', 'info');
  }

  function renderDetOperazioni(t) {
    var container = $('detOperazioni'); if (!container) return;
    var ops = (t.operazioni||[]).slice().reverse();
    if (!ops.length) { container.innerHTML='<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px">Nessuna operazione</div>'; return; }
    container.innerHTML = ops.map(function(op, idx) {
      var isAcq = op.tipo === 'acquisto';
      var totOp = op.costoTot || (op.quantita * op.prezzo);
      var realIdx = ops.length - 1 - idx;
      return '<div class="det-op">' +
        '<div class="det-op-ico ' + (isAcq?'g':'r') + '"><i class="ti ti-shopping-cart' + (isAcq?'-plus':'-x') + '"></i></div>' +
        '<div class="det-op-info">' +
          '<div class="det-op-type">' + (isAcq?'Acquisto':'Vendita') + '</div>' +
          '<div class="det-op-date">' + formatDate(op.data) + ' · ' + formatNum(op.quantita) + ' × ' + formatEur(op.prezzo,4) + (op.comm?' · Comm. '+formatEur(op.comm):'') + '</div>' +
        '</div>' +
        '<div class="det-op-right">' +
          '<div class="det-op-amt ' + (isAcq?'neg':'pos') + '">' + (isAcq?'−':'+')+formatEur(totOp) + '</div>' +
          '<button class="det-op-del" onclick="Portfolio.deleteOperazione(\'' + t.id + '\',' + realIdx + ')"><i class="ti ti-trash"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function setDetPeriod(period, btn) {
    _detPeriod = period;
    document.querySelectorAll('.det-pt').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var t = data.investimenti.titoli.find(function(x){ return x.id===dettaglioId; });
    if (t) _loadDetMainChart(t, period);
  }

  async function eliminaTitolo(id) {
    var t = data.investimenti.titoli.find(function(x){ return x.id===id; });
    if (!t) return;
    var ok = await Dialog.confirmDanger(
      '<i class="ti ti-trash-filled" style="color:var(--danger);font-size:22px;display:block;margin-bottom:10px"></i>' +
      '<strong>Elimina titolo</strong><br><span style="font-size:13px;color:var(--text-muted)">Eliminare ' + escHtml(t.nome) + '? Questa azione non può essere annullata.</span>',
      'Elimina', 'Annulla'
    );
    if (!ok) return;
    data.investimenti.titoli = data.investimenti.titoli.filter(function(x){ return x.id!==id; });
    chiudiDettaglio();
    renderInvestimenti();
    saveAndSync();
    App.showToast('Titolo eliminato','info');
  }


  function vendeTitolo() {
    if (!dettaglioId) return;
    var t = data.investimenti.titoli.find(function(x){ return x.id===dettaglioId; });
    if (!t) return;

    // FIX: mostra dialog con prezzo e quantità prima di procedere
    var prezzoSuggerito = t.prezzoAttuale || t.prezzoAcquisto;
    var qtaDisponibile  = t.quantita;
    var qtyLabel        = t.tipo === 'azione' ? 'azioni' : 'quote';
    var qtyFmt          = qtaDisponibile % 1 === 0 ? String(Math.round(qtaDisponibile)) : qtaDisponibile.toFixed(3);

    var overlay = document.getElementById('dialogOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dialogOverlay';
      overlay.className = 'dialog-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML =
      '<div class="dialog-box" style="max-width:360px">' +
        '<div class="dialog-body" style="text-align:left">' +
          '<i class="ti ti-cash" style="color:var(--success);font-size:24px;display:block;margin-bottom:10px;text-align:center"></i>' +
          '<strong style="display:block;text-align:center;margin-bottom:14px">Vendi ' + escHtml(t.nome) + '</strong>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
            '<div>' +
              '<label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Quantità (' + qtyLabel + ')</label>' +
              '<input id="vendQty" type="number" step="any" min="0.001" max="' + qtaDisponibile + '" ' +
                'value="' + qtyFmt + '" ' +
                'style="width:100%;padding:9px 10px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box" ' +
                'oninput="var q=parseFloat(this.value)||0,p=parseFloat(document.getElementById(\'vendPrice\').value)||0;var tot=document.getElementById(\'vendTot\');if(tot)tot.textContent=(q*p).toFixed(2)+\' €\'" />' +
              '<div style="font-size:10px;color:var(--text-muted);margin-top:3px">Max: ' + qtyFmt + '</div>' +
            '</div>' +
            '<div>' +
              '<label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Prezzo vendita (€)</label>' +
              '<input id="vendPrice" type="number" step="any" min="0" ' +
                'value="' + prezzoSuggerito.toFixed(4) + '" ' +
                'style="width:100%;padding:9px 10px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box" ' +
                'oninput="var q=parseFloat(document.getElementById(\'vendQty\').value)||0,p=parseFloat(this.value)||0;var tot=document.getElementById(\'vendTot\');if(tot)tot.textContent=(q*p).toFixed(2)+\' €\'" />' +
            '</div>' +
          '</div>' +
          '<div style="background:var(--success-light);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-size:12px;font-weight:600;color:var(--success)">Incasso lordo</span>' +
            '<span id="vendTot" style="font-size:15px;font-weight:800;color:var(--success)">' + (prezzoSuggerito * qtaDisponibile).toFixed(2) + ' €</span>' +
          '</div>' +
        '</div>' +
        '<div class="dialog-footer">' +
          '<button class="btn btn--ghost dialog-cancel" style="flex:1">Annulla</button>' +
          '<button class="btn btn--primary dialog-ok" style="flex:2;background:var(--success);border-color:var(--success)"><i class="ti ti-check"></i> Conferma vendita</button>' +
        '</div>' +
      '</div>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    setTimeout(function() {
      var inpQ = document.getElementById('vendQty');
      if (inpQ) { inpQ.focus(); inpQ.select(); }
    }, 100);

    overlay.querySelector('.dialog-cancel').onclick = function() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };
    overlay.querySelector('.dialog-ok').onclick = function() {
      var inpQ = document.getElementById('vendQty');
      var inpP = document.getElementById('vendPrice');
      var qta  = parseFloat(inpQ ? inpQ.value : '');
      var prez = parseFloat(inpP ? inpP.value : '');
      overlay.classList.remove('open');
      document.body.style.overflow = '';

      if (isNaN(qta) || qta <= 0) { App.showToast('Quantità non valida', 'warning'); return; }
      if (isNaN(prez) || prez <= 0) { App.showToast('Prezzo non valido', 'warning'); return; }
      if (qta > qtaDisponibile + 0.0001) { App.showToast('Quantità superiore alla posizione (' + qtyFmt + ')', 'warning'); return; }

      var importoTot = Math.round(prez * qta * 100) / 100;
      var oggi = new Date().toISOString().slice(0, 10);

      t.operazioni.push({ data: oggi, tipo: 'vendita', quantita: qta, prezzo: prez, costoTot: importoTot });

      // Ricalcola quantità residua e PMC
      var nuovaQta = Math.max(0, t.quantita - qta);
      if (nuovaQta <= 0.0001) {
        t.quantita = 0;
        t.venduto  = true;
      } else {
        t.quantita = nuovaQta;
      }

      // Movimento conto (entrata)
      var mov = {
        id: uid(), data: oggi, tipo: 'entrata',
        descrizione: 'Vendita ' + t.nome,
        importo: importoTot, categoria: 'investimento',
        note: qta + ' × ' + formatEur(prez, 4),
      };
      data.conto.movimenti.push(mov);

      renderAll(); Charts.updateAll(); saveAndSync();

      var msg = t.nome + ': venduti ' + qta + ' ' + qtyLabel + ' -> ' + formatEur(importoTot) + ' accreditati';
      if (t.venduto) msg += ' (posizione chiusa)';
      App.showToast(msg, 'success');

      // Se la posizione e' chiusa, torna alla lista investimenti
      // Se vendita parziale, riapri il dettaglio per aggiornare quantita'/P&L
      if (t.venduto) {
        setTimeout(function(){ App.navigate('investimenti'); }, 400);
      } else {
        // Cattura dettaglioId nel closure per evitare race condition
        var idDaAggiornare = dettaglioId;
        setTimeout(function(){
          if (dettaglioId === idDaAggiornare) apriDettaglio(idDaAggiornare);
        }, 100);
      }
    };
  }

  // =============================================
  // HTML HELPERS
  // =============================================

  function transactionHTML(m, showActions) {
    var isPos  = m.tipo==='entrata';
    var icon   = catIcon(m.categoria);
    var color  = catColor(m.categoria);
    var amount = isPos ? '+'+formatEur(m.importo) : '-'+formatEur(m.importo);
    var cls    = isPos ? 'transaction-amount--positive' : 'transaction-amount--negative';
    if (!showActions) {
      return '<div class="transaction-item">' +
        '<div class="transaction-icon '+color+'"><i class="ti ti-'+icon+'"></i></div>' +
        '<div class="transaction-body"><div class="transaction-desc">'+escHtml(m.descrizione)+'</div><div class="transaction-meta">'+formatDate(m.data)+' · '+catLabel(m.categoria)+'</div></div>' +
        '<div class="transaction-amount '+cls+'">'+amount+'</div>' +
      '</div>';
    }
    return '<div class="swipe-row" id="swipe-mov-'+m.id+'">' +
      '<div class="swipe-row__content transaction-item" onclick="Portfolio.editMovimento(\''+m.id+'\')">' +
        '<div class="transaction-icon '+color+'"><i class="ti ti-'+icon+'"></i></div>' +
        '<div class="transaction-body"><div class="transaction-desc">'+escHtml(m.descrizione)+'</div><div class="transaction-meta">'+formatDate(m.data)+' · '+catLabel(m.categoria)+'</div></div>' +
        '<div class="transaction-amount '+cls+'">'+amount+'</div>' +
      '</div>' +
      '<div class="swipe-row__delete" onclick="Portfolio.confirmDeleteMovimento(\''+m.id+'\')" title="Elimina"><i class="ti ti-trash"></i></div>' +
    '</div>';
  }

  function cartaSpesaHTML(s) {
    return '<div class="swipe-row" id="swipe-spesa-'+s.id+'">' +
      '<div class="swipe-row__content transaction-item" onclick="Portfolio.editSpesaCarta(\''+s.id+'\')">' +
        '<div class="transaction-icon '+catColor(s.categoria)+'"><i class="ti ti-'+catIcon(s.categoria)+'"></i></div>' +
        '<div class="transaction-body"><div class="transaction-desc">'+escHtml(s.descrizione)+'</div><div class="transaction-meta">'+formatDate(s.data)+' · '+catLabel(s.categoria)+(s.addebitoData?' · Addebito: '+formatDate(s.addebitoData):'')+' </div></div>' +
        '<div class="transaction-amount transaction-amount--negative">-'+formatEur(s.importo)+'</div>' +
      '</div>' +
      '<div class="swipe-row__delete" onclick="Portfolio.confirmDeleteSpesaCarta(\''+s.id+'\')" title="Elimina"><i class="ti ti-trash"></i></div>' +
    '</div>';
  }


  function detNuovoAcquisto() {
    if (!dettaglioId) return;
    nuovoAcquisto(dettaglioId);
  }

  function detVendi() {
    vendeTitoloById(dettaglioId);
  }

  function cancellaMovimentiConto() {
    data.conto.movimenti = [];
    renderConto(); renderDashboard(); Charts.updateAll(); saveAndSync();
  }

  function cancellaSpeseCarta() {
    data.carta.spese = [];
    renderCarta(); renderDashboard(); saveAndSync();
  }

  function cancellaTitoli() {
    data.investimenti.titoli = [];
    renderInvestimenti(); renderDashboard(); Charts.updateAll(); saveAndSync();
  }

  function resetNuovoAcquisto() { _nuovoAcquistoId = null; }

  // =============================================
  // IMPORTA TITOLI DA CSV (formato banca)
  // =============================================

  async function importTitoliDaCSV() {
    return new Promise(function(resolve, reject) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.txt';
      input.onchange = async function(e) {
        var file = e.target.files[0];
        if (!file) { reject('Nessun file'); return; }
        try {
          var text = await file.text();
          var result = _parseTitoliCSV(text);
          resolve(result);
        } catch(err) {
          App.showToast('Errore lettura file: ' + err.message, 'error');
          reject(err);
        }
      };
      input.click();
    });
  }

  function _parseTitoliCSV(text) {
    var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) throw new Error('File vuoto o non valido');

    var header = lines[0].split(';').map(function(h){ return h.trim(); });

    // Indici colonne (nuovo formato con codeZB esplicito)
    var iData    = header.findIndex(function(h){ return h === 'Data'; });
    var iTipo    = header.findIndex(function(h){ return h === 'Tipo'; });
    var iValore  = header.findIndex(function(h){ return h === 'Valore'; });
    var iComm    = header.findIndex(function(h){ return h.toLowerCase() === 'commissioni'; });
    var iTasse   = header.findIndex(function(h){ return h.toLowerCase() === 'tasse'; });
    var iAzioni  = header.findIndex(function(h){ return h === 'Azioni'; });
    var iISIN    = header.findIndex(function(h){ return h === 'ISIN'; });
    var iSimbolo = header.findIndex(function(h){ return h === 'Ticker Yahoo' || h === 'Simbolo Titolo'; }); // supporta entrambi i nomi
    var iCodeZB  = header.findIndex(function(h){ return h === 'codeZB'; });
    var iNome    = header.findIndex(function(h){ return h === 'Nome Titolo'; });
    var iNote    = header.findIndex(function(h){ return h === 'Note'; });

    if (iData === -1 || iTipo === -1 || iNome === -1)
      throw new Error('Formato CSV non riconosciuto — verificare le colonne');

    // Mappa Note → tipo titolo app
    var NOTE_TIPO = {
      'azioni':       'azione',
      'certificates': 'certificate',
      'fondi':        'fondo',
      'pir':          'pir',
      'polizze vita': 'polizza',
      'polizze':      'polizza',
    };

    function parseNum(s) {
      if (s == null || s === '') return null;
      s = String(s).trim().replace(/"/g, '');
      if (s === '' || s === '-') return null;
      // Formato italiano con decimali: 1.234,56 → 1234.56
      if (/^-?[\d.]+,\d+$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
      // Formato italiano intero con separatore migliaia: 1.199 → 1199
      } else if (/^-?\d{1,3}(\.(\d{3}))+$/.test(s)) {
        s = s.replace(/\./g, '');
      } else {
        s = s.replace(',', '');
      }
      var n = parseFloat(s);
      return isNaN(n) ? null : n;
    }

    function parseRow(line) {
      var fields = [], cur = '', inQ = false;
      for (var i = 0; i < line.length; i++) {
        var c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ';' && !inQ) { fields.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
      fields.push(cur.trim());
      return fields;
    }

    // Raggruppa operazioni per titolo (chiave = simbolo o ISIN o nome)
    var gruppi = {};

    lines.slice(1).forEach(function(line) {
      if (!line.trim()) return;
      var r = parseRow(line);

      var tipo    = (r[iTipo]  || '').trim();
      var nome    = (r[iNome]  || '').trim();
      var simbolo = iSimbolo >= 0 ? (r[iSimbolo] || '').trim() : '';
      var codeZB  = iCodeZB  >= 0 ? (r[iCodeZB]  || '').trim() : '';
      var isin    = iISIN    >= 0 ? (r[iISIN]    || '').trim() : '';
      var note    = iNote    >= 0 ? (r[iNote]    || '').trim().toLowerCase() : '';
      var dataStr = (r[iData] || '').trim().slice(0, 10);

      var valore = parseNum(r[iValore]);
      var comm   = parseNum(r[iComm])  || 0;
      var tasse  = parseNum(r[iTasse]) || 0;
      var azioni = parseNum(r[iAzioni]);

      if (!nome || azioni == null) return;

      // Chiave raggruppamento: prima simbolo ticker (non .F), poi ISIN, poi nome
      var tickerKey = (simbolo && !simbolo.endsWith('.F') && !simbolo.match(/^[A-Z]{2}\d/)) ? simbolo : null;
      var key = tickerKey || isin || nome;

      if (!gruppi[key]) {
        gruppi[key] = {
          nome: nome, isin: isin,
          simbolo: simbolo, codeZB: codeZB,
          tipoNote: NOTE_TIPO[note] || null,
          operazioni: [],
        };
      }
      // Aggiorna codeZB se presente (può comparire in righe diverse)
      if (codeZB && !gruppi[key].codeZB) gruppi[key].codeZB = codeZB;

      gruppi[key].operazioni.push({
        data: dataStr, tipo: tipo,
        valore: Math.abs(valore || 0),
        comm: comm, tasse: tasse,
        azioni: Math.abs(azioni),
      });
    });

    var importati = [], scartati = [], giaDuplicati = [];

    Object.keys(gruppi).forEach(function(key) {
      var g = gruppi[key];

      var qtaTot = 0, costoTot = 0;
      var primaData = null;
      var operazioniSalvate = [];

      g.operazioni.forEach(function(op) {
        var isAcquisto = op.tipo === 'Compra' || op.tipo === 'Trasferimento Titoli (in entrata)';
        var isVendita  = op.tipo === 'Vendi'  || op.tipo === 'Trasferimento Titoli (in uscita)';

        if (!primaData || op.data < primaData) primaData = op.data;

        if (isAcquisto) {
          var costoOp = op.valore + op.comm + op.tasse;
          qtaTot   += op.azioni;
          costoTot += costoOp;
          operazioniSalvate.push({
            data: op.data, tipo: 'acquisto',
            quantita: op.azioni,
            prezzo: op.azioni > 0 ? op.valore / op.azioni : 0,
            comm: op.comm, tasse: op.tasse, costoTot: costoOp,
          });
        } else if (isVendita) {
          // Sottrai dal costoTot la quota proporzionale (PMC corrente × quantità venduta)
          var pmcCorrente = qtaTot > 0 ? costoTot / qtaTot : 0;
          costoTot -= pmcCorrente * op.azioni;
          qtaTot   -= op.azioni;
          operazioniSalvate.push({
            data: op.data, tipo: 'vendita',
            quantita: op.azioni,
            prezzo: op.azioni > 0 ? op.valore / op.azioni : 0,
            comm: op.comm, tasse: op.tasse, costoTot: op.valore,
          });
        }
      });

      // STEP 1: genera movimenti conto per TUTTE le operazioni (anche titoli chiusi/duplicati)
      g.operazioni.forEach(function(op) {
        var isAcquisto = op.tipo === 'Compra' || op.tipo === 'Trasferimento Titoli (in entrata)';
        var isVendita  = op.tipo === 'Vendi'  || op.tipo === 'Trasferimento Titoli (in uscita)';
        if (!isAcquisto && !isVendita) return;

        var tipoMov    = isAcquisto ? 'uscita' : 'entrata';
        var descMov    = (isAcquisto ? 'Acquisto ' : 'Vendita ') + g.nome;
        var importoMov = Math.round(Math.abs(op.valore + (isAcquisto ? op.comm + op.tasse : -(op.comm + op.tasse))) * 100) / 100;
        if (importoMov <= 0) return;

        var isDup = data.conto.movimenti.some(function(m) {
          return m.data === op.data && m.descrizione === descMov &&
                 Math.round(m.importo * 100) / 100 === importoMov;
        });
        if (isDup) return;

        var qta = op.azioni % 1 === 0 ? String(Math.round(op.azioni)) : op.azioni.toFixed(3);
        var noteParts = [qta + ' unità'];
        if (op.comm  > 0) noteParts.push('Comm. '  + op.comm.toFixed(2)  + ' €');
        if (op.tasse > 0) noteParts.push('Tasse ' + op.tasse.toFixed(2) + ' €');

        data.conto.movimenti.push({
          id: uid(), data: op.data, tipo: tipoMov,
          descrizione: descMov, importo: importoMov,
          categoria: 'investimento', note: noteParts.join(' | '),
        });

      });

      // STEP 2: aggiunge il titolo solo se posizione aperta e non duplicata
      if (qtaTot <= 0.0001) {
        scartati.push({ nome: g.nome, motivo: 'Posizione chiusa (quantità netta = 0)' });
        return;
      }

      var dup = data.investimenti.titoli.find(function(t) {
        return (g.isin && t.isin === g.isin) ||
               (g.simbolo && !g.simbolo.endsWith('.F') && t.ticker === g.simbolo) ||
               (g.codeZB && t.codeZB === g.codeZB) ||
               t.nome === g.nome;
      });
      if (dup) {
        giaDuplicati.push({ nome: g.nome, motivo: 'Già presente in portafoglio' });
        return;
      }

      var pmc        = qtaTot > 0 ? costoTot / qtaTot : 0;
      var tipoTitolo = g.tipoNote || 'azione';

      // Determina ticker e codeZB dal simbolo
      var ticker = null, codeZBFinal = g.codeZB || null;
      if (g.simbolo) {
        if (g.simbolo.endsWith('.F') || g.simbolo.match(/^0P/)) {
          // Fondo: simbolo .F è un ticker Yahoo Finance, non un codeZB ZoneBourse
          ticker = g.simbolo;
        } else if (!g.simbolo.match(/^[A-Z]{2}\d/)) {
          // Azione: simbolo è ticker (es. LDO.MI, STMPA.PA)
          ticker = g.simbolo;
        }
        // Certificates: simbolo = ISIN, codeZB già impostato dalla colonna codeZB
      }

      var mercato = 'INT';
      if (ticker) {
        if (ticker.endsWith('.MI')) mercato = 'MIL';
        else if (ticker.endsWith('.PA')) mercato = 'PAR';
      }

      data.investimenti.titoli.push({
        id: uid(), tipo: tipoTitolo, nome: g.nome,
        ticker: ticker, codeZB: codeZBFinal,
        isin: g.isin || '', wkn: '',
        mercato: mercato, valuta: 'EUR',
        dataAcquisto: primaData || new Date().toISOString().slice(0, 10),
        quantita: qtaTot, prezzoAcquisto: pmc,
        cambio: 1,
        commissioni: g.operazioni.reduce(function(s,o){ return s + o.comm;  }, 0),
        tasse:       g.operazioni.reduce(function(s,o){ return s + o.tasse; }, 0),
        costoTotale: costoTot, pmc: pmc, prezzoAttuale: pmc,
        change: 0, changePct: 0, currency: 'EUR',
        venduto: false, note: '',
        operazioni: operazioniSalvate,
      });
      importati.push({ nome: g.nome, tipo: tipoTitolo, quantita: qtaTot, pmc: pmc });
    });

    return { importati: importati, scartati: scartati, duplicati: giaDuplicati };
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
    openTitoloSheet, closeTitoloSheet, aggiornaValoreManuale, toggleSezione,
    apriDettaglio, chiudiDettaglio, openDettaglioMenu, eliminaTitolo, vendeTitolo, vendeTitoloById,
    detNuovoAcquisto, detVendi,
    setDetPeriod, getDettaglioId, deleteOperazione,
    getEditingTitolo, restoreEditingTitolo, resetNuovoAcquisto,
    cancellaMovimentiConto, cancellaSpeseCarta, cancellaTitoli,
    confirmDeleteMovimento, confirmDeleteSpesaCarta,
    importTitoliDaCSV,
    restoreEditingMovimento, restoreEditingSpesaCarta,
    formatEur, formatDate,
    populateCategorieSelect, importDaBanca,
    catLabel, catIcon, catColor, CATEGORIE_BUILTIN, CATEGORIE_CUSTOM_DEFAULT,
  };

})();
