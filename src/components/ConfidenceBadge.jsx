export default function ConfidenceBadge({ confidence }) {
  const c = confidence >= 70 ? "#4ade80" : confidence >= 45 ? "#fbbf24" : "#f87171";
  const t = confidence >= 70 ? "высокая" : confidence >= 45 ? "средняя" : "низкая";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${c}22`, borderRadius: 10, padding: "4px 12px", fontSize: 11 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 5px ${c}66` }} />
      <span style={{ color: "rgba(255,255,255,0.4)" }}>Уверенность:</span>
      <span style={{ color: c, fontWeight: 600 }}>{confidence}% — {t}</span>
    </div>
  );
}
