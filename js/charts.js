/* =============================================
   PORTAFOGLIO PERSONALE — charts.js
   Grafici con Chart.js
   ============================================= */

const Charts = (() => {

  // Istanze grafici
  const instances = {};
  let activePeriod = '1M';

  // Palette colori
  const COLORS = {
    primary:   '#2563EB',
    secondary: '#7C3AED',
    success:   '#16A34A',
    danger:    '#DC2626',
    warning:   '#D97706',
    orange:    '#EA580C',
    slate:     '#64748B',
    palette: [
      '#2563EB','#7C3AED','#16A34A','#DC2626',
      '#D97706','#EA580C','#0891B2','#BE185D',
      '#059669','#7C3AED',
    ],
  };

  // =============================================
  // DEFAULTS GLOBALI CHART.JS
  // =============================================

  function applyDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.font.size   = 12;
    Chart.defaults.color       = '#64748B';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding       = 16;
    Chart.defaults.plugins.tooltip.backgroundColor     = '#0F172A';
    Chart.defaults.plugins.tooltip.titleColor          = '#F8FAFC';
    Chart.defaults.plugins.tooltip.bodyColor           = '#CBD5E1';
    Chart.defaults.plugins.tooltip.padding             = 12;
    Chart.defaults.plugins.tooltip.cornerRadius        = 10;
    Chart.defaults.plugins.tooltip.displayColors       = false;
  }

  // =============================================
  // UTILITY
  // =============================================

  function destroyChart(key) {
    if (instances[key]) { instances[key].destroy(); delete instances[key]; }
  }

  function formatEur(n) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n || 0);
  }

  function filterByPeriod(movimenti, period) {
    const now   = new Date();
    const cutoff = new Date();
    const map    = { '1M': 1, '3M': 3, '6M': 6, '1A': 12 };
    cutoff.setMonth(now.getMonth() - (map[period] || 1));
    return movimenti.filter(m => new Date(m.data) >= cutoff);
  }

  function getMonthLabels(months = 6) {
    const labels = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      labels.push(d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }));
    }
    return labels;
  }

  function groupByMonth(movimenti, tipo) {
    const months = 12;
    const result = new Array(months).fill(0);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result[months - 1 - i] = movimenti
        .filter(m => m.data?.startsWith(ym) && (!tipo || m.tipo === tipo))
        .reduce((s, m) => s + (m.importo || 0), 0);
    }
    return result;
  }

  // =============================================
  // GRAFICO PATRIMONIO (linea)
  // =============================================

  function renderPatrimonio(period = activePeriod) {
    const canvas = document.getElementById('chartPatrimonio');
    if (!canvas || !window.Chart) return;
    if (typeof Portfolio === 'undefined') return;
    destroyChart('patrimonio');

    const data    = Portfolio.getData();
    const movimenti = data.conto.movimenti || [];
    const filtered  = filterByPeriod(movimenti, period);

    // Raggruppa saldo cumulativo per data
    const byDate = {};
    const saldoIniziale = data.conto.saldoIniziale || 0;

    // Ricostruisce storico saldo dalla fine (approssimazione)
    const sorted = [...movimenti].sort((a, b) => new Date(a.data) - new Date(b.data));
    let running = saldoIniziale;
    const dateMap = {};
    sorted.forEach(m => {
      running += m.tipo === 'entrata' ? m.importo : -m.importo;
      dateMap[m.data] = running;
    });

    // Prendi i punti nel periodo selezionato
    const dates  = Object.keys(dateMap).filter(d => {
      const map = { '1M': 30, '3M': 90, '6M': 180, '1A': 365 };
      const days = map[period] || 30;
      const from = new Date(); from.setDate(from.getDate() - days);
      return new Date(d) >= from;
    }).sort();

    const saldoCorrente = saldoIniziale + (data.conto.saldo || 0);
    const labels = dates.length > 0 ? dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day:'numeric', month:'short' })) : ['Oggi'];
    const values = dates.length > 0 ? dates.map(d => dateMap[d]) : [saldoCorrente];

    // Aggiungi valore investimenti al saldo per patrimonio totale
    const invTot = (data.investimenti.titoli || [])
      .filter(t => !t.venduto)
      .reduce((s, t) => s + (t.prezzoAttuale || t.prezzoAcquisto) * t.quantita, 0);
    const enriched = values.map(v => v + invTot);

    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0,   'rgba(37,99,235,0.18)');
    gradient.addColorStop(1,   'rgba(37,99,235,0)');

    instances.patrimonio = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:           'Patrimonio (€)',
          data:            enriched,
          borderColor:     COLORS.primary,
          backgroundColor: gradient,
          borderWidth:     2.5,
          pointRadius:     3,
          pointHoverRadius: 6,
          pointBackgroundColor: COLORS.primary,
          tension:         0.4,
          fill:            true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => formatEur(ctx.parsed.y),
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: { callback: v => formatEur(v) },
          },
        },
      },
    });
  }

  // =============================================
  // GRAFICO ALLOCAZIONE (donut)
  // =============================================

  function renderAllocazione() {
    const canvas = document.getElementById('chartAllocazione');
    if (!canvas || !window.Chart) return;
    if (typeof Portfolio === 'undefined') return;
    destroyChart('allocazione');

    const data   = Portfolio.getData();
    const titoli = (data.investimenti.titoli || []).filter(t => !t.venduto);

    const tipoMap  = { azione:'Azioni', fondo:'Fondi', certificate:'Certificates', pir:'PIR', polizza:'Polizze' };
    const gruppi   = {};

    titoli.forEach(t => {
      const key = tipoMap[t.tipo] || t.tipo;
      const val = (t.prezzoAttuale || t.prezzoAcquisto) * t.quantita;
      gruppi[key] = (gruppi[key] || 0) + val;
    });

    // Aggiungi conto corrente
    const saldoConto = (data.conto.saldoIniziale || 0) + (data.conto.saldo || 0);
    if (saldoConto > 0) gruppi['Conto Corrente'] = saldoConto;

    const labels = Object.keys(gruppi);
    const values = Object.values(gruppi);

    if (labels.length === 0) {
      destroyChart('allocazione');
      return;
    }

    instances.allocazione = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:             values,
          backgroundColor:  COLORS.palette.slice(0, labels.length),
          borderWidth:      2,
          borderColor:      '#fff',
          hoverOffset:      8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.4,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const tot = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = tot > 0 ? ((ctx.parsed / tot) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${formatEur(ctx.parsed)} (${pct}%)`;
              },
            },
          },
        },
        cutout: '65%',
      },
    });
  }

  // =============================================
  // GRAFICO ENTRATE vs USCITE (barre)
  // =============================================

  function renderEntrateUscite(anno) {
    const canvas = document.getElementById('chartEntrateUscite');
    if (!canvas || !window.Chart) return;
    if (typeof Portfolio === 'undefined') return;
    destroyChart('entrateUscite');

    const data      = Portfolio.getData();
    const movimenti = (data.conto.movimenti || []).filter(m => {
      if (!anno) return true;
      return m.data?.startsWith(String(anno));
    });

    const mesi    = getMonthLabels(12);
    const entrate = groupByMonth(movimenti, 'entrata');
    const uscite  = groupByMonth(movimenti, 'uscita');

    instances.entrateUscite = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: mesi,
        datasets: [
          {
            label:           'Entrate',
            data:            entrate,
            backgroundColor: 'rgba(22,163,74,0.8)',
            borderRadius:    6,
            borderSkipped:   false,
          },
          {
            label:           'Uscite',
            data:            uscite,
            backgroundColor: 'rgba(220,38,38,0.7)',
            borderRadius:    6,
            borderSkipped:   false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatEur(ctx.parsed.y)}` } },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: { callback: v => formatEur(v) },
          },
        },
      },
    });
  }

  // =============================================
  // GRAFICO SPESE PER CATEGORIA (donut)
  // =============================================

  function renderCategorie(anno) {
    const canvas = document.getElementById('chartCategorie');
    if (!canvas || !window.Chart) return;
    if (typeof Portfolio === 'undefined') return;
    destroyChart('categorie');

    const data = Portfolio.getData();
    const spese = [
      ...(data.conto.movimenti || []).filter(m => m.tipo === 'uscita'),
      ...(data.carta.spese || []),
    ].filter(s => !anno || s.data?.startsWith(String(anno)));

    const gruppi = {};
    spese.forEach(s => {
      const cat = s.categoria || 'altro';
      gruppi[cat] = (gruppi[cat] || 0) + s.importo;
    });

    const catLabels = {
      stipendio:'Stipendio', investimento:'Investimento', affitto:'Affitto',
      utenze:'Utenze', spesa:'Spesa', trasporti:'Trasporti',
      salute:'Salute', svago:'Svago', shopping:'Shopping',
      ristoranti:'Ristoranti', viaggi:'Viaggi', abbonamenti:'Abbonamenti',
      carburante:'Carburante', altro:'Altro',
    };

    const labels = Object.keys(gruppi).map(k => catLabels[k] || k);
    const values = Object.values(gruppi);

    if (labels.length === 0) return;

    instances.categorie = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: COLORS.palette.slice(0, labels.length),
          borderWidth:     2,
          borderColor:     '#fff',
          hoverOffset:     8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.4,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const tot = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = tot > 0 ? ((ctx.parsed / tot) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${formatEur(ctx.parsed)} (${pct}%)`;
              },
            },
          },
        },
        cutout: '60%',
      },
    });
  }

  // =============================================
  // GRAFICO DETTAGLIO TITOLO (linea storico)
  // =============================================

  async function renderTitoloChart(canvasId, titolo) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;
    destroyChart(canvasId);

    const history = await Quotes.fetchHistory(titolo, '1A');
    if (!history || history.length === 0) return;

    const labels = history.map(p => new Date(p.date + 'T00:00:00').toLocaleDateString('it-IT', { day:'numeric', month:'short' }));
    const values = history.map(p => p.close);

    const first = values[0] || 0;
    const last  = values[values.length - 1] || 0;
    const color = last >= first ? COLORS.success : COLORS.danger;

    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, `${color}30`);
    gradient.addColorStop(1, `${color}00`);

    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data:            values,
          borderColor:     color,
          backgroundColor: gradient,
          borderWidth:     2,
          pointRadius:     0,
          tension:         0.3,
          fill:            true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatEur(ctx.parsed.y) } } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
          y: { grid: { color: '#F1F5F9' }, ticks: { callback: v => formatEur(v) } },
        },
      },
    });
  }

  // =============================================
  // PERIODO PATRIMONIO
  // =============================================

  function setPeriod(period, btn) {
    activePeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderPatrimonio(period);
  }

  // =============================================
  // UPDATE ALL
  // =============================================

  function updateAll() {
    renderPatrimonio(activePeriod);
    renderAllocazione();
    // Report (se visibile)
    const anno = document.getElementById('reportAnno')?.value;
    renderEntrateUscite(anno);
    renderCategorie(anno);
  }

  function init() {
    applyDefaults();
    updateAll();
  }

  // ---- API pubblica ----
  return {
    init,
    updateAll,
    setPeriod,
    renderPatrimonio,
    renderAllocazione,
    renderEntrateUscite,
    renderCategorie,
    renderTitoloChart,
  };

})();
