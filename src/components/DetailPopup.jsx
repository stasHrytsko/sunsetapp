import { useEffect } from "react";

export default function DetailPopup({ detail, onClose }) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!detail) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "80vh", overflowY: "auto", background: "linear-gradient(180deg, #1e1535 0%, #16112a 100%)", borderRadius: "20px 20px 0 0", padding: "20px 20px 32px", WebkitOverflowScrolling: "touch" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{detail.title}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 18 }}>{detail.description}</div>

        {/* Ranges */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {detail.ranges.map((r, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: r.color || "#fff", marginBottom: 4 }}>{r.range}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{r.text}</div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button onClick={onClose} style={{ marginTop: 18, width: "100%", padding: "12px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer" }}>Закрыть</button>
      </div>
    </div>
  );
}
