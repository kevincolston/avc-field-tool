import { INDUSTRIES, SOLUTIONS, DEFAULT_MODEL, THEMES, LIB, fC, fN, fP, tyCalc, addTotals, generateNarrative } from './data.js';

    const { useState, useEffect, useCallback, useMemo, useRef } = React;

    const EMPTY_TOTALS = { y1l:0, y1h:0, y2l:0, y2h:0, y3l:0, y3h:0, tl:0, th:0 };
    const LS_KEY = 'avc_state_v3';

    // Non-AI solutions for display
    const NON_AI_SOLUTIONS = SOLUTIONS.filter(s => !s.ai && s.id !== 'pro_services');

    function fAbbrev(n) {
      if (!n || isNaN(n)) return '$0';
      if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
      if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
      if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
      return fC(n);
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Guard: discard saved industry if it no longer exists in INDUSTRIES
          const validIds = INDUSTRIES.map(i => i.id);
          if (parsed.industry && !validIds.includes(parsed.industry)) {
            parsed.industry = 'retail';
          }
          return parsed;
        }
      } catch(e) {}
      return null;
    }

    function saveState(s) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch(e) {}
    }

    function catClass(cat) {
      if (!cat) return '';
      return cat.toLowerCase().replace(/[^a-z]/g, '-').replace(/--+/g, '-');
    }

    // -------------------------------------------------------------------------
    // FieldCard — new card-style field input
    // -------------------------------------------------------------------------
    function FieldCard({ field, value, onChange, locked, customerMode }) {
      const isLocked = locked && customerMode;
      const isPct = field.u === '%';
      const isCurrency = field.u === '$';
      const isAssumption = field.s === 'assumption';

      const displayVal = isPct
        ? parseFloat(((value ?? field.d) * 100).toFixed(4)).toString()
        : (value ?? field.d);

      function handleChange(e) {
        let v = parseFloat(e.target.value);
        if (isNaN(v)) v = 0;
        if (isPct) v = v / 100;
        onChange(v);
      }

      const unitSuffix = isPct ? '%' : (field.u !== '$' && field.u !== 'n' && field.u !== 'cust' ? field.u : '');

      return (
        <div className="field-card">
          <div className="field-card-top">
            <span className="field-card-label">{field.l}</span>
            <div className="field-card-badges">
              <span className="badge-lock">🔒</span>
              <span className={isAssumption ? 'badge-assum' : 'badge-input'}>
                {isAssumption ? 'ASSUM.' : 'INPUT'}
              </span>
            </div>
          </div>
          {isLocked ? (
            <div className="field-card-static">
              {isPct ? fP(value ?? field.d) : isCurrency ? fC(value ?? field.d) : fN(value ?? field.d)}
              {unitSuffix && !isPct ? <span className="field-card-suffix"> {unitSuffix}</span> : null}
            </div>
          ) : (
            <div className="field-card-input-wrap">
              {isCurrency && <span className="field-card-prefix">$</span>}
              <input
                type="number"
                className="field-card-input"
                value={displayVal}
                onChange={handleChange}
                step={isPct ? '0.1' : isCurrency ? '1000' : '1'}
              />
              {unitSuffix && <span className="field-card-suffix">{unitSuffix}</span>}
            </div>
          )}
          {field.n && (
            <div className="field-card-note">{field.n}</div>
          )}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // UseCaseCard
    // -------------------------------------------------------------------------
    function UseCaseCard({ uc, onChange, enabled, onToggle, aiEnabled, onAiToggle, model, customerMode, lockedFields, activeLens, company, inputs, globalAiEnabled, activeSols, onSolToggle }) {
      const [expanded, setExpanded] = useState(false);

      const solMap = useMemo(() => {
        const m = {};
        SOLUTIONS.forEach(s => { m[s.id] = s; });
        return m;
      }, []);

      function getVal(k) {
        const key = `${uc.id}_${k}`;
        return inputs[key] !== undefined ? inputs[key] : undefined;
      }

      function getAllInputs() {
        const result = {};
        (uc.steps || []).forEach(step => {
          (step.fields || []).forEach(f => {
            result[f.k] = getVal(f.k) ?? f.d;
          });
        });
        if (uc.ai) {
          (uc.ai.fields || []).forEach(f => {
            result[f.k] = getVal(f.k) ?? f.d;
          });
        }
        return result;
      }

      const allInputs = getAllInputs();

      function computeSteps() {
        let prev = null;
        return (uc.steps || []).map(step => {
          let val = 0;
          try { val = step.fn(allInputs, prev); } catch(e) { val = 0; }
          if (!isFinite(val)) val = 0;
          prev = val;
          return { step, val, isFinal: step.fin === true };
        });
      }

      const steps = computeSteps();
      const finalStep = steps.find(s => s.isFinal);
      const baseAnnual = finalStep ? finalStep.val : 0;
      const npv = tyCalc(baseAnnual, model);

      let aiValue = 0;
      if (uc.ai && aiEnabled) {
        try {
          aiValue = uc.ai.fn(allInputs, baseAnnual);
          if (!isFinite(aiValue)) aiValue = 0;
        } catch(e) { aiValue = 0; }
      }
      const aiNpv = aiEnabled ? tyCalc(aiValue, model) : null;

      const lensVal = useMemo(() => {
        if (activeLens === 'outcomes') {
          if (uc.ops) { try { return fN(uc.ops.fn(allInputs)) + ' ' + (uc.ops.unit || ''); } catch(e) { return '—'; } }
          return '—';
        }
        if (activeLens === 'kpi') {
          if (uc.kpi) { try { return fP(uc.kpi.fn(allInputs)); } catch(e) { return '—'; } }
          return '—';
        }
        return null;
      }, [activeLens, allInputs]);

      function handleHeaderClick(e) {
        // clicks on checkbox are handled separately
        if (e.target.type === 'checkbox') return;
        if (enabled) setExpanded(prev => !prev);
      }

      function handleCheckboxChange(e) {
        e.stopPropagation();
        onToggle(uc.id);
        if (!enabled) setExpanded(true);
      }

      function toggleLocalSol(sid) {
        onSolToggle(uc.id, sid);
      }

      return (
        <div className={`uc-card ${!enabled ? 'disabled' : ''}`}>
          <div className="uc-header" onClick={handleHeaderClick}>
            <input
              type="checkbox"
              className="uc-toggle"
              checked={!!enabled}
              onChange={handleCheckboxChange}
              onClick={e => e.stopPropagation()}
            />
            <span className="uc-name">{uc.name}</span>
            {uc.cat && (
              <span className={`uc-cat ${catClass(uc.cat)}`}>{uc.cat}</span>
            )}
            {activeSols.slice(0, 3).map(sid => {
              const s = solMap[sid];
              if (!s) return null;
              return (
                <span key={sid} className="sol-chip" style={{background: s.color + '33', color: s.color, border: `1px solid ${s.color}55`}}>
                  {s.label.replace('Amplitude ', '').replace(' (AI)', '')}
                </span>
              );
            })}
            <div className="uc-header-right">
              {enabled && activeLens !== 'financial' && lensVal && (
                <div style={{fontSize:14,fontFamily:'var(--mono)',color:'var(--a2)',fontWeight:600}}>{lensVal}</div>
              )}
              {enabled && activeLens === 'financial' && (
                <div className="uc-annual-val">{fAbbrev(baseAnnual)}</div>
              )}
              {enabled && uc.ai && !aiEnabled && (
                <div className="uc-ai-available">+AI available</div>
              )}
              {enabled && uc.ai && aiEnabled && (
                <div className="uc-ai-available">+{fAbbrev(aiValue)} AI</div>
              )}
              {enabled && (
                <div className="uc-3yr-range">3yr: {fAbbrev(npv.tl)} – {fAbbrev(npv.th)}</div>
              )}
            </div>
            {enabled && (
              <span className="uc-chevron">{expanded ? '▲' : '▼'}</span>
            )}
          </div>

          {enabled && expanded && (
            <div className="uc-body">
              {/* Platform solutions row */}
              <div className="platform-sol-row">
                <div className="platform-sol-label">PLATFORM SOLUTIONS (click to add/remove)</div>
                <div className="platform-sol-pills">
                  {NON_AI_SOLUTIONS.map(s => {
                    const isActive = activeSols.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        className="platform-sol-pill"
                        style={isActive
                          ? { background: s.color + '33', color: s.color, border: `1px solid ${s.color}66` }
                          : { background: 'transparent', color: 'var(--t2)', border: '1px solid var(--bd)' }
                        }
                        onClick={() => toggleLocalSol(s.id)}
                      >
                        {s.label.replace('Amplitude ', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Steps */}
              {steps.map((s, i) => (
                <div key={s.step.id} className="step-section">
                  <div className="step-label-row">Step {i + 1}: {s.step.label}</div>
                  {(s.step.fields || []).length > 0 && (
                    <div className="fields-grid">
                      {(s.step.fields || []).map(f => (
                        <FieldCard
                          key={f.k}
                          field={f}
                          value={getVal(f.k)}
                          onChange={v => onChange(uc.id, f.k, v)}
                          locked={lockedFields.has(`${uc.id}_${f.k}`)}
                          customerMode={customerMode}
                        />
                      ))}
                    </div>
                  )}
                  {s.step.ft && (
                    <div className="step-formula">{s.step.ft}</div>
                  )}
                  <div className="step-result-row">
                    <span className="step-result-label">{s.step.rl}</span>
                    <span className={`step-result-val ${s.isFinal ? 'final' : ''}`}>
                      {s.step.ru === '$' ? fC(s.val) : s.step.ru === '%' ? fP(s.val) : fN(s.val)}
                    </span>
                  </div>
                </div>
              ))}

              {/* AI layer */}
              {uc.ai && (
                <div className="ai-section-block" style={{marginTop: 12}}>
                  <div className="ai-section-header" onClick={() => onAiToggle(uc.id)}>
                    <input
                      type="checkbox"
                      checked={!!aiEnabled}
                      onChange={() => {}}
                      style={{accentColor:'var(--ac)',cursor:'pointer'}}
                      onClick={e => { e.stopPropagation(); onAiToggle(uc.id); }}
                    />
                    <span className="ai-badge">AI</span>
                    <span className="ai-section-title">{uc.ai.label}</span>
                    {!aiEnabled && <span className="ai-section-hint">(Toggle AI to include)</span>}
                  </div>
                  {aiEnabled && (
                    <div style={{marginTop:10}}>
                      {(uc.ai.fields || []).length > 0 && (
                        <div className="fields-grid">
                          {(uc.ai.fields || []).map(f => (
                            <FieldCard
                              key={f.k}
                              field={f}
                              value={getVal(f.k)}
                              onChange={v => onChange(uc.id, f.k, v)}
                              locked={lockedFields.has(`${uc.id}_${f.k}`)}
                              customerMode={customerMode}
                            />
                          ))}
                        </div>
                      )}
                      {uc.ai.ft && <div className="step-formula">{uc.ai.ft}</div>}
                      <div className="ai-result-line">
                        AI adds: {fC(aiNpv.tl)} – {fC(aiNpv.th)} over 3 years
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add value lever button */}
              <button className="add-lever-btn" onClick={e => e.preventDefault()}>
                + Add Value Lever to This Use Case
              </button>

              {/* 3-year projection */}
              <div className="projection-section">
                <div className="projection-label">3-YEAR PROJECTION</div>
                <div className="projection-grid">
                  <div className="proj-card">
                    <div className="proj-card-label">Yr1 (50%)</div>
                    <div className="proj-card-val">{fAbbrev(npv.y1l)} – {fAbbrev(npv.y1h)}</div>
                  </div>
                  <div className="proj-card">
                    <div className="proj-card-label">Yr2 (80%)</div>
                    <div className="proj-card-val">{fAbbrev(npv.y2l)} – {fAbbrev(npv.y2h)}</div>
                  </div>
                  <div className="proj-card">
                    <div className="proj-card-label">Yr3 (100%)</div>
                    <div className="proj-card-val">{fAbbrev(npv.y3l)} – {fAbbrev(npv.y3h)}</div>
                  </div>
                  <div className="proj-card total">
                    <div className="proj-card-label">3-Yr Total</div>
                    <div className="proj-card-val">{fAbbrev(npv.tl)} – {fAbbrev(npv.th)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // Tab: Calculator
    // -------------------------------------------------------------------------
    function TabCalculator({ industry, model, inputs, setInputs, enabled, setEnabled, aiEnabled, setAiEnabled, customerMode, lockedFields, activeLens, company, globalAiEnabled, ucSolutions, handleSolToggle }) {
      const ucs = LIB[industry] || [];

      function toggleEnabled(ucId) {
        setEnabled(prev => ({ ...prev, [ucId]: !prev[ucId] }));
      }

      function toggleAiEnabled(ucId) {
        setAiEnabled(prev => ({ ...prev, [ucId]: !prev[ucId] }));
      }

      function handleFieldChange(ucId, key, val) {
        setInputs(prev => ({ ...prev, [`${ucId}_${key}`]: val }));
      }

      // Compute summary banner totals
      const bannerTotals = useMemo(() => {
        let totalAnnual = 0;
        let totalAiAnnual = 0;
        let combinedNpv = { ...EMPTY_TOTALS };

        ucs.filter(uc => enabled[uc.id]).forEach(uc => {
          const allInputs = {};
          (uc.steps || []).forEach(step => {
            (step.fields || []).forEach(f => {
              const key = `${uc.id}_${f.k}`;
              allInputs[f.k] = inputs[key] !== undefined ? inputs[key] : f.d;
            });
          });
          if (uc.ai) {
            (uc.ai.fields || []).forEach(f => {
              const key = `${uc.id}_${f.k}`;
              allInputs[f.k] = inputs[key] !== undefined ? inputs[key] : f.d;
            });
          }
          let prev = null;
          let annual = 0;
          (uc.steps || []).forEach(step => {
            let val = 0;
            try { val = step.fn(allInputs, prev); } catch(e) {}
            if (!isFinite(val)) val = 0;
            prev = val;
            if (step.fin) annual = val;
          });
          totalAnnual += annual;

          let aiAnnual = 0;
          if (aiEnabled[uc.id] && uc.ai) {
            try { aiAnnual = uc.ai.fn(allInputs, annual); } catch(e) {}
            if (!isFinite(aiAnnual)) aiAnnual = 0;
          }
          totalAiAnnual += aiAnnual;

          const npv = tyCalc(annual, model);
          const aiNpv = aiAnnual > 0 ? tyCalc(aiAnnual, model) : EMPTY_TOTALS;
          combinedNpv = addTotals(addTotals(combinedNpv, npv), aiNpv);
        });

        return { totalAnnual, totalAiAnnual, combinedNpv };
      }, [ucs, enabled, inputs, model, aiEnabled]);

      const anyAiEnabled = Object.values(aiEnabled).some(Boolean);

      return (
        <div>
          {/* Summary banner */}
          <div className="summary-banner">
            <div className="banner-half">
              <div className="banner-stat-label">TOTAL VALUE OPPORTUNITY ⓘ</div>
              <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                <span className="banner-big-val">{fAbbrev(bannerTotals.totalAnnual)}</span>
                {anyAiEnabled && bannerTotals.totalAiAnnual > 0 && (
                  <span className="banner-ai-add">+{fAbbrev(bannerTotals.totalAiAnnual)} AI</span>
                )}
              </div>
              <div className="banner-sub">Full annual potential – not risk-adjusted</div>
            </div>
            <div className="banner-half right">
              <div className="banner-stat-label">3-YEAR RISK-ADJUSTED PROJECTION ⓘ</div>
              <div className="banner-range-val">
                {fAbbrev(bannerTotals.combinedNpv.tl)} – {fAbbrev(bannerTotals.combinedNpv.th)}
              </div>
              <div className="banner-sub">Discounted, risk-adjusted, phased</div>
              {anyAiEnabled && (
                <div className="banner-ai-range">
                  + AI: {fAbbrev(bannerTotals.combinedNpv.tl)} – {fAbbrev(bannerTotals.combinedNpv.th)}
                </div>
              )}
            </div>
          </div>

          {/* Use cases header */}
          <div className="uc-section-header">
            <span className="uc-section-title">{company || 'Customer'} – Use Cases</span>
            <button className="btn-dashed">+ Custom Use Case</button>
          </div>

          {ucs.length === 0 && (
            <div className="empty-state">No use cases for this industry.</div>
          )}

          {ucs.map(uc => (
            <UseCaseCard
              key={uc.id}
              uc={uc}
              inputs={inputs}
              onChange={handleFieldChange}
              enabled={!!enabled[uc.id]}
              onToggle={toggleEnabled}
              aiEnabled={!!aiEnabled[uc.id]}
              onAiToggle={toggleAiEnabled}
              model={model}
              customerMode={customerMode}
              lockedFields={lockedFields}
              activeLens={activeLens}
              company={company}
              globalAiEnabled={globalAiEnabled}
              activeSols={ucSolutions[uc.id] || uc.sol || []}
              onSolToggle={handleSolToggle}
            />
          ))}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // Tab: Summary
    // -------------------------------------------------------------------------
    function TabSummary({ industry, model, inputs, enabled, aiEnabled, company }) {
      const ucs = LIB[industry] || [];
      const enabledUcs = ucs.filter(uc => enabled[uc.id]);

      function getUcInputs(uc) {
        const result = {};
        (uc.steps || []).forEach(step => {
          (step.fields || []).forEach(f => {
            const key = `${uc.id}_${f.k}`;
            result[f.k] = inputs[key] !== undefined ? inputs[key] : f.d;
          });
        });
        if (uc.ai) {
          (uc.ai.fields || []).forEach(f => {
            const key = `${uc.id}_${f.k}`;
            result[f.k] = inputs[key] !== undefined ? inputs[key] : f.d;
          });
        }
        return result;
      }

      function getBaseAnnual(uc, ucInputs) {
        let prev = null;
        let annual = 0;
        (uc.steps || []).forEach(step => {
          let val = 0;
          try { val = step.fn(ucInputs, prev); } catch(e) {}
          if (!isFinite(val)) val = 0;
          prev = val;
          if (step.fin) annual = val;
        });
        return annual;
      }

      const rows = useMemo(() => {
        return enabledUcs.map(uc => {
          const ucInputs = getUcInputs(uc);
          const annual = getBaseAnnual(uc, ucInputs);
          const npv = tyCalc(annual, model);
          let aiAnnual = 0;
          if (aiEnabled[uc.id] && uc.ai) {
            try { aiAnnual = uc.ai.fn(ucInputs, annual); } catch(e) {}
            if (!isFinite(aiAnnual)) aiAnnual = 0;
          }
          const aiNpv = tyCalc(aiAnnual, model);
          const combined = addTotals(npv, aiAnnual > 0 ? aiNpv : EMPTY_TOTALS);
          return { uc, ucInputs, annual, npv: combined };
        });
      }, [enabledUcs, inputs, model, aiEnabled]);

      const totals = useMemo(() => rows.reduce((acc, r) => addTotals(acc, r.npv), EMPTY_TOTALS), [rows]);
      const maxTh = useMemo(() => Math.max(...rows.map(r => r.npv.th), 1), [rows]);

      if (enabledUcs.length === 0) {
        return <div className="empty-state">Enable use cases in the Calculator tab to see summary.</div>;
      }

      return (
        <div>
          <div className="card">
            <div className="section-header">3-Year Value Summary</div>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Use Case</th>
                  <th className="right">Y1 Low–High</th>
                  <th className="right">Y2 Low–High</th>
                  <th className="right">Y3 Low–High</th>
                  <th className="right">3-Yr Total Low–High</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.uc.id}>
                    <td className="name">{r.uc.name}</td>
                    <td className="right">{fC(r.npv.y1l)}–{fC(r.npv.y1h)}</td>
                    <td className="right">{fC(r.npv.y2l)}–{fC(r.npv.y2h)}</td>
                    <td className="right">{fC(r.npv.y3l)}–{fC(r.npv.y3h)}</td>
                    <td className="right">{fC(r.npv.tl)}–{fC(r.npv.th)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td className="name">Total</td>
                  <td className="right">{fC(totals.y1l)}–{fC(totals.y1h)}</td>
                  <td className="right">{fC(totals.y2l)}–{fC(totals.y2h)}</td>
                  <td className="right">{fC(totals.y3l)}–{fC(totals.y3h)}</td>
                  <td className="right">{fC(totals.tl)}–{fC(totals.th)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="section-header">Value by Use Case (3-Yr High)</div>
            <div className="bar-chart">
              {rows.map(r => (
                <div key={r.uc.id} className="bar-row">
                  <span className="bar-name" title={r.uc.name}>{r.uc.name}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{width: `${Math.max(2, (r.npv.th / maxTh) * 100)}%`}} />
                  </div>
                  <span className="bar-val">{fC(r.npv.tl)}–{fC(r.npv.th)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-header">If/Then Narratives</div>
            {rows.map(r => {
              const narrative = generateNarrative(r.uc, r.ucInputs, r.annual, company);
              if (!narrative) return null;
              return (
                <div key={r.uc.id} className="narrative-card">
                  <div className="narrative-uc-name">{r.uc.name}</div>
                  <div className="narrative-text">{narrative}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // Tab: ROI / TCO
    // -------------------------------------------------------------------------
    function TabROI({ industry, model, inputs, enabled, aiEnabled, investment, setInvestment }) {
      const ucs = LIB[industry] || [];
      const enabledUcs = ucs.filter(uc => enabled[uc.id]);

      function getUcInputs(uc) {
        const result = {};
        (uc.steps || []).forEach(step => {
          (step.fields || []).forEach(f => {
            const key = `${uc.id}_${f.k}`;
            result[f.k] = inputs[key] !== undefined ? inputs[key] : f.d;
          });
        });
        if (uc.ai) {
          (uc.ai.fields || []).forEach(f => {
            const key = `${uc.id}_${f.k}`;
            result[f.k] = inputs[key] !== undefined ? inputs[key] : f.d;
          });
        }
        return result;
      }

      const totals = useMemo(() => {
        return enabledUcs.reduce((acc, uc) => {
          const ucInputs = getUcInputs(uc);
          let prev = null;
          let annual = 0;
          (uc.steps || []).forEach(step => {
            let val = 0;
            try { val = step.fn(ucInputs, prev); } catch(e) {}
            if (!isFinite(val)) val = 0;
            prev = val;
            if (step.fin) annual = val;
          });
          let aiAnnual = 0;
          if (aiEnabled[uc.id] && uc.ai) {
            try { aiAnnual = uc.ai.fn(ucInputs, annual); } catch(e) {}
            if (!isFinite(aiAnnual)) aiAnnual = 0;
          }
          const npv = tyCalc(annual + aiAnnual, model);
          return addTotals(acc, npv);
        }, EMPTY_TOTALS);
      }, [enabledUcs, inputs, model, aiEnabled]);

      const totalInvestment = investment.platform + investment.impl + (investment.internal * 150);
      const roiLow = totalInvestment > 0 ? totals.tl / totalInvestment : 0;
      const roiHigh = totalInvestment > 0 ? totals.th / totalInvestment : 0;
      const netNpvLow = totals.tl - totalInvestment;
      const netNpvHigh = totals.th - totalInvestment;
      const paybackMonths = totals.y1h > 0 ? Math.round((totalInvestment / totals.y1h) * 12) : 0;
      const wfMax = Math.max(totalInvestment, totals.y1h, totals.y1h + totals.y2h, totals.th, 1);
      const wfBars = [
        { label: 'Investment', val: totalInvestment, color: 'var(--rd)' },
        { label: 'Y1 Value', val: totals.y1h, color: 'var(--ac)' },
        { label: 'Y2 Cumulative', val: totals.y1h + totals.y2h, color: 'var(--a2)' },
        { label: '3-Yr Total', val: totals.th, color: 'var(--gr)' },
      ];

      return (
        <div className="grid-2">
          <div>
            <div className="card">
              <div className="section-header">Amplitude Investment</div>
              <div className="roi-row">
                <span className="roi-field-label">Platform License</span>
                <div className="field-input-wrap">
                  <span className="field-prefix">$</span>
                  <input type="number" value={investment.platform} onChange={e => setInvestment(p => ({...p, platform: parseFloat(e.target.value)||0}))} step="10000" />
                </div>
              </div>
              <div className="roi-row">
                <span className="roi-field-label">Implementation Services</span>
                <div className="field-input-wrap">
                  <span className="field-prefix">$</span>
                  <input type="number" value={investment.impl} onChange={e => setInvestment(p => ({...p, impl: parseFloat(e.target.value)||0}))} step="5000" />
                </div>
              </div>
              <div className="roi-row">
                <span className="roi-field-label">Internal FTE Hours</span>
                <input type="number" value={investment.internal} onChange={e => setInvestment(p => ({...p, internal: parseFloat(e.target.value)||0}))} step="50" />
                <span style={{fontSize:12,color:'var(--t2)'}}>hrs × $150</span>
              </div>
              <div className="divider" />
              <div className="roi-row">
                <span className="roi-field-label fw-600">Total Investment</span>
                <span className="font-mono text-accent fw-700">{fC(totalInvestment)}</span>
              </div>
            </div>
            <div className="card">
              <div className="section-header">3-Year Value (from Calculator)</div>
              <div className="roi-row"><span className="roi-field-label">Y1 Value</span><span className="font-mono">{fC(totals.y1l)}–{fC(totals.y1h)}</span></div>
              <div className="roi-row"><span className="roi-field-label">Y2 Value</span><span className="font-mono">{fC(totals.y2l)}–{fC(totals.y2h)}</span></div>
              <div className="roi-row"><span className="roi-field-label">Y3 Value</span><span className="font-mono">{fC(totals.y3l)}–{fC(totals.y3h)}</span></div>
              <div className="divider" />
              <div className="roi-row"><span className="roi-field-label fw-600">3-Yr Total</span><span className="font-mono fw-700 text-accent">{fC(totals.tl)}–{fC(totals.th)}</span></div>
            </div>
          </div>
          <div>
            <div className="card">
              <div className="section-header">ROI Metrics</div>
              <div className="roi-metric-row"><span className="roi-metric-label">3-Year ROI Multiple</span><span className="roi-metric-value green">{roiLow.toFixed(1)}x – {roiHigh.toFixed(1)}x</span></div>
              <div className="roi-metric-row"><span className="roi-metric-label">Net NPV (3-Yr)</span><span className={`roi-metric-value ${netNpvLow >= 0 ? 'green' : ''}`}>{fC(netNpvLow)} – {fC(netNpvHigh)}</span></div>
              <div className="roi-metric-row" style={{borderBottom:'none'}}><span className="roi-metric-label">Payback Period</span><span className="roi-metric-value yellow">{paybackMonths > 0 ? `${paybackMonths} months` : '—'}</span></div>
            </div>
            <div className="card">
              <div className="section-header">Value Waterfall</div>
              <div className="waterfall">
                {wfBars.map(b => {
                  const pct = Math.max(4, (b.val / wfMax) * 140);
                  return (
                    <div key={b.label} className="wf-bar-wrap">
                      <div className="wf-value">{fC(b.val)}</div>
                      <div className="wf-bar" style={{height: pct, background: b.color}} />
                      <div className="wf-label">{b.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // Tab: Assumptions
    // -------------------------------------------------------------------------
    function TabAssumptions({ model, setModel, customerMode }) {
      const params = [
        { k: 'dr', label: 'Discount Rate', note: 'Forrester TEI 2023 standard discount rate for NPV calculations', pct: true },
        { k: 'ra', label: 'Risk Adjustment', note: 'Forrester TEI 2023: applied to create conservative (low) band', pct: true },
        { k: 'y1', label: 'Y1 Realization', note: 'Forrester TEI: 50% realization in Year 1 — ramp time, change management', pct: true },
        { k: 'y2', label: 'Y2 Realization', note: 'Forrester TEI: 80% realization in Year 2 — optimization phase', pct: true },
        { k: 'y3', label: 'Y3 Realization', note: 'Forrester TEI: 100% realization in Year 3 — full deployment', pct: true },
      ];

      return (
        <div>
          <div className="card">
            <div className="section-header">Model Parameters</div>
            <p style={{fontSize:12,color:'var(--t2)',marginBottom:16,lineHeight:1.6}}>
              These parameters affect all calculations. Defaults follow <strong style={{color:'var(--tx)'}}>Forrester TEI 2023</strong> methodology for NPV and risk adjustment.
              {customerMode && <span style={{marginLeft:8,color:'var(--yl)',fontSize:11}}>🔒 View-only in customer mode</span>}
            </p>
            {params.map(p => (
              <div key={p.k} className="assumption-row">
                <div style={{flex:1}}>
                  <div className="assumption-label-text">{p.label}</div>
                  <div className="assumption-note mt-8">{p.note}</div>
                </div>
                {customerMode ? (
                  <span style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:600,color:'var(--tx)',minWidth:60,textAlign:'right'}}>
                    {parseFloat(((model[p.k] || 0) * 100).toFixed(1))}%
                  </span>
                ) : (
                <div className="field-input-wrap">
                  <input
                    type="number"
                    value={parseFloat(((model[p.k] || 0) * 100).toFixed(1))}
                    onChange={e => {
                      const v = parseFloat(e.target.value) / 100;
                      setModel(prev => ({...prev, [p.k]: isNaN(v) ? 0 : v}));
                    }}
                    step="0.5" min="0" max="100"
                  />
                  <span className="field-suffix">%</span>
                </div>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <div className="section-header">Forrester TEI 2023 Benchmarks</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {[
                ['217%', 'ROI over 3 years'],
                ['9%', 'Acquisition improvement'],
                ['15%', 'Retention improvement'],
                ['40%', 'Monetization improvement'],
                ['50%', 'Reduction in ad-hoc data requests'],
                ['6 months', 'Average payback period'],
              ].map(([val, lbl]) => (
                <div key={lbl} style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:6,padding:'12px 16px'}}>
                  <div style={{fontSize:22,fontWeight:700,fontFamily:'var(--mono)',color:'var(--a2)'}}>{val}</div>
                  <div style={{fontSize:12,color:'var(--t2)',marginTop:4}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // Tab: Compare
    // -------------------------------------------------------------------------
    function TabCompare({ versions, setVersions }) {
      const [selectedVersions, setSelectedVersions] = useState([]);

      function deleteVersion(id) {
        setVersions(prev => prev.filter(v => v.id !== id));
        setSelectedVersions(prev => prev.filter(x => x !== id));
      }

      function toggleSelect(id) {
        setSelectedVersions(prev =>
          prev.includes(id)
            ? prev.filter(x => x !== id)
            : prev.length < 2 ? [...prev, id] : [prev[1], id]
        );
      }

      function getTotal(v) {
        const s = v.state;
        if (!s) return null;
        const industry = s.industry || 'retail';
        const ucs = LIB[industry] || [];
        const model = s.model || DEFAULT_MODEL;
        const inp = s.inputs || {};
        const en = s.enabled || {};
        const ai = s.aiEnabled || {};
        return ucs.filter(uc => en[uc.id]).reduce((acc, uc) => {
          let prev = null;
          let annual = 0;
          const ucInp = {};
          (uc.steps || []).forEach(step => {
            (step.fields || []).forEach(f => {
              ucInp[f.k] = inp[`${uc.id}_${f.k}`] !== undefined ? inp[`${uc.id}_${f.k}`] : f.d;
            });
          });
          if (uc.ai) {
            (uc.ai.fields || []).forEach(f => {
              ucInp[f.k] = inp[`${uc.id}_${f.k}`] !== undefined ? inp[`${uc.id}_${f.k}`] : f.d;
            });
          }
          (uc.steps || []).forEach(step => {
            let val = 0;
            try { val = step.fn(ucInp, prev); } catch(e) {}
            if (!isFinite(val)) val = 0;
            prev = val;
            if (step.fin) annual = val;
          });
          let aiAnnual = 0;
          if (ai[uc.id] && uc.ai) {
            try { aiAnnual = uc.ai.fn(ucInp, annual); } catch(e) {}
            if (!isFinite(aiAnnual)) aiAnnual = 0;
          }
          const npv = tyCalc(annual + aiAnnual, model);
          return addTotals(acc, npv);
        }, EMPTY_TOTALS);
      }

      const diffPairs = useMemo(() => {
        if (selectedVersions.length < 2) return null;
        const vA = versions.find(v => v.id === selectedVersions[0]);
        const vB = versions.find(v => v.id === selectedVersions[1]);
        if (!vA || !vB) return null;
        const sA = vA.state || {};
        const sB = vB.state || {};
        const industryA = sA.industry || 'retail';
        const industryB = sB.industry || 'retail';
        const ucsA = LIB[industryA] || [];
        const ucsB = LIB[industryB] || [];
        const allUcIds = [...new Set([...ucsA.map(u => u.id), ...ucsB.map(u => u.id)])];
        return { vA, vB, allUcIds, ucsA, ucsB, sA, sB };
      }, [selectedVersions, versions]);

      function getUcAnnual(uc, state) {
        if (!uc || !state) return 0;
        const inp = state.inputs || {};
        const ucInp = {};
        (uc.steps || []).forEach(step => {
          (step.fields || []).forEach(f => {
            ucInp[f.k] = inp[`${uc.id}_${f.k}`] !== undefined ? inp[`${uc.id}_${f.k}`] : f.d;
          });
        });
        let prev = null;
        let annual = 0;
        (uc.steps || []).forEach(step => {
          let val = 0;
          try { val = step.fn(ucInp, prev); } catch(e) {}
          if (!isFinite(val)) val = 0;
          prev = val;
          if (step.fin) annual = val;
        });
        return annual;
      }

      if (versions.length === 0) {
        return <div className="empty-state">No versions saved yet. Use the toolbar to save a version and start comparing.</div>;
      }

      return (
        <div>
          <div className="card">
            <div className="section-header">Saved Versions (select up to 2 to compare)</div>
            {versions.map(v => {
              const total = getTotal(v);
              const isSelected = selectedVersions.includes(v.id);
              return (
                <div key={v.id} className="version-item" style={isSelected ? {borderColor:'var(--ac)'} : {}}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(v.id)}
                    style={{accentColor:'var(--ac)'}}
                  />
                  <span className="version-name">{v.name}</span>
                  <span className="version-ts">{new Date(v.ts).toLocaleString()}</span>
                  {total && <span className="version-value">{fC(total.tl)}–{fC(total.th)}</span>}
                  <button className="btn btn-sm btn-danger" onClick={() => deleteVersion(v.id)}>Delete</button>
                </div>
              );
            })}
          </div>

          {diffPairs && (
            <div className="card">
              <div className="section-header">Comparison: {diffPairs.vA.name} vs {diffPairs.vB.name}</div>
              <table className="diff-table">
                <thead>
                  <tr>
                    <th>Use Case</th>
                    <th>{diffPairs.vA.name} (Annual)</th>
                    <th>{diffPairs.vB.name} (Annual)</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {diffPairs.allUcIds.map(uid => {
                    const ucA = diffPairs.ucsA.find(u => u.id === uid);
                    const ucB = diffPairs.ucsB.find(u => u.id === uid);
                    const enabledA = (diffPairs.sA.enabled || {})[uid];
                    const enabledB = (diffPairs.sB.enabled || {})[uid];
                    if (!enabledA && !enabledB) return null;
                    const annualA = ucA && enabledA ? getUcAnnual(ucA, diffPairs.sA) : 0;
                    const annualB = ucB && enabledB ? getUcAnnual(ucB, diffPairs.sB) : 0;
                    const delta = annualB - annualA;
                    const name = (ucA || ucB || {}).name || uid;
                    return (
                      <tr key={uid}>
                        <td className="name">{name}</td>
                        <td>{fC(annualA)}</td>
                        <td>{fC(annualB)}</td>
                        <td className={delta > 0 ? 'diff-up' : delta < 0 ? 'diff-down' : ''}>
                          {delta > 0 ? '+' : ''}{fC(delta)}
                        </td>
                      </tr>
                    );
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // Tab: Admin
    // -------------------------------------------------------------------------
    function TabAdmin({ theme, setTheme, customerMode, setCustomerMode, lockedFields, setLockedFields, industry, inputs, enabled, onReset, logoUrl, setLogoUrl, showROI, setShowROI }) {
      const ucs = LIB[industry] || [];
      const assumptionFields = useMemo(() => {
        const fields = [];
        ucs.forEach(uc => {
          (uc.steps || []).forEach(step => {
            (step.fields || []).forEach(f => {
              if (f.s === 'assumption') {
                fields.push({ ucId: uc.id, ucName: uc.name, field: f, key: `${uc.id}_${f.k}` });
              }
            });
          });
        });
        return fields;
      }, [ucs]);

      function toggleLock(key) {
        setLockedFields(prev => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      }

      const [confirmReset, setConfirmReset] = useState(false);

      return (
        <div>
          <div className="card">
            <div className="section-header">Theme</div>
            <div className="theme-grid">
              {Object.entries(THEMES).map(([tid, t]) => (
                <div key={tid} className={`theme-swatch ${theme === tid ? 'active' : ''}`} onClick={() => setTheme(tid)}>
                  <div className="theme-color-block" style={{background: `linear-gradient(135deg, ${t.bg} 50%, ${t.accent} 100%)`}} />
                  <span className="theme-name">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-header">Display Settings</div>
            <div className="admin-row">
              <div>
                <div className="admin-label">Customer Mode</div>
                <div className="admin-sublabel">Hide admin tab, lock assumption fields, show company branding</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={customerMode} onChange={e => setCustomerMode(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="admin-row">
              <div>
                <div className="admin-label">Show ROI / TCO Tab</div>
                <div className="admin-sublabel">Enables the ROI / TCO tab in the tab bar</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={showROI} onChange={e => setShowROI(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="admin-row">
              <div>
                <div className="admin-label">Company Logo URL</div>
                <div className="admin-sublabel">Shown in header when customer mode is on</div>
              </div>
              <input
                type="text"
                className="company-input"
                style={{width:280}}
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
              />
            </div>
          </div>

          {assumptionFields.length > 0 && (
            <div className="card">
              <div className="section-header">Lock / Unlock Assumption Fields</div>
              <p style={{fontSize:12,color:'var(--t2)',marginBottom:12}}>Locked fields display as read-only in customer mode.</p>
              <div style={{maxHeight:360,overflowY:'auto'}}>
                {assumptionFields.map(item => (
                  <div key={item.key} className="admin-row">
                    <div style={{flex:1}}>
                      <div className="admin-label" style={{fontSize:12}}>{item.field.l}</div>
                      <div className="admin-sublabel">{item.ucName}</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={lockedFields.has(item.key)} onChange={() => toggleLock(item.key)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="section-header">Actions</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button className="btn" onClick={() => window.print()}>Print / Save as PDF</button>
              {!confirmReset ? (
                <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>Reset All Inputs</button>
              ) : (
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:12,color:'var(--rd)'}}>Are you sure?</span>
                  <button className="btn btn-danger" onClick={() => { onReset(); setConfirmReset(false); }}>Yes, Reset</button>
                  <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // App root
    // -------------------------------------------------------------------------
    function App() {
      const saved = loadState();

      const [industry, setIndustry] = useState(saved?.industry || 'retail');
      const [activeTab, setActiveTab] = useState('calculator');
      const [company, setCompany] = useState(saved?.company || '');
      const [theme, setTheme] = useState(saved?.theme || 'amplitude');
      const [model, setModel] = useState(saved?.model || {...DEFAULT_MODEL});
      const [inputs, setInputs] = useState(saved?.inputs || {});
      const [enabled, setEnabled] = useState(() => {
        if (saved?.enabled) return saved.enabled;
        const init = {};
        (LIB[saved?.industry || 'retail'] || []).forEach(uc => { init[uc.id] = true; });
        return init;
      });
      const [aiEnabled, setAiEnabled] = useState(saved?.aiEnabled || {});
      const [globalAiEnabled, setGlobalAiEnabled] = useState(saved?.globalAiEnabled || false);
      const [customerMode, setCustomerMode] = useState(saved?.customerMode || false);
      const [lockedFields, setLockedFields] = useState(() => new Set(saved?.lockedFields || []));
      const [versions, setVersions] = useState(saved?.versions || []);
      const [investment, setInvestment] = useState(saved?.investment || { platform: 150000, impl: 50000, internal: 30000 });
      const [activeLens, setActiveLens] = useState(saved?.activeLens || 'financial');
      const [logoUrl, setLogoUrl] = useState(saved?.logoUrl || '');
      const [showROI, setShowROI] = useState(saved?.showROI || false);
      const [versionName, setVersionName] = useState('');
      const [ucSolutions, setUcSolutions] = useState(() => {
        if (saved?.ucSolutions) return saved.ucSolutions;
        const init = {};
        Object.values(LIB).flat().forEach(uc => { init[uc.id] = [...(uc.sol || [])]; });
        return init;
      });

      // When industry changes, enable new use cases
      useEffect(() => {
        setEnabled(prev => {
          const next = {...prev};
          (LIB[industry] || []).forEach(uc => {
            if (!(uc.id in next)) next[uc.id] = true;
          });
          return next;
        });
      }, [industry]);

      // Apply theme CSS variables
      useEffect(() => {
        const t = THEMES[theme] || THEMES.amplitude;
        const root = document.documentElement;
        root.style.setProperty('--bg', t.bg);
        root.style.setProperty('--sf', t.sf);
        root.style.setProperty('--s2', t.s2);
        root.style.setProperty('--bd', t.bd);
        root.style.setProperty('--ac', t.accent);
        root.style.setProperty('--a2', t.accent2);
        if (t.light) {
          root.style.setProperty('--tx', '#1a202c');
          root.style.setProperty('--t2', '#4a5568');
        } else {
          root.style.setProperty('--tx', '#e8eaf6');
          root.style.setProperty('--t2', '#8892b0');
        }
        document.body.style.background = t.bg;
        document.body.style.color = t.light ? '#1a202c' : '#e8eaf6';
      }, [theme]);

      // Persist state
      useEffect(() => {
        saveState({
          industry, company, theme, model, inputs,
          enabled, aiEnabled, globalAiEnabled, customerMode,
          lockedFields: [...lockedFields],
          versions, investment, activeLens, logoUrl, showROI, ucSolutions,
        });
      }, [industry, company, theme, model, inputs, enabled, aiEnabled, globalAiEnabled, customerMode, lockedFields, versions, investment, activeLens, logoUrl, showROI, ucSolutions]);

      function resetAll() {
        setInputs({});
        const init = {};
        (LIB[industry] || []).forEach(uc => { init[uc.id] = true; });
        setEnabled(init);
        setAiEnabled({});
        setGlobalAiEnabled(false);
        setModel({...DEFAULT_MODEL});
        setInvestment({ platform: 150000, impl: 50000, internal: 30000 });
        setLockedFields(new Set());
        const solInit = {};
        Object.values(LIB).flat().forEach(uc => { solInit[uc.id] = [...(uc.sol || [])]; });
        setUcSolutions(solInit);
      }

      function handleSolToggle(ucId, solId) {
        setUcSolutions(prev => {
          const cur = prev[ucId] || [];
          const next = cur.includes(solId) ? cur.filter(s => s !== solId) : [...cur, solId];
          return { ...prev, [ucId]: next };
        });
      }

      function saveVersion() {
        if (!versionName.trim()) return;
        const snap = {
          id: Date.now(),
          name: versionName.trim(),
          ts: Date.now(),
          state: { industry, company, model, inputs, enabled, aiEnabled, investment },
        };
        setVersions(prev => [...prev, snap]);
        setVersionName('');
      }

      const tabs = [
        { id: 'calculator', label: 'Calculator' },
        { id: 'summary', label: 'Summary' },
        { id: 'assumptions', label: 'Assumptions' },
        ...(!customerMode ? [{ id: 'admin', label: 'Admin' }] : []),
        ...(showROI ? [{ id: 'roi', label: 'ROI / TCO' }] : []),
        ...(versions.length >= 2 ? [{ id: 'compare', label: 'Compare' }] : []),
      ];

      const anyAiEnabled = Object.values(aiEnabled).some(Boolean);

      return (
        <div>
          {/* ── Header Row 1 ── */}
          <header className="header1 no-print">
            {customerMode && logoUrl ? (
              <img src={logoUrl} alt="Logo" className="header1-logo-img" />
            ) : (
              <>
                <div className="header1-logo-circle">A</div>
                <span className="header1-title">Amplitude Value Calculator</span>
              </>
            )}

            <div className="header1-right">
              {/* Segmented lens */}
              <div className="lens-seg">
                {[['financial','Financial'],['outcomes','Outcomes'],['kpi','KPI Impact']].map(([id, lbl]) => (
                  <button
                    key={id}
                    className={`lens-seg-btn ${activeLens === id ? 'active' : ''}`}
                    onClick={() => setActiveLens(id)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {/* AI Value toggle */}
              <label className="ai-toggle-label">
                <label className="toggle-switch" style={{pointerEvents:'none'}}>
                  <input type="checkbox" checked={anyAiEnabled} onChange={() => {}} />
                  <span className="toggle-slider" />
                </label>
                <span style={{color: anyAiEnabled ? 'var(--a2)' : 'var(--t2)'}}>AI Value</span>
              </label>

              {customerMode && (
                <button className="admin-escape-btn" onClick={() => setCustomerMode(false)} title="Exit customer mode">
                  ⚙ Admin
                </button>
              )}
            </div>
          </header>

          {/* ── Header Row 2 (toolbar) ── */}
          <div className="header2 no-print">
            <div className="toolbar-group">
              <span className="toolbar-label">CUSTOMER</span>
              <input
                type="text"
                className="toolbar-input"
                placeholder="Name or Opp ID"
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </div>

            <div className="toolbar-group">
              <span className="toolbar-label">INDUSTRY</span>
              <div className="toolbar-pills">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind.id}
                    className={`toolbar-pill ${industry === ind.id ? 'active' : ''}`}
                    onClick={() => setIndustry(ind.id)}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="toolbar-version-group">
              <input
                type="text"
                className="toolbar-version-input"
                placeholder="Version name"
                value={versionName}
                onChange={e => setVersionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveVersion()}
              />
              <button className="btn btn-primary" style={{fontSize:12}} onClick={saveVersion}>Save</button>
            </div>
          </div>

          {/* ── Tab nav ── */}
          <nav className="tab-nav no-print">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* ── Tab content ── */}
          <main className="main">
            <div className={`tab-content ${activeTab === 'calculator' ? 'active' : ''}`}>
              <TabCalculator
                industry={industry}
                model={model}
                inputs={inputs}
                setInputs={setInputs}
                enabled={enabled}
                setEnabled={setEnabled}
                aiEnabled={aiEnabled}
                setAiEnabled={setAiEnabled}
                customerMode={customerMode}
                lockedFields={lockedFields}
                activeLens={activeLens}
                company={company}
                globalAiEnabled={globalAiEnabled}
                ucSolutions={ucSolutions}
                handleSolToggle={handleSolToggle}
              />
            </div>

            <div className={`tab-content ${activeTab === 'summary' ? 'active' : ''}`}>
              <TabSummary
                industry={industry}
                model={model}
                inputs={inputs}
                enabled={enabled}
                aiEnabled={aiEnabled}
                company={company}
              />
            </div>

            <div className={`tab-content ${activeTab === 'assumptions' ? 'active' : ''}`}>
              <TabAssumptions model={model} setModel={setModel} customerMode={customerMode} />
            </div>

            {!customerMode && (
              <div className={`tab-content ${activeTab === 'admin' ? 'active' : ''}`}>
                <TabAdmin
                  theme={theme}
                  setTheme={setTheme}
                  customerMode={customerMode}
                  setCustomerMode={setCustomerMode}
                  lockedFields={lockedFields}
                  setLockedFields={setLockedFields}
                  industry={industry}
                  inputs={inputs}
                  enabled={enabled}
                  onReset={resetAll}
                  logoUrl={logoUrl}
                  setLogoUrl={setLogoUrl}
                  showROI={showROI}
                  setShowROI={setShowROI}
                />
              </div>
            )}

            {showROI && (
              <div className={`tab-content ${activeTab === 'roi' ? 'active' : ''}`}>
                <TabROI
                  industry={industry}
                  model={model}
                  inputs={inputs}
                  enabled={enabled}
                  aiEnabled={aiEnabled}
                  investment={investment}
                  setInvestment={setInvestment}
                />
              </div>
            )}

            {versions.length >= 2 && (
              <div className={`tab-content ${activeTab === 'compare' ? 'active' : ''}`}>
                <TabCompare
                  versions={versions}
                  setVersions={setVersions}
                />
              </div>
            )}
          </main>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
