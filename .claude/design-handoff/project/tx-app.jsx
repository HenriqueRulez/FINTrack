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

  cal:     (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="2.5" width="11" height="10" rx="0.5"/><path d="M1.5 5h11M4 1.5v2M10 1.5v2"/></svg>),
  filter:  (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1.5 2.5h11l-4 5v4l-3 1.5v-5.5z"/></svg>),
  pencil:  (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1.5 12.5l1-3 7-7 2 2-7 7z"/><path d="M8.5 3.5l2 2"/></svg>),
  trash:   (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 3.5h9M5 3.5v-1.5h4v1.5M3.5 3.5l.5 9h6l.5-9"/></svg>),
  upload:  (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 11v1.5h10V11"/><path d="M7 2v8M4 5l3-3 3 3"/></svg>),
  plus:    (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>),
  help:    (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5"/><path d="M6 6.5c0-1 1-2 2-2s2 1 2 2-2 1.5-2 2.5M8 11.5v.01"/></svg>),
  info:    (<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4v.01"/></svg>),
};

/* ─────────────────────────────────────────────────────────────
   DATA — transactions
   ───────────────────────────────────────────────────────────── */
const TRANSACTIONS = [
  // buy/sell
  { id: 't1',  date: '2026-04-02', ticker: 'VWCE', type: 'buy',  qty: 15,    price: 12.00,   cur: 'EUR', fx: 1.0000, fee: 0.00, total: 180.00 },
  { id: 't2',  date: '2026-02-05', ticker: 'AMAT', type: 'buy',  qty: 12,    price: 556.00,  cur: 'GBP', fx: 1.0000, fee: 0.00, total: 6672.00 },
  { id: 't3',  date: '2025-12-10', ticker: 'PPLT', type: 'buy',  qty: 123,   price: 1233.00, cur: 'USD', fx: 1.1628, fee: 0.00, total: 151659.00 },
  { id: 't4',  date: '2026-04-22', ticker: 'CSPX', type: 'buy',  qty: 14,    price: 480.20,  cur: 'EUR', fx: 1.0000, fee: 1.20, total: 6723.80 },
  { id: 't5',  date: '2026-03-18', ticker: 'MSFT', type: 'buy',  qty: 5,     price: 320.00,  cur: 'USD', fx: 1.0871, fee: 0.50, total: 1740.86 },
  { id: 't6',  date: '2026-03-30', ticker: 'TSLA', type: 'sell', qty: 4,     price: 245.00,  cur: 'USD', fx: 1.0871, fee: 0.50, total: 1065.86 },
  { id: 't7',  date: '2026-03-12', ticker: 'GLD',  type: 'sell', qty: 6,     price: 198.20,  cur: 'USD', fx: 1.0871, fee: 0.50, total: 1293.41 },

  // cash
  { id: 't8',  date: '2026-01-15', ticker: '—',    type: 'cash', qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00, total: 5000.00, label: 'Deposit · IBKR' },
  { id: 't9',  date: '2026-02-28', ticker: '—',    type: 'cash', qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00, total: -1200.00, label: 'Withdrawal' },

  // conversion
  { id: 't10', date: '2026-02-04', ticker: 'EUR→USD', type: 'conv', qty: 1000, price: 1.087, cur: 'USD', fx: 1.0871, fee: 1.50, total: 1087.00, label: 'EUR → USD' },

  // dividend
  { id: 't11', date: '2026-03-01', ticker: 'CSPX', type: 'div',  qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00, total: 24.40 },
  { id: 't12', date: '2026-04-01', ticker: 'VWCE', type: 'div',  qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00, total: 12.80 },

  // interest
  { id: 't13', date: '2026-03-31', ticker: '—',    type: 'int',  qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00, total: 8.16, label: 'Cash interest' },
];

const SYMBOL = { EUR: '€', USD: '$', GBP: '£' };
function fmt(n, cur, { signed = false, dec = 2 } = {}) {
  if (n == null) return '—';
  const sym = SYMBOL[cur] || '';
  const abs = Math.abs(n);
  const fixed = abs.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const sign = n < 0 ? '−' : (signed && n > 0 ? '+' : '');
  return `${sign}${sym}${fixed}`;
}
function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const TYPE_TABS = [
  { key: 'all',  label: 'All',           match: () => true },
  { key: 'bs',   label: 'Buy / Sell',    match: (t) => t.type === 'buy' || t.type === 'sell' },
  { key: 'cash', label: 'Cash Movement', match: (t) => t.type === 'cash' },
  { key: 'conv', label: 'Conversion',    match: (t) => t.type === 'conv' },
  { key: 'div',  label: 'Dividend',      match: (t) => t.type === 'div' },
  { key: 'int',  label: 'Interest',      match: (t) => t.type === 'int' },
];

const TYPE_LABEL = { buy: 'BUY', sell: 'SELL', cash: 'CASH', conv: 'CONV', div: 'DIV', int: 'INT' };
const TYPE_CLASS = { buy: 'buy', sell: 'sell', cash: 'cash', conv: 'conv', div: 'div', int: 'int' };

/* ─────────────────────────────────────────────────────────────
   SHELL
   ───────────────────────────────────────────────────────────── */
function Sidebar({ onSettings }) {
  const items = [
    { icon: I.grid,   label: 'Dashboard' },
    { icon: I.layers, label: 'Portfolios', badge: '2' },
    { icon: I.trades, label: 'Transactions', active: true, badge: String(TRANSACTIONS.length) },
    { icon: I.pie,    label: 'Holdings', badge: '6' },
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
   APP
   ───────────────────────────────────────────────────────────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "showFx": true,
  "showFees": true,
  "showRunningTotal": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // state
  const [activeTab, setActiveTab] = useState('bs');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [tickerQuery, setTickerQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort] = useState({ col: 'date', dir: 'desc' });
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // counts per tab (respect global filters but not the tab itself)
  const counts = useMemo(() => {
    const out = {};
    TYPE_TABS.forEach((tab) => {
      out[tab.key] = TRANSACTIONS.filter((tx) => tab.match(tx) && passGlobalFilters(tx)).length;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, tickerQuery, typeFilter]);

  function passGlobalFilters(tx) {
    if (fromDate && tx.date < fromDate) return false;
    if (toDate && tx.date > toDate) return false;
    if (tickerQuery && !tx.ticker.toLowerCase().includes(tickerQuery.toLowerCase())) return false;
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    return true;
  }

  // filtered + sorted
  const filtered = useMemo(() => {
    const tab = TYPE_TABS.find((x) => x.key === activeTab) || TYPE_TABS[0];
    const out = TRANSACTIONS.filter((tx) => tab.match(tx) && passGlobalFilters(tx));
    const cmp = (a, b) => {
      let av, bv;
      switch (sort.col) {
        case 'date':   av = a.date; bv = b.date; break;
        case 'ticker': av = a.ticker; bv = b.ticker; break;
        case 'type':   av = a.type; bv = b.type; break;
        case 'qty':    av = a.qty ?? -Infinity; bv = b.qty ?? -Infinity; break;
        case 'price':  av = a.price ?? -Infinity; bv = b.price ?? -Infinity; break;
        case 'fx':     av = a.fx; bv = b.fx; break;
        case 'fee':    av = a.fee; bv = b.fee; break;
        case 'total':  av = a.total; bv = b.total; break;
        default:       av = a.date; bv = b.date;
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    };
    return out.sort(cmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fromDate, toDate, tickerQuery, typeFilter, sort]);

  const paged = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize]);

  function toggleSort(col) {
    setSort((s) => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
  }
  function arr(col) {
    const active = sort.col === col;
    return <span className={`sort-arr ${active ? 'active' : ''}`}>{active ? (sort.dir === 'desc' ? '▼' : '▲') : '↕'}</span>;
  }

  // selection
  const allOnPageSelected = paged.length > 0 && paged.every((tx) => selected.has(tx.id));
  const someSelected = paged.some((tx) => selected.has(tx.id));

  function toggleOne(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllOnPage() {
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPageSelected) {
        paged.forEach((tx) => next.delete(tx.id));
      } else {
        paged.forEach((tx) => next.add(tx.id));
      }
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }
  function deleteSelected() {
    if (selected.size === 0) return;
    // demo only — would mutate data in a real app
    alert(`Would delete ${selected.size} transaction(s).`);
    clearSelection();
  }

  const denseClass = t.density === 'compact' ? 'tx-table--compact'
                  : t.density === 'spacious' ? 'tx-table--spacious'
                  : '';

  return (
    <>
      <div className="app">
        <Sidebar onSettings={() => setSettingsOpen(true)} />
        <div>
          <Topbar />
          <main>
            {/* page head — History / Realized Gains tabs removed as requested */}
            <div className="page-head rise d1">
              <h1 className="page-head__title">Transactions</h1>
              <div className="page-head__actions">
                <button className="btn btn--icon" title="Help / shortcuts">{I.help}</button>
                <button className="btn btn--ghost">{I.upload}<span style={{ marginLeft: 6 }}>Import</span></button>
                <button className="btn btn--primary">{I.plus}<span style={{ marginLeft: 6 }}>Add Manually</span></button>
              </div>
            </div>

            {/* main card */}
            <section className="tx-card rise d2">

              {/* filter row */}
              <div className="filter-row">
                <div className="filter-row__left">
                  <label className="input--chip">
                    {I.cal}
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      placeholder="From"
                    />
                  </label>
                  <label className="input--chip">
                    {I.cal}
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      placeholder="To"
                    />
                  </label>
                  <label className="input--chip">
                    {I.filter}
                    <input
                      type="text"
                      value={tickerQuery}
                      onChange={(e) => setTickerQuery(e.target.value)}
                      placeholder="Filter by ticker"
                    />
                  </label>
                  <label className="input--chip">
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                      <option value="all">All Types</option>
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                      <option value="cash">Cash Movement</option>
                      <option value="conv">Conversion</option>
                      <option value="div">Dividend</option>
                      <option value="int">Interest</option>
                    </select>
                  </label>
                </div>

                <div className="filter-row__right">
                  <button
                    className={`btn ${editMode ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => { setEditMode((v) => !v); clearSelection(); }}
                  >
                    {I.pencil}<span style={{ marginLeft: 6 }}>Edit</span>
                  </button>

                  {editMode && (
                    <>
                      <button
                        className="btn btn--ghost"
                        onClick={toggleAllOnPage}
                      >
                        <span className={`check ${allOnPageSelected ? 'check--on' : someSelected ? 'check--mixed' : ''}`}/>
                        <span style={{ marginLeft: 6 }}>Select All ({paged.length})</span>
                      </button>
                      <button
                        className="btn btn--danger"
                        onClick={deleteSelected}
                        aria-disabled={selected.size === 0}
                        disabled={selected.size === 0}
                      >
                        {I.trash}<span style={{ marginLeft: 6 }}>Delete ({selected.size})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* type tabs */}
              <div className="type-tabs">
                {TYPE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`type-tab ${activeTab === tab.key ? 'type-tab--on' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    <span className="type-tab__count">{counts[tab.key]}</span>
                  </button>
                ))}
              </div>

              {/* table */}
              {paged.length === 0 ? (
                <div className="empty">
                  <div className="empty__title">No transactions match your filters</div>
                  <div>Try clearing the date range or ticker filter</div>
                </div>
              ) : (
                <table className={`tx-table ${denseClass}`}>
                  <thead>
                    <tr>
                      {editMode && (
                        <th className="center" style={{ width: 36 }}>
                          <span
                            className={`check ${allOnPageSelected ? 'check--on' : someSelected ? 'check--mixed' : ''}`}
                            onClick={toggleAllOnPage}
                          />
                        </th>
                      )}
                      <th className="sortable" onClick={() => toggleSort('date')}>Date {arr('date')}</th>
                      <th className="sortable" onClick={() => toggleSort('ticker')}>Ticker {arr('ticker')}</th>
                      <th className="sortable" onClick={() => toggleSort('type')}>Type {arr('type')}</th>
                      <th className="num-col sortable" onClick={() => toggleSort('qty')}>Quantity {arr('qty')}</th>
                      <th className="num-col sortable" onClick={() => toggleSort('price')}>Price {arr('price')}</th>
                      {t.showFx && (
                        <th className="num-col sortable" onClick={() => toggleSort('fx')}>
                          Exchange Rate
                          <span className="info-icon" title="FX rate applied on settlement">{I.info}</span>
                          {arr('fx')}
                        </th>
                      )}
                      {t.showFees && <th className="num-col sortable" onClick={() => toggleSort('fee')}>Fee {arr('fee')}</th>}
                      <th className="num-col sortable" onClick={() => toggleSort('total')}>Total {arr('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((tx) => {
                      const isSelected = selected.has(tx.id);
                      const showTicker = tx.type === 'cash' || tx.type === 'int' ? (tx.label || tx.ticker) : tx.ticker;
                      const isSigned = tx.type === 'cash' || tx.type === 'sell' || tx.type === 'div' || tx.type === 'int';
                      return (
                        <tr key={tx.id} className={isSelected ? 'selected' : ''}>
                          {editMode && (
                            <td className="center">
                              <span
                                className={`check ${isSelected ? 'check--on' : ''}`}
                                onClick={() => toggleOne(tx.id)}
                              />
                            </td>
                          )}
                          <td>{fmtDate(tx.date)}</td>
                          <td className="ticker-mono">{showTicker}</td>
                          <td>
                            <span className={`type-badge type-badge--${TYPE_CLASS[tx.type]}`}>{TYPE_LABEL[tx.type]}</span>
                          </td>
                          <td className="num-col">{tx.qty == null ? '—' : tx.qty.toLocaleString('en-GB')}</td>
                          <td className="num-col">{tx.price == null ? '—' : fmt(tx.price, tx.cur)}</td>
                          {t.showFx && <td className="num-col">{tx.fx.toFixed(4)}</td>}
                          {t.showFees && <td className="num-col">{fmt(tx.fee, 'EUR')}</td>}
                          <td className="num-col">
                            <span style={{
                              color: tx.total < 0 ? 'var(--loss)'
                                  : (tx.type === 'div' || tx.type === 'int') ? 'var(--gain)'
                                  : undefined
                            }}>
                              {fmt(tx.total, tx.cur, { signed: isSigned })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* footer */}
              <div className="tx-foot">
                <div className="tx-foot__count">
                  Total: <b>{filtered.length}</b> transactions
                  {selected.size > 0 && <> · <b style={{ color: 'var(--primary)' }}>{selected.size}</b> selected</>}
                </div>
                <div className="tx-foot__pager">
                  <span>Show:</span>
                  <label className="input--chip" style={{ padding: '4px 8px' }}>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                </div>
              </div>

            </section>
          </main>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <TweaksPanel title="Transactions · Tweaks">
        <TweakSection label="Display" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={['compact', 'comfortable', 'spacious']}
          onChange={(v) => setTweak('density', v)}
        />

        <TweakSection label="Columns" />
        <TweakToggle
          label="Show exchange rate"
          value={t.showFx}
          onChange={(v) => setTweak('showFx', v)}
        />
        <TweakToggle
          label="Show fees"
          value={t.showFees}
          onChange={(v) => setTweak('showFees', v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
