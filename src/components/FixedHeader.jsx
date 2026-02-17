import { calcScore, getVerdict } from "../utils/scoring";
import { dayName } from "../utils/formatters";
import { detectSunsetType } from "../utils/sunsetTypes";

export default function FixedHeader({ forecast, selectedDay, onSelect, activeSection, onNavClick }) {
  const sections = [
    { id: "score", label: "\u{1F3AF} Оценка" },
    { id: "time", label: "\u23F0 Время" },
    { id: "factors", label: "\u{1F4CA} Факторы" },
    { id: "spots", label: "\u{1F4CD} Места" },
  ];
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
      background: "rgba(15,12,26,0.94)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "env(safe-area-inset-top, 48px) 0 8px",
    }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "0 12px" }}>
        {/* Calendar */}
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {forecast.map((day, i) => {
            const sc = calcScore(day), v = getVerdict(sc, day), st = detectSunsetType(day), active = i === selectedDay;
            return (
              <button key={i} onClick={() => onSelect(i)} style={{
                flex: 1, background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                border: active ? `1px solid ${v.color}44` : "1px solid rgba(255,255,255,0.05)",
                borderRadius: 10, padding: "7px 2px", cursor: "pointer", transition: "all 0.2s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              }}>
                <span style={{ fontSize: 9, color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>{dayName(day.date, i)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.35)" }}>{day.date.getDate()}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: v.color, fontFamily: "'Playfair Display',Georgia,serif" }}>{sc.total}</span>
                <span style={{ fontSize: 10 }}>{st.emoji}</span>
              </button>
            );
          })}
        </div>
        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => onNavClick(s.id)} style={{
              background: activeSection === s.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border: activeSection === s.id ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 18, padding: "4px 10px", fontSize: 11, color: activeSection === s.id ? "#fff" : "rgba(255,255,255,0.35)",
              cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", fontWeight: 500,
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
