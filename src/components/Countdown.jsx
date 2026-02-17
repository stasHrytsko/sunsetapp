export default function Countdown({ sunset, now, selectedDay }) {
  if (selectedDay > 0) return null;
  const diff = sunset.getTime() - now.getTime();
  if (diff <= 0) return <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>Закат уже был</div>;
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  return (
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>До заката: </span>
      <span style={{ fontSize: 16, fontWeight: 700, color: "#FF6B35", fontFamily: "'Playfair Display',Georgia,serif" }}>{h > 0 ? `${h}ч ${m}мин` : `${m} мин`}</span>
    </div>
  );
}
