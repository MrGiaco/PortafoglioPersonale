// ── IMPORT.JS ────────────────────────────────────────────────────────────────
// Parsing dei file CSV/XLS esportati da Banca Intesa Sanpaolo

const Import = (() => {

  // ── Leggi file come testo ────────────────────────────────────────────────

  function leggiFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Errore lettura file'));

      // Intesa esporta in ISO-8859-1 (Latin-1)
      reader.readAsText(file, 'ISO-8859-1');
    });
  }

  // ── Rileva formato CSV Intesa Sanpaolo ───────────────────────────────────
  // Il CSV di Intesa ha questa struttura tipica:
  // "Data";"Descrizione";"Importo";"Valuta";"Saldo"
  // o con varianti di intestazione

  function parseCSV(testo) {
    const righe = testo
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    if (righe.length < 2) throw new Error('File CSV vuoto o non valido');

    // Rileva separatore (; o ,)
    const separatore = righe[0].includes(';') ? ';' : ',';

    // Rimuovi le virgolette e splitta
    const splitRiga = r => r.split(separatore).map(c => c.replace(/^"|"$/g, '').trim());

    const intestazione = splitRiga(righe[0]).map(h => h.toLowerCase());
    const movimenti    = [];

    // Mappa colonne flessibile
    const idxData     = trovColonna(intestazione, ['data', 'date', 'data valuta', 'data operazione']);
    const idxDesc     = trovColonna(intestazione, ['descrizione', 'description', 'causale', 'operazione']);
    const idxImporto  = trovColonna(intestazione, ['importo', 'amount', 'dare/avere', 'valore']);

    if (idxData === -1 || idxDesc === -1 || idxImporto === -1) {
      return parseCSVByPosition(righe, separatore, splitRiga);
    }

    const _base = Date.now();
    for (let i = 1; i < righe.length; i++) {
      const cols = splitRiga(righe[i]);
      if (cols.length < 3) continue;

      const data    = parseData(cols[idxData]);
      const desc    = cols[idxDesc];
      const importo = parseImporto(cols[idxImporto]);

      if (!data || isNaN(importo)) continue;

      movimenti.push({
        id:      `imp-${_base}-${i}`,
        data,
        desc,
        importo,
        importato: true
      });
    }

    return movimenti;
  }

  // ── Parsing per posizione (formato Intesa classico) ──────────────────────

  function parseCSVByPosition(righe, sep, splitFn) {
    const movimenti = [];
    const _base = Date.now();

    for (let i = 1; i < righe.length; i++) {
      const cols = splitFn(righe[i]);
      if (cols.length < 3) continue;

      // Cerca la prima cella che sembra una data
      let idxData = -1, idxImporto = -1, idxDesc = -1;

      for (let j = 0; j < cols.length; j++) {
        if (idxData === -1 && isData(cols[j]))    idxData    = j;
        if (idxImporto === -1 && isImporto(cols[j])) idxImporto = j;
        if (idxDesc === -1 && cols[j].length > 5 && !isData(cols[j]) && !isImporto(cols[j])) idxDesc = j;
      }

      if (idxData === -1 || idxImporto === -1) continue;

      const data    = parseData(cols[idxData]);
      const importo = parseImporto(cols[idxImporto]);
      const desc    = idxDesc >= 0 ? cols[idxDesc] : 'Movimento importato';

      if (!data || isNaN(importo)) continue;

      movimenti.push({
        id:      `imp-${_base}-${i}`,
        data,
        desc,
        importo,
        importato: true
      });
    }

    return movimenti;
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  function trovColonna(intestazione, nomi) {
    for (const nome of nomi) {
      const idx = intestazione.findIndex(h => h.includes(nome));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function isData(s) {
    return /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(s);
  }

  function isImporto(s) {
    return /^-?\d{1,3}([.,]\d{3})*([.,]\d{1,2})?$/.test(s.replace(/\s/g, ''));
  }

  function parseData(s) {
    if (!s) return null;
    // Formati: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const m1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
    const m2 = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (m2) return `${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`;
    return null;
  }

  function parseImporto(s) {
    if (!s) return NaN;
    // Formato italiano: 1.234,56 → 1234.56
    let n = s.replace(/\s/g, '');
    if (n.includes(',') && n.includes('.')) {
      // 1.234,56 → punto migliaia, virgola decimale
      n = n.replace(/\./g, '').replace(',', '.');
    } else if (n.includes(',') && !n.includes('.')) {
      // 1234,56 → virgola decimale
      n = n.replace(',', '.');
    }
    return parseFloat(n);
  }

  // ── Deduplicazione movimenti ─────────────────────────────────────────────

  function deduplicaMovimenti(esistenti, nuovi) {
    const chiavi = new Set(
      esistenti.map(m => `${m.data}|${m.importo}|${m.desc?.substring(0, 20)}`)
    );
    return nuovi.filter(m => {
      const k = `${m.data}|${m.importo}|${m.desc?.substring(0, 20)}`;
      return !chiavi.has(k);
    });
  }

  // ── Entry point pubblico ─────────────────────────────────────────────────

  async function importaFile(file, movimentiEsistenti = []) {
    let testo;
    try {
      testo = await leggiFile(file);
    } catch (err) {
      return { ok: false, error: err.message };
    }

    let movimenti;
    try {
      movimenti = parseCSV(testo);
    } catch (err) {
      return { ok: false, error: `Formato non riconosciuto: ${err.message}` };
    }

    if (movimenti.length === 0) {
      return { ok: false, error: 'Nessun movimento trovato nel file' };
    }

    const nuovi = deduplicaMovimenti(movimentiEsistenti, movimenti);

    return {
      ok:         true,
      totale:     movimenti.length,
      nuovi:      nuovi.length,
      duplicati:  movimenti.length - nuovi.length,
      movimenti:  nuovi
    };
  }

  return { importaFile };

})();
