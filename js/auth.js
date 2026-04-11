/* =============================================
   PORTAFOGLIO PERSONALE — auth.js
   Gestione PIN + Biometria (WebAuthn)
   ============================================= */

const Auth = (() => {

  // ---- Costanti ----
  const PIN_KEY       = 'pp_pin_hash';
  const BIO_KEY       = 'pp_bio_enabled';
  const BIO_CRED_KEY  = 'pp_bio_cred_id';
  const LOCK_TIMEOUT  = 5 * 60 * 1000; // 5 minuti di inattività → blocco
  const PIN_LENGTH    = 6;

  // ---- Stato ----
  let currentPin     = '';
  let setupPin       = '';
  let setupStep      = 1;       // 1 = inserisci, 2 = conferma
  let lockTimer      = null;
  let isLocked       = true;
  let changingPin    = false;

  // ---- Utility: hash SHA-256 ----
  async function sha256(str) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---- Utility: DOM ----
  const $ = id => document.getElementById(id);

  function updateDots(containerId, length) {
    const dots = document.querySelectorAll(`#${containerId} .pin-dot`);
    dots.forEach((d, i) => {
      d.classList.toggle('filled', i < length);
      d.classList.remove('error');
    });
  }

  function showError(containerId, labelId, msg) {
    const dots = document.querySelectorAll(`#${containerId} .pin-dot`);
    dots.forEach(d => { d.classList.add('error'); d.classList.remove('filled'); });
    if (labelId) $( labelId).textContent = msg;
    setTimeout(() => {
      dots.forEach(d => d.classList.remove('error'));
      if (labelId) $(labelId).textContent = isSetup() ? 'Scegli il tuo PIN' : 'Inserisci il PIN';
    }, 1200);
  }

  function isSetup() {
    return !localStorage.getItem(PIN_KEY);
  }

  // ---- Init ----
  async function init() {
    if (isSetup()) {
      // Primo avvio: mostra setup PIN
      $('pinSection').classList.add('hidden');
      $('pinSetup').classList.remove('hidden');
      $('bioBtn').classList.add('hidden');
    } else {
      // PIN già impostato
      $('pinSection').classList.remove('hidden');
      $('pinSetup').classList.add('hidden');
      // Mostra biometria se disponibile e abilitata
      const bioEnabled = localStorage.getItem(BIO_KEY) === 'true';
      $('bioBtn').classList.toggle('hidden', !bioEnabled);
      // Tenta biometria automatica
      if (bioEnabled) setTimeout(() => biometric(), 400);
    }
  }

  // ---- Inserimento PIN (login) ----
  function pinInput(digit) {
    if (currentPin.length >= PIN_LENGTH) return;
    currentPin += digit;
    updateDots('pinDisplay', currentPin.length);
    if (currentPin.length === PIN_LENGTH) {
      setTimeout(() => verifyPin(), 150);
    }
  }

  function pinDelete() {
    if (currentPin.length === 0) return;
    currentPin = currentPin.slice(0, -1);
    updateDots('pinDisplay', currentPin.length);
  }

  async function verifyPin() {
    const hash = await sha256(currentPin);
    const stored = localStorage.getItem(PIN_KEY);
    if (hash === stored) {
      unlock();
    } else {
      currentPin = '';
      showError('pinDisplay', 'pinLabel', 'PIN errato, riprova');
    }
  }

  // ---- Setup PIN (primo avvio / cambio PIN) ----
  function setupInput(digit) {
    if (setupStep === 1) {
      if (setupPin.length >= PIN_LENGTH) return;
      setupPin += digit;
      updateDots('pinSetupDisplay', setupPin.length);
      if (setupPin.length === PIN_LENGTH) {
        setTimeout(() => {
          setupStep = 2;
          setupPin = '';     // reset per conferma
          updateDots('pinSetupDisplay', 0);
          $('pinSetupLabel').textContent = 'Conferma il PIN';
        }, 150);
      }
    } else {
      // Step 2: conferma
      if (setupPin.length >= PIN_LENGTH) return;
      setupPin += digit;
      updateDots('pinSetupDisplay', setupPin.length);
      if (setupPin.length === PIN_LENGTH) {
        setTimeout(() => confirmSetup(), 150);
      }
    }
  }

  function setupDelete() {
    if (setupPin.length === 0) return;
    setupPin = setupPin.slice(0, -1);
    updateDots('pinSetupDisplay', setupPin.length);
  }

  async function confirmSetup() {
    // Recupera il PIN originale (step 1)
    // Usiamo una variabile separata per il primo PIN
    const firstPin = _firstSetupPin;
    const hash = await sha256(setupPin);
    const firstHash = await sha256(firstPin);

    if (hash !== firstHash) {
      setupPin = '';
      setupStep = 1;
      _firstSetupPin = '';
      updateDots('pinSetupDisplay', 0);
      $('pinSetupLabel').textContent = 'Scegli il tuo PIN';
      showError('pinSetupDisplay', 'pinSetupLabel', 'I PIN non coincidono, riprova');
      return;
    }

    localStorage.setItem(PIN_KEY, hash);

    if (changingPin) {
      changingPin = false;
      App.showToast('PIN aggiornato con successo', 'success');
      lock();
    } else {
      App.showToast('PIN impostato! Benvenuto.', 'success');
      unlock();
    }
  }

  // Variabile temporanea per il primo PIN nel setup
  let _firstSetupPin = '';

  // Override setupInput per gestire correttamente i due step
  function setupInput(digit) {
    if (setupStep === 1) {
      if (_firstSetupPin.length >= PIN_LENGTH) return;
      _firstSetupPin += digit;
      updateDots('pinSetupDisplay', _firstSetupPin.length);
      if (_firstSetupPin.length === PIN_LENGTH) {
        setTimeout(() => {
          setupStep = 2;
          setupPin = '';
          updateDots('pinSetupDisplay', 0);
          $('pinSetupLabel').textContent = 'Conferma il PIN';
        }, 150);
      }
    } else {
      if (setupPin.length >= PIN_LENGTH) return;
      setupPin += digit;
      updateDots('pinSetupDisplay', setupPin.length);
      if (setupPin.length === PIN_LENGTH) {
        setTimeout(() => confirmSetup(), 150);
      }
    }
  }

  function setupDelete() {
    if (setupStep === 1) {
      if (_firstSetupPin.length === 0) return;
      _firstSetupPin = _firstSetupPin.slice(0, -1);
      updateDots('pinSetupDisplay', _firstSetupPin.length);
    } else {
      if (setupPin.length === 0) return;
      setupPin = setupPin.slice(0, -1);
      updateDots('pinSetupDisplay', setupPin.length);
    }
  }

  // ---- Biometria (WebAuthn) ----
  async function biometric() {
    if (!window.PublicKeyCredential) {
      App.showToast('Biometria non supportata su questo dispositivo', 'warning');
      return;
    }

    const credIdB64 = localStorage.getItem(BIO_CRED_KEY);

    if (!credIdB64) {
      // Prima volta: registra la credenziale biometrica
      await registerBiometric();
    } else {
      // Autenticazione
      await authenticateBiometric(credIdB64);
    }
  }

  async function registerBiometric() {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId    = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Portafoglio Personale', id: location.hostname },
          user: { id: userId, name: 'utente', displayName: 'Utente' },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7  },   // ES256
            { type: 'public-key', alg: -257 },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        }
      });

      // Salva l'ID della credenziale (base64)
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(BIO_CRED_KEY, credId);
      localStorage.setItem(BIO_KEY, 'true');

      App.showToast('Biometria registrata con successo!', 'success');
      unlock();
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        App.showToast('Registrazione biometrica fallita', 'error');
      }
    }
  }

  async function authenticateBiometric(credIdB64) {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credIdArr = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0));

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: 'public-key', id: credIdArr }],
          userVerification: 'required',
          timeout: 60000,
        }
      });

      unlock();
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        App.showToast('Autenticazione biometrica fallita', 'error');
      }
    }
  }

  async function toggleBiometric() {
    const enabled = localStorage.getItem(BIO_KEY) === 'true';

    if (enabled) {
      // Disabilita
      localStorage.removeItem(BIO_KEY);
      localStorage.removeItem(BIO_CRED_KEY);
      $('bioToggleLabel').textContent = 'Abilita Biometria';
      $('bioBtn').classList.add('hidden');
      App.showToast('Biometria disabilitata', 'info');
    } else {
      // Abilita: registra credenziale
      if (!window.PublicKeyCredential) {
        App.showToast('Biometria non supportata su questo dispositivo', 'warning');
        return;
      }
      await registerBiometric();
      if (localStorage.getItem(BIO_KEY) === 'true') {
        $('bioToggleLabel').textContent = 'Disabilita Biometria';
        $('bioBtn').classList.remove('hidden');
      }
    }
  }

  // ---- Cambio PIN ----
  function changePin() {
    changingPin = true;
    setupStep = 1;
    _firstSetupPin = '';
    setupPin = '';
    $('pinSection').classList.add('hidden');
    $('pinSetup').classList.remove('hidden');
    $('pinSetupLabel').textContent = 'Scegli il nuovo PIN';
    updateDots('pinSetupDisplay', 0);
    lock(false); // blocca senza mostrare lock screen, solo UI
  }

  // ---- Lock / Unlock ----
  function unlock() {
    isLocked = false;
    currentPin = '';
    updateDots('pinDisplay', 0);
    $('lockScreen').classList.add('hidden');
    $('app').classList.remove('hidden');
    resetLockTimer();

    // Aggiorna UI biometria in impostazioni
    const bioEnabled = localStorage.getItem(BIO_KEY) === 'true';
    const bioLabel = $('bioToggleLabel');
    if (bioLabel) bioLabel.textContent = bioEnabled ? 'Disabilita Biometria' : 'Abilita Biometria';

    // Init app
    if (typeof App !== 'undefined') App.init();
  }

  function lock(showScreen = true) {
    isLocked = true;
    currentPin = '';
    updateDots('pinDisplay', 0);
    clearLockTimer();

    if (showScreen) {
      $('lockScreen').classList.remove('hidden');
      $('app').classList.add('hidden');
      // Reset sezione login
      $('pinSection').classList.remove('hidden');
      $('pinSetup').classList.add('hidden');
      $('pinLabel').textContent = 'Inserisci il PIN';
    }
  }

  // ---- Inattività → auto-lock ----
  function resetLockTimer() {
    clearLockTimer();
    lockTimer = setTimeout(() => lock(), LOCK_TIMEOUT);
  }

  function clearLockTimer() {
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  }

  // Ascolta interazioni utente per resettare timer
  ['click', 'touchstart', 'keydown', 'scroll'].forEach(ev =>
    document.addEventListener(ev, () => { if (!isLocked) resetLockTimer(); }, { passive: true })
  );

  // ---- API pubblica ----
  return {
    init,
    pinInput,
    pinDelete,
    setupInput,
    setupDelete,
    biometric,
    toggleBiometric,
    changePin,
    lock,
    unlock,
    isLocked: () => isLocked,
  };

})();

// Avvio autenticazione al caricamento pagina
document.addEventListener('DOMContentLoaded', () => Auth.init());
