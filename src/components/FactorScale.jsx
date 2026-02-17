import { useState, useEffect } from "react";

export default function FactorScale({ name, icon, value, unit, min, max, idealMin, idealMax, hint, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const range = max - min, pos = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const iS = ((idealMin - min) / range) * 100, iW = ((idealMax - idealMin) / range) * 100;
  const ok = value >= idealMin && value <= idealMax, mc = ok ? "#4ade80" : "#f59e0b";
  return (
    <div style={{ marginBottom: 14, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px 16px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{icon} {name}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: mc, fontFamily: "monospace" }}>{typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value}{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, lineHeight: 1.3 }}>{hint}</div>
      <div style={{ position: "relative", height: 18, marginBottom: 3 }}>
        <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", top: 5, height: 8, borderRadius: 4, left: `${iS}%`, width: `${iW}%`, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.12)" }} />
        <div style={{ position: "absolute", top: 2, left: vis ? `${pos}%` : "0%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: mc, boxShadow: `0 0 8px ${mc}55`, transition: "left 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
        <span>{min}{unit}</span><span style={{ color: "rgba(74,222,128,0.3)" }}>{idealMin}–{idealMax} идеал</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}
