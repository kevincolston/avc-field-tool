// Amplitude Value Calculator — data.js
// Self-contained ES module. No external imports required.

// ---------------------------------------------------------------------------
// INDUSTRIES
// ---------------------------------------------------------------------------
const INDUSTRIES = [
  { id: "retail",        label: "Retail / E-Commerce" },
  { id: "saas",          label: "SaaS / Tech" },
  { id: "finserv",       label: "Financial Services" },
  { id: "media",         label: "Media / Entertainment" },
  { id: "proserv",       label: "Prof. & Business Services" },
  { id: "manufacturing", label: "Manufacturing" },
];

// ---------------------------------------------------------------------------
// SOLUTIONS
// ---------------------------------------------------------------------------
const SOLUTIONS = [
  { id: "analytics",          label: "Amplitude Analytics",      color: "#3b82f6", ai: false },
  { id: "cdp",                label: "Amplitude CDP",            color: "#8b5cf6", ai: false },
  { id: "experiment",         label: "Experiment",               color: "#f59e0b", ai: false },
  { id: "replay",             label: "Session Replay",           color: "#10b981", ai: false },
  { id: "guides",             label: "Guides & Surveys",         color: "#ec4899", ai: false },
  { id: "flags",              label: "Feature Flags",            color: "#6366f1", ai: false },
  { id: "global_agent",       label: "Global Agent (AI)",        color: "#06b6d4", ai: true  },
  { id: "specialized_agents", label: "Specialized Agents (AI)",  color: "#14b8a6", ai: true  },
  { id: "pro_services",       label: "Professional Services",    color: "#78716c", ai: false },
];

// ---------------------------------------------------------------------------
// DEFAULT_MODEL
// ---------------------------------------------------------------------------
const DEFAULT_MODEL = { dr: 0.10, ra: 0.15, y1: 0.50, y2: 0.80, y3: 1.00 };

// ---------------------------------------------------------------------------
// THEMES
// ---------------------------------------------------------------------------
const THEMES = {
  amplitude: {
    label: "Amplitude",
    bg: "#0f1629", sf: "#1a2340", s2: "#1e2d52",
    bd: "#2a3860", accent: "#2b7fff", accent2: "#6aacff",
    light: false,
  },
  dark: {
    label: "Dark",
    bg: "#16181d", sf: "#1e2028", s2: "#252830",
    bd: "#32363f", accent: "#7c83f5", accent2: "#b0b5fb",
    light: false,
  },
  neutral: {
    label: "Neutral",
    bg: "#f9fafb", sf: "#ffffff", s2: "#f3f4f6",
    bd: "#e5e7eb", accent: "#2563eb", accent2: "#1d4ed8",
    light: true,
  },
  warmgrey: {
    label: "Warm Grey",
    bg: "#f5f0eb", sf: "#ffffff", s2: "#ede8e2",
    bd: "#d6cfc7", accent: "#92530a", accent2: "#6b3a07",
    light: true,
  },
  coolgrey: {
    label: "Cool Grey",
    bg: "#eef2f7", sf: "#ffffff", s2: "#e2e8f0",
    bd: "#cbd5e1", accent: "#3b5278", accent2: "#1e293b",
    light: true,
  },
  slate: {
    label: "Slate",
    bg: "#1c2535", sf: "#232f42", s2: "#2a3a52",
    bd: "#364d68", accent: "#4db8f0", accent2: "#90d4f7",
    light: false,
  },
  sand: {
    label: "Sand",
    bg: "#faf6f0", sf: "#ffffff", s2: "#f2ece3",
    bd: "#ddd4c5", accent: "#a0521e", accent2: "#7a3c12",
    light: true,
  },
  jcpenney: {
    label: "JCPenney",
    bg: "#1c1214", sf: "#26191b", s2: "#2e2022",
    bd: "#4a2d30", accent: "#c0392b", accent2: "#e06c5e",
    light: false,
  },
  chase: {
    label: "Chase",
    bg: "#0d1a3a", sf: "#162244", s2: "#1c2d57",
    bd: "#2a4080", accent: "#2e86c9", accent2: "#70b4e8",
    light: false,
  },
  disney: {
    label: "Disney",
    bg: "#14102a", sf: "#1c1638", s2: "#241e48",
    bd: "#382e68", accent: "#8b5cf6", accent2: "#b89cf8",
    light: false,
  },
  spotify: {
    label: "Spotify",
    bg: "#151515", sf: "#1c1c1c", s2: "#232323",
    bd: "#333333", accent: "#1aa34a", accent2: "#4cc976",
    light: false,
  },
};

// ---------------------------------------------------------------------------
// FINANCIAL UTILITIES
// ---------------------------------------------------------------------------

/**
 * Format a number as USD currency string.
 * @param {number} n
 * @returns {string}
 */
function fC(n) {
  if (n === null || n === undefined || isNaN(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format a number with comma separators.
 * @param {number} n
 * @returns {string}
 */
function fN(n) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

/**
 * Format a decimal fraction as a percentage string (e.g. 0.125 → "12.5%").
 * @param {number} n
 * @returns {string}
 */
function fP(n) {
  if (n === null || n === undefined || isNaN(n)) return "0%";
  return (n * 100).toFixed(1).replace(/\.0$/, "") + "%";
}

/**
 * Compute 3-year NPV range for a use case.
 * Returns low (risk-adjusted) and high (unadjusted) bands for each year plus totals.
 * @param {number} annual  - 100% realization annual value
 * @param {object} model   - { dr, ra, y1, y2, y3 }
 * @returns {{ y1l:number, y1h:number, y2l:number, y2h:number, y3l:number, y3h:number, tl:number, th:number }}
 */
function tyCalc(annual, model) {
  const m = { ...DEFAULT_MODEL, ...model };
  const discount = (val, yr) => val / Math.pow(1 + m.dr, yr);

  const y1h = discount(annual * m.y1, 1);
  const y2h = discount(annual * m.y2, 2);
  const y3h = discount(annual * m.y3, 3);

  const y1l = y1h * (1 - m.ra);
  const y2l = y2h * (1 - m.ra);
  const y3l = y3h * (1 - m.ra);

  return {
    y1l, y1h,
    y2l, y2h,
    y3l, y3h,
    tl: y1l + y2l + y3l,
    th: y1h + y2h + y3h,
  };
}

/**
 * Add two tyCalc result objects together.
 * @param {object} a
 * @param {object} b
 * @returns {object}
 */
function addTotals(a, b) {
  return {
    y1l: a.y1l + b.y1l, y1h: a.y1h + b.y1h,
    y2l: a.y2l + b.y2l, y2h: a.y2h + b.y2h,
    y3l: a.y3l + b.y3l, y3h: a.y3h + b.y3h,
    tl:  a.tl  + b.tl,  th:  a.th  + b.th,
  };
}

/**
 * Fill in the ifThen narrative template with computed values.
 * Replaces {company}, {rate}, {value}, {customers}, {ftes}, {spend}, {cvr} placeholders.
 * @param {object} uc          - use case object from LIB
 * @param {object} inputs      - field key/value map
 * @param {number} baseValue   - 100% annual value from the final step
 * @param {string} companyName
 * @returns {string}
 */
function generateNarrative(uc, inputs, baseValue, companyName) {
  if (!uc || !uc.ifThen) return "";
  const kpiVal = uc.kpi ? uc.kpi.fn(inputs) : null;
  const opsVal = uc.ops ? uc.ops.fn(inputs) : null;

  return uc.ifThen
    .replace(/\{company\}/g, companyName || "your company")
    .replace(/\{rate\}/g,     kpiVal !== null ? fP(kpiVal) : "")
    .replace(/\{value\}/g,    fC(baseValue))
    .replace(/\{customers\}/g, opsVal !== null ? fN(opsVal) : "")
    .replace(/\{ftes\}/g,     inputs.ftes !== undefined ? fN(inputs.ftes) : "")
    .replace(/\{spend\}/g,    inputs.rv   !== undefined ? fC(inputs.rv * (inputs.ir || 0)) : "")
    .replace(/\{cvr\}/g,      inputs.cv   !== undefined ? fP(inputs.cv) : "");
}

// ---------------------------------------------------------------------------
// LIB — Use Case Library
// ---------------------------------------------------------------------------
const LIB = {

  // =========================================================================
  // RETAIL
  // =========================================================================
  retail: [

    // -----------------------------------------------------------------------
    // 1. Checkout Conversion & Digital Acquisition
    // -----------------------------------------------------------------------
    {
      id: "acq",
      name: "Checkout Conversion & Digital Acquisition",
      cat: "Revenue Growth",
      sol: ["analytics", "cdp", "experiment", "replay"],
      desc: "Identify and eliminate checkout friction to convert more visitors into buyers.",
      ifThen: "If Amplitude can improve {company}'s checkout conversion rate by {rate} — even half the improvement Rappi achieved — that translates to {value} in additional annual profit from existing traffic.",
      benchmarkNote: "Forrester TEI 2023: 9% acquisition improvement; Rappi achieved 15% AOV increase; average cart abandonment ~70%",
      ops: {
        fn: (v) => v.sessions * v.cvr * v.cvr_imp * 12,
        label: "Additional Annual Conversions",
        unit: "conversions",
      },
      kpi: {
        fn: (v) => v.cvr_imp,
        label: "Conversion Rate Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Monthly Sessions in Scope",
          fields: [
            { k: "sessions", l: "Monthly Digital Sessions",      d: 2000000, u: "n",  s: "input" },
            { k: "cvr",      l: "Current Conversion Rate",       d: 0.025,   u: "%",  s: "assumption", n: "Retail avg ~2-3%; Forrester TEI: 9% acquisition improvement" },
            { k: "cvr_imp",  l: "Conversion Rate Improvement",   d: 0.15,    u: "%",  s: "assumption", n: "Relative improvement. Rappi: +15% AOV; Jumbo: +120% CVR" },
          ],
          fn: (v) => v.sessions * v.cvr * v.cvr_imp * 12,
          ft: "Sessions × CVR × CVR Improvement × 12",
          rl: "Additional Annual Conversions",
          ru: "n",
          fin: false,
        },
        {
          id: "s2",
          label: "Revenue Impact",
          fields: [
            { k: "aov", l: "Avg Order Value", d: 85, u: "$", s: "input" },
          ],
          fn: (v, p) => p * v.aov,
          ft: "Additional Conversions × AOV",
          rl: "Additional Annual Revenue",
          ru: "$",
          fin: false,
        },
        {
          id: "s3",
          label: "Profit Impact",
          fields: [
            { k: "m", l: "Profit Margin", d: 0.06, u: "%", s: "assumption" },
          ],
          fn: (v, p) => p * v.m,
          ft: "Revenue × Margin",
          rl: "Annual Profit Impact (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Specialized Agents - Real-Time Personalization",
        sol: ["specialized_agents", "global_agent"],
        fields: [
          { k: "ai_cvr", l: "AI Conversion Lift", d: 0.05, u: "%", s: "assumption", n: "Continuous A/B + personalization loop" },
        ],
        fn: (v, base) => v.sessions * v.cvr * v.ai_cvr * 12 * v.aov * v.m,
        ft: "Sessions × CVR × AI Lift × 12 × AOV × Margin",
      },
    },

    // -----------------------------------------------------------------------
    // 2. Churn Reduction & Retention
    // -----------------------------------------------------------------------
    {
      id: "churn",
      name: "Churn Reduction & Retention",
      cat: "Revenue Protection",
      sol: ["analytics", "cdp", "experiment", "specialized_agents"],
      desc: "Use behavioral signals to detect at-risk customers and trigger retention interventions before they leave.",
      ifThen: "If Amplitude helps {company} reduce churn among its active customer base by just {rate} — a conservative estimate by Forrester TEI standards — {company} could preserve {value} in annual profit.",
      benchmarkNote: "Forrester TEI 2023: 15% retention improvement; Super.com: 90% retention increase",
      ops: {
        fn: (v) => v.cust * v.cr * v.ci,
        label: "Customers Retained",
        unit: "customers",
      },
      kpi: {
        fn: (v) => v.ci,
        label: "Churn Rate Reduction",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Customers at Risk of Churning",
          fields: [
            { k: "cust", l: "Total Active Customers",           d: 5000000, u: "cust", s: "input" },
            { k: "cr",   l: "Annual Churn Rate",                d: 0.20,    u: "%",    s: "assumption", n: "Retail loyalty benchmark; Forrester TEI baseline" },
            { k: "ci",   l: "Churn Reduction with Amplitude",   d: 0.10,    u: "%",    s: "assumption", n: "Forrester TEI 2023: 15% avg; conservative at 10%" },
          ],
          fn: (v) => v.cust * v.cr * v.ci,
          ft: "Customers × Churn Rate × Reduction",
          rl: "Customers Retained",
          ru: "n",
          fin: false,
        },
        {
          id: "s2",
          label: "Revenue Preserved",
          fields: [
            { k: "as", l: "Avg Annual Spend / Customer", d: 336, u: "$", s: "input" },
          ],
          fn: (v, p) => p * v.as,
          ft: "Retained Customers × Annual Spend",
          rl: "Annual Revenue Preserved",
          ru: "$",
          fin: false,
        },
        {
          id: "s3",
          label: "Profit Preserved",
          fields: [
            { k: "m", l: "Profit Margin", d: 0.06, u: "%", s: "assumption" },
          ],
          fn: (v, p) => p * v.m,
          ft: "Revenue × Margin",
          rl: "Annual Profit Preserved (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Specialized Agents Predictive Churn",
        sol: ["specialized_agents"],
        fields: [
          { k: "aib", l: "Additional AI Churn Reduction", d: 0.05, u: "%", s: "assumption", n: "Predictive scoring + proactive alerts" },
        ],
        fn: (v, base) => v.cust * v.cr * v.aib * v.as * v.m,
        ft: "Customers × Churn × AI Boost × Spend × Margin",
      },
    },

    // -----------------------------------------------------------------------
    // 3. Increased Monetization
    // -----------------------------------------------------------------------
    {
      id: "monet",
      name: "Increased Monetization",
      cat: "Revenue Growth",
      sol: ["analytics", "cdp", "experiment", "guides"],
      desc: "Drive incremental spend from existing loyalty and non-loyalty customers through personalized offers and journey optimization.",
      ifThen: "If Amplitude can lift monetization by {rate} across {company}'s addressable customer base — generating an additional {spend} in annual spend per impacted customer — {company} would generate {value} in incremental annual profit.",
      benchmarkNote: "Forrester TEI 2023: 40% monetization improvement; Jumbo: user retention +18%",
      ops: {
        fn: (v) => (v.loy + v.nl) * v.ir,
        label: "Customers Reached",
        unit: "customers",
      },
      kpi: {
        fn: (v) => v.ir,
        label: "Monetization Uplift Rate",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Customers in Scope",
          fields: [
            { k: "loy", l: "Loyalty Members",             d: 2000000, u: "cust", s: "input" },
            { k: "nl",  l: "Non-Loyalty Active",          d: 500000,  u: "cust", s: "input" },
            { k: "ir",  l: "Monetization Impact Rate",    d: 0.10,    u: "%",    s: "assumption", n: "Forrester TEI 2023: 40% monetization improvement; apply conservatively" },
          ],
          fn: (v) => (v.loy + v.nl) * v.ir,
          ft: "(Loyalty + Non-Loyalty) × Impact Rate",
          rl: "Customers in Scope",
          ru: "n",
          fin: false,
        },
        {
          id: "s2",
          label: "Incremental Revenue",
          fields: [
            { k: "rv", l: "Incremental Rev / Customer", d: 40, u: "$", s: "assumption", n: "1-2 extra purchases/trips per year" },
          ],
          fn: (v, p) => p * v.rv,
          ft: "Customers × Incremental Rev",
          rl: "Incremental Revenue",
          ru: "$",
          fin: false,
        },
        {
          id: "s3",
          label: "Incremental Profit",
          fields: [
            { k: "m", l: "Profit Margin", d: 0.06, u: "%", s: "assumption" },
          ],
          fn: (v, p) => p * v.m,
          ft: "Revenue × Margin",
          rl: "Incremental Profit (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Agent-Driven Personalization",
        sol: ["specialized_agents", "global_agent"],
        fields: [
          { k: "ail", l: "AI Monetization Lift", d: 0.03, u: "%", s: "assumption", n: "Continuous optimization loop" },
        ],
        fn: (v, base) => (v.loy + v.nl) * v.ail * v.rv * v.m,
        ft: "Customers × AI Lift × Rev × Margin",
      },
    },

    // -----------------------------------------------------------------------
    // 4. Loyalty Membership Uplift
    // -----------------------------------------------------------------------
    {
      id: "loyalty",
      name: "Loyalty Membership Uplift",
      cat: "Revenue Growth",
      sol: ["analytics", "cdp", "experiment", "replay"],
      desc: "Convert high-potential non-loyalty shoppers into loyalty members who spend significantly more.",
      ifThen: "If Amplitude helps {company} convert {rate} of active non-loyalty customers into members, {company} could add {customers} new loyalty members generating {value} in annual profit.",
      benchmarkNote: "Industry: loyalty members spend 2-3x more than non-members; Amplitude enables behavioral targeting of high-potential non-members",
      ops: {
        fn: (v) => v.pool * v.cv,
        label: "New Loyalty Members",
        unit: "customers",
      },
      kpi: {
        fn: (v) => v.cv,
        label: "Loyalty Enrollment Conversion Rate",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Conversions",
          fields: [
            { k: "pool", l: "Non-Loyalty Active Customers",   d: 500000, u: "cust", s: "input" },
            { k: "cv",   l: "Enrollment Conversion Rate",     d: 0.15,   u: "%",    s: "assumption", n: "Conservative; Amplitude helps target high-intent shoppers" },
          ],
          fn: (v) => v.pool * v.cv,
          ft: "Non-Loyalty Pool × Conversion Rate",
          rl: "New Loyalty Members",
          ru: "n",
          fin: false,
        },
        {
          id: "s2",
          label: "Revenue",
          fields: [
            { k: "rv", l: "Incremental Rev / New Member", d: 45, u: "$", s: "assumption", n: "Loyalty members spend ~2x more; $45 incremental conservatively" },
          ],
          fn: (v, p) => p * v.rv,
          ft: "New Members × Incremental Rev",
          rl: "Incremental Revenue",
          ru: "$",
          fin: false,
        },
        {
          id: "s3",
          label: "Profit",
          fields: [
            { k: "m", l: "Profit Margin", d: 0.06, u: "%", s: "assumption" },
          ],
          fn: (v, p) => p * v.m,
          ft: "Revenue × Margin",
          rl: "Profit (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 5. Productivity & Efficiency Gains
    // -----------------------------------------------------------------------
    {
      id: "prod",
      name: "Productivity & Efficiency Gains",
      cat: "Cost Savings",
      sol: ["analytics", "cdp", "experiment", "global_agent"],
      desc: "Eliminate manual data requests and reporting bottlenecks to free analyst, PM, and marketing capacity for higher-value work.",
      ifThen: "If Amplitude improves productivity for {ftes} of {company}'s analysts, product managers, and marketers by eliminating {rate} of manual data work, {company} gains {value} in recaptured capacity annually.",
      benchmarkNote: "Forrester TEI 2023: 50% reduction in ad-hoc data requests; 5-20% of analyst/PM work impacted",
      ops: {
        fn: (v) => v.ftes * v.pw * v.imp * 2080,
        label: "Hours Recaptured Annually",
        unit: "hours",
      },
      kpi: {
        fn: (v) => v.pw * v.imp,
        label: "Productivity Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Value per FTE",
          fields: [
            { k: "ftes", l: "# of FTEs Impacted",          d: 30,      u: "FTEs", s: "input" },
            { k: "pw",   l: "% of Work Impacted",           d: 0.10,    u: "%",    s: "assumption", n: "Forrester TEI: 5-20% of analytics/product/marketing work" },
            { k: "imp",  l: "Productivity Improvement",     d: 0.80,    u: "%",    s: "assumption", n: "Forrester TEI: 50% reduction in ad-hoc requests" },
            { k: "sal",  l: "Annual Salary + Benefits",     d: 140000,  u: "$",    s: "assumption" },
            { k: "va",   l: "Value Add Rate",               d: 0.50,    u: "%",    s: "assumption", n: "% of recaptured time spent on higher-value work" },
          ],
          fn: (v) => v.sal * v.pw * v.imp * v.va,
          ft: "Salary × % Work × Improvement × Value Add",
          rl: "Value / FTE",
          ru: "$",
          fin: false,
        },
        {
          id: "s2",
          label: "Total Value",
          fields: [],
          fn: (v, p) => p * v.ftes,
          ft: "Value/FTE × FTEs",
          rl: "Total Productivity Value (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Global Agent + Specialized Agents",
        sol: ["global_agent", "specialized_agents"],
        fields: [
          { k: "aip", l: "Additional AI Automation", d: 0.08, u: "%", s: "assumption", n: "NL queries + automated monitoring" },
        ],
        fn: (v, base) => v.sal * v.aip * v.imp * v.va * v.ftes,
        ft: "Salary × AI% × Imp × VA × FTEs",
      },
    },

    // -----------------------------------------------------------------------
    // 6. Tech Stack Consolidation
    // -----------------------------------------------------------------------
    {
      id: "tech",
      name: "Tech Stack Consolidation",
      cat: "Cost Savings",
      sol: ["analytics", "cdp", "experiment"],
      desc: "Replace redundant BI, analytics, and experimentation tools with Amplitude.",
      ifThen: "If {company} consolidates {rate} of its overlapping analytics and BI spend onto Amplitude, the annual savings of {value} compound into meaningful TCO reduction while also reducing data silos and improving team velocity.",
      benchmarkNote: "Amplitude replaces legacy BI, analytics, and experimentation point solutions; Forrester TEI 2023: 217% ROI",
      ops: {
        fn: (v) => Math.round((v.rd || 0.5) * 10),
        label: "Redundant Tools Eliminated (est.)",
        unit: "tools",
      },
      kpi: {
        fn: (v) => v.rd || 0.5,
        label: "Tech Stack Cost Reduction",
        unit: "%",
      },
      subcalcs: {
        sc1: {
          label: "License Cost Reduction",
          steps: [
            {
              id: "s1",
              label: "Redundant Spend",
              fields: [
                { k: "sp", l: "Redundant Software Spend", d: 500000, u: "$", s: "input", n: "Legacy BI, analytics, experimentation tools" },
              ],
              fn: (v) => v.sp,
              ft: "Redundant Software Spend",
              rl: "Annual Redundant Spend",
              ru: "$",
              fin: false,
            },
            {
              id: "s2",
              label: "License Savings",
              fields: [
                { k: "rd", l: "% Reduction", d: 0.50, u: "%", s: "assumption", n: "Amplitude replaces 40-60% of point solutions" },
              ],
              fn: (v, p) => p * v.rd,
              ft: "Redundant Spend × % Reduction",
              rl: "Annual License Savings (100%)",
              ru: "$",
              fin: true,
            },
          ],
        },
        sc2: {
          label: "Operational Efficiency",
          steps: [
            {
              id: "s3",
              label: "Operational Savings",
              fields: [
                { k: "tftes", l: "Impacted FTEs",             d: 10,     u: "FTEs", s: "input",      n: "Analysts/PMs managing multiple tools" },
                { k: "tsal",  l: "Avg Salary + Benefits",      d: 140000, u: "$",    s: "assumption" },
                { k: "thr",   l: "Hours Saved / Week / Person", d: 3,      u: "hrs",  s: "assumption", n: "Context switching + duplicate work" },
              ],
              fn: (v) => v.tftes * v.tsal * (v.thr / 40),
              ft: "FTEs × Salary × (Hours Saved / 40)",
              rl: "Annual Efficiency Value (100%)",
              ru: "$",
              fin: true,
            },
          ],
        },
      },
      // Flat steps for compatibility with single-step renderers
      steps: [
        {
          id: "s1",
          label: "Redundant Spend",
          fields: [
            { k: "sp", l: "Redundant Software Spend", d: 500000, u: "$", s: "input", n: "Legacy BI, analytics, experimentation tools" },
          ],
          fn: (v) => v.sp,
          ft: "Redundant Software Spend",
          rl: "Annual Redundant Spend",
          ru: "$",
          fin: false,
        },
        {
          id: "s2",
          label: "License Savings",
          fields: [
            { k: "rd", l: "% Reduction", d: 0.50, u: "%", s: "assumption", n: "Amplitude replaces 40-60% of point solutions" },
          ],
          fn: (v, p) => p * v.rd,
          ft: "Redundant Spend × % Reduction",
          rl: "Annual License Savings",
          ru: "$",
          fin: false,
        },
        {
          id: "s3",
          label: "Operational Savings",
          fields: [
            { k: "tftes", l: "Impacted FTEs",              d: 10,     u: "FTEs", s: "input",      n: "Analysts/PMs managing multiple tools" },
            { k: "tsal",  l: "Avg Salary + Benefits",       d: 140000, u: "$",    s: "assumption" },
            { k: "thr",   l: "Hours Saved / Week / Person", d: 3,      u: "hrs",  s: "assumption", n: "Context switching + duplicate work" },
          ],
          fn: (v) => v.tftes * v.tsal * (v.thr / 40),
          ft: "FTEs × Salary × (Hours / 40)",
          rl: "Annual Efficiency Value (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

  ],

  // =========================================================================
  // SAAS
  // =========================================================================
  saas: [

    // -----------------------------------------------------------------------
    // 1. Net Revenue Retention
    // -----------------------------------------------------------------------
    {
      id: "nrr",
      name: "Net Revenue Retention",
      cat: "Revenue Protection",
      sol: ["analytics", "cdp", "experiment"],
      desc: "Reduce gross revenue churn by identifying at-risk accounts before they cancel or downgrade.",
      ifThen: "If Amplitude helps {company} reduce gross revenue churn by {rate}, the {value} in preserved ARR compounds significantly — improving NRR and extending the lifetime of every dollar of existing ARR.",
      benchmarkNote: "Forrester TEI: 15% churn reduction; WeMoney: Amplitude paid for itself 20x",
      ops: {
        fn: (v) => v.arr * v.ch * v.rd,
        label: "ARR Preserved",
        unit: "$",
      },
      kpi: {
        fn: (v) => v.rd,
        label: "Churn Reduction",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Revenue Preserved",
          fields: [
            { k: "arr", l: "Annual Recurring Revenue (ARR)", d: 50000000, u: "$",  s: "input" },
            { k: "ch",  l: "Gross Revenue Churn",            d: 0.12,     u: "%",  s: "input" },
            { k: "rd",  l: "Churn Reduction with Amplitude", d: 0.15,     u: "%",  s: "assumption", n: "Forrester TEI avg; WeMoney 2x CAC reduction" },
          ],
          fn: (v) => v.arr * v.ch * v.rd,
          ft: "ARR × Gross Churn × Reduction",
          rl: "ARR Preserved (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Predictive Churn Alerts",
        sol: ["specialized_agents"],
        fields: [
          { k: "aib", l: "AI Boost", d: 0.05, u: "%", s: "assumption" },
        ],
        fn: (v, base) => v.arr * v.ch * v.aib,
        ft: "ARR × Churn × AI Boost",
      },
    },

    // -----------------------------------------------------------------------
    // 2. Expansion & Upsell
    // -----------------------------------------------------------------------
    {
      id: "sexp",
      name: "Expansion & Upsell",
      cat: "Revenue Growth",
      sol: ["analytics", "cdp", "guides"],
      desc: "Surface product usage signals that indicate upsell and cross-sell readiness across the customer base.",
      ifThen: "If Amplitude surfaces expansion signals across {rate} of {company}'s eligible accounts, and converts {cvr} of those to expansions, that unlocks {value} in net new ARR from the existing customer base.",
      benchmarkNote: "Product-led expansion: usage signals are the strongest predictor of upsell readiness",
      ops: {
        fn: (v) => v.acc * v.el * v.cv,
        label: "Expansion Deals Closed",
        unit: "accounts",
      },
      kpi: {
        fn: (v) => v.el,
        label: "Eligible for Expansion",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Expansion Revenue",
          fields: [
            { k: "acc", l: "Total Accounts",                  d: 2000,   u: "n",  s: "input" },
            { k: "el",  l: "% Eligible for Expansion",        d: 0.25,   u: "%",  s: "assumption" },
            { k: "val", l: "Avg Expansion Value",             d: 15000,  u: "$",  s: "assumption" },
            { k: "cv",  l: "Conversion Rate",                 d: 0.20,   u: "%",  s: "assumption" },
          ],
          fn: (v) => v.acc * v.el * v.val * v.cv,
          ft: "Accounts × Eligible% × Expansion Value × CVR",
          rl: "Annual Expansion ARR (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Productivity & Efficiency
    // -----------------------------------------------------------------------
    {
      id: "sp",
      name: "Productivity & Efficiency",
      cat: "Cost Savings",
      sol: ["analytics", "cdp", "global_agent"],
      desc: "Give product and data teams self-serve analytics to eliminate analyst queue time and unblock roadmap decisions.",
      ifThen: "If Amplitude gives {company}'s product and data teams self-serve analytics, eliminating {rate} of analyst queue time for {ftes} FTEs, that recaptures {value} annually in high-value engineering and product capacity.",
      benchmarkNote: "Forrester TEI 2023: 50% reduction in ad-hoc data requests",
      ops: {
        fn: (v) => v.ftes * v.pw * v.imp * 2080,
        label: "Hours Recaptured Annually",
        unit: "hours",
      },
      kpi: {
        fn: (v) => v.pw * v.imp,
        label: "Productivity Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Productivity Value",
          fields: [
            { k: "ftes", l: "FTEs Impacted",             d: 20,     u: "FTEs", s: "input" },
            { k: "sal",  l: "Annual Salary + Benefits",   d: 160000, u: "$",    s: "assumption" },
            { k: "pw",   l: "% of Work Impacted",         d: 0.15,   u: "%",    s: "assumption", n: "Forrester TEI: 50% ad-hoc reduction" },
            { k: "imp",  l: "Productivity Improvement",   d: 0.80,   u: "%",    s: "assumption" },
            { k: "va",   l: "Value Add Rate",             d: 0.50,   u: "%",    s: "assumption" },
          ],
          fn: (v) => v.sal * v.pw * v.imp * v.va * v.ftes,
          ft: "Salary × % Work × Improvement × Value Add × FTEs",
          rl: "Total Productivity Value (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Global Agent Automation",
        sol: ["global_agent"],
        fields: [
          { k: "aip", l: "AI Automation %", d: 0.10, u: "%", s: "assumption" },
        ],
        fn: (v, base) => v.sal * v.aip * v.imp * v.va * v.ftes,
        ft: "Salary × AI% × Imp × VA × FTEs",
      },
    },

    // -----------------------------------------------------------------------
    // 4. Tech Consolidation
    // -----------------------------------------------------------------------
    {
      id: "stc",
      name: "Tech Stack Consolidation",
      cat: "Cost Savings",
      sol: ["analytics", "experiment"],
      desc: "Eliminate redundant analytics and experimentation point solutions by consolidating onto Amplitude.",
      ifThen: "By consolidating onto Amplitude, {company} can eliminate {value} in annual redundant analytics and experimentation tool spend while gaining a unified platform for product, marketing, and data.",
      benchmarkNote: "Forrester TEI 2023: 217% ROI; Amplitude replaces legacy BI, analytics, and experimentation tools",
      ops: {
        fn: (v) => Math.round((v.rd || 0.4) * 10),
        label: "Redundant Tools Eliminated (est.)",
        unit: "tools",
      },
      kpi: {
        fn: (v) => v.rd || 0.4,
        label: "Tech Stack Cost Reduction",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Tech Consolidation Savings",
          fields: [
            { k: "sp", l: "Redundant Analytics / Experimentation Spend", d: 300000, u: "$",  s: "input" },
            { k: "rd", l: "% Reduction",                                  d: 0.40,   u: "%",  s: "assumption" },
          ],
          fn: (v) => v.sp * v.rd,
          ft: "Redundant Spend × % Reduction",
          rl: "Annual Savings (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

  ],

  // =========================================================================
  // FINSERV
  // =========================================================================
  finserv: [

    // -----------------------------------------------------------------------
    // 1. Customer Attrition Prevention
    // -----------------------------------------------------------------------
    {
      id: "fa",
      name: "Customer Attrition Prevention",
      cat: "Revenue Protection",
      sol: ["analytics", "cdp", "specialized_agents"],
      desc: "Detect early behavioral signals of customer attrition before accounts are lost to competitors.",
      ifThen: "If Amplitude helps {company} reduce customer attrition by {rate} — detecting early signals before customers leave for competitors — {company} could preserve {value} in net revenue and protect margin.",
      benchmarkNote: "Forrester TEI 2023: 15% retention improvement; digital-first engagement reduces attrition",
      ops: {
        fn: (v) => v.rv * v.at * v.rd,
        label: "Revenue Protected",
        unit: "$",
      },
      kpi: {
        fn: (v) => v.rd,
        label: "Attrition Reduction",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Profit Preserved",
          fields: [
            { k: "rv", l: "Digital Revenue",                  d: 500000000, u: "$",  s: "input" },
            { k: "at", l: "Annual Attrition Rate",            d: 0.08,      u: "%",  s: "input" },
            { k: "rd", l: "Attrition Reduction with Amplitude", d: 0.10,    u: "%",  s: "assumption", n: "Conservative Forrester TEI baseline" },
            { k: "m",  l: "Net Margin",                       d: 0.15,      u: "%",  s: "assumption" },
          ],
          fn: (v) => v.rv * v.at * v.rd * v.m,
          ft: "Revenue × Attrition × Reduction × Margin",
          rl: "Annual Profit Preserved (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Early Warning System",
        sol: ["specialized_agents"],
        fields: [
          { k: "air", l: "AI Early Warning Boost", d: 0.04, u: "%", s: "assumption" },
        ],
        fn: (v, base) => v.rv * v.at * v.air * v.m,
        ft: "Revenue × Attrition × AI Boost × Margin",
      },
    },

    // -----------------------------------------------------------------------
    // 2. Digital Channel Acquisition
    // -----------------------------------------------------------------------
    {
      id: "facq",
      name: "Digital Channel Acquisition",
      cat: "Revenue Growth",
      sol: ["analytics", "experiment", "guides", "replay"],
      desc: "Improve digital onboarding activation rates to convert more applicants into active digital customers.",
      ifThen: "If Amplitude improves digital onboarding activation by {rate} — converting more applicants who start the process to active digital users — {company} could add {customers} new digital customers generating {value} annually.",
      benchmarkNote: "Digital interactions cost $0.10 vs $4-$8 for branch/call center; Amplitude improves digital activation by 9% (Forrester TEI)",
      ops: {
        fn: (v) => v.apps * v.act * v.imp * 12,
        label: "Additional Activated Customers/Yr",
        unit: "customers",
      },
      kpi: {
        fn: (v) => v.imp,
        label: "Activation Rate Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Additional Activated Customers",
          fields: [
            { k: "apps", l: "Monthly Digital Applications",    d: 50000, u: "n",  s: "input" },
            { k: "act",  l: "Current Activation Rate",         d: 0.35,  u: "%",  s: "input" },
            { k: "imp",  l: "Activation Rate Improvement",     d: 0.10,  u: "%",  s: "assumption", n: "Forrester TEI: 9% acquisition improvement" },
          ],
          fn: (v) => v.apps * v.act * v.imp * 12,
          ft: "Applications × Activation × Improvement × 12",
          rl: "Additional Activated Customers / Yr",
          ru: "n",
          fin: false,
        },
        {
          id: "s2",
          label: "Annual Revenue Impact",
          fields: [
            { k: "arpu", l: "Annual Revenue / Activated Customer", d: 800, u: "$", s: "assumption" },
          ],
          fn: (v, p) => p * v.arpu,
          ft: "New Customers × Annual ARPU",
          rl: "Annual Revenue Impact",
          ru: "$",
          fin: false,
        },
        {
          id: "s3",
          label: "Annual Profit",
          fields: [
            { k: "m", l: "Net Margin", d: 0.15, u: "%", s: "assumption" },
          ],
          fn: (v, p) => p * v.m,
          ft: "Revenue × Margin",
          rl: "Annual Profit (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Digital Deflection / Cost Reduction
    // -----------------------------------------------------------------------
    {
      id: "fd",
      name: "Digital Deflection / Cost Reduction",
      cat: "Cost Savings",
      sol: ["analytics", "experiment", "guides", "replay"],
      desc: "Shift costly branch and call center interactions to low-cost digital self-service channels.",
      ifThen: "If Amplitude helps {company} deflect {rate} of costly branch and call center interactions to digital channels, {company} can save {value} annually while improving the customer experience.",
      benchmarkNote: "Industry: digital interactions cost $0.10 vs $8-12 for branch/call center",
      ops: {
        fn: (v) => v.calls * v.df * 12,
        label: "Interactions Deflected Annually",
        unit: "interactions",
      },
      kpi: {
        fn: (v) => v.df,
        label: "Digital Deflection Rate",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Deflection Savings",
          fields: [
            { k: "calls", l: "Monthly High-Cost Interactions",  d: 200000, u: "n",  s: "input" },
            { k: "cost",  l: "Cost / Interaction",              d: 12,     u: "$",  s: "input" },
            { k: "df",    l: "Digital Deflection Rate",         d: 0.08,   u: "%",  s: "assumption", n: "Industry: digital costs $0.10 vs $8-12 for branch/call" },
          ],
          fn: (v) => v.calls * v.cost * v.df * 12,
          ft: "Interactions × Cost × Deflection Rate × 12",
          rl: "Annual Deflection Savings (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 4. Productivity & Efficiency
    // -----------------------------------------------------------------------
    {
      id: "fp",
      name: "Productivity & Efficiency",
      cat: "Cost Savings",
      sol: ["analytics", "cdp", "global_agent"],
      desc: "Reduce manual data request burden for compliance, risk, and product analytics teams.",
      ifThen: "With Amplitude's self-serve analytics, {ftes} of {company}'s compliance, risk, and product analysts spend {rate} less time on manual data requests — recapturing {value} in annual capacity.",
      benchmarkNote: "Forrester TEI 2023: 50% reduction in ad-hoc data requests",
      ops: {
        fn: (v) => v.ftes * v.pw * v.imp * 2080,
        label: "Hours Recaptured Annually",
        unit: "hours",
      },
      kpi: {
        fn: (v) => v.pw * v.imp,
        label: "Productivity Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Productivity Value",
          fields: [
            { k: "ftes", l: "FTEs Impacted",           d: 40,     u: "FTEs", s: "input" },
            { k: "sal",  l: "Annual Salary + Benefits", d: 175000, u: "$",    s: "assumption" },
            { k: "pw",   l: "% of Work Impacted",       d: 0.10,   u: "%",    s: "assumption", n: "Forrester TEI: 50% ad-hoc reduction" },
            { k: "imp",  l: "Productivity Improvement", d: 0.80,   u: "%",    s: "assumption" },
            { k: "va",   l: "Value Add Rate",           d: 0.50,   u: "%",    s: "assumption" },
          ],
          fn: (v) => v.sal * v.pw * v.imp * v.va * v.ftes,
          ft: "Salary × % Work × Improvement × Value Add × FTEs",
          rl: "Total Productivity Value (100%)",
          ru: "$",
          fin: true,
        },
      ],
      ai: {
        label: "AI: Global Agent Automation",
        sol: ["global_agent"],
        fields: [
          { k: "aip", l: "AI Automation", d: 0.06, u: "%", s: "assumption" },
        ],
        fn: (v, base) => v.sal * v.aip * v.imp * v.va * v.ftes,
        ft: "Salary × AI% × Imp × VA × FTEs",
      },
    },

  ],

  // =========================================================================
  // MEDIA
  // =========================================================================
  media: [

    // -----------------------------------------------------------------------
    // 1. Subscriber Retention
    // -----------------------------------------------------------------------
    {
      id: "mr",
      name: "Subscriber Retention",
      cat: "Revenue Protection",
      sol: ["analytics", "cdp", "experiment"],
      desc: "Identify disengagement signals and intervene before subscribers cancel.",
      ifThen: "If Amplitude helps {company} reduce monthly subscriber churn by {rate} — on par with what Le Monde and NBC achieved — {company} could retain {customers} additional subscribers and preserve {value} in annual recurring revenue.",
      benchmarkNote: "Forrester TEI: 15% retention improvement; Le Monde: 20% conversion boost; NBC: 2x user retention",
      ops: {
        fn: (v) => v.sub * v.ch * v.rd,
        label: "Subscribers Retained",
        unit: "subscribers",
      },
      kpi: {
        fn: (v) => v.rd,
        label: "Churn Reduction",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Revenue Preserved",
          fields: [
            { k: "sub",  l: "Total Subscribers",                    d: 1000000, u: "cust", s: "input" },
            { k: "arpu", l: "Monthly ARPU",                         d: 12,      u: "$",    s: "input" },
            { k: "ch",   l: "Monthly Churn Rate",                   d: 0.04,    u: "%",    s: "input" },
            { k: "rd",   l: "Churn Reduction with Amplitude",       d: 0.12,    u: "%",    s: "assumption", n: "Forrester TEI: 15% avg; NBC: 2x retention" },
          ],
          fn: (v) => v.sub * v.arpu * 12 * v.ch * v.rd,
          ft: "Subscribers × Monthly ARPU × 12 × Churn × Reduction",
          rl: "Annual Revenue Preserved (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 2. Free-to-Paid Conversion
    // -----------------------------------------------------------------------
    {
      id: "macq",
      name: "Free-to-Paid Conversion",
      cat: "Revenue Growth",
      sol: ["analytics", "experiment", "guides", "flags"],
      desc: "Convert free users to paid subscribers through optimized upgrade flows and targeted nudges.",
      ifThen: "If Amplitude improves {company}'s free-to-paid conversion rate by {rate} — consistent with Le Monde's results — {company} could convert {customers} additional subscribers monthly generating {value} in incremental ARR.",
      benchmarkNote: "Le Monde: 20% conversion lift; Forrester TEI: 40% monetization improvement; avg free-to-paid ~2%",
      ops: {
        fn: (v) => v.free * v.cv * v.imp * 12,
        label: "Additional Annual Paid Subscribers",
        unit: "subscribers",
      },
      kpi: {
        fn: (v) => v.imp,
        label: "Conversion Rate Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Additional Paid Subscribers",
          fields: [
            { k: "free", l: "Free Users",                     d: 5000000, u: "n",  s: "input" },
            { k: "cv",   l: "Current Conversion Rate",        d: 0.02,    u: "%",  s: "input" },
            { k: "imp",  l: "Conversion Improvement",         d: 0.15,    u: "%",  s: "assumption", n: "Le Monde: 20%; Forrester TEI: 40% monetization uplift" },
          ],
          fn: (v) => v.free * v.cv * v.imp * 12,
          ft: "Free Users × CVR × Improvement × 12",
          rl: "Additional Annual Paid Subscribers",
          ru: "n",
          fin: false,
        },
        {
          id: "s2",
          label: "Incremental ARR",
          fields: [
            { k: "val", l: "Annual Subscription Value", d: 120, u: "$", s: "input" },
          ],
          fn: (v, p) => p * v.val,
          ft: "New Subscribers × Annual Value",
          rl: "Incremental ARR (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Engagement & Content Optimization
    // -----------------------------------------------------------------------
    {
      id: "meng",
      name: "Engagement & Content Optimization",
      cat: "Revenue Growth",
      sol: ["analytics", "experiment", "replay"],
      desc: "Reduce search-and-discovery friction so users spend more time watching and less time searching.",
      ifThen: "If Amplitude reveals which content keeps {company}'s subscribers engaged and reduces search-to-play friction — viewers spend 10.5 min searching — {company} could improve engagement by {rate} and reduce churn-driven by low engagement.",
      benchmarkNote: "Viewers spend 10.5 min searching per session; 20% of churn attributed to content discovery friction",
      ops: {
        fn: (v) => v.mau * (1 - v.eng) * v.imp,
        label: "Users Re-Engaged",
        unit: "users",
      },
      kpi: {
        fn: (v) => v.imp,
        label: "Engagement Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Engagement Revenue",
          fields: [
            { k: "mau",    l: "Monthly Active Users",          d: 500000, u: "n",  s: "input" },
            { k: "eng",    l: "Current Engagement Rate",       d: 0.45,   u: "%",  s: "input" },
            { k: "imp",    l: "Engagement Improvement",        d: 0.15,   u: "%",  s: "assumption", n: "Viewers spend 10.5 min searching; 20% churn due to content friction" },
            { k: "arpu_m", l: "Monthly ARPU",                  d: 12,     u: "$",  s: "input" },
          ],
          fn: (v) => v.mau * (1 - v.eng) * v.imp * v.arpu_m * 12,
          ft: "MAU × (1 - Engagement) × Improvement × Monthly ARPU × 12",
          rl: "Annual Revenue Impact (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 4. Productivity
    // -----------------------------------------------------------------------
    {
      id: "mprod",
      name: "Productivity & Efficiency",
      cat: "Cost Savings",
      sol: ["analytics", "global_agent"],
      desc: "Reduce manual analytics and reporting work for content, product, and marketing teams.",
      ifThen: "With Amplitude, {ftes} of {company}'s content, product, and marketing teams spend {rate} less time on manual data requests, recapturing {value} in capacity annually.",
      benchmarkNote: "Forrester TEI 2023: 50% reduction in ad-hoc data requests",
      ops: {
        fn: (v) => v.ftes * v.pw * v.imp * 2080,
        label: "Hours Recaptured Annually",
        unit: "hours",
      },
      kpi: {
        fn: (v) => v.pw * v.imp,
        label: "Productivity Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Productivity Value",
          fields: [
            { k: "ftes", l: "FTEs Impacted",           d: 20,     u: "FTEs", s: "input" },
            { k: "sal",  l: "Annual Salary + Benefits", d: 150000, u: "$",    s: "assumption" },
            { k: "pw",   l: "% of Work Impacted",       d: 0.12,   u: "%",    s: "assumption" },
            { k: "imp",  l: "Productivity Improvement", d: 0.80,   u: "%",    s: "assumption" },
            { k: "va",   l: "Value Add Rate",           d: 0.50,   u: "%",    s: "assumption" },
          ],
          fn: (v) => v.sal * v.pw * v.imp * v.va * v.ftes,
          ft: "Salary × % Work × Improvement × Value Add × FTEs",
          rl: "Total Productivity Value (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

  ],

  // =========================================================================
  // PROSERV
  // =========================================================================
  proserv: [

    // -----------------------------------------------------------------------
    // 1. Client Retention
    // -----------------------------------------------------------------------
    {
      id: "pr",
      name: "Client Retention",
      cat: "Revenue Protection",
      sol: ["analytics", "cdp"],
      desc: "Give client success teams behavioral signals to identify at-risk clients before they churn.",
      ifThen: "If Amplitude gives {company}'s client success teams behavioral signals to identify at-risk clients before they churn, reducing attrition by {rate}, {company} could preserve {value} in annual client revenue.",
      benchmarkNote: "Forrester TEI 2023: 15% retention improvement; behavioral signals surface churn 60+ days earlier",
      ops: {
        fn: (v) => v.rv * v.ch * v.rd,
        label: "Revenue Protected",
        unit: "$",
      },
      kpi: {
        fn: (v) => v.rd,
        label: "Client Churn Reduction",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Profit Preserved",
          fields: [
            { k: "rv", l: "Client Revenue",                      d: 200000000, u: "$",  s: "input" },
            { k: "ch", l: "Client Churn Rate",                   d: 0.10,      u: "%",  s: "input" },
            { k: "rd", l: "Reduction with Amplitude",            d: 0.12,      u: "%",  s: "assumption" },
            { k: "m",  l: "Margin",                              d: 0.20,      u: "%",  s: "assumption" },
          ],
          fn: (v) => v.rv * v.ch * v.rd * v.m,
          ft: "Revenue × Churn × Reduction × Margin",
          rl: "Annual Profit Preserved (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 2. New Business Conversion
    // -----------------------------------------------------------------------
    {
      id: "pacq",
      name: "New Business Conversion",
      cat: "Revenue Growth",
      sol: ["analytics", "experiment", "guides"],
      desc: "Improve the conversion rate of digital-first prospecting and onboarding flows.",
      ifThen: "If Amplitude helps {company} improve the conversion rate of its digital-first prospecting and onboarding flows by {rate}, that translates to {value} in net new client revenue annually.",
      benchmarkNote: "Forrester TEI 2023: 9% acquisition improvement; digital onboarding reduces friction",
      ops: {
        fn: (v) => v.leads * v.cv * v.imp * 12,
        label: "Additional Clients / Yr",
        unit: "clients",
      },
      kpi: {
        fn: (v) => v.imp,
        label: "Conversion Rate Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "New Client Revenue",
          fields: [
            { k: "leads", l: "Monthly Qualified Leads",           d: 500,   u: "n",  s: "input" },
            { k: "cv",    l: "Current Digital Conversion Rate",   d: 0.08,  u: "%",  s: "input" },
            { k: "imp",   l: "Conversion Improvement",            d: 0.15,  u: "%",  s: "assumption" },
            { k: "val",   l: "Avg Client Value",                  d: 50000, u: "$",  s: "assumption" },
          ],
          fn: (v) => v.leads * v.cv * v.imp * 12 * v.val,
          ft: "Leads × CVR × Improvement × 12 × Client Value",
          rl: "Annual New Client Revenue (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Productivity
    // -----------------------------------------------------------------------
    {
      id: "pp",
      name: "Productivity & Efficiency",
      cat: "Cost Savings",
      sol: ["analytics", "global_agent"],
      desc: "Reduce manual data requests and reporting so consultants spend more time on billable work.",
      ifThen: "With Amplitude, {ftes} of {company}'s consultants and analysts spend {rate} less time on manual data requests and reporting, recapturing {value} in billable capacity annually.",
      benchmarkNote: "Forrester TEI 2023: 50% reduction in ad-hoc data requests",
      ops: {
        fn: (v) => v.ftes * v.pw * v.imp * 2080,
        label: "Hours Recaptured Annually",
        unit: "hours",
      },
      kpi: {
        fn: (v) => v.pw * v.imp,
        label: "Productivity Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Productivity Value",
          fields: [
            { k: "ftes", l: "FTEs Impacted",           d: 25,     u: "FTEs", s: "input" },
            { k: "sal",  l: "Annual Salary + Benefits", d: 150000, u: "$",    s: "assumption" },
            { k: "pw",   l: "% of Work Impacted",       d: 0.10,   u: "%",    s: "assumption" },
            { k: "imp",  l: "Productivity Improvement", d: 0.80,   u: "%",    s: "assumption" },
            { k: "va",   l: "Value Add Rate",           d: 0.50,   u: "%",    s: "assumption" },
          ],
          fn: (v) => v.sal * v.pw * v.imp * v.va * v.ftes,
          ft: "Salary × % Work × Improvement × Value Add × FTEs",
          rl: "Total Productivity Value (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

  ],

  // =========================================================================
  // MANUFACTURING
  // =========================================================================
  manufacturing: [

    // -----------------------------------------------------------------------
    // 1. Digital Sales Conversion
    // -----------------------------------------------------------------------
    {
      id: "md",
      name: "Digital Sales Conversion",
      cat: "Revenue Growth",
      sol: ["analytics", "experiment", "replay", "guides"],
      desc: "Optimize digital quoting and ordering flows to capture more revenue from the existing pipeline.",
      ifThen: "If Amplitude improves {company}'s digital quoting and ordering conversion rate by {rate}, {company} could capture {value} in additional annual revenue from its existing digital pipeline.",
      benchmarkNote: "Forrester TEI 2023: 9% acquisition improvement; digital ordering reduces friction vs. rep-assisted",
      ops: {
        fn: (v) => v.qt * 12 * v.cv * v.imp,
        label: "Additional Orders / Yr",
        unit: "orders",
      },
      kpi: {
        fn: (v) => v.imp,
        label: "Conversion Rate Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Revenue Impact",
          fields: [
            { k: "qt",  l: "Monthly Quotes / Leads",           d: 20000, u: "n",  s: "input" },
            { k: "val", l: "Avg Order Value",                  d: 5000,  u: "$",  s: "input" },
            { k: "cv",  l: "Current Conversion Rate",          d: 0.08,  u: "%",  s: "input" },
            { k: "imp", l: "Conversion Improvement",           d: 0.15,  u: "%",  s: "assumption" },
            { k: "m",   l: "Margin",                           d: 0.12,  u: "%",  s: "assumption" },
          ],
          fn: (v) => v.qt * 12 * v.val * v.cv * v.imp * v.m,
          ft: "Quotes × 12 × Order Value × CVR × Improvement × Margin",
          rl: "Annual Profit Impact (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 2. Digital Adoption & Self-Service
    // -----------------------------------------------------------------------
    {
      id: "mpd",
      name: "Digital Adoption & Self-Service",
      cat: "Cost Savings",
      sol: ["analytics", "guides", "replay"],
      desc: "Accelerate digital self-service adoption to deflect costly manual interactions from dealers and customers.",
      ifThen: "If Amplitude accelerates {company}'s digital self-service adoption, deflecting {rate} of costly manual interactions, {company} can save {value} annually while improving dealer and customer satisfaction.",
      benchmarkNote: "Digital self-service costs $0.10-$1 vs $10-$25 for rep-assisted; Guides reduces support friction",
      ops: {
        fn: (v) => v.inter * v.df * 12,
        label: "Interactions Deflected Annually",
        unit: "interactions",
      },
      kpi: {
        fn: (v) => v.df,
        label: "Digital Deflection Rate",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Deflection Savings",
          fields: [
            { k: "inter", l: "Monthly Manual Interactions",    d: 50000, u: "n",  s: "input" },
            { k: "cost",  l: "Cost / Interaction",             d: 15,    u: "$",  s: "input" },
            { k: "df",    l: "Digital Deflection Rate",        d: 0.10,  u: "%",  s: "assumption" },
          ],
          fn: (v) => v.inter * v.cost * v.df * 12,
          ft: "Interactions × Cost × Deflection Rate × 12",
          rl: "Annual Deflection Savings (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Productivity
    // -----------------------------------------------------------------------
    {
      id: "mpp",
      name: "Productivity & Efficiency",
      cat: "Cost Savings",
      sol: ["analytics", "global_agent"],
      desc: "Reduce manual analytics burden for operations, product, and commercial teams.",
      ifThen: "With Amplitude, {ftes} of {company}'s operations and commercial analytics teams spend {rate} less time on manual data work, recapturing {value} in annual capacity.",
      benchmarkNote: "Forrester TEI 2023: 50% reduction in ad-hoc data requests",
      ops: {
        fn: (v) => v.ftes * v.pw * v.imp * 2080,
        label: "Hours Recaptured Annually",
        unit: "hours",
      },
      kpi: {
        fn: (v) => v.pw * v.imp,
        label: "Productivity Improvement",
        unit: "%",
      },
      steps: [
        {
          id: "s1",
          label: "Productivity Value",
          fields: [
            { k: "ftes", l: "FTEs Impacted",           d: 15,     u: "FTEs", s: "input" },
            { k: "sal",  l: "Annual Salary + Benefits", d: 130000, u: "$",    s: "assumption" },
            { k: "pw",   l: "% of Work Impacted",       d: 0.08,   u: "%",    s: "assumption" },
            { k: "imp",  l: "Productivity Improvement", d: 0.80,   u: "%",    s: "assumption" },
            { k: "va",   l: "Value Add Rate",           d: 0.50,   u: "%",    s: "assumption" },
          ],
          fn: (v) => v.sal * v.pw * v.imp * v.va * v.ftes,
          ft: "Salary × % Work × Improvement × Value Add × FTEs",
          rl: "Total Productivity Value (100%)",
          ru: "$",
          fin: true,
        },
      ],
    },

  ],

};

// ---------------------------------------------------------------------------
// Named exports
// ---------------------------------------------------------------------------
export {
  INDUSTRIES,
  SOLUTIONS,
  DEFAULT_MODEL,
  THEMES,
  LIB,
  fC,
  fN,
  fP,
  tyCalc,
  addTotals,
  generateNarrative,
};
