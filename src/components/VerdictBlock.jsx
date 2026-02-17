import ConfidenceBadge from "./ConfidenceBadge";

export default function VerdictBlock({ verdict, confidence }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${verdict.color}20`, borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{verdict.emoji}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: verdict.color }}>{verdict.action}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 10 }}>
        {verdict.pros.map((p, i) => <div key={"p" + i}><span style={{ color: "#4ade80" }}>+</span> {p}</div>)}
        {verdict.cons.map((c, i) => <div key={"c" + i}><span style={{ color: "#f59e0b" }}>−</span> {c}</div>)}
      </div>
      <ConfidenceBadge confidence={confidence} />
    </div>
  );
}
