/* global React, ReactDOM, SettingsModal, useFinSettings, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle */

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

  help:    (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5"/><path d="M6 6.5c0-1 1-2 2-2s2 1 2 2-2 1.5-2 2.5M8 11.5v.01"/></svg>),
  info:    (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4v.01"/></svg>),
  trendUp: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 12l4-4 3 2 5-6"/><path d="M10 4h4v4"/></svg>),
  coins:   (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><ellipse cx="6" cy="5" rx="4" ry="2"/><path d="M2 5v3c0 1.1 1.79 2 4 2s4-.9 4-2V5"/><ellipse cx="10" cy="9" rx="4" ry="2"/><path d="M6 9v3c0 1.1 1.79 2 4 2s4-.9 4-2V9"/></svg>),

  emptyTrend: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 36l12-12 8 8 16-18"/><path d="M30 14h12v12"/></svg>),
  emptyCoins: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="18" cy="16" rx="12" ry="6"/><path d="M6 16v8c0 3.3 5.37 6 12 6s12-2.7 12-6v-8"/><ellipse cx="30" cy="28" rx="12" ry="6"/><path d="M18 28v8c0 3.3 5.37 6 12 6s12-2.7 12-6v-8"/></svg>),
};

/* ─────────────────────────────────────────────────────────────
   SAMPLE TAX EVENTS
   ───────────────────────────────────────────────────────────── */
// In a real app these come from realised sales / dividend transactions.
// Provided here so the user can flip "Show sample data" and see the full UI.
const SAMPLE_EVENTS_2026 = {
  sales: [
    { date: '2026-03-12', ticker: 'TSLA', proceeds: 1065.86, cost: 980.00,  holdYears: 1.2 },
    { date: '2026-02-08', ticker: 'GLD',  proceeds: 1293.41, cost: 1170.00, holdYears: 3.4 },
    { date: '2026-04-01', ticker: 'MSFT', proceeds: 2280.50, cost: 1600.00, holdYears: 5.6 },
    { date: '2026-04-20', ticker: 'AAPL', proceeds: 920.00,  cost: 1440.00, holdYears: 0.8 },
  ],
  dividends: [
    { date: '2026-03-01', ticker: 'CSPX', amount: 24.40 },
    { date: '2026-04-01', ticker: 'VWCE', amount: 12.80 },
    { date: '2026-05-15', ticker: 'MSFT', amount: 4.20 },
  ],
};

/* ─────────────────────────────────────────────────────────────
   TAX MATH
   ───────────────────────────────────────────────────────────── */
function rateForHoldYears(years, tax) {
  if (tax.method === 'fixed') return tax.fixedRate;
  const tier = tax.tiers.find((t) => {
    const fromOk = years >= (t.from ?? 0);
    const toOk = t.to == null ? true : years < t.to;
    return fromOk && toOk;
  });
  return tier ? tier.rate : (tax.tiers[tax.tiers.length - 1]?.rate ?? 0);
}

function fmtEUR(n, { signed = false, dec = 2 } = {}) {
  if (n == null || isNaN(n)) return '€0.00';
  const abs = Math.abs(n);
  const fixed = abs.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const sign = n < 0 ? '−' : (signed && n > 0 ? '+' : '');
  return `${sign}€${fixed}`;
}
function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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
    { icon: I.trend,  label: 'Performance' },
    { icon: I.calc,   label: 'Tax Calculator', active: true },
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
        <a
          className="nav-item"
          style={{ cursor: 'pointer' }}
          onClick={onSettings}
        >
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
   APP
   ───────────────────────────────────────────────────────────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "useSampleData": false,
  "cgView": "aggregate"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [year, setYear] = useState(2026);
  const [settings] = useFinSettings();

  const events = t.useSampleData ? SAMPLE_EVENTS_2026 : { sales: [], dividends: [] };

  const cg = useMemo(() => {
    const rows = events.sales.map((s) => {
      const gain = s.proceeds - s.cost;
      const rate = gain > 0 ? rateForHoldYears(s.holdYears, settings.tax) : 0;
      const tax = Math.max(0, gain) * (rate / 100);
      return { ...s, gain, rate, tax };
    });
    const totalProceeds = rows.reduce((s, r) => s + r.proceeds, 0);
    const totalCost     = rows.reduce((s, r) => s + r.cost, 0);
    const totalGain     = rows.reduce((s, r) => s + r.gain, 0);
    const totalTax      = rows.reduce((s, r) => s + r.tax, 0);
    return { rows, totalProceeds, totalCost, totalGain, totalTax };
  }, [events.sales, settings.tax]);

  const div = useMemo(() => {
    const rate = settings.tax.dividendRate / 100;
    const rows = events.dividends.map((d) => ({ ...d, tax: d.amount * rate }));
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const totalTax = rows.reduce((s, r) => s + r.tax, 0);
    return { rows, total, totalTax };
  }, [events.dividends, settings.tax.dividendRate]);

  const totalTax = cg.totalTax + div.totalTax;

  return (
    <>
      <div className="app">
        <Sidebar onSettings={() => setSettingsOpen(true)} />
        <div>
          <Topbar />
          <main>
            <div className="page-head rise d1">
              <h1 className="page-head__title">Tax Calculator</h1>
              <div className="page-head__right">
                <button className="help-icon" title="How is this calculated?">{I.help}</button>
                <span className="t-small text-muted">Tax Year:</span>
                <label className="input--chip">
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </label>
              </div>
            </div>

            {/* KPI strip */}
            <section className="tax-kpis rise d2">
              <div className="tax-kpi">
                <div className="tax-kpi__top">
                  <div className="tax-kpi__label">Total Estimated Tax Liability</div>
                  <div className="tax-kpi__icon">{I.info}</div>
                </div>
                <div className={`tax-kpi__value ${totalTax > 0 ? 'neon-loss' : ''}`}>
                  {fmtEUR(totalTax)}
                </div>
                <div className="tax-kpi__sub">Sum for {year}</div>
              </div>

              <div className="tax-kpi">
                <div className="tax-kpi__top">
                  <div className="tax-kpi__label">Capital Gains Tax</div>
                  <div className="tax-kpi__icon" style={{ color: cg.totalTax > 0 ? 'var(--gain)' : undefined }}>{I.trendUp}</div>
                </div>
                <div className="tax-kpi__value" style={{ color: cg.totalTax > 0 ? 'var(--foreground)' : undefined }}>
                  {fmtEUR(cg.totalTax)}
                </div>
                <div className="tax-kpi__sub">From {cg.rows.length} sale event{cg.rows.length === 1 ? '' : 's'}</div>
              </div>

              <div className="tax-kpi">
                <div className="tax-kpi__top">
                  <div className="tax-kpi__label">Dividend Tax</div>
                  <div className="tax-kpi__icon" style={{ color: div.totalTax > 0 ? 'var(--chart-3)' : undefined }}>{I.coins}</div>
                </div>
                <div className="tax-kpi__value">
                  {fmtEUR(div.totalTax)}
                </div>
                <div className="tax-kpi__sub">From {div.rows.length} dividend event{div.rows.length === 1 ? '' : 's'}</div>
              </div>
            </section>

            {/* Panel grid */}
            <section className="panel-grid rise d3">

              {/* Capital Gains */}
              <div className="panel">
                <div className="panel__head">
                  <h2 className="panel__title">Capital Gains</h2>
                  <div className="seg">
                    <button
                      className={`seg__btn ${t.cgView === 'aggregate' ? 'seg__btn--on' : ''}`}
                      onClick={() => setTweak('cgView', 'aggregate')}
                    >Aggregate</button>
                    <button
                      className={`seg__btn ${t.cgView === 'detailed' ? 'seg__btn--on' : ''}`}
                      onClick={() => setTweak('cgView', 'detailed')}
                    >Detailed</button>
                  </div>
                </div>

                {cg.rows.length === 0 ? (
                  <div className="panel__body">
                    <div className="empty">
                      <div className="empty__icon">{I.emptyTrend}</div>
                      <div>No taxable sales found for {year}</div>
                    </div>
                  </div>
                ) : t.cgView === 'aggregate' ? (
                  <div className="agg">
                    <div className="agg__row">
                      <span className="agg__label">Total proceeds</span>
                      <span className="agg__value agg__value--neutral">{fmtEUR(cg.totalProceeds)}</span>
                    </div>
                    <div className="agg__row">
                      <span className="agg__label">Total cost basis</span>
                      <span className="agg__value agg__value--neutral">{fmtEUR(cg.totalCost)}</span>
                    </div>
                    <div className="agg__row">
                      <span className="agg__label">Net realised gain</span>
                      <span className={`agg__value ${cg.totalGain >= 0 ? 'agg__value--gain' : 'agg__value--loss'}`}>
                        {fmtEUR(cg.totalGain, { signed: true })}
                      </span>
                    </div>
                    <div className="agg__row">
                      <span className="agg__label">Capital gains tax due</span>
                      <span className="agg__value agg__value--loss">
                        {fmtEUR(cg.totalTax)}
                        <u>tier-weighted</u>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Asset</th>
                          <th>Hold</th>
                          <th>Gain</th>
                          <th>Rate</th>
                          <th>Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cg.rows.map((r, i) => (
                          <tr key={i}>
                            <td className="text-muted">{fmtDate(r.date)}</td>
                            <td><span style={{ fontWeight: 600 }}>{r.ticker}</span></td>
                            <td className="text-muted">{r.holdYears.toFixed(1)}y</td>
                            <td style={{ color: r.gain >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                              {fmtEUR(r.gain, { signed: true })}
                            </td>
                            <td className="text-muted">{r.rate.toFixed(1)}%</td>
                            <td>{fmtEUR(r.tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Dividend Tax */}
              <div className="panel">
                <div className="panel__head">
                  <h2 className="panel__title">Dividend Tax</h2>
                  <span className="badge">{(settings.tax.dividendRate || 0).toFixed(0)}% rate</span>
                </div>

                {div.rows.length === 0 ? (
                  <div className="panel__body">
                    <div className="empty">
                      <div className="empty__icon">{I.emptyCoins}</div>
                      <div>No dividend income found for {year}</div>
                    </div>
                  </div>
                ) : (
                  <div className="agg">
                    <div className="agg__row">
                      <span className="agg__label">Total dividends received</span>
                      <span className="agg__value agg__value--gain">{fmtEUR(div.total, { signed: true })}</span>
                    </div>
                    <div className="agg__row">
                      <span className="agg__label">Dividend tax due</span>
                      <span className="agg__value agg__value--loss">{fmtEUR(div.totalTax)}</span>
                    </div>
                    <div className="agg__row">
                      <span className="agg__label">Net dividend income</span>
                      <span className="agg__value agg__value--neutral">{fmtEUR(div.total - div.totalTax)}</span>
                    </div>
                    <div style={{ overflowX: 'auto', marginTop: 'var(--s-3)' }}>
                      <table className="detail-table">
                        <thead><tr>
                          <th>Date</th><th>Asset</th><th>Amount</th><th>Tax</th>
                        </tr></thead>
                        <tbody>
                          {div.rows.map((r, i) => (
                            <tr key={i}>
                              <td className="text-muted">{fmtDate(r.date)}</td>
                              <td style={{ fontWeight: 600 }}>{r.ticker}</td>
                              <td style={{ color: 'var(--gain)' }}>{fmtEUR(r.amount, { signed: true })}</td>
                              <td>{fmtEUR(r.tax)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </section>
          </main>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab="tax"
      />

      <TweaksPanel title="Tax Calculator · Tweaks">
        <TweakSection label="Demo" />
        <TweakToggle
          label="Show sample data"
          value={t.useSampleData}
          onChange={(v) => setTweak('useSampleData', v)}
        />
        <TweakRadio
          label="Capital Gains view"
          value={t.cgView}
          options={['aggregate', 'detailed']}
          onChange={(v) => setTweak('cgView', v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
