/* FINTrack — chart + movers + interactions */

(function () {
  // --- data: generate a believable portfolio curve ---
  function genSeries(n, start, drift, vol, seed) {
    let v = start;
    const out = [];
    let s = seed;
    function rng() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (let i = 0; i < n; i++) {
      const r = (rng() - 0.5) * 2;
      v = Math.max(0, v + drift + r * vol);
      out.push(v);
    }
    return out;
  }

  // --- chart rendering ---
  const SVG = document.getElementById('chart');
  const TT = document.getElementById('tooltip');
  const TT_DATE = document.getElementById('tt-date');
  const TT_VAL = document.getElementById('tt-val');
  const XAXIS = document.getElementById('xaxis');
  const W = 1000, H = 320;
  const PAD = { l: 14, r: 14, t: 12, b: 8 };

  function smoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cx = (p0[0] + p1[0]) / 2;
      d += ` C ${cx} ${p0[1]}, ${cx} ${p1[1]}, ${p1[0]} ${p1[1]}`;
    }
    return d;
  }

  function fmtEUR(n) {
    return '€ ' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDateShort(d) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  }

  const TIMEFRAMES = {
    '1d':  { days: 1,   ticks: 5,  drift: 0.04, vol: 1.2 },
    '1w':  { days: 7,   ticks: 5,  drift: 0.2,  vol: 4 },
    '1m':  { days: 30,  ticks: 5,  drift: 0.4,  vol: 8 },
    '3m':  { days: 90,  ticks: 5,  drift: 0.6,  vol: 14 },
    'ytd': { days: 145, ticks: 5,  drift: 0.9,  vol: 18 },
    '1y':  { days: 365, ticks: 5,  drift: 1.2,  vol: 22 },
    'all': { days: 730, ticks: 5,  drift: 0.9,  vol: 26 },
  };

  let currentTF = '3m';
  let currentSeries = null;

  function render(tf) {
    const cfg = TIMEFRAMES[tf];
    // end value should be 2243.65; back-solve start
    const endVal = 2243.65;
    const series = genSeries(cfg.days, endVal * 0.78, cfg.drift, cfg.vol, 4242);
    // normalise so last value lands on endVal
    const ratio = endVal / series[series.length - 1];
    for (let i = 0; i < series.length; i++) series[i] *= ratio;

    // invested line — slowly stepping up to a level just below
    const invested = series.map((_, i) => {
      const t = i / (series.length - 1);
      return 1400 + t * 600;
    });

    currentSeries = series;

    const maxV = Math.max(...series, ...invested) * 1.08;
    const minV = Math.min(...series, ...invested) * 0.92;

    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;

    const xAt = (i) => PAD.l + (i / (series.length - 1)) * innerW;
    const yAt = (v) => PAD.t + (1 - (v - minV) / (maxV - minV)) * innerH;

    const linePts = series.map((v, i) => [xAt(i), yAt(v)]);
    const invPts = invested.map((v, i) => [xAt(i), yAt(v)]);

    const linePath = smoothPath(linePts);
    const fillPath = linePath + ` L ${xAt(series.length - 1)} ${H - PAD.b} L ${xAt(0)} ${H - PAD.b} Z`;
    const invPath = smoothPath(invPts);

    // gridlines (4 horizontal) + HTML y-axis labels
    const grid = [];
    const yLabels = [];
    for (let g = 0; g < 4; g++) {
      const gv = minV + (maxV - minV) * (g + 1) / 5;
      const gy = yAt(gv);
      grid.push(`<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${gy}" y2="${gy}" stroke="var(--line)" stroke-dasharray="2 4" stroke-width="1" />`);
      const pctTop = (gy / H) * 100;
      yLabels.push(`<span style="top:${pctTop.toFixed(2)}%">€${(gv/1000).toFixed(1)}k</span>`);
    }
    const yAxisEl = document.getElementById('yaxis');
    if (yAxisEl) yAxisEl.innerHTML = yLabels.join('');

    SVG.innerHTML = `
      <defs>
        <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="chart-grid">${grid.join('')}</g>
      <path class="chart-fill" d="${fillPath}" fill="url(#fade)" />
      <path class="chart-invested" d="${invPath}" fill="none" stroke="var(--faint-foreground)" stroke-width="1.5" stroke-dasharray="4 5" stroke-linecap="round" />
      <path class="chart-line" d="${linePath}" fill="none" stroke="var(--primary)" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" />
      <circle id="hover-dot" cx="0" cy="0" r="5" fill="var(--card)" stroke="var(--primary)" stroke-width="2" opacity="0"/>
      <line id="hover-line" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" stroke="var(--muted-foreground)" stroke-width="1" stroke-dasharray="2 3" opacity="0"/>
    `;

    // x-axis labels
    const xLabels = [];
    const today = new Date('2026-05-25');
    for (let i = 0; i < cfg.ticks; i++) {
      const di = Math.round((cfg.days - 1) * (i / (cfg.ticks - 1)));
      const date = new Date(today);
      date.setDate(today.getDate() - (cfg.days - 1 - di));
      xLabels.push(`<span>${fmtDateShort(date)}</span>`);
    }
    XAXIS.innerHTML = xLabels.join('');

    // store the line points on the SVG for hover lookup
    SVG._linePts = linePts;
    SVG._series = series;
    SVG._cfg = cfg;
  }

  // hover handler
  const wrap = document.getElementById('chart-wrap');
  wrap.addEventListener('mousemove', (e) => {
    const rect = SVG.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgX = (x / rect.width) * W;
    const pts = SVG._linePts;
    if (!pts) return;
    // find nearest
    let bestI = 0, bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i][0] - svgX);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    const p = pts[bestI];
    const dot = document.getElementById('hover-dot');
    const line = document.getElementById('hover-line');
    if (dot) {
      dot.setAttribute('cx', p[0]);
      dot.setAttribute('cy', p[1]);
      dot.setAttribute('opacity', '1');
    }
    if (line) {
      line.setAttribute('x1', p[0]);
      line.setAttribute('x2', p[0]);
      line.setAttribute('opacity', '0.5');
    }
    // tooltip position in CSS px
    const px = (p[0] / W) * rect.width;
    const py = (p[1] / H) * rect.height;
    TT.style.left = px + 'px';
    TT.style.top = py + 'px';
    TT.style.opacity = '1';
    TT_VAL.textContent = fmtEUR(SVG._series[bestI]);
    const today = new Date('2026-05-25');
    const date = new Date(today);
    date.setDate(today.getDate() - (SVG._cfg.days - 1 - bestI));
    TT_DATE.textContent = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  });
  wrap.addEventListener('mouseleave', () => {
    TT.style.opacity = '0';
    const dot = document.getElementById('hover-dot'); if (dot) dot.setAttribute('opacity', '0');
    const line = document.getElementById('hover-line'); if (line) line.setAttribute('opacity', '0');
  });

  // timeframe buttons
  document.querySelectorAll('#timeframes .seg__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeframes .seg__btn').forEach(b => b.classList.remove('seg__btn--on'));
      btn.classList.add('seg__btn--on');
      currentTF = btn.dataset.tf;
      render(currentTF);
    });
  });

  render(currentTF);

  // --- movers ---
  const MOVERS = [
    { t: 'CSPX',  n: 'iShares Core S&P 500',  price: '512.40', pct: 1.83, dir: 1 },
    { t: 'VWCE',  n: 'Vanguard FTSE All-World', price: '112.80', pct: 0.92, dir: 1 },
    { t: 'AAPL',  n: 'Apple Inc.',              price: '178.40', pct: -0.41, dir: -1 },
    { t: 'GLD',   n: 'SPDR Gold Shares',        price: '198.20', pct: 0.24, dir: 1 },
    { t: 'TSLA',  n: 'Tesla Inc.',              price: '218.30', pct: -2.14, dir: -1 },
  ];

  function sparkSVG(dir, seed) {
    const n = 24;
    let v = 50;
    const pts = [];
    let s = seed;
    function rng() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (let i = 0; i < n; i++) {
      const trend = dir * 0.8;
      v += trend + (rng() - 0.5) * 4;
      pts.push([i / (n - 1) * 100, 30 - (v - 50) * 0.9]);
    }
    // smooth
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const cx = (p0[0] + p1[0]) / 2;
      d += ` C ${cx} ${p0[1]}, ${cx} ${p1[1]}, ${p1[0]} ${p1[1]}`;
    }
    const color = dir > 0 ? 'var(--gain)' : 'var(--loss)';
    return `<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:100%;height:100%"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  const moversEl = document.getElementById('movers');
  moversEl.innerHTML = MOVERS.map((m, i) => `
    <div class="mover rise d${(i % 5) + 1}" style="animation-delay:${400 + i * 80}ms">
      <div class="mover__head">
        <span class="mover__ticker">${m.t}</span>
        <span class="mover__price">€${m.price}</span>
      </div>
      <div class="mover__name">${m.n}</div>
      <div class="mover__pct ${m.dir > 0 ? 'mover__pct--up' : 'mover__pct--down'}">
        ${m.dir > 0 ? '+' : '−'}${Math.abs(m.pct).toFixed(2)}<small>%</small>
      </div>
      <div class="mover__spark">${sparkSVG(m.dir, 100 + i * 17)}</div>
    </div>
  `).join('');

})();
