// ── WALLET.JS ────────────────────────────────────────────────────────────────
// Integrazione BudgetBakers Wallet API tramite Cloudflare Worker

const Wallet = (() => {

  const LS_TOKEN      = 'pf_wallet_token';
  const LS_ACCOUNT_ID = 'pf_wallet_account_id';
  const LS_LAST_SYNC  = 'pf_wallet_last_sync';

  // ── Accesso alle impostazioni salvate ────────────────────────────────────

  function getToken()     { return localStorage.getItem(LS_TOKEN) || ''; }
  function getAccountId() { return localStorage.getItem(LS_ACCOUNT_ID) || ''; }
  function getLastSync()  { return localStorage.getItem(LS_LAST_SYNC) || ''; }

  function salvaToken(token)         { localStorage.setItem(LS_TOKEN, token); }
  function salvaAccountId(accountId) { localStorage.setItem(LS_ACCOUNT_ID, accountId); }
  function salvaLastSync(data)       { localStorage.setItem(LS_LAST_SYNC, data); }

  function isConfigurato() {
    return !!getToken() && !!getAccountId();
  }

  // ── Chiamate al Worker ───────────────────────────────────────────────────

  async function _chiama(body) {
    const res = await fetch(CONFIG.WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Worker HTTP ${res.status}`);
    return await res.json();
  }

  // Recupera lista conti dal Worker
  async function fetchConti(token) {
    const data = await _chiama({ action: 'wallet_accounts', token });
    if (!data.ok) throw new Error(data.error || 'Errore sconosciuto');
    return data.conti;
  }

  // Recupera movimenti dal Worker passando since come stringa data (o '' per tutto lo storico)
  async function fetchMovimenti(since = '') {
    const token     = getToken();
    const accountId = getAccountId();
    if (!token || !accountId) throw new Error('Wallet non configurato');

    const data = await _chiama({
      action: 'wallet_records',
      token,
      accountId,
      since,
    });
    if (!data.ok) throw new Error(data.error || 'Errore sconosciuto');
    return data.movimenti;
  }

  // Deduplicazione: usa la stessa logica dell'import CSV
  function deduplicaMovimenti(esistenti, nuovi) {
    const chiavi = new Set(
      esistenti.map(m => `${m.data}|${m.importo}|${(m.desc || '').substring(0, 20)}`)
    );
    return nuovi.filter(m => {
      const k = `${m.data}|${m.importo}|${(m.desc || '').substring(0, 20)}`;
      return !chiavi.has(k);
    });
  }

  // ── Sincronizzazione per un conto specifico ──────────────────────────────

  async function sincronizzaConto(conto, movimentiEsistenti) {
    const token     = getToken();
    const accountId = conto.wallet_account_id;
    if (!token || !accountId) return { totale: 0, nuovi: 0, duplicati: 0, movimenti: [] };

    const oggi = new Date().toISOString().split('T')[0];
    const lastSync = localStorage.getItem(`pf_wallet_sync_${conto.id}`) || '';
    const since = (lastSync && lastSync < oggi) ? lastSync : '';

    const data = await _chiama({ action: 'wallet_records', token, accountId, since });
    if (!data.ok) throw new Error(data.error || 'Errore sconosciuto');

    const tutti = data.movimenti || [];
    const nuovi = deduplicaMovimenti(movimentiEsistenti, tutti);

    if (tutti.length > 0) {
      localStorage.setItem(`pf_wallet_sync_${conto.id}`, oggi);
    }

    return { totale: tutti.length, nuovi: nuovi.length, duplicati: tutti.length - nuovi.length, movimenti: nuovi };
  }

  // ── Sincronizzazione completa (retrocompatibile) ─────────────────────────

  async function sincronizza(movimentiEsistenti, incremental = true) {
    const oggi = new Date().toISOString().split('T')[0];
    const lastSync = getLastSync();
    const sinceEff = (incremental && lastSync && lastSync < oggi) ? lastSync : '';
    const tutti = await fetchMovimenti(sinceEff);
    const nuovi = deduplicaMovimenti(movimentiEsistenti, tutti);
    if (tutti.length > 0) salvaLastSync(oggi);
    return { totale: tutti.length, nuovi: nuovi.length, duplicati: tutti.length - nuovi.length, movimenti: nuovi };
  }

  // ── API pubblica ──────────────────────────────────────────────────────────

  return {
    getToken,
    getAccountId,
    getLastSync,
    salvaToken,
    salvaAccountId,
    isConfigurato,
    fetchConti,
    sincronizza,
    sincronizzaConto,
  };

})();
