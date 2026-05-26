/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard */

const { useMemo } = React;

/* ---------- shared bits ---------- */

function SketchyChart({ height = 220, accent = 'var(--accent)', baseline = 0.55, dashed = true }) {
  // a hand-drawn looking polyline
  const w = 900;
  const h = height;
  const points = useMemo(() => {
    const pts = [];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * w;
      const noise = Math.sin(i * 1.3) * 8 + Math.cos(i * 0.6) * 14 + (Math.random() - 0.5) * 6;
      const trend = (i / N) * 50;
      const y = h * baseline - trend + noise;
      pts.push([x, y]);
    }
    return pts;
  }, [height, baseline]);
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const dashPath = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1] + 18}` : `L${p[0]},${p[1] + 18}`)).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {/* gridlines */}
      {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
        <line key={i} x1="0" x2={w} y1={h * t} y2={h * t} stroke="#c9c9c2" strokeDasharray="3 5" strokeWidth="1" />
      ))}
      {dashed && <path d={dashPath} fill="none" stroke="#9a9a92" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />}
      <path d={path} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Squiggle({ width = 60, color = '#1a1a1a' }) {
  return (
    <svg width={width} height="8" viewBox="0 0 80 8" preserveAspectRatio="none">
      <path d="M0 4 Q 10 0 20 4 T 40 4 T 60 4 T 80 4" fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function ArrowAnno({ x, y, w = 100, h = 40, text, dir = 'right', color = 'var(--accent)' }) {
  return (
    <div className="anno" style={{ left: x, top: y, width: w + 40 }}>
      <div style={{ color, fontSize: 17, transform: `rotate(${dir === 'right' ? -3 : 2}deg)`, whiteSpace: 'nowrap' }}>{text}</div>
      <svg width={w} height={h} style={{ marginTop: -2 }}>
        <path
          d={dir === 'right'
            ? `M 4 ${h - 8} Q ${w/2} 0 ${w - 10} ${h - 10}`
            : `M ${w - 4} ${h - 8} Q ${w/2} 0 10 ${h - 10}`}
          fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <path
          d={dir === 'right'
            ? `M ${w - 10} ${h - 10} l -8 -2 m 8 2 l -3 -8`
            : `M 10 ${h - 10} l 8 -2 m -8 2 l 3 -8`}
          fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ---------- common chrome ---------- */

const NAV_ITEMS = [
  { label: 'Dashboard', shape: 'sq', active: true },
  { label: 'Portfolios', shape: 'sq' },
  { label: 'Transactions', shape: 'sq' },
  { label: 'Holdings', shape: 'circle' },
  { label: 'Performance', shape: 'sq' },
  { label: 'Dividends', shape: 'circle' },
  { label: 'Tax Calculator', shape: 'sq' },
];

function Sidebar({ width = 180 }) {
  return (
    <aside className="col" style={{ width, padding: '18px 14px', borderRight: '1.5px solid var(--line)', gap: 4, flexShrink: 0 }}>
      <div className="row center gap-2" style={{ marginBottom: 18 }}>
        <svg width="20" height="20" viewBox="0 0 20 20"><path d="M2 14 L 7 9 L 11 12 L 18 4" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /></svg>
        <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>FINTrack</div>
      </div>
      {NAV_ITEMS.map((it) => (
        <div key={it.label} className={`nav-row ${it.active ? 'active' : ''}`}>
          <div className={`nav-dot ${it.shape === 'circle' ? 'circle' : ''}`}></div>
          <div>{it.label}</div>
        </div>
      ))}
      <div style={{ flex: 1 }}></div>
      <div className="col gap-2" style={{ paddingTop: 12, borderTop: '1.2px dashed #c9c9c2' }}>
        <div className="nav-row"><div className="nav-dot circle"></div><div>Settings</div></div>
      </div>
    </aside>
  );
}

function TopBar({ showTabs = true, accountName = 'Trade · IBKR' }) {
  return (
    <header className="row center between" style={{ padding: '12px 24px', borderBottom: '1.5px solid var(--line)', gap: 16 }}>
      <div className="chip">
        <div style={{ width: 14, height: 14, border: '1.5px solid var(--line)', borderRadius: 3 }}></div>
        <span>{accountName}</span>
        <span style={{ color: 'var(--muted)' }}>▾</span>
      </div>
      {showTabs && (
        <div className="tab-pill">
          <span className="on">Portfolio</span>
          <span>Analysis</span>
          <span>Watchlist</span>
        </div>
      )}
      <div className="row center gap-2">
        <div className="nav-dot"></div>
        <div className="nav-dot circle"></div>
        <div className="nav-dot"></div>
        <div className="nav-dot"></div>
      </div>
    </header>
  );
}

/* =====================================================
   OPTION A — "Faithful" — close to the source structure
   ===================================================== */
function OptionA() {
  return (
    <div className="wf row" style={{ height: '100%' }}>
      <Sidebar />
      <div className="col grow">
        <TopBar />
        <main className="col gap-4" style={{ padding: 24, flex: 1 }}>
          <div className="row center between">
            <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 34 }}>Dashboard</div>
            <div className="seg">
              <span>1D</span><span>1W</span><span className="on">1M</span><span>3M</span><span>YTD</span><span>ALL</span>
            </div>
          </div>

          {/* KPI row */}
          <div className="row gap-3">
            {[
              { lbl: 'Total Net Worth', val: '€ 2,243.65' },
              { lbl: 'Invested Capital', val: '€ 0.00' },
              { lbl: 'Total Gain / Loss', val: '+€ 2,243.65', accent: true, pill: '0.00 %' },
              { lbl: 'Portfolios', val: '1' },
            ].map((k, i) => (
              <div key={i} className={`kpi ink-border grow ${k.accent ? 'accent' : ''}`}>
                <div className="label-cap">{k.lbl} ⓘ</div>
                <div className="num">{k.val}</div>
                {k.pill && <div className="pill">{k.pill}</div>}
              </div>
            ))}
          </div>

          {/* chart + accounts */}
          <div className="row gap-3 grow">
            <section className="ink-border col grow" style={{ padding: 16 }}>
              <div className="row center between" style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 22 }}>Performance</div>
                <div className="row center gap-3" style={{ fontSize: 12 }}>
                  <span><span className="lg-dot" style={{ background: 'var(--accent)' }}></span> Portfolio</span>
                  <span><span className="lg-dot" style={{ background: '#8a8a85' }}></span> Invested</span>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}><SketchyChart height={260} /></div>
              <div className="row between" style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)', paddingTop: 6 }}>
                <span>Apr 26</span><span>May 26</span>
              </div>
            </section>

            <aside className="ink-border col gap-3" style={{ padding: 16, width: 280 }}>
              <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 22 }}>Accounts</div>
              {[
                { n: 'Trade · IBKR', v: '€ 2,243.65' },
                { n: 'Crypto · Kraken', v: '€ 0.00' },
                { n: '+ Add account', muted: true },
              ].map((a, i) => (
                <div key={i} className="row center between" style={{ padding: '8px 0', borderBottom: i < 2 ? '1.2px dashed #c9c9c2' : 'none' }}>
                  <div className="row center gap-2">
                    <div className="nav-dot"></div>
                    <div style={{ color: a.muted ? 'var(--muted)' : 'inherit' }}>{a.n}</div>
                  </div>
                  {a.v && <div className="num-mono" style={{ fontSize: 13 }}>{a.v}</div>}
                </div>
              ))}
            </aside>
          </div>
        </main>
      </div>

      {/* annotations */}
      <ArrowAnno x={280} y={170} w={120} text="KPI strip — 4 up" />
      <div className="sticky" style={{ position: 'absolute', right: 30, bottom: 30, width: 170 }}>
        Mirrors source layout — safe, familiar.
      </div>
    </div>
  );
}

/* =====================================================
   OPTION B — "Hero metric" — one giant number, full-bleed chart
   ===================================================== */
function OptionB() {
  return (
    <div className="wf row" style={{ height: '100%' }}>
      <Sidebar />
      <div className="col grow">
        <TopBar />
        <main className="col" style={{ padding: 28, flex: 1, gap: 18 }}>

          {/* hero block */}
          <div className="row gap-6 center">
            <div className="col" style={{ minWidth: 320 }}>
              <div className="label-cap">Total Net Worth · EUR</div>
              <div style={{ fontFamily: 'Kalam', fontWeight: 700, fontSize: 64, lineHeight: 1 }}>€ 2,243.<span style={{ color: 'var(--muted)' }}>65</span></div>
              <div className="row center gap-3" style={{ marginTop: 10 }}>
                <span style={{ color: 'var(--accent)', fontSize: 22, fontFamily: 'Caveat', fontWeight: 700 }}>+€ 2,243.65</span>
                <span className="pill" style={{ border: '1.2px solid var(--accent)', color: 'var(--accent)' }}>▲ 0.00 %</span>
                <span className="label-cap">vs. invested</span>
              </div>
              <div style={{ marginTop: 6 }}><Squiggle width={240} color="var(--accent)" /></div>
            </div>

            <div className="col grow gap-2">
              <div className="row gap-3">
                <div className="kpi ink-border grow"><div className="label-cap">Invested</div><div className="num">€ 0.00</div></div>
                <div className="kpi ink-border grow"><div className="label-cap">Cash</div><div className="num">€ 142</div></div>
                <div className="kpi ink-border grow"><div className="label-cap">Positions</div><div className="num">12</div></div>
                <div className="kpi ink-border grow"><div className="label-cap">Day P/L</div><div className="num" style={{ color: 'var(--danger)' }}>−€ 18.40</div></div>
              </div>
            </div>
          </div>

          {/* full-bleed chart */}
          <section className="ink-border col grow" style={{ padding: 18 }}>
            <div className="row center between">
              <div className="row center gap-3">
                <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 24 }}>Portfolio over time</div>
                <Squiggle width={50} />
              </div>
              <div className="seg">
                <span>1D</span><span>1W</span><span>1M</span><span className="on">3M</span><span>YTD</span><span>1Y</span><span>ALL</span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}><SketchyChart height={280} baseline={0.6} /></div>
          </section>

          {/* lower row: top movers (lifted from option C) */}
          <section className="ink-border" style={{ padding: 14 }}>
            <div className="row between center" style={{ marginBottom: 8 }}>
              <div className="scribble" style={{ fontSize: 22 }}>Top movers · today</div>
              <div className="label-cap">see all →</div>
            </div>
            <div className="row gap-3">
              {[
                { t: 'CSPX', n: 'iShares S&P 500', v: '+1.8%', good: true },
                { t: 'VWCE', n: 'Vanguard FTSE All-World', v: '+0.9%', good: true },
                { t: 'AAPL', n: 'Apple Inc.', v: '−0.4%', good: false },
                { t: 'GLD', n: 'Gold ETF', v: '+0.2%', good: true },
                { t: 'TSLA', n: 'Tesla', v: '−2.1%', good: false },
              ].map((m, i) => (
                <div key={i} className="dashed col grow" style={{ padding: 10 }}>
                  <div className="num-mono" style={{ fontWeight: 700 }}>{m.t}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.n}</div>
                  <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 22, color: m.good ? 'var(--accent)' : 'var(--danger)' }}>{m.v}</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <ArrowAnno x={290} y={120} w={140} text="hero number front-and-centre" />
    </div>
  );
}

/* =====================================================
   OPTION C — "Editorial" — top nav, asymmetric grid
   ===================================================== */
function OptionC() {
  return (
    <div className="wf col" style={{ height: '100%' }}>
      {/* top brand+nav */}
      <header className="row center between" style={{ padding: '14px 28px', borderBottom: '1.5px solid var(--line)' }}>
        <div className="row center gap-3">
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 16 L 7 10 L 12 13 L 20 3" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /></svg>
          <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 24, color: 'var(--accent)' }}>FINTrack</div>
          <div className="row center gap-4" style={{ marginLeft: 24 }}>
            {['Overview', 'Holdings', 'Transactions', 'Dividends', 'Performance', 'Tax'].map((n, i) => (
              <div key={n} style={{ position: 'relative', paddingBottom: 4, fontSize: 14 }}>
                {n}
                {i === 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, height: 3, background: 'var(--accent)' }}></div>}
              </div>
            ))}
          </div>
        </div>
        <div className="row center gap-3">
          <div className="chip"><div className="nav-dot"></div><span>Trade · IBKR</span><span>▾</span></div>
          <div className="nav-dot circle"></div>
          <div className="nav-dot"></div>
        </div>
      </header>

      <main className="grow" style={{ padding: 28, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gridTemplateRows: 'auto 1fr auto', gap: 16 }}>
        {/* big hero — left col, spans 2 rows */}
        <section className="col gap-3" style={{ gridRow: '1 / span 2' }}>
          <div className="row between center">
            <div>
              <div className="label-cap">Net Worth</div>
              <div style={{ fontFamily: 'Kalam', fontWeight: 700, fontSize: 56, lineHeight: 1 }}>€ 2,243.65</div>
              <div className="row center gap-2" style={{ marginTop: 6 }}>
                <span className="scribble" style={{ color: 'var(--accent)', fontSize: 22 }}>↗ +€ 2,243.65</span>
                <span className="label-cap">all-time</span>
              </div>
            </div>
            <div className="seg">
              <span>1W</span><span className="on">1M</span><span>3M</span><span>1Y</span><span>ALL</span>
            </div>
          </div>
          <div className="ink-border grow" style={{ padding: 12 }}>
            <SketchyChart height={280} baseline={0.55} />
          </div>
        </section>

        {/* right rail — KPI stack */}
        <aside className="col gap-3">
          <div className="row gap-3">
            <div className="kpi ink-border grow"><div className="label-cap">Invested</div><div className="num">€ 0</div></div>
            <div className="kpi ink-border grow accent"><div className="label-cap">Gain</div><div className="num">+€ 2.2k</div><div className="pill">0.00 %</div></div>
          </div>
          <div className="ink-border col" style={{ padding: 14, flex: 1 }}>
            <div className="row between center" style={{ marginBottom: 8 }}>
              <div className="scribble" style={{ fontSize: 20 }}>Allocation</div>
              <div className="label-cap">by class</div>
            </div>
            <div className="row center gap-3 grow">
              <div className="donut"></div>
              <div className="col gap-2" style={{ fontSize: 13 }}>
                <div className="row center gap-2"><span className="lg-dot" style={{ background: 'var(--accent)' }}></span> ETFs · 38%</div>
                <div className="row center gap-2"><span className="lg-dot" style={{ background: '#cfcfc4' }}></span> Stocks · 24%</div>
                <div className="row center gap-2"><span className="lg-dot" style={{ background: '#8a8a85' }}></span> Bonds · 18%</div>
                <div className="row center gap-2"><span className="lg-dot" style={{ background: '#1a1a1a' }}></span> Cash · 20%</div>
              </div>
            </div>
          </div>
        </aside>

        {/* bottom row — top movers + accounts (spans both cols) */}
        <section className="ink-border" style={{ gridColumn: '1 / span 2', padding: 14 }}>
          <div className="row between center" style={{ marginBottom: 8 }}>
            <div className="scribble" style={{ fontSize: 22 }}>Top movers · today</div>
            <div className="label-cap">see all →</div>
          </div>
          <div className="row gap-3">
            {[
              { t: 'CSPX', n: 'iShares S&P 500', v: '+1.8%', good: true },
              { t: 'VWCE', n: 'Vanguard FTSE All-World', v: '+0.9%', good: true },
              { t: 'AAPL', n: 'Apple Inc.', v: '−0.4%', good: false },
              { t: 'GLD', n: 'Gold ETF', v: '+0.2%', good: true },
              { t: 'TSLA', n: 'Tesla', v: '−2.1%', good: false },
            ].map((m, i) => (
              <div key={i} className="dashed col grow" style={{ padding: 10 }}>
                <div className="num-mono" style={{ fontWeight: 700 }}>{m.t}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.n}</div>
                <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 22, color: m.good ? 'var(--accent)' : 'var(--danger)' }}>{m.v}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="sticky" style={{ position: 'absolute', right: 30, top: 90, width: 180 }}>
        Top nav frees vertical space — more room for content.
      </div>
    </div>
  );
}

/* =====================================================
   OPTION D — "Data dense" — table-forward, smaller chart
   ===================================================== */
function OptionD() {
  return (
    <div className="wf row" style={{ height: '100%' }}>
      <Sidebar width={56} />
      <div className="col grow">
        {/* compact header */}
        <header className="row center between" style={{ padding: '10px 20px', borderBottom: '1.5px solid var(--line)' }}>
          <div className="row center gap-3">
            <div style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 22 }}>Dashboard</div>
            <Squiggle width={50} />
            <span className="label-cap">Trade · IBKR ▾</span>
          </div>
          <div className="row center gap-3">
            <div className="seg"><span>1D</span><span>1W</span><span className="on">1M</span><span>3M</span><span>1Y</span><span>ALL</span></div>
            <div className="chip"><span>EUR ▾</span></div>
            <div className="nav-dot circle"></div>
          </div>
        </header>

        <main className="col gap-3" style={{ padding: 18, flex: 1 }}>
          {/* top strip: 5 inline KPIs + mini chart */}
          <div className="row gap-2">
            {[
              { l: 'Net worth', v: '€ 2,243.65' },
              { l: 'Invested', v: '€ 0.00' },
              { l: 'Gain', v: '+€ 2,243', accent: true },
              { l: 'Day P/L', v: '−€ 18.40', neg: true },
              { l: 'Dividends YTD', v: '€ 142.80' },
              { l: 'Cash', v: '€ 482.20' },
            ].map((k, i) => (
              <div key={i} className="ink-border col grow" style={{ padding: '8px 12px' }}>
                <div className="label-cap">{k.l}</div>
                <div className="num-mono" style={{ fontSize: 18, fontWeight: 700, color: k.accent ? 'var(--accent)' : k.neg ? 'var(--danger)' : 'inherit' }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* split: chart (smaller) + allocation */}
          <div className="row gap-3" style={{ height: 180 }}>
            <section className="ink-border col grow" style={{ padding: 12 }}>
              <div className="row between center">
                <div className="scribble" style={{ fontSize: 18 }}>Performance · 1M</div>
                <div className="num-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>portfolio vs invested</div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}><SketchyChart height={140} /></div>
            </section>
            <section className="ink-border row center gap-3" style={{ padding: 12, width: 340 }}>
              <div className="donut" style={{ width: 110, height: 110 }}></div>
              <div className="col gap-2 grow" style={{ fontSize: 12 }}>
                <div className="scribble" style={{ fontSize: 18, marginBottom: 4 }}>Allocation</div>
                <div className="row between"><span><span className="lg-dot" style={{ background: 'var(--accent)' }}></span> ETFs</span><span className="num-mono">38%</span></div>
                <div className="row between"><span><span className="lg-dot" style={{ background: '#cfcfc4' }}></span> Stocks</span><span className="num-mono">24%</span></div>
                <div className="row between"><span><span className="lg-dot" style={{ background: '#8a8a85' }}></span> Bonds</span><span className="num-mono">18%</span></div>
                <div className="row between"><span><span className="lg-dot" style={{ background: '#1a1a1a' }}></span> Cash</span><span className="num-mono">20%</span></div>
              </div>
            </section>
          </div>

          {/* holdings table — the meat */}
          <section className="ink-border col grow" style={{ padding: 12 }}>
            <div className="row between center" style={{ marginBottom: 4 }}>
              <div className="scribble" style={{ fontSize: 20 }}>Holdings</div>
              <div className="row center gap-3">
                <span className="label-cap">12 positions</span>
                <div className="chip"><span>filter ▾</span></div>
                <div className="chip"><span>+ add</span></div>
              </div>
            </div>
            <table className="wf-tbl">
              <thead><tr>
                <th>Ticker</th><th>Name</th><th>Qty</th><th>Avg cost</th><th>Price</th><th>Value</th><th>P/L</th><th>%</th><th></th>
              </tr></thead>
              <tbody>
                {[
                  ['CSPX', 'iShares S&P 500', '6', '480.20', '512.40', '3,074', '+193', '+6.7%', true],
                  ['VWCE', 'Vanguard FTSE All-World', '12', '108.60', '112.80', '1,353', '+50', '+3.9%', true],
                  ['AAPL', 'Apple Inc.', '4', '180.00', '178.40', '714', '−6', '−0.9%', false],
                  ['GLD',  'SPDR Gold Shares', '3', '195.00', '198.20', '595', '+10', '+1.6%', true],
                  ['TSLA', 'Tesla Inc.', '2', '240.00', '218.30', '437', '−43', '−9.0%', false],
                  ['BND',  'Vanguard Total Bond', '8', '72.10', '71.40', '571', '−6', '−1.0%', false],
                ].map((r, i) => (
                  <tr key={i}>
                    <td><span className="num-mono" style={{ fontWeight: 700 }}>{r[0]}</span></td>
                    <td>{r[1]}</td>
                    <td className="num-mono">{r[2]}</td>
                    <td className="num-mono">{r[3]}</td>
                    <td className="num-mono">{r[4]}</td>
                    <td className="num-mono">{r[5]}</td>
                    <td className="num-mono" style={{ color: r[8] ? 'var(--accent)' : 'var(--danger)' }}>{r[6]}</td>
                    <td className="num-mono" style={{ color: r[8] ? 'var(--accent)' : 'var(--danger)' }}>{r[7]}</td>
                    <td style={{ color: 'var(--muted)' }}>···</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>

      <ArrowAnno x={250} y={290} w={140} text="Holdings on the dashboard, not a click away" />
    </div>
  );
}

/* ---------- canvas ---------- */

function App() {
  return (
    <DesignCanvas title="FINTrack — Dashboard Wireframes" subtitle="Four sketchy directions exploring the same data">
      <DCSection id="dashboards" title="Dashboard Layouts" subtitle="b&w · low-fi · pick a direction">
        <DCArtboard id="a" label="A · Faithful — closest to source" width={1280} height={780}>
          <OptionA />
        </DCArtboard>
        <DCArtboard id="b" label="B · Hero metric — big number, big chart" width={1280} height={780}>
          <OptionB />
        </DCArtboard>
        <DCArtboard id="c" label="C · Editorial — top nav, asymmetric grid" width={1280} height={780}>
          <OptionC />
        </DCArtboard>
        <DCArtboard id="d" label="D · Data-dense — table forward" width={1280} height={780}>
          <OptionD />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
