# Portafoglio Personale

> App PWA per la gestione personale di conto corrente, carta di credito e investimenti (azioni, fondi, certificates, PIR, polizze vita).

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-2563EB?style=flat-square&logo=github)
![PWA](https://img.shields.io/badge/PWA-Installabile-1E3A8A?style=flat-square)
![License](https://img.shields.io/badge/Licenza-Privata-gray?style=flat-square)

---

## Caratteristiche principali

- **Dashboard** con riepilogo patrimonio totale, grafici di andamento e allocazione
- **Conto Corrente** — movimenti in entrata/uscita, filtri per tipo e periodo, saldo aggiornato in tempo reale
- **Carta di Credito** — gestione spese, plafond, date di addebito automatico
- **Investimenti** — azioni, fondi, certificates, PIR, polizze vita con quotazioni live
- **Quotazioni in tempo reale** da Yahoo Finance e Zonebourse (via proxy Cloudflare Worker)
- **Costo di carico** calcolato automaticamente con ISIN, WKN, commissioni, tasse, rateo e PMC unitario
- **Report** mensili con grafici entrate/uscite e spese per categoria, esportabili in CSV
- **Sincronizzazione** dati su Google Drive con cifratura AES-256-GCM lato client
- **Accesso sicuro** con PIN a 6 cifre + biometria (impronta digitale / Face ID)
- **Funzionamento offline** grazie al Service Worker
- **Installabile** come app nativa su Android e iOS (PWA)

---

## Stack tecnologico

| Componente | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Grafica | Chart.js 4.x |
| Icone | Bootstrap Icons 1.11 |
| Font | Plus Jakarta Sans |
| Quotazioni | Yahoo Finance API + Zonebourse |
| Proxy CORS | Cloudflare Workers |
| Storage | Google Drive API (cifrato AES-256-GCM) |
| Autenticazione | WebAuthn (biometria) + PIN locale |
| Hosting | GitHub Pages |

---

## Struttura del repository

```
PortafoglioPersonale/
├── index.html              # App principale
├── manifest.json           # Manifest PWA
├── sw.js                   # Service Worker (cache offline)
├── favicon.ico
├── css/
│   └── style.css           # Stili (mobile-first)
├── js/
│   ├── app.js              # Logica principale, navigazione, modali
│   ├── auth.js             # PIN + biometria WebAuthn
│   ├── drive.js            # Google Drive API + cifratura AES-256
│   ├── quotes.js           # Quotazioni Yahoo Finance + Zonebourse
│   ├── portfolio.js        # Conto, carta, investimenti
│   └── charts.js           # Grafici Chart.js
├── icons/                  # Icone PWA (72→512px)
└── cloudflare-worker/
    └── worker.js           # Proxy Cloudflare per CORS
```

---

## Configurazione iniziale

### 1. Cloudflare Worker (proxy quotazioni)

Il Worker fa da proxy per le chiamate a Yahoo Finance e Zonebourse, aggirando le restrizioni CORS.

1. Accedi a [dash.cloudflare.com](https://dash.cloudflare.com)
2. Vai su **Workers & Pages → Create Worker**
3. Incolla il codice da `cloudflare-worker/worker.js`
4. Deploy e copia l'URL del Worker (es. `https://portafoglio-proxy.tuonome.workers.dev`)
5. Inserisci l'URL in `js/quotes.js` alla riga `const WORKER_URL`

### 2. Google Drive API

1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuovo progetto: `PortafoglioPersonale`
3. Abilita **Google Drive API**
4. Configura la schermata OAuth (tipo: **Esterno**)
5. Aggiungi lo scope: `https://www.googleapis.com/auth/drive.file`
6. Crea credenziali **OAuth → Applicazione web**
7. Aggiungi come origine autorizzata: `https://tuonome.github.io`
8. Copia il **Client ID** e inseriscilo in `js/drive.js` alla riga `const CLIENT_ID`

### 3. GitHub Pages

1. Carica tutti i file nel repository
2. Vai su **Settings → Pages**
3. Source: branch `main`, cartella `/ (root)`
4. L'app sarà disponibile su `https://MrGiaco.github.io/PortafoglioPersonale`

---

## Installazione come app

### Android (Chrome)
1. Apri l'app in Chrome
2. Menu `⋮` → **Aggiungi a schermata Home**

### iPhone / iPad (Safari)
1. Apri l'app in **Safari** (obbligatorio)
2. Tasto Condividi → **Aggiungi a schermata Home**

---

## Sicurezza e privacy

- **Nessun dato personale** viene trasmesso a server di terze parti
- I dati vengono cifrati con **AES-256-GCM** direttamente nel browser prima di essere salvati su Google Drive
- La chiave di cifratura è derivata dal tuo PIN tramite **PBKDF2** con 200.000 iterazioni
- Il PIN non viene mai salvato in chiaro — solo il suo hash SHA-256
- Il Cloudflare Worker trasmette solo quotazioni pubbliche di borsa, senza dati personali
- L'accesso è protetto da PIN a 6 cifre con supporto biometrico (WebAuthn)
- Auto-lock dopo 5 minuti di inattività

---

## Aggiornamento quotazioni

Le quotazioni vengono aggiornate:
- Automaticamente all'avvio dell'app (dopo 2 secondi)
- Ogni 5 minuti durante l'utilizzo
- Manualmente tramite il pulsante **↺** nella topbar o in **Impostazioni → Aggiorna Ora**

I titoli supportati:
- **Azioni e Fondi** → Yahoo Finance (ticker es. `ENI.MI`, `VEUR.AS`)
- **Certificates** → Zonebourse (codice numerico es. `184320628`)
- **Polizze Vita** → valore manuale (nessuna quotazione automatica)

---

## Backup e ripristino

I dati vengono salvati automaticamente su **Google Drive** in formato cifrato.
È possibile esportare un backup locale non cifrato (JSON) da **Impostazioni → Esporta Backup**.

---

## Note tecniche

- L'app funziona completamente **offline** dopo il primo caricamento (Service Worker)
- I dati locali sono salvati in `localStorage` come cache del Drive
- La connessione a Google Drive avviene silenziosamente all'avvio se già autorizzata in precedenza
- L'errore `Cross-Origin-Opener-Policy` in console è generato dalla libreria Google OAuth su GitHub Pages ed è innocuo

---

*Sviluppato con l'assistenza di Claude (Anthropic) — uso personale privato.*
