import { fmt } from "../utils/formatters";

export default function SunsetTimeline({ goldenHour, sunset }) {
  const preGolden = new Date(goldenHour.getTime() - 15 * 60000);
  const postSunset = new Date(sunset.getTime() + 15 * 60000);
  const totalMs = postSunset.getTime() - preGolden.getTime();
  const pos = (t) => Math.max(0, Math.min(100, ((t.getTime() - preGolden.getTime()) / totalMs) * 100));

  const points = [
    { time: preGolden, label: "Начало", color: "#F7C948", pct: pos(preGolden) },
    { time: goldenHour, label: "Golden Hour", color: "#F7C948", pct: pos(goldenHour) },
    { time: sunset, label: "Закат", color: "#FF6B35", pct: pos(sunset) },
    { time: postSunset, label: "Конец", color: "#881740", pct: pos(postSunset) },
  ];

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "18px 20px 16px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 18, textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>Когда смотреть</div>

      <div style={{ padding: "0 16px" }}>
        {/* Times above track */}
        <div style={{ position: "relative", height: 16, marginBottom: 4 }}>
          {points.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: `${p.pct}%`, transform: "translateX(-50%)", fontSize: 12, fontWeight: 600, color: p.color, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(p.time)}</div>
          ))}
        </div>

        {/* Track */}
        <div style={{ position: "relative", height: 12, marginBottom: 4 }}>
          <div style={{ position: "absolute", top: 4, left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", top: 2, left: `${points[0].pct}%`, right: `${100 - points[3].pct}%`, height: 8, borderRadius: 4, background: "linear-gradient(90deg, #F7C94855, #F7C948, #FF6B35, #FF6B3588, #88174055)" }} />
          {points.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: `${p.pct}%`, transform: "translateX(-50%)", top: 1, width: 10, height: 10, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}55` }} />
          ))}
        </div>

        {/* Labels below track */}
        <div style={{ position: "relative", height: 14 }}>
          {points.map((p, i) => (
            <span key={i} style={{ position: "absolute", left: `${p.pct}%`, transform: "translateX(-50%)", fontSize: 9, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{p.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
