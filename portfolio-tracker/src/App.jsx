import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const ASSET_CLASSES = ["Fixed Deposit", "Listed Shares", "Unit Trust", "Village Bank", "Property"];
const DB_COLS = {
  "Fixed Deposit": "fixed_deposit",
  "Listed Shares": "listed_shares",
  "Unit Trust":    "unit_trust",
  "Village Bank":  "village_bank",
  "Property":      "property",
};

const SEED_DATA = [
  { month: "31-Dec-25", "Fixed Deposit": 1000.00,  "Listed Shares": 6975.20, "Unit Trust": 0, "Village Bank": 150.00,  "Property": 0, liabilities: 0 },
  { month: "31-Jan-26", "Fixed Deposit": 1023.18,  "Listed Shares": 6873.20, "Unit Trust": 0, "Village Bank": 165.00,  "Property": 0, liabilities: 0 },
  { month: "28-Feb-26", "Fixed Deposit": 1042.94,  "Listed Shares": 6912.80, "Unit Trust": 0, "Village Bank": 181.50,  "Property": 0, liabilities: 0 },
  { month: "31-Mar-26", "Fixed Deposit": 6092.37,  "Listed Shares": 6890.00, "Unit Trust": 0, "Village Bank": 199.65,  "Property": 0, liabilities: 0 },
  { month: "30-Apr-26", "Fixed Deposit": 11205.45, "Listed Shares": 6778.80, "Unit Trust": 0, "Village Bank": 219.62,  "Property": 0, liabilities: 0 },
  { month: "31-May-26", "Fixed Deposit": 11262.85, "Listed Shares": 6786.00, "Unit Trust": 0, "Village Bank": 241.58,  "Property": 0, liabilities: 0 },
];

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
  v >= 1000000 ? `MK ${(v / 1000000).toFixed(2)}M`
  : v >= 1000  ? `MK ${(v / 1000).toFixed(1)}K`
  : `MK ${v.toFixed(0)}`;

function gain(current, prev) {
  if (!prev || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

// Convert a DB row → internal month object
function rowToMonth(row) {
  const assets = {};
  for (const a of ASSET_CLASSES) {
    assets[a] = { value: parseFloat(row[DB_COLS[a]]) || 0 };
  }
  return { month: row.month, assets, liabilities: parseFloat(row.liabilities) || 0, id: row.id };
}

// Convert SEED_DATA entry → internal month object
function seedToMonth(s) {
  const assets = {};
  for (const a of ASSET_CLASSES) assets[a] = { value: s[a] || 0 };
  return { month: s.month, assets, liabilities: s.liabilities || 0 };
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
  const id = `sg${color.replace("#", "")}`;
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ segments, total }) {
  const R = 52, CX = 60, CY = 60;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const angle = (s.value / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(cumAngle);
    const y1 = CY + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = CX + R * Math.cos(cumAngle);
    const y2 = CY + R * Math.sin(cumAngle);
    return { ...s, d: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z` };
  });
  return (
    <svg width={120} height={120}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity="0.9" />)}
      <circle cx={CX} cy={CY} r={R * 0.55} fill="#111520" />
      <text x={CX} y={CY - 4} textAnchor="middle" fill="white" fontSize="9" fontFamily="'DM Mono',monospace" opacity="0.5">TOTAL</text>
      <text x={CX} y={CY + 10} textAnchor="middle" fill="white" fontSize="9" fontFamily="'DM Mono',monospace" fontWeight="600">{fmtShort(total)}</text>
    </svg>
  );
}

function GainBadge({ pct }) {
  if (pct === null || pct === undefined) return <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>—</span>;
  const pos = pct >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11,
      fontFamily: "'DM Mono',monospace",
      color: pos ? "#34D399" : "#F87171",
      background: pos ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
      padding: "2px 6px", borderRadius: 4,
    }}>
      {pos ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

const card = {
  background: "#111520",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
};

export default function App() {
  const [months, setMonths] = useState(SEED_DATA.map(seedToMonth));
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [addForm, setAddForm] = useState({
    month: "", assets: Object.fromEntries(ASSET_CLASSES.map(a => [a, ""])), liabilities: "",
  });
  const [addError, setAddError] = useState("");

  const isConnected = !!supabase;

  // Load from Supabase if connected
  const loadFromSupabase = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("portfolio_entries")
      .select("*")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) { console.error(error); return; }
    if (data && data.length > 0) {
      setMonths(data.map(rowToMonth));
    }
  }, []);

  useEffect(() => { loadFromSupabase(); }, [loadFromSupabase]);

  const latest = months[months.length - 1];
  const prev   = months[months.length - 2];

  const totalAssets = useMemo(() =>
    ASSET_CLASSES.reduce((s, a) => s + (latest?.assets[a]?.value || 0), 0), [latest]);
  const totalLiab = latest?.liabilities || 0;
  const netWorth  = totalAssets - totalLiab;

  const prevNetWorth = prev
    ? ASSET_CLASSES.reduce((s, a) => s + (prev.assets[a]?.value || 0), 0) - (prev.liabilities || 0)
    : null;
  const nwGain = gain(netWorth, prevNetWorth);

  const donutSegs = ASSET_CLASSES
    .map(a => ({ label: a, value: latest?.assets[a]?.value || 0, color: ASSET_COLORS[a] }))
    .filter(s => s.value > 0);

  const sparklineData = (ac) => months.map(m => m.assets[ac]?.value || 0).filter(v => v > 0);

  const netWorthHistory = months.map(m => ({
    month: m.month,
    value: ASSET_CLASSES.reduce((s, a) => s + (m.assets[a]?.value || 0), 0) - (m.liabilities || 0),
  }));

  async function handleAddEntry() {
    setAddError("");
    if (!addForm.month.trim()) { setAddError("Month is required"); return; }

    const assets = {};
    for (const a of ASSET_CLASSES) assets[a] = { value: parseFloat(addForm.assets[a]) || 0 };
    const newEntry = { month: addForm.month.trim(), assets, liabilities: parseFloat(addForm.liabilities) || 0 };

    if (supabase) {
      setSaving(true);
      const row = {
        month: newEntry.month,
        liabilities: newEntry.liabilities,
      };
      for (const a of ASSET_CLASSES) row[DB_COLS[a]] = newEntry.assets[a].value;

      const { error } = await supabase.from("portfolio_entries").upsert(row, { onConflict: "user_id,month" });
      setSaving(false);
      if (error) { setAddError("Save failed: " + error.message); return; }
      setStatusMsg("✓ Saved to Supabase");
      setTimeout(() => setStatusMsg(""), 3000);
      await loadFromSupabase();
    } else {
      setMonths(m => [...m, newEntry]);
    }

    setAddForm({ month: "", assets: Object.fromEntries(ASSET_CLASSES.map(a => [a, ""])), liabilities: "" });
    setView("dashboard");
  }

  const inputStyle = {
    width: "100%", background: "#161B2A",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8,
    padding: "10px 12px", color: "white", fontSize: 13,
    fontFamily: "'DM Mono',monospace", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0D14", color: "white",
      fontFamily: "'DM Sans',sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "#F59E0B", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>WOMENOFALXSE</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.5 }}>Portfolio Tracker</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            fontSize: 9, fontFamily: "'DM Mono',monospace", letterSpacing: 1,
            color: isConnected ? "#34D399" : "rgba(255,255,255,0.25)",
            background: isConnected ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
            padding: "3px 8px", borderRadius: 4,
          }}>
            {isConnected ? "● SUPABASE" : "○ LOCAL"}
          </span>
          {statusMsg && <span style={{ fontSize: 11, color: "#34D399", fontFamily: "'DM Mono',monospace" }}>{statusMsg}</span>}
          {["dashboard", "history", "add"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid",
              borderColor: view === v ? "#F59E0B" : "rgba(255,255,255,0.07)",
              background: view === v ? "rgba(245,158,11,0.12)" : "transparent",
              color: view === v ? "#F59E0B" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer",
              textTransform: "capitalize", letterSpacing: 0.5,
            }}>
              {v === "add" ? "+ Entry" : v}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
          LOADING FROM SUPABASE…
        </div>
      )}

      {/* ---- DASHBOARD ---- */}
      {!loading && view === "dashboard" && latest && (
        <div style={{ padding: "20px 24px" }}>
          {/* Net worth hero */}
          <div style={{ ...card, padding: "24px 28px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 8 }}>
                NET WORTH · {latest.month}
              </div>
              <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: -1, marginBottom: 8 }}>{fmt(netWorth)}</div>
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
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.7)" }}>
                      {((s.value / totalAssets) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Assets", value: totalAssets, color: "#10B981" },
              { label: "Total Liabilities", value: totalLiab, color: "#F87171" },
            ].map(c => (
              <div key={c.label} style={{ ...card, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, marginBottom: 6 }}>{c.label.toUpperCase()}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: c.color }}>{fmt(c.value)}</div>
              </div>
            ))}
          </div>

          {/* Asset class cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
            {ASSET_CLASSES.map(a => {
              const val = latest.assets[a]?.value || 0;
              const prevVal = prev?.assets[a]?.value || 0;
              const pct = gain(val, prevVal);
              const sparkData = sparklineData(a);
              if (val === 0 && sparkData.length === 0) return null;
              return (
                <div key={a} style={{ ...card, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1.2, marginBottom: 5 }}>{a.toUpperCase()}</div>
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
      {!loading && view === "history" && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 16 }}>MONTHLY HISTORY</div>

          {/* Bar chart */}
          <div style={{ ...card, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, marginBottom: 16 }}>NET WORTH TREND</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
              {netWorthHistory.map((m, i) => {
                const maxNW = Math.max(...netWorthHistory.map(x => x.value));
                const h = maxNW > 0 ? Math.max(4, (m.value / maxNW) * 70) : 4;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)" }}>{fmtShort(m.value)}</div>
                    <div style={{ width: "100%", height: h, background: "#F59E0B", borderRadius: "3px 3px 0 0", opacity: i === netWorthHistory.length - 1 ? 1 : 0.45 }} />
                    <div style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{m.month.slice(3)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontWeight: 400 }}>MONTH</th>
                    {ASSET_CLASSES.map(a => (
                      <th key={a} style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 10, color: ASSET_COLORS[a], letterSpacing: 1, fontWeight: 400 }}>
                        {a.split(" ")[0].toUpperCase()}
                      </th>
                    ))}
                    <th style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontWeight: 400 }}>NET WORTH</th>
                    <th style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontWeight: 400 }}>GAIN%</th>
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((m, ri) => {
                    const idx = months.length - 1 - ri;
                    const p   = idx > 0 ? months[idx - 1] : null;
                    const nw  = ASSET_CLASSES.reduce((s, a) => s + (m.assets[a]?.value || 0), 0) - (m.liabilities || 0);
                    const pnw = p ? ASSET_CLASSES.reduce((s, a) => s + (p.assets[a]?.value || 0), 0) - (p.liabilities || 0) : null;
                    return (
                      <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: ri === 0 ? "rgba(245,158,11,0.04)" : "transparent" }}>
                        <td style={{ padding: "10px 16px", fontFamily: "'DM Mono',monospace", fontSize: 11, color: ri === 0 ? "#F59E0B" : "rgba(255,255,255,0.6)" }}>{m.month}</td>
                        {ASSET_CLASSES.map(a => (
                          <td key={a} style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 11, color: m.assets[a]?.value ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)" }}>
                            {m.assets[a]?.value ? fmtShort(m.assets[a].value) : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 500 }}>{fmtShort(nw)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}><GainBadge pct={gain(nw, pnw)} /></td>
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
      {!loading && view === "add" && (
        <div style={{ padding: "20px 24px", maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 20 }}>NEW MONTHLY ENTRY</div>
          <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, display: "block", marginBottom: 6 }}>MONTH ENDING</label>
              <input value={addForm.month} onChange={e => setAddForm(f => ({ ...f, month: e.target.value }))} placeholder="e.g. 30-Jun-26" style={inputStyle} />
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
            {ASSET_CLASSES.map(a => (
              <div key={a}>
                <label style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: ASSET_COLORS[a], letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: ASSET_COLORS[a], display: "inline-block" }} />
                  {a.toUpperCase()} VALUE (MK)
                </label>
                <input type="number" value={addForm.assets[a]} onChange={e => setAddForm(f => ({ ...f, assets: { ...f.assets, [a]: e.target.value } }))} placeholder="0.00" style={inputStyle} />
              </div>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
            <div>
              <label style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "#F87171", letterSpacing: 1.5, display: "block", marginBottom: 6 }}>TOTAL LIABILITIES (MK)</label>
              <input type="number" value={addForm.liabilities} onChange={e => setAddForm(f => ({ ...f, liabilities: e.target.value }))} placeholder="0.00" style={inputStyle} />
            </div>
            {addError && <div style={{ fontSize: 12, color: "#F87171", fontFamily: "'DM Mono',monospace" }}>{addError}</div>}
            <button onClick={handleAddEntry} disabled={saving} style={{ marginTop: 4, padding: 12, background: saving ? "rgba(245,158,11,0.4)" : "#F59E0B", border: "none", borderRadius: 10, color: "#0A0D14", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
              {saving ? "Saving…" : isConnected ? "Save to Supabase" : "Save Entry"}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 8 }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.15)", letterSpacing: 1 }}>
          WOMENOFALXSE PORTFOLIO TRACKER · MWK · {isConnected ? "SUPABASE CONNECTED" : "LOCAL MODE — ADD .ENV.LOCAL TO PERSIST"}
        </div>
      </div>
    </div>
  );
}
