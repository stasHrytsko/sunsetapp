import { useState } from "react";

export default function SpotCard({ spot, index, onDelete }) {
  const [h, setH] = useState(false);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=driving`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <a href={url} target="_blank" rel="noopener noreferrer" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ flex: 1, display: "block", background: h ? "rgba(255,255,255,0.1)" : index === 0 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 14px", textDecoration: "none", border: index === 0 ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent", transition: "all 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>
              {spot.icon} {spot.name}
              {index === 0 && <span style={{ marginLeft: 6, fontSize: 9, color: "#F7C948", background: "rgba(247,201,72,0.12)", padding: "2px 7px", borderRadius: 8, fontWeight: 600 }}>лучший</span>}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{spot.desc}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
            {spot.km != null && <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>{spot.km.toFixed(1)} км</div>}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>маршрут →</div>
          </div>
        </div>
      </a>
      <button onClick={() => onDelete(spot.id)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1 }} title="Удалить">✕</button>
    </div>
  );
}
