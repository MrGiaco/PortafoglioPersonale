// ── DRIVE.JS ────────────────────────────────────────────────────────────────
// Legge e scrive portafoglio.json su Google Drive dell'utente

const Drive = (() => {

  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
  const BACKUP_FILE_NAME = 'portafoglio-backup.json';

  function headers() {
    return {
      'Authorization': `Bearer ${Auth.getToken()}`,
      'Content-Type':  'application/json'
    };
  }

  // ── Helper: esegui fetch con rinnovo token automatico su 401 ────────────

  async function fetchConToken(url, opzioni = {}) {
    let res = await fetch(url, {
      ...opzioni,
      headers: { ...opzioni.headers, 'Authorization': `Bearer ${Auth.getToken()}` }
    });
    if (res.status === 401) {
      // Token scaduto: tenta silent refresh e riprova
      const rinnovato = await Auth.ensureValidToken();
      if (rinnovato) {
        res = await fetch(url, {
          ...opzioni,
          headers: { ...opzioni.headers, 'Authorization': `Bearer ${Auth.getToken()}` }
        });
      }
    }
    return res;
  }

  // ── Cerca il file portafoglio.json su Drive ──────────────────────────────

  async function trovaDriveFileId() {
    const cached = localStorage.getItem('pf_drive_file_id');
    if (cached) return cached;

    const q = encodeURIComponent(
      `name='${CONFIG.DRIVE_FILE_NAME}' and trashed=false and mimeType='application/json'`
    );
    const resp = await fetchConToken(`${API}/files?q=${q}&fields=files(id,name)`);
    if (!resp.ok) throw new Error(`Drive search error: ${resp.status}`);

    const data = await resp.json();
    if (data.files && data.files.length > 0) {
      const id = data.files[0].id;
      localStorage.setItem('pf_drive_file_id', id);
      return id;
    }
    return null;
  }

  // ── Cerca il file portafoglio-backup.json su Drive ───────────────────────

  async function trovaBackupFileId() {
    const cached = localStorage.getItem('pf_backup_file_id');
    if (cached) return cached;

    const q = encodeURIComponent(
      `name='${BACKUP_FILE_NAME}' and trashed=false and mimeType='application/json'`
    );
    const resp = await fetchConToken(`${API}/files?q=${q}&fields=files(id,name)`);
    if (!resp.ok) return null;

    const data = await resp.json();
    if (data.files && data.files.length > 0) {
      const id = data.files[0].id;
      localStorage.setItem('pf_backup_file_id', id);
      return id;
    }
    return null;
  }

  // ── Backup silenzioso: copia il contenuto attuale in portafoglio-backup.json

  async function eseguiBackup(contenutoAttuale) {
    try {
      const blob = new Blob([contenutoAttuale], { type: 'application/json' });
      let backupId = await trovaBackupFileId();

      if (!backupId) {
        const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);
        const resp = await fetchConToken(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
          method: 'POST',
          body:   form
        });
        if (resp.ok) {
          const created = await resp.json();
          localStorage.setItem('pf_backup_file_id', created.id);
        }
      } else {
        const resp = await fetchConToken(`${UPLOAD_API}/files/${backupId}?uploadType=media`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    contenutoAttuale
        });
        if (resp.status === 404) localStorage.removeItem('pf_backup_file_id');
      }
    } catch (e) {
      // Il backup fallisce silenziosamente — non blocca il salvataggio principale
      console.warn('Backup Drive fallito (non bloccante):', e);
    }
  }

  // ── Leggi portafoglio.json ───────────────────────────────────────────────

  async function leggiPortafoglio() {
    const fileId = await trovaDriveFileId();
    if (!fileId) {
      console.log('portafoglio.json non trovato su Drive, verrà creato.');
      return null;
    }

    const resp = await fetchConToken(`${API}/files/${fileId}?alt=media`);
    if (!resp.ok) {
      if (resp.status === 404 || resp.status === 403) {
        localStorage.removeItem('pf_drive_file_id');
        return null;
      }
      throw new Error(`Drive read error: ${resp.status}`);
    }
    return migraSeNecessario(await resp.json());
  }

  // ── Leggi il backup ───────────────────────────────────────────────────────

  async function leggiBackup() {
    const backupId = await trovaBackupFileId();
    if (!backupId) return null;
    const resp = await fetchConToken(`${API}/files/${backupId}?alt=media`);
    if (!resp.ok) return null;
    return await resp.json();
  }

  // ── Scrivi / aggiorna portafoglio.json ───────────────────────────────────

  async function scriviPortafoglio(data) {
    const content = JSON.stringify(data, null, 2);
    const blob    = new Blob([content], { type: 'application/json' });
    let fileId    = localStorage.getItem('pf_drive_file_id');

    if (!fileId) {
      fileId = await trovaDriveFileId();
    }

    if (!fileId) {
      // Crea nuovo file (prima volta)
      const metadata = { name: CONFIG.DRIVE_FILE_NAME, mimeType: 'application/json' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const resp = await fetchConToken(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
        method: 'POST',
        body:   form
      });
      if (!resp.ok) throw new Error(`Drive create error: ${resp.status}`);

      const created = await resp.json();
      fileId = created.id;
      localStorage.setItem('pf_drive_file_id', fileId);

    } else {
      // Prima esegui il backup del contenuto attuale, poi sovrascrivi
      await eseguiBackup(content);

      const resp = await fetchConToken(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    content
      });
      if (resp.status === 404) {
        localStorage.removeItem('pf_drive_file_id');
        return scriviPortafoglio(data);
      }
      if (!resp.ok) throw new Error(`Drive update error: ${resp.status}`);
    }

    return fileId;
  }

  // ── Salvataggio con debounce (evita scritture continue) ─────────────────

  let _saveTimer = null;

  function salvaConDebounce(data, ms = 2000) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => scriviPortafoglio(data), ms);
  }

  // ── Migrazione automatica da vecchio formato a nuovo ────────────────────

  function migraSeNecessario(dati) {
    if (!dati) return dati;
    // Se ha già il nuovo formato conti[], non fare nulla
    if (Array.isArray(dati.conti)) return dati;
    // Migra dal vecchio conto_corrente singolo
    const cc = dati.conto_corrente || { saldo_iniziale: 0, data_saldo_iniziale: oggi(), movimenti: [] };
    dati.conti = [{
      id:              'conto-principale',
      nome:            'Conto Corrente',
      tipo:            'corrente',
      wallet_account_id: '',
      saldo_iniziale:  cc.saldo_iniziale || 0,
      data_saldo_iniziale: cc.data_saldo_iniziale || oggi(),
      movimenti:       cc.movimenti || []
    }];
    delete dati.conto_corrente;
    // Mantieni retrocompatibilità: esponi conto_corrente come getter sul primo conto
    dati.meta.versione = '2.0';
    console.log('Migrazione dati da v1 a v2 completata.');
    return dati;
  }

  // ── Crea struttura vuota se prima volta ─────────────────────────────────

  function portafoglioVuoto() {
    return {
      meta: {
        versione:                   '2.0',
        proprietario:               'Roberto',
        valuta:                     'EUR',
        conto_investimenti_id:      'conto-principale',
        ultimo_aggiornamento:       new Date().toISOString(),
        ultimo_aggiornamento_prezzi: null
      },
      titoli: [],
      conti: [
        {
          id:                   'conto-principale',
          nome:                 'Conto Corrente',
          tipo:                 'corrente',
          wallet_account_id:    '',
          saldo_iniziale:       0,
          data_saldo_iniziale:  oggi(),
          movimenti:            []
        }
      ],
      impostazioni: {
        aggiornamento_automatico: true,
        ora_aggiornamento:        '09:00',
        logica_variazione_fondi:  'ultimo_disponibile',
        google_drive_file_id:     null
      }
    };
  }

  function oggi() {
    return new Date().toISOString().split('T')[0];
  }

  // ── API pubblica ──────────────────────────────────────────────────────────

  return {
    leggi:            leggiPortafoglio,
    leggiBackup,
    scrivi:           scriviPortafoglio,
    salvaConDebounce,
    portafoglioVuoto,
    clearCache: () => {
      localStorage.removeItem('pf_drive_file_id');
      localStorage.removeItem('pf_backup_file_id');
    }
  };

})();
