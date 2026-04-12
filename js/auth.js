/* =============================================
   PORTAFOGLIO PERSONALE — auth.js
   Gestione PIN + Biometria (WebAuthn)
   ============================================= */

const Auth = (() => {

  const PIN_KEY      = 'pp_pin_hash';
  const BIO_KEY      = 'pp_bio_enabled';
  const BIO_CRED_KEY = 'pp_bio_cred_id';
  const LOCK_TIMEOUT = 5 * 60 * 1000;
  const PIN_LENGTH   = 6;

  let currentPin  = '';
  let _firstSetupPin = '';
  let setupPin    = '';
  let setupStep   = 1;
  let lockTimer   = null;
  let isLocked    = true;
  let changingPin = false;

  async function sha256(str) {
    const buf = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const $ = id => document.getElementById(id);

  function updateDots(containerId, length, color) {
    const dots = document.querySelectorAll(`#${containerId} .pin-dot`);
    dots.forEach((d, i) => {
      d.classList.toggle('filled', i < length);
      d.classList.remove('error');
    });
  }

  function showError(containerId, labelId, msg) {
    const dots = document.querySelectorAll(`#${containerId} .pin-dot`);
    dots.forEach(d => { d.classList.add('error'); d.classList.remove('filled'); });
    if (labelId) $(labelId).textContent = msg;
    setTimeout(() => {
      dots.forEach(d => d.classList.remove('error'));
      if (labelId) $(labelId).textContent = isSetup() ? 'Scegli il tuo PIN' : 'Inserisci il PIN';
    }, 1200);
  }

  function isSetup() {
    return !localStorage.getItem(PIN_KEY);
  }

  // ---- Controlla se biometria è disponibile sul dispositivo ----
  async function isBiometricAvailable() {
    if (!window.PublicKeyCredential) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  // ---- Init ----
  async function init() {
    const bioAvailable = await isBiometricAvailable();
    const bioEnabled   = localStorage.getItem(BIO_KEY) === 'true';
    const bioBtn       = $('bioBtn');

    if (isSetup()) {
      $('pinSection').classList.add('hidden');
      $('pinSetup').classList.remove('hidden');
      if (bioBtn) bioBtn.classList.add('hidden');
    } else {
      $('pinSection').classList.remove('hidden');
      $('pinSetup').classList.add('hidden');

      // Mostra il pulsante impronta se il dispositivo la supporta
      if (bioBtn) {
        if (bioAvailable) {
          bioBtn.classList.remove('hidden');
          // Se già abilitata, tenta automaticamente
          if (bioEnabled) {
            setTimeout(() => biometric(), 600);
          }
        } else {
          bioBtn.classList.add('hidden');
        }
      }
    }
  }

  // ---- PIN login ----
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
    const hash   = await sha256(currentPin);
    const stored = localStorage.getItem(PIN_KEY);
    if (hash === stored) {
      unlock();
    } else {
      currentPin = '';
      showError('pinDisplay', 'pinLabel', 'PIN errato, riprova');
    }
  }

  // ---- Setup PIN ----
  function setupInput(digit) {
    if (setupStep === 1) {
      if (_firstSetupPin.length >= PIN_LENGTH) return;
      _firstSetupPin += digit;
      updateDots('pinSetupDisplay', _firstSetupPin.length);
      if (_firstSetupPin.length === PIN_LENGTH) {
        setTimeout(() => {
          setupStep = 2;
          setupPin  = '';
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

  async function confirmSetup() {
    const hashFirst  = await sha256(_firstSetupPin);
    const hashSecond = await sha256(setupPin);

    if (hashFirst !== hashSecond) {
      setupPin       = '';
      setupStep      = 1;
      _firstSetupPin = '';
      updateDots('pinSetupDisplay', 0);
      $('pinSetupLabel').textContent = 'Scegli il tuo PIN';
      showError('pinSetupDisplay', 'pinSetupLabel', 'I PIN non coincidono, riprova');
      return;
    }

    localStorage.setItem(PIN_KEY, hashFirst);

    if (changingPin) {
      changingPin = false;
      if (typeof App !== 'undefined') App.showToast('PIN aggiornato con successo', 'success');
      lock();
    } else {
      if (typeof App !== 'undefined') App.showToast('PIN impostato! Benvenuto.', 'success');
      // Proponi biometria dopo il primo setup
      const bioAvailable = await isBiometricAvailable();
      if (bioAvailable) {
        setTimeout(() => offerBiometric(), 800);
      } else {
        unlock();
      }
    }
  }

  // Proponi biometria al primo accesso
  async function offerBiometric() {
    const ok = confirm('Vuoi abilitare l\'accesso con impronta digitale o Face ID?');
    if (ok) {
      const registered = await registerBiometric();
      if (registered) return; // unlock avviene dentro registerBiometric
    }
    unlock();
  }

  // ---- Biometria (WebAuthn) ----
  async function biometric() {
    if (!window.PublicKeyCredential) {
      if (typeof App !== 'undefined') App.showToast('Biometria non supportata su questo dispositivo', 'warning');
      return;
    }

    const credIdB64 = localStorage.getItem(BIO_CRED_KEY);

    if (!credIdB64) {
      // Prima volta: registra
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
          rp: {
            name: 'Portafoglio Personale',
            id:   location.hostname,
          },
          user: {
            id:          userId,
            name:        'utente',
            displayName: 'Utente',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7   },  // ES256
            { type: 'public-key', alg: -257 },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification:        'required',
          },
          timeout: 60000,
        }
      });

      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(BIO_CRED_KEY, credId);
      localStorage.setItem(BIO_KEY, 'true');

      if (typeof App !== 'undefined') App.showToast('Biometria abilitata!', 'success');

      // Aggiorna UI impostazioni
      const bioLabel = $('bioToggleLabel');
      if (bioLabel) bioLabel.textContent = 'Disabilita Biometria';
      const bioBtn = $('bioBtn');
      if (bioBtn) bioBtn.classList.remove('hidden');

      unlock();
      return true;
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        if (typeof App !== 'undefined') App.showToast('Registrazione biometrica fallita', 'error');
      }
      return false;
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
          timeout:          60000,
        }
      });

      unlock();
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        if (typeof App !== 'undefined') App.showToast('Autenticazione biometrica fallita', 'error');
      }
    }
  }

  async function toggleBiometric() {
    const enabled = localStorage.getItem(BIO_KEY) === 'true';

    if (enabled) {
      localStorage.removeItem(BIO_KEY);
      localStorage.removeItem(BIO_CRED_KEY);
      const bioLabel = $('bioToggleLabel');
      if (bioLabel) bioLabel.textContent = 'Abilita Biometria';
      const bioBtn = $('bioBtn');
      if (bioBtn) bioBtn.classList.add('hidden');
      if (typeof App !== 'undefined') App.showToast('Biometria disabilitata', 'info');
    } else {
      const bioAvailable = await isBiometricAvailable();
      if (!bioAvailable) {
        if (typeof App !== 'undefined') App.showToast('Biometria non supportata su questo dispositivo', 'warning');
        return;
      }
      await registerBiometric();
    }
  }

  // ---- Cambio PIN ----
  function changePin() {
    changingPin    = true;
    setupStep      = 1;
    _firstSetupPin = '';
    setupPin       = '';
    $('pinSection').classList.add('hidden');
    $('pinSetup').classList.remove('hidden');
    $('pinSetupLabel').textContent = 'Scegli il nuovo PIN';
    updateDots('pinSetupDisplay', 0);
    lock(false);
  }

  // ---- Lock / Unlock ----
  function unlock() {
    isLocked   = false;
    currentPin = '';
    updateDots('pinDisplay', 0);
    $('lockScreen').classList.add('hidden');
    $('app').classList.remove('hidden');
    resetLockTimer();

    // Aggiorna UI biometria in impostazioni
    const bioEnabled = localStorage.getItem(BIO_KEY) === 'true';
    const bioLabel   = $('bioToggleLabel');
    if (bioLabel) bioLabel.textContent = bioEnabled ? 'Disabilita Biometria' : 'Abilita Biometria';

    if (typeof App !== 'undefined') App.init();
  }

  function lock(showScreen = true) {
    isLocked   = true;
    currentPin = '';
    updateDots('pinDisplay', 0);
    clearLockTimer();

    if (showScreen) {
      $('lockScreen').classList.remove('hidden');
      $('app').classList.add('hidden');
      $('pinSection').classList.remove('hidden');
      $('pinSetup').classList.add('hidden');
      $('pinLabel').textContent = 'Inserisci il PIN';
    }
  }

  function resetLockTimer() {
    clearLockTimer();
    lockTimer = setTimeout(() => lock(), LOCK_TIMEOUT);
  }

  function clearLockTimer() {
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  }

  ['click', 'touchstart', 'keydown', 'scroll'].forEach(ev =>
    document.addEventListener(ev, () => { if (!isLocked) resetLockTimer(); }, { passive: true })
  );

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

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();

  // Rimuove il delay 300ms su mobile usando touchstart
  function fastClick(el, fn) {
    let moved = false;
    el.addEventListener('touchstart', e => { moved = false; }, { passive: true });
    el.addEventListener('touchmove',  () => { moved = true; },  { passive: true });
    el.addEventListener('touchend',   e => {
      if (!moved) { e.preventDefault(); fn(); }
    });
    el.addEventListener('click', fn); // fallback desktop
  }

  // PIN login keys
  document.querySelectorAll('#pinSection .pin-key').forEach(btn => {
    const digit = btn.textContent.trim();
    if (btn.classList.contains('pin-key--bio')) {
      fastClick(btn, () => Auth.biometric());
    } else if (btn.classList.contains('pin-key--del')) {
      fastClick(btn, () => Auth.pinDelete());
    } else if (digit && !isNaN(digit)) {
      fastClick(btn, () => Auth.pinInput(digit));
    }
  });

  // PIN setup keys
  document.querySelectorAll('#pinSetup .pin-key').forEach(btn => {
    const digit = btn.textContent.trim();
    if (btn.classList.contains('pin-key--del')) {
      fastClick(btn, () => Auth.setupDelete());
    } else if (digit && !isNaN(digit)) {
      fastClick(btn, () => Auth.setupInput(digit));
    }
  });
});
