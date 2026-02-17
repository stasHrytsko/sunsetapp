export default function SunsetTypeBlock({ sunsetType }) {
  if (!sunsetType || sunsetType.type === "normal") return null;

  // No sunset — muted style
  if (sunsetType.type === null) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14, padding: "14px 16px", marginBottom: 16, textAlign: "center",
      }}>
        <span style={{ fontSize: 20 }}>{sunsetType.emoji}</span>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6, lineHeight: 1.5 }}>
          Сегодня вряд ли — низкие облака закрывают горизонт
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: "14px 16px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{sunsetType.emoji}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{sunsetType.name}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
        {sunsetType.description}
      </div>
    </div>
  );
}
