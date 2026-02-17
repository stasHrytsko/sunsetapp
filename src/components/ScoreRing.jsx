import { useAnim } from "../hooks/useAnim";
import { scoreColor } from "../utils/scoring";

export default function ScoreRing({ score, size = 160 }) {
  const anim = useAnim(score, 1400), sw = 7, r = (size - sw * 2) / 2, c = 2 * Math.PI * r, col = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={col} /><stop offset="100%" stopColor={col} stopOpacity="0.35" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#rg)" strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c - (anim / 100) * c} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 44, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "'Playfair Display',Georgia,serif" }}>{anim}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: 1 }}>из 100</span>
      </div>
    </div>
  );
}
