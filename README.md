# Portafoglio Roberto — PWA

App di monitoraggio investimenti personale.
Stile OdeaBank · Google Drive · Yahoo Finance

## Struttura file

```
portafoglio/
├── index.html          ← app completa
├── manifest.json       ← configurazione PWA
├── sw.js               ← service worker
├── src/
│   ├── config.js       ← Client ID Google
│   ├── auth.js         ← OAuth + impronta digitale
│   ├── drive.js        ← leggi/scrivi Drive
│   ├── prezzi.js       ← Yahoo Finance API
│   ├── app.js          ← UI e logica principale
│   └── import.js       ← parsing CSV Banca Intesa
└── assets/
    ├── icon-192.png    ← da creare
    └── icon-512.png    ← da creare
```

## Setup iniziale (una volta sola)

### 1. Crea repository GitHub

1. Vai su [github.com](https://github.com) → "New repository"
2. Nome: `portafoglio` (o qualsiasi nome)
3. Visibilità: **Public** (richiesta da GitHub Pages gratuito)
4. Clicca "Create repository"

### 2. Carica i file

```bash
git clone https://github.com/TUO-UTENTE/portafoglio.git
# Copia tutti i file in questa cartella
git add .
git commit -m "Prima versione portafoglio PWA"
git push
```

### 3. Abilita GitHub Pages

1. Nel repository → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main` / cartella: `/ (root)`
4. Salva → dopo 2 minuti il sito è live su:
   `https://TUO-UTENTE.github.io/portafoglio`

### 4. Aggiorna Client ID Google

Nel file `src/config.js` il Client ID è già configurato.

Ora aggiungi l'URL di produzione in Google Cloud:
1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Progetto `portafoglio-roberto` → Client → modifica il client
3. **Origini JavaScript autorizzate**: aggiungi `https://TUO-UTENTE.github.io`
4. **URI di reindirizzamento**: aggiungi `https://TUO-UTENTE.github.io/portafoglio`
5. Salva

### 5. Crea le icone

Crea una cartella `assets/` e metti due immagini PNG:
- `icon-192.png` (192×192 pixel)
- `icon-512.png` (512×512 pixel)

Puoi usare qualsiasi immagine o generarle su [favicon.io](https://favicon.io)

## Uso dell'app

### Primo accesso
- Apri `https://TUO-UTENTE.github.io/portafoglio`
- Clicca "Accedi con Google"
- Autorizza l'accesso a Google Drive
- Opzionale: registra l'impronta digitale per gli accessi successivi

### Aggiornare i prezzi
- Clicca il pulsante "↻ Aggiorna" → scarica prezzi da Yahoo Finance
- I fondi mostrano l'**ultima variazione disponibile** (non 0%)
- Patrimonio Pro si aggiorna manualmente dal pannello dettaglio

### Importare il conto corrente
- Scarica il CSV/XLS da Banca Intesa (area personale → movimenti → esporta)
- Nell'app: "↓ Importa CSV"
- I duplicati vengono rilevati automaticamente

### Installare come app su Android
- Apri in Chrome → menu (⋮) → "Aggiungi a schermata Home"
- Si installa come app nativa, niente barra del browser

### Accesso con impronta (dopo registrazione)
- Apri l'app → "Usa impronta digitale"
- Funziona su Android, iPhone, PC Windows con Windows Hello

## Dati

Il file `portafoglio.json` viene salvato automaticamente su Google Drive.
È leggibile da qualsiasi dispositivo con il tuo account Google.

## Note tecniche

- **Fonte prezzi azioni**: Yahoo Finance via corsproxy.io
- **Fondi Eurizon**: ticker con suffisso `.FZ` su Yahoo Finance
- **Logica variazione fondi**: confronto tra ultimi due prezzi disponibili
  (evita il problema dello 0% quando non ci sono aggiornamenti giornalieri)
- **Patrimonio Pro**: inserimento manuale dal pannello dettaglio titolo
