/* =============================================
   PORTAFOGLIO PERSONALE — drive.js
   Persistenza dati su Google Drive (cifrata)
   ============================================= */

const Drive = (() => {

  // ---- Configurazione ----
  // SOSTITUISCI con il tuo Client ID Google
  const CLIENT_ID   = '311853633073-deskq7q9sl3bmdl5k4uh7er20rokeqhn.apps.googleusercontent.com';
  const SCOPE       = 'https://www.googleapis.com/auth/drive.file';
  const FILE_NAME   = 'portafoglio_personale_data.enc';
  const FOLDER_NAME = 'PortafoglioPersonale';

  // ---- Stato ----
  let accessToken  = null;
  let fileId       = null;
  let folderId     = null;
  let encKey       = null;   // CryptoKey AES-256-GCM

  const $ = id => document.getElementById(id);

  // =============================================
  // CIFRATURA AES-256-GCM
  // =============================================

  // Deriva una chiave AES dalla passphrase (PIN hash)
  async function deriveKey(passphrase) {
    const enc  = new TextEncoder();
    const salt = enc.encode('PortafoglioPersonale_salt_v1');
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(data) {
    if (!encKey) throw new Error('Chiave di cifratura non inizializzata');
    const iv        = crypto.getRandomValues(new Uint8Array(12));
    const encoded   = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, encoded);
    // Combina IV + dati cifrati → base64
    const combined  = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  async function decrypt(b64) {
    if (!encKey) throw new Error('Chiave di cifratura non inizializzata');
    const combined  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv        = combined.slice(0, 12);
    const data      = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, encKey, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  // Inizializza la chiave di cifratura dal PIN hash salvato
  async function initEncKey() {
    const pinHash = localStorage.getItem('pp_pin_hash');
    if (!pinHash) throw new Error('PIN non impostato');
    encKey = await deriveKey(pinHash);
  }

  // =============================================
  // GOOGLE OAUTH
  // =============================================

  async function connect() {
    if (!window.google || !google.accounts) {
      App.showToast('Google Identity Services non caricato', 'error');
      return;
    }

    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async (resp) => {
          if (resp.error) {
            App.showToast('Accesso Google negato', 'error');
            reject(resp.error);
            return;
          }
          accessToken = resp.access_token;
          updateDriveStatus(true);
          App.showToast('Google Drive connesso!', 'success');

          // Inizializza chiave e carica dati
          try {
            await initEncKey();
            await ensureFolder();
            await load();
            resolve();
          } catch (e) {
            console.error('Drive init error:', e);
            reject(e);
          }
        },
        error_callback: (err) => {
          App.showToast('Errore autenticazione Google', 'error');
          reject(err);
        }
      });
      client.requestAccessToken({ prompt: 'consent' });
    });
  }

  function updateDriveStatus(connected) {
    const badge = $('driveStatus');
    if (!badge) return;
    if (connected) {
      badge.textContent = 'Connesso';
      badge.className = 'status-badge status-badge--on';
    } else {
      badge.textContent = 'Non connesso';
      badge.className = 'status-badge status-badge--off';
    }
  }

  function isConnected() { return !!accessToken; }

  // =============================================
  // GESTIONE CARTELLA E FILE SU DRIVE
  // =============================================

  async function driveRequest(url, options = {}) {
    if (!accessToken) throw new Error('Non autenticato con Google Drive');
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      }
    });
    if (res.status === 401) {
      accessToken = null;
      updateDriveStatus(false);
      App.showToast('Sessione Google scaduta, riconnetti Drive', 'warning');
      throw new Error('Token scaduto');
    }
    return res;
  }

  async function ensureFolder() {
    // Cerca la cartella PortafoglioPersonale
    const res = await driveRequest(
      `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`
    );
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      folderId = data.files[0].id;
    } else {
      // Crea la cartella
      const create = await driveRequest(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
          })
        }
      );
      const folder = await create.json();
      folderId = folder.id;
    }
  }

  async function ensureFile() {
    if (!folderId) await ensureFolder();

    // Cerca il file dati
    const res = await driveRequest(
      `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and '${folderId}' in parents and trashed=false&fields=files(id,name)`
    );
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      fileId = data.files[0].id;
      return true; // file esistente
    }
    return false; // file non esiste
  }

  // =============================================
  // SALVATAGGIO
  // =============================================

  async function save(appData) {
    if (!isConnected()) {
      // Salvataggio locale come fallback
      saveLocal(appData);
      return;
    }

    try {
      App.showLoading(true);
      await initEncKey();
      const encrypted = await encrypt(appData);
      const blob = new Blob([encrypted], { type: 'text/plain' });

      const exists = await ensureFile();

      let url, method;
      if (exists && fileId) {
        url    = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        method = 'PATCH';
      } else {
        // Crea il file con metadati
        const meta = await driveRequest(
          'https://www.googleapis.com/drive/v3/files',
          {
            method: 'POST',
            body: JSON.stringify({
              name: FILE_NAME,
              parents: [folderId],
            })
          }
        );
        const f = await meta.json();
        fileId = f.id;
        url    = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        method = 'PATCH';
      }

      await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/plain',
        },
        body: blob,
      });

      saveLocal(appData); // backup locale
      App.showToast('Dati salvati su Drive', 'success');
    } catch (err) {
      console.error('Drive save error:', err);
      saveLocal(appData);
      App.showToast('Errore Drive, dati salvati localmente', 'warning');
    } finally {
      App.showLoading(false);
    }
  }

  // =============================================
  // CARICAMENTO
  // =============================================

  async function load() {
    if (!isConnected()) {
      return loadLocal();
    }

    try {
      App.showLoading(true);
      await initEncKey();
      const exists = await ensureFile();

      if (!exists || !fileId) {
        // Nessun file su Drive: usa dati locali se presenti
        return loadLocal();
      }

      const res = await driveRequest(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
      );
      const encrypted = await res.text();

      if (!encrypted || encrypted.trim() === '') return loadLocal();

      const data = await decrypt(encrypted);
      saveLocal(data); // sincronizza locale
      if (typeof Portfolio !== 'undefined') Portfolio.loadData(data);
      App.showToast('Dati caricati da Drive', 'success');
      return data;
    } catch (err) {
      console.error('Drive load error:', err);
      App.showToast('Errore caricamento Drive, uso dati locali', 'warning');
      return loadLocal();
    } finally {
      App.showLoading(false);
    }
  }

  // =============================================
  // STORAGE LOCALE (fallback / cache)
  // =============================================

  const LOCAL_KEY = 'pp_data_local';

  function saveLocal(data) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage pieno:', e);
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof Portfolio !== 'undefined') Portfolio.loadData(data);
      return data;
    } catch (e) {
      return null;
    }
  }

  // =============================================
  // SYNC MANUALE
  // =============================================

  async function sync() {
    if (!isConnected()) {
      App.showToast('Connetti prima Google Drive nelle impostazioni', 'warning');
      return;
    }
    const data = Portfolio.getData();
    await save(data);
  }

  // =============================================
  // EXPORT / IMPORT BACKUP (JSON locale)
  // =============================================

  function exportBackup(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `portafoglio_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type  = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { reject('Nessun file'); return; }
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          saveLocal(data);
          if (typeof Portfolio !== 'undefined') Portfolio.loadData(data);
          App.showToast('Backup importato con successo', 'success');
          resolve(data);
        } catch (err) {
          App.showToast('File non valido', 'error');
          reject(err);
        }
      };
      input.click();
    });
  }

  // =============================================
  // AUTO-CONNECT al caricamento
  // =============================================

  async function tryAutoConnect() {
    // Se non c'è Client ID configurato, salta
    if (CLIENT_ID.startsWith('INSERISCI')) return;

    // Prova token silenzioso (senza prompt)
    if (!window.google || !google.accounts) return;

    return new Promise((resolve) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        prompt: '',
        callback: async (resp) => {
          if (resp.error || !resp.access_token) { resolve(null); return; }
          accessToken = resp.access_token;
          updateDriveStatus(true);
          try {
            await initEncKey();
            await ensureFolder();
            await load();
          } catch (e) { console.warn('Auto-connect Drive:', e); }
          resolve(accessToken);
        },
        error_callback: () => resolve(null),
      });
      client.requestAccessToken({ prompt: '' });
    });
  }

  // ---- API pubblica ----
  return {
    connect,
    sync,
    save,
    load,
    loadLocal,
    saveLocal,
    exportBackup,
    importBackup,
    isConnected,
    tryAutoConnect,
  };

})();
