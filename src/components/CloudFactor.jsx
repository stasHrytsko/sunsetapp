import { useState, useEffect } from "react";

export default function CloudFactor({ clouds, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const layers = [
    { name: "Высокие (cirrus)", val: clouds.high, min: 0, max: 100, idealMin: 20, idealMax: 70, good: clouds.high >= 20 && clouds.high <= 70, hint: "Ловят свет → яркие краски" },
    { name: "Средние", val: clouds.mid, min: 0, max: 100, idealMin: 20, idealMax: 60, good: clouds.mid >= 20 && clouds.mid <= 60, hint: "Добавляют глубину цвета" },
    { name: "Низкие", val: clouds.low, min: 0, max: 100, idealMin: 0, idealMax: 30, good: clouds.low < 30, hint: "Блокируют солнце — меньше = лучше" },
  ];
  return (
    <div style={{ marginBottom: 14, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px 16px 10px" }}>
      <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginBottom: 2 }}>☁️ Облачность</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10, lineHeight: 1.3 }}>Высокие и средние рассеивают свет → тёплые тона. Низкие — закрывают.</div>
      {layers.map((l, i) => {
        const pos = Math.max(0, Math.min(100, (l.val / 100) * 100));
        const iS = (l.idealMin / 100) * 100, iW = ((l.idealMax - l.idealMin) / 100) * 100;
        const mc = l.good ? "#4ade80" : "#f59e0b";
        return (
          <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{l.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: mc }}>{l.val}%</span>
            </div>
            <div style={{ position: "relative", height: 14, marginBottom: 2 }}>
              <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ position: "absolute", top: 3, height: 8, borderRadius: 4, left: `${iS}%`, width: `${iW}%`, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.1)" }} />
              <div style={{ position: "absolute", top: 0, left: vis ? `${pos}%` : "0%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: mc, boxShadow: `0 0 6px ${mc}44`, transition: "left 1s ease-out" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "rgba(255,255,255,0.15)" }}>
              <span>0%</span><span style={{ color: "rgba(74,222,128,0.25)" }}>{l.idealMin}–{l.idealMax}% идеал</span><span>100%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
