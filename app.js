import { INDUSTRIES, SOLUTIONS, DEFAULT_MODEL, THEMES, LIB, fC, fN, fP, tyCalc, addTotals, generateNarrative } from './data.js';
const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} = React;
const EMPTY_TOTALS = {
  y1l: 0,
  y1h: 0,
  y2l: 0,
  y2h: 0,
  y3l: 0,
  y3h: 0,
  tl: 0,
  th: 0
};
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
  } catch (e) {}
  return null;
}
function saveState(s) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch (e) {}
}
function catClass(cat) {
  if (!cat) return '';
  return cat.toLowerCase().replace(/[^a-z]/g, '-').replace(/--+/g, '-');
}

// -------------------------------------------------------------------------
// FieldCard — new card-style field input
// -------------------------------------------------------------------------
function FieldCard({
  field,
  value,
  onChange,
  locked,
  customerMode
}) {
  const isLocked = locked && customerMode;
  const isPct = field.u === '%';
  const isCurrency = field.u === '$';
  const isAssumption = field.s === 'assumption';
  const displayVal = isPct ? parseFloat(((value ?? field.d) * 100).toFixed(4)).toString() : value ?? field.d;
  function handleChange(e) {
    let v = parseFloat(e.target.value);
    if (isNaN(v)) v = 0;
    if (isPct) v = v / 100;
    onChange(v);
  }
  const unitSuffix = isPct ? '%' : field.u !== '$' && field.u !== 'n' && field.u !== 'cust' ? field.u : '';
  return /*#__PURE__*/React.createElement("div", {
    className: "field-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-card-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "field-card-label"
  }, field.l), /*#__PURE__*/React.createElement("div", {
    className: "field-card-badges"
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge-lock"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("span", {
    className: isAssumption ? 'badge-assum' : 'badge-input'
  }, isAssumption ? 'ASSUM.' : 'INPUT'))), isLocked ? /*#__PURE__*/React.createElement("div", {
    className: "field-card-static"
  }, isPct ? fP(value ?? field.d) : isCurrency ? fC(value ?? field.d) : fN(value ?? field.d), unitSuffix && !isPct ? /*#__PURE__*/React.createElement("span", {
    className: "field-card-suffix"
  }, " ", unitSuffix) : null) : /*#__PURE__*/React.createElement("div", {
    className: "field-card-input-wrap"
  }, isCurrency && /*#__PURE__*/React.createElement("span", {
    className: "field-card-prefix"
  }, "$"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "field-card-input",
    value: displayVal,
    onChange: handleChange,
    step: isPct ? '0.1' : isCurrency ? '1000' : '1'
  }), unitSuffix && /*#__PURE__*/React.createElement("span", {
    className: "field-card-suffix"
  }, unitSuffix)), field.n && /*#__PURE__*/React.createElement("div", {
    className: "field-card-note"
  }, field.n));
}

// -------------------------------------------------------------------------
// UseCaseCard
// -------------------------------------------------------------------------
function UseCaseCard({
  uc,
  onChange,
  enabled,
  onToggle,
  aiEnabled,
  onAiToggle,
  model,
  customerMode,
  lockedFields,
  activeLens,
  company,
  inputs,
  globalAiEnabled,
  activeSols,
  onSolToggle
}) {
  const [expanded, setExpanded] = useState(false);
  const solMap = useMemo(() => {
    const m = {};
    SOLUTIONS.forEach(s => {
      m[s.id] = s;
    });
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
      try {
        val = step.fn(allInputs, prev);
      } catch (e) {
        val = 0;
      }
      if (!isFinite(val)) val = 0;
      prev = val;
      return {
        step,
        val,
        isFinal: step.fin === true
      };
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
    } catch (e) {
      aiValue = 0;
    }
  }
  const aiNpv = aiEnabled ? tyCalc(aiValue, model) : null;
  const lensVal = useMemo(() => {
    if (activeLens === 'outcomes') {
      if (uc.ops) {
        try {
          return fN(uc.ops.fn(allInputs)) + ' ' + (uc.ops.unit || '');
        } catch (e) {
          return '—';
        }
      }
      return '—';
    }
    if (activeLens === 'kpi') {
      if (uc.kpi) {
        try {
          return fP(uc.kpi.fn(allInputs));
        } catch (e) {
          return '—';
        }
      }
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
  return /*#__PURE__*/React.createElement("div", {
    className: `uc-card ${!enabled ? 'disabled' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "uc-header",
    onClick: handleHeaderClick
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "uc-toggle",
    checked: !!enabled,
    onChange: handleCheckboxChange,
    onClick: e => e.stopPropagation()
  }), /*#__PURE__*/React.createElement("span", {
    className: "uc-name"
  }, uc.name), uc.cat && /*#__PURE__*/React.createElement("span", {
    className: `uc-cat ${catClass(uc.cat)}`
  }, uc.cat), activeSols.slice(0, 3).map(sid => {
    const s = solMap[sid];
    if (!s) return null;
    return /*#__PURE__*/React.createElement("span", {
      key: sid,
      className: "sol-chip",
      style: {
        background: s.color + '33',
        color: s.color,
        border: `1px solid ${s.color}55`
      }
    }, s.label.replace('Amplitude ', '').replace(' (AI)', ''));
  }), /*#__PURE__*/React.createElement("div", {
    className: "uc-header-right"
  }, enabled && activeLens !== 'financial' && lensVal && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontFamily: 'var(--mono)',
      color: 'var(--a2)',
      fontWeight: 600
    }
  }, lensVal), enabled && activeLens === 'financial' && /*#__PURE__*/React.createElement("div", {
    className: "uc-annual-val"
  }, fAbbrev(baseAnnual)), enabled && uc.ai && !aiEnabled && /*#__PURE__*/React.createElement("div", {
    className: "uc-ai-available"
  }, "+AI available"), enabled && uc.ai && aiEnabled && /*#__PURE__*/React.createElement("div", {
    className: "uc-ai-available"
  }, "+", fAbbrev(aiValue), " AI"), enabled && /*#__PURE__*/React.createElement("div", {
    className: "uc-3yr-range"
  }, "3yr: ", fAbbrev(npv.tl), " \u2013 ", fAbbrev(npv.th))), enabled && /*#__PURE__*/React.createElement("span", {
    className: "uc-chevron"
  }, expanded ? '▲' : '▼')), enabled && expanded && /*#__PURE__*/React.createElement("div", {
    className: "uc-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "platform-sol-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "platform-sol-label"
  }, "PLATFORM SOLUTIONS (click to add/remove)"), /*#__PURE__*/React.createElement("div", {
    className: "platform-sol-pills"
  }, NON_AI_SOLUTIONS.map(s => {
    const isActive = activeSols.includes(s.id);
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      className: "platform-sol-pill",
      style: isActive ? {
        background: s.color + '33',
        color: s.color,
        border: `1px solid ${s.color}66`
      } : {
        background: 'transparent',
        color: 'var(--t2)',
        border: '1px solid var(--bd)'
      },
      onClick: () => toggleLocalSol(s.id)
    }, s.label.replace('Amplitude ', ''));
  }))), steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.step.id,
    className: "step-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "step-label-row"
  }, "Step ", i + 1, ": ", s.step.label), (s.step.fields || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "fields-grid"
  }, (s.step.fields || []).map(f => /*#__PURE__*/React.createElement(FieldCard, {
    key: f.k,
    field: f,
    value: getVal(f.k),
    onChange: v => onChange(uc.id, f.k, v),
    locked: lockedFields.has(`${uc.id}_${f.k}`),
    customerMode: customerMode
  }))), s.step.ft && /*#__PURE__*/React.createElement("div", {
    className: "step-formula"
  }, s.step.ft), /*#__PURE__*/React.createElement("div", {
    className: "step-result-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "step-result-label"
  }, s.step.rl), /*#__PURE__*/React.createElement("span", {
    className: `step-result-val ${s.isFinal ? 'final' : ''}`
  }, s.step.ru === '$' ? fC(s.val) : s.step.ru === '%' ? fP(s.val) : fN(s.val))))), uc.ai && /*#__PURE__*/React.createElement("div", {
    className: "ai-section-block",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ai-section-header",
    onClick: () => onAiToggle(uc.id)
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!aiEnabled,
    onChange: () => {},
    style: {
      accentColor: 'var(--ac)',
      cursor: 'pointer'
    },
    onClick: e => {
      e.stopPropagation();
      onAiToggle(uc.id);
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "ai-badge"
  }, "AI"), /*#__PURE__*/React.createElement("span", {
    className: "ai-section-title"
  }, uc.ai.label), !aiEnabled && /*#__PURE__*/React.createElement("span", {
    className: "ai-section-hint"
  }, "(Toggle AI to include)")), aiEnabled && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, (uc.ai.fields || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "fields-grid"
  }, (uc.ai.fields || []).map(f => /*#__PURE__*/React.createElement(FieldCard, {
    key: f.k,
    field: f,
    value: getVal(f.k),
    onChange: v => onChange(uc.id, f.k, v),
    locked: lockedFields.has(`${uc.id}_${f.k}`),
    customerMode: customerMode
  }))), uc.ai.ft && /*#__PURE__*/React.createElement("div", {
    className: "step-formula"
  }, uc.ai.ft), /*#__PURE__*/React.createElement("div", {
    className: "ai-result-line"
  }, "AI adds: ", fC(aiNpv.tl), " \u2013 ", fC(aiNpv.th), " over 3 years"))), /*#__PURE__*/React.createElement("button", {
    className: "add-lever-btn",
    onClick: e => e.preventDefault()
  }, "+ Add Value Lever to This Use Case"), /*#__PURE__*/React.createElement("div", {
    className: "projection-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "projection-label"
  }, "3-YEAR PROJECTION"), /*#__PURE__*/React.createElement("div", {
    className: "projection-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "proj-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "proj-card-label"
  }, "Yr1 (50%)"), /*#__PURE__*/React.createElement("div", {
    className: "proj-card-val"
  }, fAbbrev(npv.y1l), " \u2013 ", fAbbrev(npv.y1h))), /*#__PURE__*/React.createElement("div", {
    className: "proj-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "proj-card-label"
  }, "Yr2 (80%)"), /*#__PURE__*/React.createElement("div", {
    className: "proj-card-val"
  }, fAbbrev(npv.y2l), " \u2013 ", fAbbrev(npv.y2h))), /*#__PURE__*/React.createElement("div", {
    className: "proj-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "proj-card-label"
  }, "Yr3 (100%)"), /*#__PURE__*/React.createElement("div", {
    className: "proj-card-val"
  }, fAbbrev(npv.y3l), " \u2013 ", fAbbrev(npv.y3h))), /*#__PURE__*/React.createElement("div", {
    className: "proj-card total"
  }, /*#__PURE__*/React.createElement("div", {
    className: "proj-card-label"
  }, "3-Yr Total"), /*#__PURE__*/React.createElement("div", {
    className: "proj-card-val"
  }, fAbbrev(npv.tl), " \u2013 ", fAbbrev(npv.th)))))));
}

// -------------------------------------------------------------------------
// Tab: Calculator
// -------------------------------------------------------------------------
function TabCalculator({
  industry,
  model,
  inputs,
  setInputs,
  enabled,
  setEnabled,
  aiEnabled,
  setAiEnabled,
  customerMode,
  lockedFields,
  activeLens,
  company,
  globalAiEnabled,
  ucSolutions,
  handleSolToggle
}) {
  const ucs = LIB[industry] || [];
  function toggleEnabled(ucId) {
    setEnabled(prev => ({
      ...prev,
      [ucId]: !prev[ucId]
    }));
  }
  function toggleAiEnabled(ucId) {
    setAiEnabled(prev => ({
      ...prev,
      [ucId]: !prev[ucId]
    }));
  }
  function handleFieldChange(ucId, key, val) {
    setInputs(prev => ({
      ...prev,
      [`${ucId}_${key}`]: val
    }));
  }

  // Compute summary banner totals
  const bannerTotals = useMemo(() => {
    let totalAnnual = 0;
    let totalAiAnnual = 0;
    let combinedNpv = {
      ...EMPTY_TOTALS
    };
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
        try {
          val = step.fn(allInputs, prev);
        } catch (e) {}
        if (!isFinite(val)) val = 0;
        prev = val;
        if (step.fin) annual = val;
      });
      totalAnnual += annual;
      let aiAnnual = 0;
      if (aiEnabled[uc.id] && uc.ai) {
        try {
          aiAnnual = uc.ai.fn(allInputs, annual);
        } catch (e) {}
        if (!isFinite(aiAnnual)) aiAnnual = 0;
      }
      totalAiAnnual += aiAnnual;
      const npv = tyCalc(annual, model);
      const aiNpv = aiAnnual > 0 ? tyCalc(aiAnnual, model) : EMPTY_TOTALS;
      combinedNpv = addTotals(addTotals(combinedNpv, npv), aiNpv);
    });
    return {
      totalAnnual,
      totalAiAnnual,
      combinedNpv
    };
  }, [ucs, enabled, inputs, model, aiEnabled]);
  const anyAiEnabled = Object.values(aiEnabled).some(Boolean);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "summary-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "banner-half"
  }, /*#__PURE__*/React.createElement("div", {
    className: "banner-stat-label"
  }, "TOTAL VALUE OPPORTUNITY \u24D8"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "banner-big-val"
  }, fAbbrev(bannerTotals.totalAnnual)), anyAiEnabled && bannerTotals.totalAiAnnual > 0 && /*#__PURE__*/React.createElement("span", {
    className: "banner-ai-add"
  }, "+", fAbbrev(bannerTotals.totalAiAnnual), " AI")), /*#__PURE__*/React.createElement("div", {
    className: "banner-sub"
  }, "Full annual potential \u2013 not risk-adjusted")), /*#__PURE__*/React.createElement("div", {
    className: "banner-half right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "banner-stat-label"
  }, "3-YEAR RISK-ADJUSTED PROJECTION \u24D8"), /*#__PURE__*/React.createElement("div", {
    className: "banner-range-val"
  }, fAbbrev(bannerTotals.combinedNpv.tl), " \u2013 ", fAbbrev(bannerTotals.combinedNpv.th)), /*#__PURE__*/React.createElement("div", {
    className: "banner-sub"
  }, "Discounted, risk-adjusted, phased"), anyAiEnabled && /*#__PURE__*/React.createElement("div", {
    className: "banner-ai-range"
  }, "+ AI: ", fAbbrev(bannerTotals.combinedNpv.tl), " \u2013 ", fAbbrev(bannerTotals.combinedNpv.th)))), /*#__PURE__*/React.createElement("div", {
    className: "uc-section-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "uc-section-title"
  }, company || 'Customer', " \u2013 Use Cases"), /*#__PURE__*/React.createElement("button", {
    className: "btn-dashed"
  }, "+ Custom Use Case")), ucs.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No use cases for this industry."), ucs.map(uc => /*#__PURE__*/React.createElement(UseCaseCard, {
    key: uc.id,
    uc: uc,
    inputs: inputs,
    onChange: handleFieldChange,
    enabled: !!enabled[uc.id],
    onToggle: toggleEnabled,
    aiEnabled: !!aiEnabled[uc.id],
    onAiToggle: toggleAiEnabled,
    model: model,
    customerMode: customerMode,
    lockedFields: lockedFields,
    activeLens: activeLens,
    company: company,
    globalAiEnabled: globalAiEnabled,
    activeSols: ucSolutions[uc.id] || uc.sol || [],
    onSolToggle: handleSolToggle
  })));
}

// -------------------------------------------------------------------------
// Tab: Summary
// -------------------------------------------------------------------------
function TabSummary({
  industry,
  model,
  inputs,
  enabled,
  aiEnabled,
  company
}) {
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
      try {
        val = step.fn(ucInputs, prev);
      } catch (e) {}
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
        try {
          aiAnnual = uc.ai.fn(ucInputs, annual);
        } catch (e) {}
        if (!isFinite(aiAnnual)) aiAnnual = 0;
      }
      const aiNpv = tyCalc(aiAnnual, model);
      const combined = addTotals(npv, aiAnnual > 0 ? aiNpv : EMPTY_TOTALS);
      return {
        uc,
        ucInputs,
        annual,
        npv: combined
      };
    });
  }, [enabledUcs, inputs, model, aiEnabled]);
  const totals = useMemo(() => rows.reduce((acc, r) => addTotals(acc, r.npv), EMPTY_TOTALS), [rows]);
  const maxTh = useMemo(() => Math.max(...rows.map(r => r.npv.th), 1), [rows]);
  if (enabledUcs.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "empty-state"
    }, "Enable use cases in the Calculator tab to see summary.");
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "3-Year Value Summary"), /*#__PURE__*/React.createElement("table", {
    className: "summary-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Use Case"), /*#__PURE__*/React.createElement("th", {
    className: "right"
  }, "Y1 Low\u2013High"), /*#__PURE__*/React.createElement("th", {
    className: "right"
  }, "Y2 Low\u2013High"), /*#__PURE__*/React.createElement("th", {
    className: "right"
  }, "Y3 Low\u2013High"), /*#__PURE__*/React.createElement("th", {
    className: "right"
  }, "3-Yr Total Low\u2013High"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.uc.id
  }, /*#__PURE__*/React.createElement("td", {
    className: "name"
  }, r.uc.name), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(r.npv.y1l), "\u2013", fC(r.npv.y1h)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(r.npv.y2l), "\u2013", fC(r.npv.y2h)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(r.npv.y3l), "\u2013", fC(r.npv.y3h)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(r.npv.tl), "\u2013", fC(r.npv.th)))), /*#__PURE__*/React.createElement("tr", {
    className: "total-row"
  }, /*#__PURE__*/React.createElement("td", {
    className: "name"
  }, "Total"), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(totals.y1l), "\u2013", fC(totals.y1h)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(totals.y2l), "\u2013", fC(totals.y2h)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(totals.y3l), "\u2013", fC(totals.y3h)), /*#__PURE__*/React.createElement("td", {
    className: "right"
  }, fC(totals.tl), "\u2013", fC(totals.th)))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Value by Use Case (3-Yr High)"), /*#__PURE__*/React.createElement("div", {
    className: "bar-chart"
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.uc.id,
    className: "bar-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bar-name",
    title: r.uc.name
  }, r.uc.name), /*#__PURE__*/React.createElement("div", {
    className: "bar-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar-fill",
    style: {
      width: `${Math.max(2, r.npv.th / maxTh * 100)}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "bar-val"
  }, fC(r.npv.tl), "\u2013", fC(r.npv.th)))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "If/Then Narratives"), rows.map(r => {
    const narrative = generateNarrative(r.uc, r.ucInputs, r.annual, company);
    if (!narrative) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: r.uc.id,
      className: "narrative-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "narrative-uc-name"
    }, r.uc.name), /*#__PURE__*/React.createElement("div", {
      className: "narrative-text"
    }, narrative));
  })));
}

// -------------------------------------------------------------------------
// Tab: ROI / TCO
// -------------------------------------------------------------------------
function TabROI({
  industry,
  model,
  inputs,
  enabled,
  aiEnabled,
  investment,
  setInvestment
}) {
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
        try {
          val = step.fn(ucInputs, prev);
        } catch (e) {}
        if (!isFinite(val)) val = 0;
        prev = val;
        if (step.fin) annual = val;
      });
      let aiAnnual = 0;
      if (aiEnabled[uc.id] && uc.ai) {
        try {
          aiAnnual = uc.ai.fn(ucInputs, annual);
        } catch (e) {}
        if (!isFinite(aiAnnual)) aiAnnual = 0;
      }
      const npv = tyCalc(annual + aiAnnual, model);
      return addTotals(acc, npv);
    }, EMPTY_TOTALS);
  }, [enabledUcs, inputs, model, aiEnabled]);
  const totalInvestment = investment.platform + investment.impl + investment.internal * 150;
  const roiLow = totalInvestment > 0 ? totals.tl / totalInvestment : 0;
  const roiHigh = totalInvestment > 0 ? totals.th / totalInvestment : 0;
  const netNpvLow = totals.tl - totalInvestment;
  const netNpvHigh = totals.th - totalInvestment;
  const paybackMonths = totals.y1h > 0 ? Math.round(totalInvestment / totals.y1h * 12) : 0;
  const wfMax = Math.max(totalInvestment, totals.y1h, totals.y1h + totals.y2h, totals.th, 1);
  const wfBars = [{
    label: 'Investment',
    val: totalInvestment,
    color: 'var(--rd)'
  }, {
    label: 'Y1 Value',
    val: totals.y1h,
    color: 'var(--ac)'
  }, {
    label: 'Y2 Cumulative',
    val: totals.y1h + totals.y2h,
    color: 'var(--a2)'
  }, {
    label: '3-Yr Total',
    val: totals.th,
    color: 'var(--gr)'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "grid-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Amplitude Investment"), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label"
  }, "Platform License"), /*#__PURE__*/React.createElement("div", {
    className: "field-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "field-prefix"
  }, "$"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: investment.platform,
    onChange: e => setInvestment(p => ({
      ...p,
      platform: parseFloat(e.target.value) || 0
    })),
    step: "10000"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label"
  }, "Implementation Services"), /*#__PURE__*/React.createElement("div", {
    className: "field-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "field-prefix"
  }, "$"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: investment.impl,
    onChange: e => setInvestment(p => ({
      ...p,
      impl: parseFloat(e.target.value) || 0
    })),
    step: "5000"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label"
  }, "Internal FTE Hours"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: investment.internal,
    onChange: e => setInvestment(p => ({
      ...p,
      internal: parseFloat(e.target.value) || 0
    })),
    step: "50"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--t2)'
    }
  }, "hrs \xD7 $150")), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label fw-600"
  }, "Total Investment"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-accent fw-700"
  }, fC(totalInvestment)))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "3-Year Value (from Calculator)"), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label"
  }, "Y1 Value"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, fC(totals.y1l), "\u2013", fC(totals.y1h))), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label"
  }, "Y2 Value"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, fC(totals.y2l), "\u2013", fC(totals.y2h))), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label"
  }, "Y3 Value"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, fC(totals.y3l), "\u2013", fC(totals.y3h))), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "roi-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-field-label fw-600"
  }, "3-Yr Total"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono fw-700 text-accent"
  }, fC(totals.tl), "\u2013", fC(totals.th))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "ROI Metrics"), /*#__PURE__*/React.createElement("div", {
    className: "roi-metric-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-metric-label"
  }, "3-Year ROI Multiple"), /*#__PURE__*/React.createElement("span", {
    className: "roi-metric-value green"
  }, roiLow.toFixed(1), "x \u2013 ", roiHigh.toFixed(1), "x")), /*#__PURE__*/React.createElement("div", {
    className: "roi-metric-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-metric-label"
  }, "Net NPV (3-Yr)"), /*#__PURE__*/React.createElement("span", {
    className: `roi-metric-value ${netNpvLow >= 0 ? 'green' : ''}`
  }, fC(netNpvLow), " \u2013 ", fC(netNpvHigh))), /*#__PURE__*/React.createElement("div", {
    className: "roi-metric-row",
    style: {
      borderBottom: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "roi-metric-label"
  }, "Payback Period"), /*#__PURE__*/React.createElement("span", {
    className: "roi-metric-value yellow"
  }, paybackMonths > 0 ? `${paybackMonths} months` : '—'))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Value Waterfall"), /*#__PURE__*/React.createElement("div", {
    className: "waterfall"
  }, wfBars.map(b => {
    const pct = Math.max(4, b.val / wfMax * 140);
    return /*#__PURE__*/React.createElement("div", {
      key: b.label,
      className: "wf-bar-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "wf-value"
    }, fC(b.val)), /*#__PURE__*/React.createElement("div", {
      className: "wf-bar",
      style: {
        height: pct,
        background: b.color
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "wf-label"
    }, b.label));
  })))));
}

// -------------------------------------------------------------------------
// Tab: Assumptions
// -------------------------------------------------------------------------
function TabAssumptions({
  model,
  setModel,
  customerMode
}) {
  const params = [{
    k: 'dr',
    label: 'Discount Rate',
    note: 'Forrester TEI 2023 standard discount rate for NPV calculations',
    pct: true
  }, {
    k: 'ra',
    label: 'Risk Adjustment',
    note: 'Forrester TEI 2023: applied to create conservative (low) band',
    pct: true
  }, {
    k: 'y1',
    label: 'Y1 Realization',
    note: 'Forrester TEI: 50% realization in Year 1 — ramp time, change management',
    pct: true
  }, {
    k: 'y2',
    label: 'Y2 Realization',
    note: 'Forrester TEI: 80% realization in Year 2 — optimization phase',
    pct: true
  }, {
    k: 'y3',
    label: 'Y3 Realization',
    note: 'Forrester TEI: 100% realization in Year 3 — full deployment',
    pct: true
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Model Parameters"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: 'var(--t2)',
      marginBottom: 16,
      lineHeight: 1.6
    }
  }, "These parameters affect all calculations. Defaults follow ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--tx)'
    }
  }, "Forrester TEI 2023"), " methodology for NPV and risk adjustment.", customerMode && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      color: 'var(--yl)',
      fontSize: 11
    }
  }, "\uD83D\uDD12 View-only in customer mode")), params.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.k,
    className: "assumption-row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "assumption-label-text"
  }, p.label), /*#__PURE__*/React.createElement("div", {
    className: "assumption-note mt-8"
  }, p.note)), customerMode ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--mono)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--tx)',
      minWidth: 60,
      textAlign: 'right'
    }
  }, parseFloat(((model[p.k] || 0) * 100).toFixed(1)), "%") : /*#__PURE__*/React.createElement("div", {
    className: "field-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: parseFloat(((model[p.k] || 0) * 100).toFixed(1)),
    onChange: e => {
      const v = parseFloat(e.target.value) / 100;
      setModel(prev => ({
        ...prev,
        [p.k]: isNaN(v) ? 0 : v
      }));
    },
    step: "0.5",
    min: "0",
    max: "100"
  }), /*#__PURE__*/React.createElement("span", {
    className: "field-suffix"
  }, "%"))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Forrester TEI 2023 Benchmarks"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, [['217%', 'ROI over 3 years'], ['9%', 'Acquisition improvement'], ['15%', 'Retention improvement'], ['40%', 'Monetization improvement'], ['50%', 'Reduction in ad-hoc data requests'], ['6 months', 'Average payback period']].map(([val, lbl]) => /*#__PURE__*/React.createElement("div", {
    key: lbl,
    style: {
      background: 'var(--s2)',
      border: '1px solid var(--bd)',
      borderRadius: 6,
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      fontFamily: 'var(--mono)',
      color: 'var(--a2)'
    }
  }, val), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--t2)',
      marginTop: 4
    }
  }, lbl))))));
}

// -------------------------------------------------------------------------
// Tab: Compare
// -------------------------------------------------------------------------
function TabCompare({
  versions,
  setVersions
}) {
  const [selectedVersions, setSelectedVersions] = useState([]);
  function deleteVersion(id) {
    setVersions(prev => prev.filter(v => v.id !== id));
    setSelectedVersions(prev => prev.filter(x => x !== id));
  }
  function toggleSelect(id) {
    setSelectedVersions(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]);
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
        try {
          val = step.fn(ucInp, prev);
        } catch (e) {}
        if (!isFinite(val)) val = 0;
        prev = val;
        if (step.fin) annual = val;
      });
      let aiAnnual = 0;
      if (ai[uc.id] && uc.ai) {
        try {
          aiAnnual = uc.ai.fn(ucInp, annual);
        } catch (e) {}
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
    return {
      vA,
      vB,
      allUcIds,
      ucsA,
      ucsB,
      sA,
      sB
    };
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
      try {
        val = step.fn(ucInp, prev);
      } catch (e) {}
      if (!isFinite(val)) val = 0;
      prev = val;
      if (step.fin) annual = val;
    });
    return annual;
  }
  if (versions.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "empty-state"
    }, "No versions saved yet. Use the toolbar to save a version and start comparing.");
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Saved Versions (select up to 2 to compare)"), versions.map(v => {
    const total = getTotal(v);
    const isSelected = selectedVersions.includes(v.id);
    return /*#__PURE__*/React.createElement("div", {
      key: v.id,
      className: "version-item",
      style: isSelected ? {
        borderColor: 'var(--ac)'
      } : {}
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: isSelected,
      onChange: () => toggleSelect(v.id),
      style: {
        accentColor: 'var(--ac)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "version-name"
    }, v.name), /*#__PURE__*/React.createElement("span", {
      className: "version-ts"
    }, new Date(v.ts).toLocaleString()), total && /*#__PURE__*/React.createElement("span", {
      className: "version-value"
    }, fC(total.tl), "\u2013", fC(total.th)), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-sm btn-danger",
      onClick: () => deleteVersion(v.id)
    }, "Delete"));
  })), diffPairs && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Comparison: ", diffPairs.vA.name, " vs ", diffPairs.vB.name), /*#__PURE__*/React.createElement("table", {
    className: "diff-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Use Case"), /*#__PURE__*/React.createElement("th", null, diffPairs.vA.name, " (Annual)"), /*#__PURE__*/React.createElement("th", null, diffPairs.vB.name, " (Annual)"), /*#__PURE__*/React.createElement("th", null, "Change"))), /*#__PURE__*/React.createElement("tbody", null, diffPairs.allUcIds.map(uid => {
    const ucA = diffPairs.ucsA.find(u => u.id === uid);
    const ucB = diffPairs.ucsB.find(u => u.id === uid);
    const enabledA = (diffPairs.sA.enabled || {})[uid];
    const enabledB = (diffPairs.sB.enabled || {})[uid];
    if (!enabledA && !enabledB) return null;
    const annualA = ucA && enabledA ? getUcAnnual(ucA, diffPairs.sA) : 0;
    const annualB = ucB && enabledB ? getUcAnnual(ucB, diffPairs.sB) : 0;
    const delta = annualB - annualA;
    const name = (ucA || ucB || {}).name || uid;
    return /*#__PURE__*/React.createElement("tr", {
      key: uid
    }, /*#__PURE__*/React.createElement("td", {
      className: "name"
    }, name), /*#__PURE__*/React.createElement("td", null, fC(annualA)), /*#__PURE__*/React.createElement("td", null, fC(annualB)), /*#__PURE__*/React.createElement("td", {
      className: delta > 0 ? 'diff-up' : delta < 0 ? 'diff-down' : ''
    }, delta > 0 ? '+' : '', fC(delta)));
  }).filter(Boolean)))));
}

// -------------------------------------------------------------------------
// Tab: Admin
// -------------------------------------------------------------------------
function TabAdmin({
  theme,
  setTheme,
  customerMode,
  setCustomerMode,
  lockedFields,
  setLockedFields,
  industry,
  inputs,
  enabled,
  onReset,
  logoUrl,
  setLogoUrl,
  showROI,
  setShowROI
}) {
  const ucs = LIB[industry] || [];
  const assumptionFields = useMemo(() => {
    const fields = [];
    ucs.forEach(uc => {
      (uc.steps || []).forEach(step => {
        (step.fields || []).forEach(f => {
          if (f.s === 'assumption') {
            fields.push({
              ucId: uc.id,
              ucName: uc.name,
              field: f,
              key: `${uc.id}_${f.k}`
            });
          }
        });
      });
    });
    return fields;
  }, [ucs]);
  function toggleLock(key) {
    setLockedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);else next.add(key);
      return next;
    });
  }
  const [confirmReset, setConfirmReset] = useState(false);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Theme"), /*#__PURE__*/React.createElement("div", {
    className: "theme-grid"
  }, Object.entries(THEMES).map(([tid, t]) => /*#__PURE__*/React.createElement("div", {
    key: tid,
    className: `theme-swatch ${theme === tid ? 'active' : ''}`,
    onClick: () => setTheme(tid)
  }, /*#__PURE__*/React.createElement("div", {
    className: "theme-color-block",
    style: {
      background: `linear-gradient(135deg, ${t.bg} 50%, ${t.accent} 100%)`
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "theme-name"
  }, t.label))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Display Settings"), /*#__PURE__*/React.createElement("div", {
    className: "admin-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "admin-label"
  }, "Customer Mode"), /*#__PURE__*/React.createElement("div", {
    className: "admin-sublabel"
  }, "Hide admin tab, lock assumption fields, show company branding")), /*#__PURE__*/React.createElement("label", {
    className: "toggle-switch"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: customerMode,
    onChange: e => setCustomerMode(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", {
    className: "toggle-slider"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "admin-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "admin-label"
  }, "Show ROI / TCO Tab"), /*#__PURE__*/React.createElement("div", {
    className: "admin-sublabel"
  }, "Enables the ROI / TCO tab in the tab bar")), /*#__PURE__*/React.createElement("label", {
    className: "toggle-switch"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showROI,
    onChange: e => setShowROI(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", {
    className: "toggle-slider"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "admin-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "admin-label"
  }, "Company Logo URL"), /*#__PURE__*/React.createElement("div", {
    className: "admin-sublabel"
  }, "Shown in header when customer mode is on")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "company-input",
    style: {
      width: 280
    },
    placeholder: "https://example.com/logo.png",
    value: logoUrl,
    onChange: e => setLogoUrl(e.target.value)
  }))), assumptionFields.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Lock / Unlock Assumption Fields"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: 'var(--t2)',
      marginBottom: 12
    }
  }, "Locked fields display as read-only in customer mode."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 360,
      overflowY: 'auto'
    }
  }, assumptionFields.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.key,
    className: "admin-row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "admin-label",
    style: {
      fontSize: 12
    }
  }, item.field.l), /*#__PURE__*/React.createElement("div", {
    className: "admin-sublabel"
  }, item.ucName)), /*#__PURE__*/React.createElement("label", {
    className: "toggle-switch"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: lockedFields.has(item.key),
    onChange: () => toggleLock(item.key)
  }), /*#__PURE__*/React.createElement("span", {
    className: "toggle-slider"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-header"
  }, "Actions"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => window.print()
  }, "Print / Save as PDF"), !confirmReset ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => setConfirmReset(true)
  }, "Reset All Inputs") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--rd)'
    }
  }, "Are you sure?"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => {
      onReset();
      setConfirmReset(false);
    }
  }, "Yes, Reset"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setConfirmReset(false)
  }, "Cancel")))));
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
  const [model, setModel] = useState(saved?.model || {
    ...DEFAULT_MODEL
  });
  const [inputs, setInputs] = useState(saved?.inputs || {});
  const [enabled, setEnabled] = useState(() => {
    if (saved?.enabled) return saved.enabled;
    const init = {};
    (LIB[saved?.industry || 'retail'] || []).forEach(uc => {
      init[uc.id] = true;
    });
    return init;
  });
  const [aiEnabled, setAiEnabled] = useState(saved?.aiEnabled || {});
  const [globalAiEnabled, setGlobalAiEnabled] = useState(saved?.globalAiEnabled || false);
  const [customerMode, setCustomerMode] = useState(saved?.customerMode || false);
  const [lockedFields, setLockedFields] = useState(() => new Set(saved?.lockedFields || []));
  const [versions, setVersions] = useState(saved?.versions || []);
  const [investment, setInvestment] = useState(saved?.investment || {
    platform: 150000,
    impl: 50000,
    internal: 30000
  });
  const [activeLens, setActiveLens] = useState(saved?.activeLens || 'financial');
  const [logoUrl, setLogoUrl] = useState(saved?.logoUrl || '');
  const [showROI, setShowROI] = useState(saved?.showROI || false);
  const [versionName, setVersionName] = useState('');
  const [ucSolutions, setUcSolutions] = useState(() => {
    if (saved?.ucSolutions) return saved.ucSolutions;
    const init = {};
    Object.values(LIB).flat().forEach(uc => {
      init[uc.id] = [...(uc.sol || [])];
    });
    return init;
  });

  // When industry changes, enable new use cases
  useEffect(() => {
    setEnabled(prev => {
      const next = {
        ...prev
      };
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
      industry,
      company,
      theme,
      model,
      inputs,
      enabled,
      aiEnabled,
      globalAiEnabled,
      customerMode,
      lockedFields: [...lockedFields],
      versions,
      investment,
      activeLens,
      logoUrl,
      showROI,
      ucSolutions
    });
  }, [industry, company, theme, model, inputs, enabled, aiEnabled, globalAiEnabled, customerMode, lockedFields, versions, investment, activeLens, logoUrl, showROI, ucSolutions]);
  function resetAll() {
    setInputs({});
    const init = {};
    (LIB[industry] || []).forEach(uc => {
      init[uc.id] = true;
    });
    setEnabled(init);
    setAiEnabled({});
    setGlobalAiEnabled(false);
    setModel({
      ...DEFAULT_MODEL
    });
    setInvestment({
      platform: 150000,
      impl: 50000,
      internal: 30000
    });
    setLockedFields(new Set());
    const solInit = {};
    Object.values(LIB).flat().forEach(uc => {
      solInit[uc.id] = [...(uc.sol || [])];
    });
    setUcSolutions(solInit);
  }
  function handleSolToggle(ucId, solId) {
    setUcSolutions(prev => {
      const cur = prev[ucId] || [];
      const next = cur.includes(solId) ? cur.filter(s => s !== solId) : [...cur, solId];
      return {
        ...prev,
        [ucId]: next
      };
    });
  }
  function saveVersion() {
    if (!versionName.trim()) return;
    const snap = {
      id: Date.now(),
      name: versionName.trim(),
      ts: Date.now(),
      state: {
        industry,
        company,
        model,
        inputs,
        enabled,
        aiEnabled,
        investment
      }
    };
    setVersions(prev => [...prev, snap]);
    setVersionName('');
  }
  const tabs = [{
    id: 'calculator',
    label: 'Calculator'
  }, {
    id: 'summary',
    label: 'Summary'
  }, {
    id: 'assumptions',
    label: 'Assumptions'
  }, ...(!customerMode ? [{
    id: 'admin',
    label: 'Admin'
  }] : []), ...(showROI ? [{
    id: 'roi',
    label: 'ROI / TCO'
  }] : []), ...(versions.length >= 2 ? [{
    id: 'compare',
    label: 'Compare'
  }] : [])];
  const anyAiEnabled = Object.values(aiEnabled).some(Boolean);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("header", {
    className: "header1 no-print"
  }, customerMode && logoUrl ? /*#__PURE__*/React.createElement("img", {
    src: logoUrl,
    alt: "Logo",
    className: "header1-logo-img"
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "header1-logo-circle"
  }, "A"), /*#__PURE__*/React.createElement("span", {
    className: "header1-title"
  }, "Amplitude Value Calculator")), /*#__PURE__*/React.createElement("div", {
    className: "header1-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lens-seg"
  }, [['financial', 'Financial'], ['outcomes', 'Outcomes'], ['kpi', 'KPI Impact']].map(([id, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: `lens-seg-btn ${activeLens === id ? 'active' : ''}`,
    onClick: () => setActiveLens(id)
  }, lbl))), /*#__PURE__*/React.createElement("label", {
    className: "ai-toggle-label"
  }, /*#__PURE__*/React.createElement("label", {
    className: "toggle-switch",
    style: {
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: anyAiEnabled,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement("span", {
    className: "toggle-slider"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      color: anyAiEnabled ? 'var(--a2)' : 'var(--t2)'
    }
  }, "AI Value")), customerMode && /*#__PURE__*/React.createElement("button", {
    className: "admin-escape-btn",
    onClick: () => setCustomerMode(false),
    title: "Exit customer mode"
  }, "\u2699 Admin"))), /*#__PURE__*/React.createElement("div", {
    className: "header2 no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toolbar-group"
  }, /*#__PURE__*/React.createElement("span", {
    className: "toolbar-label"
  }, "CUSTOMER"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "toolbar-input",
    placeholder: "Name or Opp ID",
    value: company,
    onChange: e => setCompany(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "toolbar-group"
  }, /*#__PURE__*/React.createElement("span", {
    className: "toolbar-label"
  }, "INDUSTRY"), /*#__PURE__*/React.createElement("div", {
    className: "toolbar-pills"
  }, INDUSTRIES.map(ind => /*#__PURE__*/React.createElement("button", {
    key: ind.id,
    className: `toolbar-pill ${industry === ind.id ? 'active' : ''}`,
    onClick: () => setIndustry(ind.id)
  }, ind.label)))), /*#__PURE__*/React.createElement("div", {
    className: "toolbar-version-group"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "toolbar-version-input",
    placeholder: "Version name",
    value: versionName,
    onChange: e => setVersionName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && saveVersion()
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      fontSize: 12
    },
    onClick: saveVersion
  }, "Save"))), /*#__PURE__*/React.createElement("nav", {
    className: "tab-nav no-print"
  }, tabs.map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab.id,
    className: `tab-btn ${activeTab === tab.id ? 'active' : ''}`,
    onClick: () => setActiveTab(tab.id)
  }, tab.label))), /*#__PURE__*/React.createElement("main", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: `tab-content ${activeTab === 'calculator' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(TabCalculator, {
    industry: industry,
    model: model,
    inputs: inputs,
    setInputs: setInputs,
    enabled: enabled,
    setEnabled: setEnabled,
    aiEnabled: aiEnabled,
    setAiEnabled: setAiEnabled,
    customerMode: customerMode,
    lockedFields: lockedFields,
    activeLens: activeLens,
    company: company,
    globalAiEnabled: globalAiEnabled,
    ucSolutions: ucSolutions,
    handleSolToggle: handleSolToggle
  })), /*#__PURE__*/React.createElement("div", {
    className: `tab-content ${activeTab === 'summary' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(TabSummary, {
    industry: industry,
    model: model,
    inputs: inputs,
    enabled: enabled,
    aiEnabled: aiEnabled,
    company: company
  })), /*#__PURE__*/React.createElement("div", {
    className: `tab-content ${activeTab === 'assumptions' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(TabAssumptions, {
    model: model,
    setModel: setModel,
    customerMode: customerMode
  })), !customerMode && /*#__PURE__*/React.createElement("div", {
    className: `tab-content ${activeTab === 'admin' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(TabAdmin, {
    theme: theme,
    setTheme: setTheme,
    customerMode: customerMode,
    setCustomerMode: setCustomerMode,
    lockedFields: lockedFields,
    setLockedFields: setLockedFields,
    industry: industry,
    inputs: inputs,
    enabled: enabled,
    onReset: resetAll,
    logoUrl: logoUrl,
    setLogoUrl: setLogoUrl,
    showROI: showROI,
    setShowROI: setShowROI
  })), showROI && /*#__PURE__*/React.createElement("div", {
    className: `tab-content ${activeTab === 'roi' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(TabROI, {
    industry: industry,
    model: model,
    inputs: inputs,
    enabled: enabled,
    aiEnabled: aiEnabled,
    investment: investment,
    setInvestment: setInvestment
  })), versions.length >= 2 && /*#__PURE__*/React.createElement("div", {
    className: `tab-content ${activeTab === 'compare' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(TabCompare, {
    versions: versions,
    setVersions: setVersions
  }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
