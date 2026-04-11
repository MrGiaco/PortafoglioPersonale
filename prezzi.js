// ── PREZZI.JS ─────────────────────────────────────────────────────────────────
// Fetch prezzi via Cloudflare Worker + calcoli portafoglio

const Prezzi = (() => {

  // ── Aggiorna tutti i prezzi tramite Worker ───────────────────────────────

  async function aggiornaTutti(titoli, onProgress) {
    const oggi = new Date().toISOString().split('T')[0];

    // Solo titoli con fonte automatica e ticker
    const fetchable = titoli.filter(t => {
      const fonte = t.fonte_prezzi || t.fonte || 'yahoo';
      return fonte !== 'manuale' && (t.ticker || t.codeZB);
    });

    if (fetchable.length === 0) return {};

    const tickers = fetchable.map(t => {
      const fonte = t.fonte_prezzi || t.fonte || 'yahoo';
      return {
        id:     t.id,
        symbol: t.ticker || null,
        type:   fonte === 'zonebourse' ? 'zonebourse' : 'yahoo',
        codeZB: t.codeZB || null
      };
    });

    try {
      const res = await fetch(CONFIG.WORKER_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tickers })
      });

      if (!res.ok) throw new Error(`Worker HTTP ${res.status}`);
      const data = await res.json();

      const mappa = {};
      for (const r of data.results || []) {
        if (r.id) mappa[r.id] = r;
      }
      return mappa;

    } catch (e) {
      console.error('Errore Worker prezzi:', e);
      return {};
    }
  }

  // ── Applica i prezzi ricevuti ai titoli (raw data) ───────────────────────

  function applicaPrezzi(titoli, risultati) {
    const oggi = new Date().toISOString().split('T')[0];

    return titoli.map(t => {
      const r = risultati[t.id];
      if (!r || r.error || !r.prezzi || r.prezzi.length === 0) return t;

      const prezzi = r.prezzi;
      const ultimo      = prezzi[prezzi.length - 1];
      const penultimo   = prezzi.length > 1 ? prezzi[prezzi.length - 2] : null;

      const var_pct = penultimo && penultimo.prezzo > 0
        ? ((ultimo.prezzo - penultimo.prezzo) / penultimo.prezzo) * 100
        : null;

      return {
        ...t,
        prezzo_attuale:    ultimo.prezzo,
        data_ultimo_prezzo: ultimo.data,
        aggiornato_oggi:   ultimo.data === oggi,
        var_pct_oggi:      var_pct,
        storico_prezzi:    prezzi
      };
    });
  }

  // ── Calcola valori derivati per ogni titolo ──────────────────────────────

  function calcolaPortafoglio(titoli) {
    const oggi = new Date().toISOString().split('T')[0];

    return (titoli || []).map(t => {
      const cat     = t.categoria || t.tipo || 'Altro';
      const fonte   = t.fonte_prezzi || t.fonte || 'yahoo';
      const qty     = t.quantita ?? 1;
      const carico  = t.prezzo_carico || 0;
      const attuale = t.prezzo_attuale || t.prezzo_carico || 0;

      const _costo_totale  = qty * carico;
      const _valore_totale = qty * attuale;
      const _gp_eur        = _valore_totale - _costo_totale;
      const _gp_pct        = _costo_totale > 0 ? (_gp_eur / _costo_totale) * 100 : null;
      const aggiornato_oggi = t.data_ultimo_prezzo === oggi;

      return {
        ...t,
        categoria:       cat,
        fonte_prezzi:    fonte,
        aggiornato_oggi,
        _costo_totale,
        _valore_totale,
        _gp_eur,
        _gp_pct
      };
    });
  }

  // ── Calcola totali portafoglio ────────────────────────────────────────────

  function calcolaTotali(titoli, conti) {
    const totale_valore = (titoli || []).reduce((s, t) => s + (t._valore_totale || 0), 0);
    const totale_costo  = (titoli || []).reduce((s, t) => s + (t._costo_totale  || 0), 0);
    const gp_eur  = totale_valore - totale_costo;
    const gp_pct  = totale_costo > 0 ? (gp_eur / totale_costo) * 100 : 0;

    const listaConti = Array.isArray(conti) ? conti : (conti ? [conti] : []);
    const saldo_conto = listaConti.reduce((tot, c) => {
      // I trasferimenti tra conti vengono esclusi: non sono entrate/uscite reali
      const mov = (c.movimenti || [])
        .filter(m => m.tipo !== 'trasferimento')
        .reduce((s, m) => s + (m.importo || 0), 0);
      return tot + (c.saldo_iniziale || 0) + mov;
    }, 0);

    const patrimonio = totale_valore + saldo_conto;
    return { totale_valore, totale_costo, gp_eur, gp_pct, saldo_conto, patrimonio };
  }

  return { aggiornaTutti, applicaPrezzi, calcolaPortafoglio, calcolaTotali };

})();
