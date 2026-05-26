/* global React */
// Settings modal — Personal / Tax Rate / Account.
// Persists settings to localStorage so every page sees the same config.
//
// Usage in any page:
//   const [settingsOpen, setSettingsOpen] = useState(false);
//   const [settings, setSettings] = useFinSettings();
//   …
//   <button onClick={() => setSettingsOpen(true)}>Settings</button>
//   <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

(function () {
  const { useState, useEffect, useRef, useMemo } = React;

  /* ── defaults & storage ─────────────────────────── */
  const STORAGE_KEY = 'fintrack.settings';
  const DEFAULTS = {
    personal: {
      name: 'Pedro',
      email: 'pedro@example.com',
      currency: 'EUR',
      timezone: 'Europe/Lisbon',
    },
    tax: {
      dividendRate: 28,
      method: 'tiered',           // 'fixed' | 'tiered'
      fixedRate: 28,
      tiers: [
        { from: 0, to: 2,    rate: 28.0 },
        { from: 2, to: 5,    rate: 25.2 },
        { from: 5, to: 8,    rate: 22.4 },
        { from: 8, to: null, rate: 19.6 },
      ],
    },
    account: {
      twoFactor: false,
      brokerSync: true,
    },
  };

  function readStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULTS;
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) { return DEFAULTS; }
  }

  function useFinSettings() {
    const [val, setVal] = useState(readStored);
    useEffect(() => {
      // listen for cross-tab updates
      const onStorage = (e) => {
        if (e.key === STORAGE_KEY) setVal(readStored());
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }, []);
    function persist(next) {
      setVal(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
    }
    return [val, persist];
  }

  /* ── icons ──────────────────────────────────────── */
  const I = {
    close: (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>),
    info:  (<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4v.01"/></svg>),
    plus:  (<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>),
    trash: (<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 3.5h9M5 3.5v-1.5h4v1.5M3.5 3.5l.5 9h6l.5-9"/></svg>),
  };

  /* ── Personal panel ─────────────────────────────── */
  function PersonalPanel({ value, onChange }) {
    function set(key, v) { onChange({ ...value, [key]: v }); }
    return (
      <div className="set-section">
        <div className="set-section__head">
          <h3 className="set-section__title">Personal</h3>
          <p className="set-section__desc">How you appear inside FINTrack.</p>
        </div>
        <div className="field">
          <label className="field__label">Display name</label>
          <input className="input" value={value.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Email</label>
          <input className="input" type="email" value={value.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Display currency</label>
          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            {['EUR', 'USD', 'GBP'].map((c) => (
              <button key={c} className={`seg__btn ${value.currency === c ? 'seg__btn--on' : ''}`} onClick={() => set('currency', c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field__label">Timezone</label>
          <input className="input" value={value.timezone} onChange={(e) => set('timezone', e.target.value)} />
        </div>
      </div>
    );
  }

  /* ── Tax Rate panel ─────────────────────────────── */
  function TaxPanel({ value, onChange }) {
    function set(key, v) { onChange({ ...value, [key]: v }); }

    function updateTier(i, patch) {
      const next = value.tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t);
      set('tiers', next);
    }

    function addTier() {
      const tiers = value.tiers;
      const last = tiers[tiers.length - 1];
      // close the previous open-ended tier at `from + 1`, push new open-ended after it
      const closedFrom = (last.from ?? 0);
      const closedTo = closedFrom + 1;
      const newOpenFrom = closedTo;
      const updatedLast = { ...last, to: closedTo };
      const newOpen = { from: newOpenFrom, to: null, rate: Math.max(0, (last.rate || 0) - 2) };
      set('tiers', [...tiers.slice(0, -1), updatedLast, newOpen]);
    }

    function removeTier(i) {
      const next = value.tiers.slice();
      next.splice(i, 1);
      // ensure the new last tier is open-ended
      if (next.length > 0) {
        next[next.length - 1] = { ...next[next.length - 1], to: null };
      }
      set('tiers', next);
    }

    return (
      <div className="set-section">
        <div className="set-section__head">
          <h3 className="set-section__title">
            Tax Rules
            <span className="info-icon" title="Rules used by Tax Calculator">{I.info}</span>
          </h3>
          <p className="set-section__desc">Configure dividend and capital gains tax rules.</p>
        </div>

        <div className="field">
          <label className="field__label">Dividend Tax Rate (%)</label>
          <input
            className="input"
            type="number"
            step="0.1"
            value={value.dividendRate}
            onChange={(e) => set('dividendRate', Number(e.target.value))}
          />
        </div>

        <div className="tier-block">
          <div className="tier-block__head">
            <div className="tier-block__title">Capital Gains Method</div>
            <button className="btn btn--ghost btn--sm" onClick={addTier} disabled={value.method !== 'tiered'} style={{ opacity: value.method !== 'tiered' ? 0.5 : 1 }}>
              {I.plus}<span style={{ marginLeft: 6 }}>Add Tier</span>
            </button>
          </div>

          <div className="radio-row">
            <div
              className={`radio ${value.method === 'fixed' ? 'radio--on' : ''}`}
              onClick={() => set('method', 'fixed')}
            >
              <span className="radio__circle"></span>Fixed rate
            </div>
            <div
              className={`radio ${value.method === 'tiered' ? 'radio--on' : ''}`}
              onClick={() => set('method', 'tiered')}
            >
              <span className="radio__circle"></span>Tiered by holding period
            </div>
          </div>

          {value.method === 'fixed' && (
            <div className="field">
              <label className="field__label">Capital Gains Rate (%)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={value.fixedRate}
                onChange={(e) => set('fixedRate', Number(e.target.value))}
              />
            </div>
          )}

          {value.method === 'tiered' && (
            <>
              <div className="tier-grid">
                <div className="tier-grid__head">
                  <span>From (years)</span>
                  <span>To (years)</span>
                  <span>Rate (%)</span>
                  <span></span>
                </div>
                {value.tiers.map((t, i) => {
                  const isLast = i === value.tiers.length - 1;
                  const isFirst = i === 0;
                  return (
                    <React.Fragment key={i}>
                      <input
                        className="input"
                        type="number"
                        value={t.from ?? ''}
                        placeholder="0"
                        disabled={isFirst}
                        onChange={(e) => updateTier(i, { from: Number(e.target.value) })}
                      />
                      <input
                        className="input"
                        type="text"
                        value={isLast ? `≥ ${t.from}` : (t.to ?? '')}
                        disabled={isLast}
                        onChange={(e) => updateTier(i, { to: Number(e.target.value) })}
                      />
                      <input
                        className="input"
                        type="number"
                        step="0.1"
                        value={t.rate}
                        onChange={(e) => updateTier(i, { rate: Number(e.target.value) })}
                      />
                      {(isFirst || isLast) ? (
                        <span></span>
                      ) : (
                        <button
                          className="btn btn--icon"
                          onClick={() => removeTier(i)}
                          title="Remove tier"
                        >{I.trash}</button>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="tier-foot">Tiers must be consecutive; the last one is open-ended (≥).</div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Account panel ──────────────────────────────── */
  function AccountPanel({ value, onChange }) {
    function set(key, v) { onChange({ ...value, [key]: v }); }
    return (
      <div className="set-section">
        <div className="set-section__head">
          <h3 className="set-section__title">Account</h3>
          <p className="set-section__desc">Security & connections.</p>
        </div>
        <div className="field">
          <label className="field__label">Two-factor authentication</label>
          <div className="radio-row">
            <div className={`radio ${value.twoFactor ? 'radio--on' : ''}`} onClick={() => set('twoFactor', true)}>
              <span className="radio__circle"></span>Enabled
            </div>
            <div className={`radio ${!value.twoFactor ? 'radio--on' : ''}`} onClick={() => set('twoFactor', false)}>
              <span className="radio__circle"></span>Disabled
            </div>
          </div>
        </div>
        <div className="field">
          <label className="field__label">Broker sync</label>
          <div className="radio-row">
            <div className={`radio ${value.brokerSync ? 'radio--on' : ''}`} onClick={() => set('brokerSync', true)}>
              <span className="radio__circle"></span>Auto · every 5 min
            </div>
            <div className={`radio ${!value.brokerSync ? 'radio--on' : ''}`} onClick={() => set('brokerSync', false)}>
              <span className="radio__circle"></span>Manual only
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Modal ──────────────────────────────────────── */
  function SettingsModal({ open, onClose, initialTab }) {
    const [settings, persist] = useFinSettings();
    const [draft, setDraft] = useState(settings);
    const [tab, setTab] = useState(initialTab || 'tax');

    // re-seed draft on each open
    useEffect(() => {
      if (open) { setDraft(settings); setTab(initialTab || 'tax'); }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
      function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
      if (open) window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    function setSection(key, v) { setDraft({ ...draft, [key]: v }); }
    function save() { persist(draft); onClose && onClose(); }

    return (
      <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-label="User Settings">
          <div className="modal__head">
            <h2 className="modal__title">User Settings</h2>
            <button className="modal__close" onClick={onClose} aria-label="Close">{I.close}</button>
          </div>

          <div className="modal__tabs">
            <button className={`modal__tab ${tab === 'personal' ? 'modal__tab--on' : ''}`} onClick={() => setTab('personal')}>Personal</button>
            <button className={`modal__tab ${tab === 'tax' ? 'modal__tab--on' : ''}`} onClick={() => setTab('tax')}>Tax Rate</button>
            <button className={`modal__tab ${tab === 'account' ? 'modal__tab--on' : ''}`} onClick={() => setTab('account')}>Account</button>
          </div>

          <div className="modal__body">
            {tab === 'personal' && <PersonalPanel value={draft.personal} onChange={(v) => setSection('personal', v)} />}
            {tab === 'tax'      && <TaxPanel      value={draft.tax}      onChange={(v) => setSection('tax', v)} />}
            {tab === 'account'  && <AccountPanel  value={draft.account}  onChange={(v) => setSection('account', v)} />}
          </div>

          <div className="modal__foot">
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary" onClick={save}>Save Settings</button>
          </div>
        </div>
      </div>
    );
  }

  // export
  Object.assign(window, { SettingsModal, useFinSettings });
})();
