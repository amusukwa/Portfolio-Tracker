import { useState, useMemo } from "react";

const ASSET_CLASSES = ["Fixed Deposit", "Listed Shares", "Unit Trust", "Village Bank", "Property"];

const INITIAL_DATA = {
  months: [
    {
      month: "31-Dec-25",
      assets: {
        "Fixed Deposit":  { value: 1000.00, change: null },
        "Listed Shares":  { value: 6975.20, change: null },
        "Unit Trust":     { value: 0,        change: null },
        "Village Bank":   { value: 150.00,   change: null },
        "Property":       { value: 0,        change: null },
      },
      liabilities: 0,
    },
    {
      month: "31-Jan-26",
      assets: {
        "Fixed Deposit":  { value: 1023.18,  change: null },
        "Listed Shares":  { value: 6873.20,  change: null },
        "Unit Trust":     { value: 0,        change: null },
        "Village Bank":   { value: 165.00,   change: null },
        "Property":       { value: 0,        change: null },
      },
      liabilities: 0,
    },
    {
      month: "28-Feb-26",
      assets: {
        "Fixed Deposit":  { value: 1042.94,  change: null },
        "Listed Shares":  { value: 6912.80,  change: null },
        "Unit Trust":     { value: 0,        change: null },
        "Village Bank":   { value: 181.50,   change: null },
        "Property":       { value: 0,        change: null },
      },
      liabilities: 0,
    },
    {
      month: "31-Mar-26",
      assets: {
        "Fixed Deposit":  { value: 6092.37,  change: 2000 },
        "Listed Shares":  { value: 6890.00,  change: null },
        "Unit Trust":     { value: 0,        change: null },
        "Village Bank":   { value: 199.65,   change: null },
        "Property":       { value: 0,        change: null },
      },
      liabilities: 0,
    },
    {
      month: "30-Apr-26",
      assets: {
        "Fixed Deposit":  { value: 11205.45, change: null },
        "Listed Shares":  { value: 6778.80,  change: null },
        "Unit Trust":     { value: 0,        change: null },
        "Village Bank":   { value: 219.62,   change: null },
        "Property":       { value: 0,        change: null },
      },
      liabilities: 0,
    },
    {
      month: "31-May-26",
      assets: {
        "Fixed Deposit":  { value: 11262.85, change: null },
        "Listed Shares":  { value: 6786.00,  change: null },
        "Unit Trust":     { value: 0,        change: null },
        "Village Bank":   { value: 241.58,   change: null },
        "Property":       { value: 0,        change: null },
      },
      liabilities: 0,
    },
  ],
};

const ASSET_COLORS = {
  "Fixed Deposit": "#F59E0B",
  "Listed Shares": "#10B981",
  "Unit Trust":    "#6366F1",
  "Village Bank":  "#EC4899",
  "Property":      "#3B82F6",
};

const fmt = (v) =>
  v === 0 ? "—" : "MK " + v.toLocaleString("en-MW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtShort = (v) =>
  v >= 1000000 ? `MK ${(v/1000000).toFixed(2)}M`
  : v >= 1000  ? `MK ${(v/1000).toFixed(1)}K`
  : `MK ${v.toFixed(0)}`;

function gain(current, prev) {
  if (!prev || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

function MiniSparkline({ data, color }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  const areaPath = `M${pts.join("L")}L${W},${H}L0,${H}Z`;
  const linePath = `M${pts.join("L")}`;
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace("#","")})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ segments, total }) {
  const R = 52, CX = 60, CY = 60;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const frac = s.value / total;
    const angle = frac * 2 * Math.PI;
    const x1 = CX + R * Math.cos(cumAngle);
    const y1 = CY + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = CX + R * Math.cos(cumAngle);
    const y2 = CY + R * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...s, d: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`, frac };
  });
  return (
    <svg width={120} height={120}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill={a.color} opacity="0.9" />
      ))}
      <circle cx={CX} cy={CY} r={R * 0.55} fill="var(--bg-card)" />
      <text x={CX} y={CY - 4} textAnchor="middle" fill="white" fontSize="9" fontFamily="'DM Mono', monospace" opacity="0.5">TOTAL</text>
      <text x={CX} y={CY + 10} textAnchor="middle" fill="white" fontSize="9" fontFamily="'DM Mono', monospace" fontWeight="600">{fmtShort(total)}</text>
    </svg>
  );
}

function GainBadge({ pct }) {
  if (pct === null || pct === undefined) return <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>—</span>;
  const pos = pct >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 11, fontFamily: "'DM Mono', monospace",
      color: pos ? "#34D399" : "#F87171",
      background: pos ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
      padding: "2px 6px", borderRadius: 4,
    }}>
      {pos ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [view, setView] = useState("dashboard"); // dashboard | history | add
  const [addForm, setAddForm] = useState({ month: "", assets: Object.fromEntries(ASSET_CLASSES.map(a => [a, ""])), liabilities: "" });
  const [addError, setAddError] = useState("");

  const latest = data.months[data.months.length - 1];
  const prev = data.months[data.months.length - 2];

  const totalAssets = useMemo(() =>
    ASSET_CLASSES.reduce((s, a) => s + (latest.assets[a]?.value || 0), 0),
    [latest]
  );
  const totalLiab = latest.liabilities || 0;
  const netWorth = totalAssets - totalLiab;

  const prevNetWorth = prev
    ? ASSET_CLASSES.reduce((s, a) => s + (prev.assets[a]?.value || 0), 0) - (prev.liabilities || 0)
    : null;
  const nwGain = gain(netWorth, prevNetWorth);

  const donutSegs = ASSET_CLASSES
    .map(a => ({ label: a, value: latest.assets[a]?.value || 0, color: ASSET_COLORS[a] }))
    .filter(s => s.value > 0);

  const sparklineData = (assetClass) =>
    data.months.map(m => m.assets[assetClass]?.value || 0).filter(v => v > 0);

  const netWorthHistory = data.months.map(m => ({
    month: m.month,
    value: ASSET_CLASSES.reduce((s, a) => s + (m.assets[a]?.value || 0), 0) - (m.liabilities || 0),
  }));

  function handleAddEntry() {
    setAddError("");
    if (!addForm.month.trim()) { setAddError("Month is required"); return; }
    const assets = {};
    for (const a of ASSET_CLASSES) {
      assets[a] = { value: parseFloat(addForm.assets[a]) || 0, change: null };
    }
    const newEntry = { month: addForm.month.trim(), assets, liabilities: parseFloat(addForm.liabilities) || 0 };
    setData(d => ({ ...d, months: [...d.months, newEntry] }));
    setAddForm({ month: "", assets: Object.fromEntries(ASSET_CLASSES.map(a => [a, ""])), liabilities: "" });
    setView("dashboard");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "white",
      fontFamily: "'DM Sans', sans-serif",
      "--bg": "#0A0D14",
      "--bg-card": "#111520",
      "--bg-card2": "#161B2A",
      "--border": "rgba(255,255,255,0.07)",
      "--accent": "#F59E0B",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--accent)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
            WOMENOFALXSE
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.5 }}>Portfolio Tracker</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["dashboard","history","add"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid",
              borderColor: view === v ? "var(--accent)" : "var(--border)",
              background: view === v ? "rgba(245,158,11,0.12)" : "transparent",
              color: view === v ? "var(--accent)" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: "pointer",
              textTransform: "capitalize", letterSpacing: 0.5,
            }}>
              {v === "add" ? "+ Entry" : v}
            </button>
          ))}
        </div>
      </div>

      {/* ---- DASHBOARD ---- */}
      {view === "dashboard" && (
        <div style={{ padding: "20px 24px" }}>
          {/* Net worth hero */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16,
            padding: "24px 28px", marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 8 }}>
                NET WORTH · {latest.month}
              </div>
              <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: -1, marginBottom: 8 }}>
                {fmt(netWorth)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <GainBadge pct={nwGain} />
                {prevNetWorth && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>vs {prev.month}</span>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <DonutChart segments={donutSegs} total={totalAssets} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {donutSegs.map(s => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", width: 90 }}>{s.label}</span>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.7)" }}>
                      {((s.value / totalAssets) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Assets", value: totalAssets, color: "#10B981" },
              { label: "Total Liabilities", value: totalLiab, color: "#F87171" },
            ].map(c => (
              <div key={c.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, marginBottom: 6 }}>{c.label.toUpperCase()}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: c.color }}>{fmt(c.value)}</div>
              </div>
            ))}
          </div>

          {/* Asset class cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {ASSET_CLASSES.map(a => {
              const val = latest.assets[a]?.value || 0;
              const prevVal = prev?.assets[a]?.value || 0;
              const pct = gain(val, prevVal);
              const sparkData = sparklineData(a);
              if (val === 0 && sparkData.length === 0) return null;
              return (
                <div key={a} style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12,
                  padding: "16px 18px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1.2, marginBottom: 5 }}>{a.toUpperCase()}</div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{val === 0 ? "—" : fmtShort(val)}</div>
                    </div>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: ASSET_COLORS[a], marginTop: 4, flexShrink: 0 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <GainBadge pct={pct} />
                    <MiniSparkline data={sparkData} color={ASSET_COLORS[a]} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- HISTORY ---- */}
      {view === "history" && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 16 }}>
            MONTHLY HISTORY
          </div>

          {/* Net worth bar chart */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, marginBottom: 16 }}>NET WORTH TREND</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
              {netWorthHistory.map((m, i) => {
                const maxNW = Math.max(...netWorthHistory.map(x => x.value));
                const h = maxNW > 0 ? (m.value / maxNW) * 70 : 4;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)" }}>{fmtShort(m.value)}</div>
                    <div style={{ width: "100%", height: h, background: "var(--accent)", borderRadius: "3px 3px 0 0", opacity: i === netWorthHistory.length - 1 ? 1 : 0.5 }} />
                    <div style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{m.month.slice(3)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History table */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontWeight: 400 }}>MONTH</th>
                    {ASSET_CLASSES.map(a => (
                      <th key={a} style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 10, color: ASSET_COLORS[a], letterSpacing: 1, fontWeight: 400 }}>
                        {a.split(" ")[0].toUpperCase()}
                      </th>
                    ))}
                    <th style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontWeight: 400 }}>NET WORTH</th>
                    <th style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontWeight: 400 }}>GAIN%</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.months].reverse().map((m, ri) => {
                    const idx = data.months.length - 1 - ri;
                    const p = idx > 0 ? data.months[idx - 1] : null;
                    const nw = ASSET_CLASSES.reduce((s, a) => s + (m.assets[a]?.value || 0), 0) - (m.liabilities || 0);
                    const pnw = p ? ASSET_CLASSES.reduce((s, a) => s + (p.assets[a]?.value || 0), 0) - (p.liabilities || 0) : null;
                    const g = gain(nw, pnw);
                    return (
                      <tr key={ri} style={{ borderBottom: "1px solid var(--border)", background: ri === 0 ? "rgba(245,158,11,0.04)" : "transparent" }}>
                        <td style={{ padding: "10px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: ri === 0 ? "var(--accent)" : "rgba(255,255,255,0.6)" }}>{m.month}</td>
                        {ASSET_CLASSES.map(a => (
                          <td key={a} style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 11, color: m.assets[a]?.value ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)" }}>
                            {m.assets[a]?.value ? fmtShort(m.assets[a].value) : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500 }}>
                          {fmtShort(nw)}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <GainBadge pct={g} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---- ADD ENTRY ---- */}
      {view === "add" && (
        <div style={{ padding: "20px 24px", maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 20 }}>NEW MONTHLY ENTRY</div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, display: "block", marginBottom: 6 }}>MONTH ENDING</label>
              <input
                value={addForm.month}
                onChange={e => setAddForm(f => ({ ...f, month: e.target.value }))}
                placeholder="e.g. 30-Jun-26"
                style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            {ASSET_CLASSES.map(a => (
              <div key={a}>
                <label style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: ASSET_COLORS[a], letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: ASSET_COLORS[a], display: "inline-block" }} />
                  {a.toUpperCase()} VALUE (MK)
                </label>
                <input
                  type="number"
                  value={addForm.assets[a]}
                  onChange={e => setAddForm(f => ({ ...f, assets: { ...f.assets, [a]: e.target.value } }))}
                  placeholder="0.00"
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <div style={{ height: 1, background: "var(--border)" }} />

            <div>
              <label style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#F87171", letterSpacing: 1.5, display: "block", marginBottom: 6 }}>TOTAL LIABILITIES (MK)</label>
              <input
                type="number"
                value={addForm.liabilities}
                onChange={e => setAddForm(f => ({ ...f, liabilities: e.target.value }))}
                placeholder="0.00"
                style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {addError && <div style={{ fontSize: 12, color: "#F87171", fontFamily: "'DM Mono', monospace" }}>{addError}</div>}

            <button
              onClick={handleAddEntry}
              style={{ marginTop: 4, padding: "12px", background: "var(--accent)", border: "none", borderRadius: 10, color: "#0A0D14", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", letterSpacing: 0.3 }}
            >
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", marginTop: 8 }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.15)", letterSpacing: 1 }}>
          WOMENOFALXSE PORTFOLIO TRACKER · MWK · DATA IS STORED IN-SESSION
        </div>
      </div>
    </div>
  );
}
