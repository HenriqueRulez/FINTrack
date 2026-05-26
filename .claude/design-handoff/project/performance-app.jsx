/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle */

const { useState, useMemo } = React;

/* ─────────────────────────────────────────────────────────────
   ICONS
   ───────────────────────────────────────────────────────────── */
const I = {
  grid:    (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5.5" height="5.5"/><rect x="8.5" y="2" width="5.5" height="5.5"/><rect x="2" y="8.5" width="5.5" height="5.5"/><rect x="8.5" y="8.5" width="5.5" height="5.5"/></svg>),
  layers:  (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5l6-3 6 3-6 3z"/><path d="M2 8l6 3 6-3"/><path d="M2 11l6 3 6-3"/></svg>),
  trades:  (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10l-3-3"/><path d="M13 11H3l3 3"/></svg>),
  pie:     (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2v6l5 3"/></svg>),
  trend:   (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 12l4-4 3 2 5-6"/><path d="M10 4h4v4"/></svg>),
  calc:    (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12"/><path d="M5 5h6M5 8h2M9 8h2M5 11h2M9 11h2"/></svg>),
  gear:    (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></svg>),

  target:  (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="4"/><circle cx="8" cy="8" r="1.5"/></svg>),
  wallet:  (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="12" height="9" rx="1"/><path d="M2 6h12"/><circle cx="11" cy="9" r="0.8" fill="currentColor"/></svg>),
  clock:   (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5"/><path d="M8 4v4l3 2"/></svg>),
};

/* ─────────────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────────────── */
const TRADES = [
  {
    ticker: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF',
    chart: 'chart-2', status: 'active',
    holdDays: 54,
    invested: 180.00,
    realized: 0.00,
    unrealized: 2243.65,
    native: 'EUR',
  },
  {
    ticker: 'AMAT', name: 'Applied Materials, Inc.',
    chart: 'chart-1', status: 'active',
    holdDays: 110, // ~3m 20d
    invested: 6672.00,
    realized: 0.00,
    unrealized: -2191.84,
    native: 'USD',
  },
  {
    ticker: 'CSPX', name: 'iShares Core S&P 500 UCITS ETF',
    chart: 'chart-2', status: 'active',
    holdDays: 72,
    invested: 6722.80,
    realized: 0.00,
    unrealized: 450.40,
    native: 'EUR',
  },
  {
    ticker: 'MSFT', name: 'Microsoft Corp.',
    chart: 'chart-1', status: 'active',
    holdDays: 198,
    invested: 1600.00,
    realized: 0.00,
    unrealized: 461.00,
    native: 'USD',
  },
  {
    ticker: 'TSLA', name: 'Tesla Inc.',
    chart: 'chart-1', status: 'closed',
    holdDays: 0, // sold fast
    invested: 980.00,
    realized: -106.80,
    unrealized: 0.00,
    native: 'USD',
  },
  {
    ticker: 'GLD', name: 'SPDR Gold Shares',
    chart: 'chart-5', status: 'closed',
    holdDays: 0,
    invested: 1170.00,
    realized: 19.20,
    unrealized: 0.00,
    native: 'USD',
  },
];

const FX = {
  EUR: { EUR: 1,     USD: 1.09 },
  USD: { EUR: 0.92,  USD: 1 },
};
const SYMBOL = { EUR: '€', USD: '$' };

function convert(amount, from, to) { return amount * (FX[from]?.[to] ?? 1); }

function fmt(n, cur, { signed = false, dec = 2 } = {}) {
  const sym = SYMBOL[cur] || '';
  const abs = Math.abs(n);
  const fixed = abs.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const sign = n < 0 ? '−' : (signed && n > 0 ? '+' : '');
  return `${sign}${sym}${fixed}`;
}

function fmtPct(n, { signed = true } = {}) {
  const sign = n < 0 ? '−' : (signed && n > 0 ? '+' : '');
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function fmtHold(days) {
  if (days <= 0) return '—';
  const months = Math.floor(days / 30);
  const rem = days % 30;
  if (months === 0) return `${rem}d`;
  return `${months}m ${rem}d`;
}

/* ─────────────────────────────────────────────────────────────
   SHELL
   ───────────────────────────────────────────────────────────── */
function Sidebar({ onSettings }) {
  const items = [
    { icon: I.grid,   label: 'Dashboard' },
    { icon: I.layers, label: 'Portfolios', badge: '2' },
    { icon: I.trades, label: 'Transactions' },
    { icon: I.pie,    label: 'Holdings', badge: '6' },
    { icon: I.trend,  label: 'Performance', active: true },
    { icon: I.calc,   label: 'Tax Calculator' },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark">F</div>
        <div className="brand__name">FINTrack <span>/ v0.1</span></div>
      </div>
      <nav className="nav">
        {items.map((it) => (
          <a key={it.label} className={`nav-item ${it.active ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon">{it.icon}</span>
            {it.label}
            {it.badge && <span className="badge" style={{ marginLeft: 'auto' }}>{it.badge}</span>}
          </a>
        ))}
        <div style={{ flex: 1 }} />
        <a className="nav-item" style={{ cursor: 'pointer' }} onClick={onSettings}>
          <span className="nav-item__icon">{I.gear}</span>
          Settings
        </a>
      </nav>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__date rise d0">
        <b>Tuesday</b> 25 · May · 2026
      </div>
      <div className="topbar__status rise d1">
        <b>Sync</b> · 2 min ago
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   KPI CARDS — each with its own micro-viz
   ───────────────────────────────────────────────────────────── */
function KPIWinRate({ rate }) {
  return (
    <div className="kpi-cell">
      <div className="kpi-cell__top">
        <div className="kpi-cell__label">Win Rate</div>
        <div className="kpi-cell__icon">{I.target}</div>
      </div>
      <div className="kpi-cell__value">{rate.toFixed(1)}%</div>
      <div className="kpi-cell__sub">Of positions are profitable</div>
      <div className="kpi-cell__viz">
        <div className="gauge"><div className="gauge__fill" style={{ width: `${rate}%` }}/></div>
      </div>
    </div>
  );
}

function KPIProfitSplit({ realizedPct, unrealizedPct }) {
  return (
    <div className="kpi-cell">
      <div className="kpi-cell__top">
        <div className="kpi-cell__label">Profit Split</div>
        <div className="kpi-cell__icon">{I.wallet}</div>
      </div>
      <div className="kpi-cell__value">
        {realizedPct.toFixed(0)}%
        <u style={{ color: 'var(--faint-foreground)' }}> / </u>
        {unrealizedPct.toFixed(0)}%
      </div>
      <div className="kpi-cell__sub">Realized vs Unrealized</div>
      <div className="kpi-cell__viz">
        <div className="split">
          <div className="split__realized" style={{ width: `${realizedPct}%` }}/>
          <div className="split__unrealized" style={{ width: `${unrealizedPct}%` }}/>
        </div>
      </div>
    </div>
  );
}

function KPIHold({ label, days, sub, tone, distribution }) {
  return (
    <div className="kpi-cell">
      <div className="kpi-cell__top">
        <div className="kpi-cell__label">{label}</div>
        <div className={`kpi-cell__icon ${tone === 'gain' ? 'tone-gain' : tone === 'loss' ? 'tone-loss' : ''}`}>{I.clock}</div>
      </div>
      <div className={`kpi-cell__value ${tone === 'gain' ? 'kpi-cell__value--gain' : tone === 'loss' ? 'kpi-cell__value--loss' : ''}`}>
        {days} <u>{days === 1 ? 'Day' : 'Days'}</u>
      </div>
      <div className="kpi-cell__sub">{sub}</div>
      <div className="kpi-cell__viz">
        <div className="tick-row">
          {distribution.map((d, i) => (
            <div key={i} className={`tick tick--${d}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SPARKLINE — last 30 days
   ───────────────────────────────────────────────────────────── */
function generateSpark(seed, dir30) {
  // 30 daily points, ending at the trade's current direction
  let s = seed;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const n = 30;
  const points = [];
  let v = 0;
  // bias the drift toward dir30 ( -1 .. +1 )
  const drift = dir30 * 0.35;
  for (let i = 0; i < n; i++) {
    v += drift + (rng() - 0.5) * 1.4;
    points.push(v);
  }
  // normalise to 0..1 (inverted later for svg y)
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = (max - min) || 1;
  return points.map((p) => (p - min) / range);
}

function Sparkline({ seed, dir30, pct30 }) {
  const data = useMemo(() => generateSpark(seed, dir30), [seed, dir30]);
  const W = 96, H = 28, P = 2;
  const positive = dir30 >= 0;
  const color = positive ? 'var(--gain)' : 'var(--loss)';
  const colorRgb = positive ? 'var(--gain-rgb)' : 'var(--loss-rgb)';

  // build smooth bezier path
  const pts = data.map((d, i) => [
    P + (i / (data.length - 1)) * (W - P * 2),
    P + (1 - d) * (H - P * 2),
  ]);
  let path = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cx = (p0[0] + p1[0]) / 2;
    path += ` C ${cx} ${p0[1]}, ${cx} ${p1[1]}, ${p1[0]} ${p1[1]}`;
  }
  const fillPath = `${path} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const lastPt = pts[pts.length - 1];

  const id = `sp-fade-${seed}`;
  return (
    <div className="spark">
      <svg className="spark__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={lastPt[0]} cy={lastPt[1]} r="2.2" fill={color}/>
      </svg>
      <span className={`spark__delta spark__delta--${positive ? 'gain' : 'loss'}`}>
        {pct30 >= 0 ? '+' : '−'}{Math.abs(pct30).toFixed(1)}%
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TRADE ANALYSIS
   ───────────────────────────────────────────────────────────── */
function AssetCell({ t }) {
  return (
    <div className="asset">
      <div className="asset__logo" style={{ background: `var(--${t.chart})` }}>{t.ticker[0]}</div>
      <div className="asset__main">
        <div className="asset__ticker">{t.ticker}</div>
        <div className="asset__name">{t.name}</div>
      </div>
    </div>
  );
}

function TradeTable({ rows, tweaks }) {
  const [sort, setSort] = useState({ col: 'totalEUR', dir: 'desc' });

  const sorted = useMemo(() => {
    const out = [...rows];
    const cmp = (a, b) => {
      let av, bv;
      switch (sort.col) {
        case 'ticker':    av = a.ticker; bv = b.ticker; break;
        case 'status':    av = a.status; bv = b.status; break;
        case 'hold':      av = a.holdDays; bv = b.holdDays; break;
        case 'invested':  av = a._investedEUR; bv = b._investedEUR; break;
        case 'realized':  av = a._realizedEUR; bv = b._realizedEUR; break;
        case 'unrealized':av = a._unrealizedEUR; bv = b._unrealizedEUR; break;
        case 'totalEUR':  av = a._totalEUR; bv = b._totalEUR; break;
        case 'roi':       av = a._roi; bv = b._roi; break;
        default:          av = a.ticker; bv = b.ticker;
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    };
    return out.sort(cmp);
  }, [rows, sort]);

  function toggleSort(col) {
    setSort((s) => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
  }

  function arr(col) {
    const active = sort.col === col;
    return <span className={`sort-arr ${active ? 'active' : ''}`}>{active ? (sort.dir === 'desc' ? '▼' : '▲') : '↕'}</span>;
  }

  const denseClass = tweaks.density === 'compact' ? 'ta-table--compact'
                  : tweaks.density === 'spacious' ? 'ta-table--spacious'
                  : '';

  return (
    <table className={`ta-table ${denseClass}`}>
      <thead>
        <tr>
          <th className="sortable" onClick={() => toggleSort('ticker')}>Asset {arr('ticker')}</th>
          <th className="sortable" onClick={() => toggleSort('status')}>Status {arr('status')}</th>
          <th className="sortable" onClick={() => toggleSort('hold')}>Holding Period {arr('hold')}</th>
          <th className="sortable" onClick={() => toggleSort('invested')}>Invested {arr('invested')}</th>
          <th className="sortable" onClick={() => toggleSort('realized')}>Realized {arr('realized')}</th>
          <th className="sortable" onClick={() => toggleSort('unrealized')}>Unrealized {arr('unrealized')}</th>
          <th className="sortable" onClick={() => toggleSort('totalEUR')}>Total Profit {arr('totalEUR')}</th>
          <th>Last 30 days</th>
          <th className="sortable" onClick={() => toggleSort('roi')}>ROI {arr('roi')}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((t, i) => {
          const cur = tweaks.currency === 'Native' ? t.native : tweaks.currency;
          const invested = convert(t.invested, t.native, cur);
          const realized = convert(t.realized, t.native, cur);
          const unrealized = convert(t.unrealized, t.native, cur);
          const total = realized + unrealized;
          return (
            <tr key={t.ticker + i}>
              <td><AssetCell t={t} /></td>
              <td>
                <span className={`status status--${t.status}`}>
                  {t.status === 'active' ? 'Active' : 'Closed'}
                </span>
              </td>
              <td className="num num-tone--muted">{fmtHold(t.holdDays)}</td>
              <td className="num">{fmt(invested, cur)}</td>
              <td className={`num ${realized > 0 ? 'num-tone--gain' : realized < 0 ? 'num-tone--loss' : 'num-tone--muted'}`}>
                {realized === 0 ? fmt(0, cur) : fmt(realized, cur, { signed: true })}
              </td>
              <td className={`num ${unrealized > 0 ? 'num-tone--gain' : unrealized < 0 ? 'num-tone--loss' : 'num-tone--muted'}`}>
                {unrealized === 0 ? fmt(0, cur) : fmt(unrealized, cur, { signed: true })}
              </td>
              <td className={`num ${total > 0 ? 'num-tone--gain' : total < 0 ? 'num-tone--loss' : 'num-tone--muted'}`}>
                {total === 0 ? fmt(0, cur) : fmt(total, cur, { signed: true })}
              </td>
              <td>
                {t.status === 'active'
                  ? <Sparkline seed={(t.ticker.charCodeAt(0) * 31 + t.ticker.charCodeAt(1)) % 9999} dir30={t._dir30} pct30={t._pct30} />
                  : <span className="text-faint t-small">—</span>}
              </td>
              <td>
                <span className={`roi roi--${t._roi >= 0 ? 'gain' : 'loss'}`}>{fmtPct(t._roi)}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT
   ───────────────────────────────────────────────────────────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "currency": "EUR",
  "density": "comfortable",
  "showClosed": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const data = useMemo(() => {
    const enrich = (tr) => {
      const invE = convert(tr.invested, tr.native, 'EUR');
      const reaE = convert(tr.realized, tr.native, 'EUR');
      const unrE = convert(tr.unrealized, tr.native, 'EUR');
      const totE = reaE + unrE;
      const roi = invE > 0 ? (totE / invE) * 100 : 0;
      // synthetic last-30-days metric: derived from total direction, slightly noisy
      const dir30 = totE === 0 ? 0 : (totE > 0 ? 1 : -1);
      // shape pct30 from total: roughly 1/4 of total ROI clamped
      const pct30 = Math.max(-12, Math.min(12, roi * 0.18 + (dir30 * 0.6)));
      return { ...tr, _investedEUR: invE, _realizedEUR: reaE, _unrealizedEUR: unrE, _totalEUR: totE, _roi: roi, _dir30: dir30, _pct30: pct30 };
    };
    const all = TRADES.map(enrich);
    const active = all.filter((x) => x.status === 'active');
    const closed = all.filter((x) => x.status === 'closed');

    // KPIs (computed across all trades)
    const winners = all.filter((x) => x._totalEUR > 0);
    const losers  = all.filter((x) => x._totalEUR < 0);
    const winRate = all.length > 0 ? (winners.length / all.length) * 100 : 0;

    const totalRealized   = all.reduce((s, x) => s + x._realizedEUR, 0);
    const totalUnrealized = all.reduce((s, x) => s + x._unrealizedEUR, 0);
    const totalProfit     = totalRealized + totalUnrealized;
    const absRea = Math.abs(totalRealized);
    const absUnr = Math.abs(totalUnrealized);
    const splitDenom = absRea + absUnr || 1;
    const realizedPct   = (absRea / splitDenom) * 100;
    const unrealizedPct = (absUnr / splitDenom) * 100;

    const avgHoldAll = active.length > 0
      ? Math.round(active.reduce((s, x) => s + x.holdDays, 0) / active.length)
      : 0;
    const avgHoldWin = winners.length > 0
      ? Math.round(winners.reduce((s, x) => s + x.holdDays, 0) / winners.length)
      : 0;
    const avgHoldLose = losers.length > 0
      ? Math.round(losers.reduce((s, x) => s + x.holdDays, 0) / losers.length)
      : 0;

    // tick distributions — 10 ticks per row
    const tickFromTrades = (set, tone) => {
      const arr = Array(10).fill('off');
      const sortedByHold = [...set].sort((a, b) => a.holdDays - b.holdDays);
      sortedByHold.forEach((_, i) => { if (i < arr.length) arr[i] = tone; });
      return arr;
    };

    const rows = t.showClosed ? all : active;

    return {
      rows,
      winRate, realizedPct, unrealizedPct,
      avgHoldAll, avgHoldWin, avgHoldLose,
      activeTicks: tickFromTrades(active, 'active'),
      winTicks:    tickFromTrades(winners, 'gain'),
      loseTicks:   tickFromTrades(losers, 'loss'),
      totalActive: active.length,
      totalClosed: closed.length,
    };
  }, [t.showClosed]);

  return (
    <>
      <div className="app">
        <Sidebar onSettings={() => setSettingsOpen(true)} />
        <div>
          <Topbar />
          <main>
            <div className="page-head rise d1">
              <div>
                <h1 className="page-head__title">Performance</h1>
                <div className="page-head__meta">
                  <span className="neon-dot"></span>
                  <span style={{ color: 'var(--foreground)' }}>LIVE</span>
                  <span>·</span>
                  <span>{data.totalActive} active · {data.totalClosed} closed</span>
                </div>
              </div>
              <div className="seg">
                <button className="seg__btn">1M</button>
                <button className="seg__btn">3M</button>
                <button className="seg__btn seg__btn--on">YTD</button>
                <button className="seg__btn">1Y</button>
                <button className="seg__btn">ALL</button>
              </div>
            </div>

            <section className="kpi-strip rise d2">
              <KPIWinRate rate={data.winRate} />
              <KPIProfitSplit realizedPct={data.realizedPct} unrealizedPct={data.unrealizedPct} />
              <KPIHold
                label="Overall Avg Hold"
                days={data.avgHoldAll}
                sub="Total portfolio discipline"
                tone="neutral"
                distribution={data.activeTicks}
              />
              <KPIHold
                label="Avg Winner Hold"
                days={data.avgHoldWin}
                sub="Letting winners run"
                tone="gain"
                distribution={data.winTicks}
              />
              <KPIHold
                label="Avg Loser Hold"
                days={data.avgHoldLose}
                sub="Cutting losers fast"
                tone="loss"
                distribution={data.loseTicks}
              />
            </section>

            <section className="ta-card rise d3">
              <div className="ta-card__head">
                <h2 className="ta-card__title">Trade Analysis</h2>
                <div className="ta-card__controls">
                  <div className="seg">
                    {['EUR', 'USD', 'Native'].map((c) => (
                      <button
                        key={c}
                        className={`seg__btn ${t.currency === c ? 'seg__btn--on' : ''}`}
                        onClick={() => setTweak('currency', c)}
                      >{c}</button>
                    ))}
                  </div>
                </div>
              </div>
              <TradeTable rows={data.rows} tweaks={t} />
            </section>
          </main>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <TweaksPanel title="Performance · Tweaks">
        <TweakSection label="Display" />
        <TweakRadio
          label="Currency"
          value={t.currency}
          options={['EUR', 'USD', 'Native']}
          onChange={(v) => setTweak('currency', v)}
        />
        <TweakRadio
          label="Density"
          value={t.density}
          options={['compact', 'comfortable', 'spacious']}
          onChange={(v) => setTweak('density', v)}
        />

        <TweakSection label="Data" />
        <TweakToggle
          label="Show closed trades"
          value={t.showClosed}
          onChange={(v) => setTweak('showClosed', v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
