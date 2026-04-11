// ── AUTH.JS ─────────────────────────────────────────────────────────────────

const Auth = (() => {

  let _accessToken = null;
  let _tokenExpiry  = null;
  let _tokenClient  = null;
  let _resolveLogin = null;

  // ── Token storage (localStorage per persistenza tra sessioni) ────────────

  function isTokenValid() {
    return _accessToken && _tokenExpiry && Date.now() < _tokenExpiry;
  }

  function getToken() {
    return _accessToken;
  }

  function saveToken(token, expiresIn) {
    _accessToken = token;
    _tokenExpiry = Date.now() + (expiresIn - 120) * 1000; // 2 min di margine
    localStorage.setItem('pf_token',  token);
    localStorage.setItem('pf_expiry', String(_tokenExpiry));
  }

  function loadToken() {
    const token  = localStorage.getItem('pf_token');
    const expiry = Number(localStorage.getItem('pf_expiry') || 0);
    if (token && expiry && Date.now() < expiry) {
      _accessToken = token;
      _tokenExpiry = expiry;
      return true;
    }
    return false;
  }

  function clearToken() {
    _accessToken = null;
    _tokenExpiry = null;
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_expiry');
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────

  function initGoogleAuth() {
    return new Promise((resolve) => {
      _tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope:     CONFIG.SCOPES,
        callback:  (response) => {
          if (response.error) {
            console.error('OAuth error:', response.error);
            if (_resolveLogin) _resolveLogin({ ok: false, error: response.error });
            return;
          }
          saveToken(response.access_token, response.expires_in);
          if (_resolveLogin) _resolveLogin({ ok: true });
        }
      });
      resolve();
    });
  }

  // Refresh silenzioso — non mostra popup se l'utente è già loggato
  function silentRefresh() {
    return new Promise((resolve) => {
      _resolveLogin = resolve;
      _tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  // Login completo con popup di selezione account
  function fullLogin() {
    return new Promise((resolve) => {
      _resolveLogin = resolve;
      _tokenClient.requestAccessToken({ prompt: 'select_account' });
    });
  }

  function revokeGoogle() {
    if (_accessToken) google.accounts.oauth2.revoke(_accessToken, () => {});
    clearToken();
  }

  // ── WebAuthn ─────────────────────────────────────────────────────────────

  function isWebAuthnSupported() {
    return window.PublicKeyCredential !== undefined;
  }

  function hasCredentialRegistered() {
    return !!localStorage.getItem('pf_webauthn_id');
  }

  function _rnd(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }

  function _toB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function _fromB64(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }

  async function registerBiometric(userEmail) {
    if (!isWebAuthnSupported()) return { ok: false };
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: _rnd(32),
          rp: { name: 'Portafoglio Roberto', id: window.location.hostname },
          user: { id: _rnd(16), name: userEmail, displayName: 'Roberto' },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
          timeout: 60000
        }
      });
      localStorage.setItem('pf_webauthn_id', _toB64(cred.rawId));
      localStorage.setItem('pf_webauthn_user', userEmail);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function authenticateWithBiometric() {
    if (!isWebAuthnSupported() || !hasCredentialRegistered()) return { ok: false };
    try {
      const credId = _fromB64(localStorage.getItem('pf_webauthn_id'));
      await navigator.credentials.get({
        publicKey: {
          challenge: _rnd(32),
          allowCredentials: [{ id: credId, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000
        }
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function clearBiometric() {
    localStorage.removeItem('pf_webauthn_id');
    localStorage.removeItem('pf_webauthn_user');
  }

  // ── Recupera email utente (solo da cache locale) ─────────────────────────
  // NOTA: il token ha scope drive.file che non include l'endpoint userinfo.
  // L'email viene salvata al primo login completo tramite Google Identity Services.

  async function fetchUserEmail() {
    return localStorage.getItem('pf_webauthn_user') || '';
  }

  // ── Garantisce un token valido, rinnovandolo silenziosamente se scaduto ──

  async function ensureValidToken() {
    if (isTokenValid()) return true;
    const result = await silentRefresh();
    return result.ok;
  }

  // ── Flusso di login principale ────────────────────────────────────────────
  // Ordine di priorità:
  // 1. Token ancora valido → accesso immediato
  // 2. Token scaduto → silent refresh (nessun popup)
  // 3. Impronta disponibile → verifica biometrica + silent refresh
  // 4. Nessuna sessione → login completo con popup

  async function login() {
    // 1. Token valido
    if (loadToken()) return { ok: true, method: 'token' };

    // 2. Prova silent refresh (funziona se l'utente è già loggato con Google)
    const silent = await silentRefresh();
    if (silent.ok) {
      if (isWebAuthnSupported() && !hasCredentialRegistered()) {
        const vuole = await UI_chiediImpronta();
        if (vuole) {
          const email = await fetchUserEmail();
          if (email) await registerBiometric(email);
        }
      }
      return { ok: true, method: 'silent' };
    }

    // 3. Impronta registrata → verifica + silent refresh
    if (isWebAuthnSupported() && hasCredentialRegistered()) {
      const bio = await authenticateWithBiometric();
      if (bio.ok) {
        const refresh = await silentRefresh();
        if (refresh.ok) return { ok: true, method: 'biometric' };
      }
    }

    // 4. Login completo con popup
    const result = await fullLogin();
    if (!result.ok) return result;

    if (isWebAuthnSupported() && !hasCredentialRegistered()) {
      const vuole = await UI_chiediImpronta();
      if (vuole) {
        const email = await fetchUserEmail();
        if (email) await registerBiometric(email);
      }
    }

    return { ok: true, method: 'google' };
  }

  async function logout() {
    revokeGoogle();
    await App.reset();
  }

  async function UI_chiediImpronta() {
    if (typeof App !== 'undefined' && App.chiediRegistrazioneBiometrica) {
      return App.chiediRegistrazioneBiometrica();
    }
    return false;
  }

  // ── API pubblica ──────────────────────────────────────────────────────────

  return {
    init: initGoogleAuth,
    login,
    logout,
    getToken,
    isTokenValid,
    ensureValidToken,
    isWebAuthnSupported,
    hasCredentialRegistered,
    registerBiometric,
    authenticateWithBiometric,
    clearBiometric
  };

})();
