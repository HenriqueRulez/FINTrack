/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect */

const { useState, useMemo } = React;

/* ─────────────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────────────── */

const HOLDINGS = [
  {
    ticker: 'AMAT', name: 'Applied Materials, Inc.',
    klass: 'Stocks', chart: 'chart-1',
    shares: 12, native: 'USD',
    avgCost: 556, costBasis: 6672, price: 433.62,
    sold: false,
  },
  {
    ticker: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF',
    klass: 'ETFs', chart: 'chart-2',
    shares: 60, native: 'EUR',
    avgCost: 108.6, costBasis: 6516, price: 122.40,
    sold: false,
  },
  {
    ticker: 'CSPX', name: 'iShares Core S&P 500 UCITS ETF',
    klass: 'ETFs', chart: 'chart-2',
    shares: 14, native: 'EUR',
    avgCost: 480.2, costBasis: 6722.8, price: 512.40,
    sold: false,
  },
  {
    ticker: 'AAPL', name: 'Apple Inc.',
    klass: 'Stocks', chart: 'chart-1',
    shares: 8, native: 'USD',
    avgCost: 180, costBasis: 1440, price: 178.40,
    sold: false,
  },
  {
    ticker: 'MSFT', name: 'Microsoft Corp.',
    klass: 'Stocks', chart: 'chart-1',
    shares: 5, native: 'USD',
    avgCost: 320, costBasis: 1600, price: 412.20,
    sold: false,
  },
  {
    ticker: 'BTC', name: 'Bitcoin',
    klass: 'Crypto', chart: 'chart-4',
    shares: 0.045, native: 'USD',
    avgCost: 42000, costBasis: 1890, price: 67400,
    sold: false,
  },
  // sold positions — hidden by default
  {
    ticker: 'TSLA', name: 'Tesla Inc.',
    klass: 'Stocks', chart: 'chart-1',
    shares: 4, native: 'USD',
    avgCost: 245, costBasis: 980, price: 218.30,
    sold: true,
  },
  {
    ticker: 'GLD', name: 'SPDR Gold Shares',
    klass: 'Other', chart: 'chart-5',
    shares: 6, native: 'USD',
    avgCost: 195, costBasis: 1170, price: 198.20,
    sold: true,
  },
];

// FX → display currency
const FX = {
  EUR: { EUR: 1,     USD: 1.09,  GBP: 0.85 },
  USD: { EUR: 0.92,  USD: 1,     GBP: 0.78 },
  GBP: { EUR: 1.17,  USD: 1.27,  GBP: 1 },
};
const SYMBOL = { EUR: '€', USD: '$', GBP: '£' };

function convert(amount, fromCur, toCur) {
  return amount * (FX[fromCur]?.[toCur] ?? 1);
}

function fmt(n, cur, opts = {}) {
  const sym = SYMBOL[cur] || '';
  const abs = Math.abs(n);
  const fixed = abs.toLocaleString('en-GB', {
    minimumFractionDigits: opts.dec ?? 2,
    maximumFractionDigits: opts.dec ?? 2,
  });
  const sign = n < 0 ? '−' : (opts.signed ? '+' : '');
  return `${sign}${sym}${fixed}`;
}

function fmtPct(n) {
  const sign = n < 0 ? '−' : '+';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

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
  info:    (<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4v.01"/></svg>),
  alert:   (<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 1.5l6 11H1z"/><path d="M7 6v3M7 11v.01"/></svg>),
  stack:   (<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="10" height="4"/><rect x="2" y="8" width="10" height="3"/></svg>),
  cash:    (<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="3.5" width="11" height="7"/><circle cx="7" cy="7" r="1.5"/></svg>),
  refresh: (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11.5 3.5A5 5 0 1 0 12.5 9"/><path d="M12.5 1.5v3h-3"/></svg>),
};

/* ─────────────────────────────────────────────────────────────
   SHELL — sidebar + topbar
   ───────────────────────────────────────────────────────────── */

function Sidebar({ onSettings }) {
  const items = [
    { icon: I.grid,   label: 'Dashboard' },
    { icon: I.layers, label: 'Portfolios', badge: '2' },
    { icon: I.trades, label: 'Transactions' },
    { icon: I.pie,    label: 'Holdings', badge: '6', active: true },
    { icon: I.trend,  label: 'Performance' },
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
   KPI STRIP
   ───────────────────────────────────────────────────────────── */

function KPIStrip({ kpis }) {
  return (
    <section className="kpi-strip rise d2">
      {kpis.map((k, i) => (
        <div key={k.label} className="kpi-cell">
          <div className="kpi-cell__top">
            <div className="kpi-cell__label">{k.label}</div>
            <div className="kpi-cell__icon">{k.icon || I.info}</div>
          </div>
          <div
            className={`kpi-cell__value ${k.neon ? 'neon-loss' : ''}`}
            style={{ color: k.color }}
          >
            {k.value}
          </div>
          <div className="kpi-cell__sub">{k.sub}</div>
        </div>
      ))}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   ALLOCATION CELL — three variants
   ───────────────────────────────────────────────────────────── */

function Company({ h, pct, variant }) {
  const colorVar = `var(--${h.chart})`;
  const initial = h.ticker[0];

  if (variant === 'fill') {
    return (
      <div className="company">
        <div
          className="company__logo"
          style={{ background: colorVar }}
          title={h.klass}
        >{initial}</div>
        <div className="alloc-pill" style={{ '--bar-color': colorVar }}>
          <div className="alloc-pill__fill" style={{ width: `${pct}%` }} />
          <div className="alloc-pill__content">
            <div className="alloc-pill__left">
              <div className="company__main">
                <div className="company__ticker">{h.ticker}</div>
                <div className="company__name">{h.name}</div>
              </div>
            </div>
            <div className="alloc-pill__pct">{pct.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'stripe') {
    return (
      <div className="company">
        <div className="company__logo" style={{ background: colorVar }}>{initial}</div>
        <div className="company__main">
          <div className="company__ticker">{h.ticker}</div>
          <div className="company__name">{h.name}</div>
        </div>
        <div className="alloc-stripe" style={{ '--bar-color': colorVar }}>
          <div className="alloc-stripe__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="company__alloc">{pct.toFixed(1)}%</div>
      </div>
    );
  }

  // hidden / minimal
  return (
    <div className="company">
      <div className="company__logo" style={{ background: colorVar }}>{initial}</div>
      <div className="company__main">
        <div className="company__ticker">{h.ticker}</div>
        <div className="company__name">{h.name}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HOLDINGS TABLE
   ───────────────────────────────────────────────────────────── */

function HoldingsTable({ rows, totalValueEUR, tweaks }) {
  const [sort, setSort] = useState({ col: 'value', dir: 'desc' });

  const sorted = useMemo(() => {
    const out = [...rows];
    const cmp = (a, b) => {
      let av, bv;
      switch (sort.col) {
        case 'ticker': av = a.ticker; bv = b.ticker; break;
        case 'pct':    av = a._pctEUR; bv = b._pctEUR; break;
        case 'shares': av = a.shares; bv = b.shares; break;
        case 'avg':    av = a.avgCost; bv = b.avgCost; break;
        case 'cost':   av = a.costBasis; bv = b.costBasis; break;
        case 'price':  av = a.price; bv = b.price; break;
        case 'value':  av = a._marketEUR; bv = b._marketEUR; break;
        case 'gain':   av = a._gainEUR; bv = b._gainEUR; break;
        default:       av = a.ticker; bv = b.ticker;
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    };
    return out.sort(cmp);
  }, [rows, sort]);

  function toggleSort(col) {
    setSort((s) => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'desc' });
  }

  function arr(col) {
    const active = sort.col === col;
    return (
      <span className={`sort-arr ${active ? 'active' : ''}`}>
        {active ? (sort.dir === 'desc' ? '▼' : '▲') : '↕'}
      </span>
    );
  }

  const showCol = tweaks.allocBar !== 'fill'; // dedicated portfolio% column visible in stripe + hidden

  const denseClass = tweaks.density === 'compact' ? 'h-table--compact'
                  : tweaks.density === 'spacious' ? 'h-table--spacious'
                  : '';

  return (
    <table className={`h-table ${denseClass}`}>
      <thead>
        <tr>
          <th className="sortable" onClick={() => toggleSort('ticker')}>Company {arr('ticker')}</th>
          {showCol && <th className="sortable" onClick={() => toggleSort('pct')}>Portfolio% {arr('pct')}</th>}
          <th className="sortable" onClick={() => toggleSort('shares')}>Shares {arr('shares')}</th>
          <th className="sortable" onClick={() => toggleSort('avg')}>Avg Cost {arr('avg')}</th>
          <th className="sortable" onClick={() => toggleSort('cost')}>Cost Basis {arr('cost')}</th>
          <th className="sortable" onClick={() => toggleSort('price')}>Current Price {arr('price')}</th>
          <th className="sortable" onClick={() => toggleSort('value')}>Market Value {arr('value')}</th>
          <th className="sortable" onClick={() => toggleSort('gain')}>Total Gain/Loss {arr('gain')}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((h, i) => (
          <HoldingRow
            key={h.ticker + i}
            h={h}
            tweaks={tweaks}
            showCol={showCol}
          />
        ))}
      </tbody>
    </table>
  );
}

function HoldingRow({ h, tweaks, showCol }) {
  const displayCur = tweaks.currency === 'Native' ? h.native : tweaks.currency;
  const conv = (n) => convert(n, h.native, displayCur);

  const avg = conv(h.avgCost);
  const cost = conv(h.costBasis);
  const price = conv(h.price);
  const value = conv(h.shares * h.price);
  const gain = conv((h.price - h.avgCost) * h.shares);
  const gainPct = ((h.price - h.avgCost) / h.avgCost) * 100;

  // for Native, also show EUR conversion in parens
  const showConv = tweaks.currency === 'Native' && h.native !== 'EUR';

  return (
    <tr className={h.sold ? 'row-sold' : ''}>
      <td><Company h={h} pct={h._pctEUR} variant={tweaks.allocBar} /></td>
      {showCol && (
        <td>
          <span className="num text-muted">{h._pctEUR.toFixed(1)}%</span>
        </td>
      )}
      <td className="num">{h.shares.toLocaleString('en-GB', { maximumFractionDigits: 4 })}</td>
      <td className="num">
        {fmt(avg, displayCur)}
        {showConv && <span className="text-faint" style={{ marginLeft: 6, fontSize: '0.85em' }}>({fmt(convert(h.avgCost, h.native, 'EUR'), 'EUR')})</span>}
      </td>
      <td className="num">
        {fmt(cost, displayCur)}
        {showConv && <span className="text-faint" style={{ marginLeft: 6, fontSize: '0.85em' }}>({fmt(convert(h.costBasis, h.native, 'EUR'), 'EUR')})</span>}
      </td>
      <td className="num">{fmt(price, displayCur)}</td>
      <td className="num">
        {fmt(value, displayCur)}
        {showConv && <span className="text-faint" style={{ marginLeft: 6, fontSize: '0.85em' }}>({fmt(convert(h.shares * h.price, h.native, 'EUR'), 'EUR')})</span>}
      </td>
      <td>
        <span className={`pl ${gain >= 0 ? 'pl--gain' : 'pl--loss'}`}>
          <span className="pl__main">
            {fmt(gain, displayCur, { signed: true })}
            {showConv && <span className="conv">({fmt(convert((h.price - h.avgCost) * h.shares, h.native, 'EUR'), 'EUR', { signed: true })})</span>}
          </span>
          <span className={`badge badge--${gain >= 0 ? 'gain' : 'loss'}`}>{fmtPct(gainPct)}</span>
        </span>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT
   ───────────────────────────────────────────────────────────── */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "currency": "EUR",
  "density": "comfortable",
  "allocBar": "fill",
  "showSold": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [spin, setSpin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // active rows + portfolio % based on EUR market value
  const { rows, totalEUR, holdingsEUR, cashEUR, unrealizedEUR, realizedEUR, count } = useMemo(() => {
    const active = HOLDINGS.filter((h) => !h.sold);
    const sold = HOLDINGS.filter((h) => h.sold);

    const enrich = (h) => {
      const marketEUR = convert(h.shares * h.price, h.native, 'EUR');
      const gainEUR = convert((h.price - h.avgCost) * h.shares, h.native, 'EUR');
      return { ...h, _marketEUR: marketEUR, _gainEUR: gainEUR };
    };

    const activeEnriched = active.map(enrich);
    const soldEnriched = sold.map(enrich);

    const holdingsEUR = activeEnriched.reduce((s, h) => s + h._marketEUR, 0);
    const unrealizedEUR = activeEnriched.reduce((s, h) => s + h._gainEUR, 0);
    const realizedEUR = soldEnriched.reduce((s, h) => s + h._gainEUR, 0);
    const cashEUR = -7894.04;     // synthetic — matches screenshot "uninvested cash"
    const totalEUR = holdingsEUR + cashEUR;

    const visible = t.showSold ? [...activeEnriched, ...soldEnriched] : activeEnriched;
    const withPct = visible.map((h) => ({
      ...h,
      _pctEUR: holdingsEUR > 0 ? (h._marketEUR / holdingsEUR) * 100 : 0,
    }));

    return {
      rows: withPct,
      totalEUR, holdingsEUR, cashEUR, unrealizedEUR, realizedEUR,
      count: active.length,
    };
  }, [t.showSold]);

  const kpis = [
    {
      label: 'Total Value', icon: I.alert,
      value: fmt(totalEUR, 'EUR'),
      color: totalEUR < 0 ? 'var(--loss)' : undefined,
      neon: totalEUR < 0,
      sub: 'Investments + cash',
    },
    {
      label: 'Holdings Value', icon: I.info,
      value: fmt(holdingsEUR, 'EUR'),
      sub: 'Open positions',
    },
    {
      label: 'Cash', icon: I.alert,
      value: fmt(cashEUR, 'EUR'),
      color: cashEUR < 0 ? 'var(--loss)' : undefined,
      sub: 'Uninvested cash balance',
    },
    {
      label: 'Total P/L', icon: I.info,
      value: fmt(unrealizedEUR + realizedEUR, 'EUR', { signed: true }),
      color: (unrealizedEUR + realizedEUR) >= 0 ? 'var(--gain)' : 'var(--loss)',
      sub: 'Since inception',
    },
    {
      label: 'Unrealized P/L', icon: I.info,
      value: fmt(unrealizedEUR, 'EUR', { signed: true }),
      color: unrealizedEUR >= 0 ? 'var(--gain)' : 'var(--loss)',
      sub: 'Open positions',
    },
    {
      label: 'Realized P/L', icon: I.info,
      value: fmt(realizedEUR, 'EUR', { signed: true }),
      color: realizedEUR >= 0 ? 'var(--gain)' : 'var(--loss)',
      sub: 'Closed trades',
    },
    {
      label: 'Holdings', icon: I.stack,
      value: String(count),
      sub: 'Active positions',
    },
  ];

  return (
    <>
      <div className="app">
        <Sidebar onSettings={() => setSettingsOpen(true)} />
        <div>
          <Topbar />
          <main>
            <div className="page-head rise d1">
              <h1 className="page-head__title">Holdings</h1>
              <div className="page-head__meta">
                <span className="neon-dot"></span>
                <span style={{ color: 'var(--foreground)' }}>LIVE</span>
                <span>·</span>
                <span>{count} active · {HOLDINGS.length - count} closed</span>
              </div>
            </div>

            <KPIStrip kpis={kpis} />

            <section className="holdings-card rise d3">
              <div className="holdings-card__head">
                <h2 className="holdings-card__title">Holdings</h2>
                <div className="holdings-card__controls">
                  <button
                    className="btn btn--icon"
                    title="Refresh"
                    onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 800); }}
                  >
                    <span className={spin ? 'spin' : ''} style={{ display: 'grid', placeItems: 'center' }}>{I.refresh}</span>
                  </button>
                  <div
                    className={`toggle ${t.showSold ? 'toggle--on' : ''}`}
                    onClick={() => setTweak('showSold', !t.showSold)}
                  >
                    <span>Show sold</span>
                    <span className="toggle__track">
                      <span className="toggle__thumb"></span>
                    </span>
                  </div>
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
              <HoldingsTable rows={rows} totalValueEUR={holdingsEUR} tweaks={t} />
            </section>
          </main>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <TweaksPanel title="Holdings · Tweaks">
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

        <TweakSection label="Allocation viz" />
        <TweakRadio
          label="Bar style"
          value={t.allocBar}
          options={['fill', 'stripe', 'hidden']}
          onChange={(v) => setTweak('allocBar', v)}
        />

        <TweakSection label="Data" />
        <TweakToggle
          label="Show sold positions"
          value={t.showSold}
          onChange={(v) => setTweak('showSold', v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
