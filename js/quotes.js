/* =============================================
   PORTAFOGLIO PERSONALE — quotes.js
   Quotazioni da Yahoo Finance e Zonebourse
   via Cloudflare Worker proxy
   ============================================= */

const Quotes = (() => {

  // ---- Configurazione ----
  const WORKER_URL  = 'https://portafoglio-proxy.roberto-giacomazzi.workers.dev';
  const CACHE_TTL   = 5 * 60 * 1000;   // 5 minuti cache locale
  const RETRY_MAX   = 2;

  // Cache locale { ticker: { price, change, changePct, timestamp } }
  const cache = {};

  // =============================================
  // FETCH TRAMITE WORKER PROXY
  // =============================================

  async function proxyFetch(targetUrl, retries = 0) {
    const url = `${WORKER_URL}?url=${encodeURIComponent(targetUrl)}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (retries < RETRY_MAX) {
        await delay(1000 * (retries + 1));
        return proxyFetch(targetUrl, retries + 1);
      }
      throw err;
    }
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // =============================================
  // YAHOO FINANCE
  // =============================================

  async function fetchYahoo(ticker) {
    // Controlla cache
    const cached = cache[ticker];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;
    const res  = await proxyFetch(url);
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) throw new Error(`Ticker ${ticker} non trovato`);

    const meta       = result.meta;
    const price      = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose  = meta.previousClose ?? price;
    const openPrice  = meta.regularMarketOpen ?? prevClose;
    const change     = price - prevClose;
    const changePct  = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    const changeFromOpen    = price - openPrice;
    const changePctFromOpen = openPrice !== 0 ? (changeFromOpen / openPrice) * 100 : 0;
    const currency   = meta.currency ?? 'EUR';

    const quote = {
      ticker,
      name:      meta.longName || meta.shortName || ticker,
      price:     round(price),
      change:    round(change),
      changePct: round(changePct),
      changeFromOpen:    round(changeFromOpen),
      changePctFromOpen: round(changePctFromOpen),
      openPrice: round(openPrice),
      currency,
      timestamp: Date.now(),
      source:    'yahoo',
    };

    cache[ticker] = quote;
    return quote;
  }

  // Storico prezzi Yahoo (per grafici)
  async function fetchYahooHistory(ticker, range = '1y', interval = '1d') {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
    const res  = await proxyFetch(url);
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const closes     = result.indicators?.quote?.[0]?.close ?? [];

    return timestamps.map((ts, i) => ({
      date:  new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i] != null ? round(closes[i]) : null,
    })).filter(p => p.close !== null);
  }

  // =============================================
  // ZONEBOURSE
  // =============================================

  async function fetchZonebourse(codeZB) {
    const cached = cache[`zb_${codeZB}`];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached;

    const url = `https://www.zonebourse.com/charting/atDataFeed.php?codeZB=${codeZB}&type=chart&fields=Date,Close`;
    const res  = await proxyFetch(url);
    const text = await res.text();

    // Parse CSV: Date,Close
    const lines  = text.trim().split('\n').filter(l => l && !l.startsWith('Date'));
    if (lines.length === 0) throw new Error(`Nessun dato Zonebourse per ${codeZB}`);

    // Prendi ultima e penultima riga
    const last   = parseLine(lines[lines.length - 1]);
    const prev   = lines.length > 1 ? parseLine(lines[lines.length - 2]) : last;

    const price     = last.close;
    const prevClose = prev.close;
    const change    = price - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    const quote = {
      ticker:    `zb_${codeZB}`,
      codeZB,
      price:     round(price),
      change:    round(change),
      changePct: round(changePct),
      currency:  'EUR',
      timestamp: Date.now(),
      source:    'zonebourse',
    };

    cache[`zb_${codeZB}`] = quote;
    return quote;
  }

  function parseLine(line) {
    const parts = line.split(',');
    return {
      date:  parts[0]?.trim() ?? '',
      close: parseFloat(parts[1]?.trim() ?? '0') || 0,
    };
  }

  // Storico Zonebourse (per grafici)
  async function fetchZonebourseHistory(codeZB) {
    const url = `https://www.zonebourse.com/charting/atDataFeed.php?codeZB=${codeZB}&type=chart&fields=Date,Close`;
    const res  = await proxyFetch(url);
    const text = await res.text();

    return text.trim().split('\n')
      .filter(l => l && !l.startsWith('Date'))
      .map(parseLine)
      .filter(p => p.close > 0);
  }

  // =============================================
  // API UNIFICATA
  // =============================================

  /**
   * Recupera quotazione per un titolo.
   * @param {Object} titolo - { ticker?, codeZB?, tipo }
   * @returns {Object} quote
   */
  async function fetchQuote(titolo) {
    try {
      // Polizze e strumenti manuali: nessuna quotazione automatica
      if (titolo.tipo === 'polizza') {
        return { price: titolo.prezzoAttuale || titolo.pmc || titolo.prezzoAcquisto, change: 0, changePct: 0, source: 'manuale' };
      }
      if (titolo.codeZB) {
        return await fetchZonebourse(titolo.codeZB);
      } else if (titolo.ticker) {
        return await fetchYahoo(titolo.ticker);
      }
      throw new Error('Nessun identificativo titolo');
    } catch (err) {
      console.warn(`Quote error per ${titolo.ticker || titolo.codeZB}:`, err.message);
      return null;
    }
  }

  /**
   * Aggiorna tutte le quotazioni del portafoglio.
   */
  async function refreshAll() {
    const titoli = Portfolio.getTitoli();
    if (!titoli || titoli.length === 0) {
      App.showToast('Nessun titolo in portafoglio', 'info');
      return;
    }

    App.showLoading(true);
    App.showToast('Aggiornamento quotazioni...', 'info');

    // Raggruppa per fonte per parallelizzare
    const results = await Promise.allSettled(
      titoli.map(t => fetchQuote(t).then(q => ({ id: t.id, quote: q })))
    );

    let updated = 0;
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.quote) {
        Portfolio.updateQuote(r.value.id, r.value.quote);
        updated++;
      }
    });

    App.showLoading(false);
    Portfolio.renderAll();
    Charts.updateAll();

    // Salva su Drive
    await Drive.save(Portfolio.getData());

    // Aggiorna timestamp
    const now = new Date().toLocaleString('it-IT');
    const el  = document.getElementById('lastQuoteUpdate');
    if (el) el.textContent = `Ultimo aggiornamento: ${now}`;

    App.showToast(`${updated}/${titoli.length} quotazioni aggiornate`, updated > 0 ? 'success' : 'warning');
  }

  /**
   * Recupera storico prezzi per grafici.
   * @param {Object} titolo
   * @param {string} range - '1mo','3mo','6mo','1y'
   */
  async function fetchHistory(titolo, range = '1y') {
    try {
      if (titolo.codeZB) {
        return await fetchZonebourseHistory(titolo.codeZB);
      } else if (titolo.ticker) {
        const map = { '1M': '1mo', '3M': '3mo', '6M': '6mo', '1A': '1y' };
        return await fetchYahooHistory(titolo.ticker, map[range] || '1y');
      }
      return [];
    } catch (err) {
      console.warn('History error:', err.message);
      return [];
    }
  }

  // Storico intraday (intervalli 5 minuti, giornata corrente)
  async function fetchIntraday(titolo) {
    try {
      if (!titolo.ticker) return [];
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(titolo.ticker)}?interval=5m&range=1d`;
      const res  = await proxyFetch(url);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) return [];
      const timestamps = result.timestamp ?? [];
      const closes     = result.indicators?.quote?.[0]?.close ?? [];
      return timestamps.map((ts, i) => ({
        time:  new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        close: closes[i] != null ? round(closes[i]) : null,
      })).filter(p => p.close !== null);
    } catch (err) {
      console.warn('Intraday error:', err.message);
      return [];
    }
  }

  // Storico dal carico: da dataAcquisto a oggi
  async function fetchSincePMC(titolo) {
    try {
      if (titolo.codeZB) {
        // ZoneBourse: restituisce tutto lo storico, filtriamo dalla data acquisto
        const all = await fetchZonebourseHistory(titolo.codeZB);
        return all.filter(p => p.date >= titolo.dataAcquisto);
      } else if (titolo.ticker) {
        // Calcola range in giorni dalla data di acquisto
        const msDay = 86400000;
        const giorni = Math.ceil((Date.now() - new Date(titolo.dataAcquisto).getTime()) / msDay);
        let range = '1y';
        if (giorni > 365 * 2) range = '5y';
        else if (giorni > 365) range = '2y';
        const all = await fetchYahooHistory(titolo.ticker, range, '1d');
        return all.filter(p => p.date >= titolo.dataAcquisto);
      }
      return [];
    } catch (err) {
      console.warn('SincePMC error:', err.message);
      return [];
    }
  }



  // =============================================
  // RICERCA TICKER YAHOO
  // =============================================

  async function searchTicker(query) {
    if (!query || query.length < 2) return [];
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=it&region=IT&quotesCount=8&newsCount=0`;
    try {
      const res  = await proxyFetch(url);
      const json = await res.json();
      return (json?.quotes ?? []).map(q => ({
        ticker:   q.symbol,
        name:     q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange,
        type:     q.quoteType,
      }));
    } catch {
      return [];
    }
  }

  // =============================================
  // UTILITY
  // =============================================

  function round(n, decimals = 4) {
    return Math.round(n * 10 ** decimals) / 10 ** decimals;
  }

  function formatPrice(price, currency = 'EUR') {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency', currency,
      minimumFractionDigits: 2, maximumFractionDigits: 4,
    }).format(price);
  }

  function formatPct(pct) {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  }

  function getChangeClass(value) {
    if (value > 0) return 'titolo-var--pos';
    if (value < 0) return 'titolo-var--neg';
    return '';
  }

  function getChangeIcon(value) {
    if (value > 0) return 'bi-arrow-up-right';
    if (value < 0) return 'bi-arrow-down-right';
    return 'bi-dash';
  }

  // Svuota cache (utile per forzare refresh)
  function clearCache() {
    Object.keys(cache).forEach(k => delete cache[k]);
  }

  // ---- API pubblica ----
  return {
    fetchQuote,
    fetchHistory,
    fetchIntraday,
    fetchSincePMC,
    refreshAll,
    searchTicker,
    formatPrice,
    formatPct,
    getChangeClass,
    getChangeIcon,
    clearCache,
  };

})();
