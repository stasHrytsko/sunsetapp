import { useState, useEffect } from "react";

import { fetchWeatherData, buildWeekForecast, buildToday } from "./api/weather";
import { loadSpots, saveSpots } from "./utils/storage";
import { calcScore, calcConfidence, getVerdict } from "./utils/scoring";
import { rankSpots } from "./utils/spotRanking";
import { detectSunsetType } from "./utils/sunsetTypes";

import FixedHeader from "./components/FixedHeader";
import ScoreRing from "./components/ScoreRing";
import VerdictBlock from "./components/VerdictBlock";
import Countdown from "./components/Countdown";
import SunsetTimeline from "./components/SunsetTimeline";
import CloudFactor from "./components/CloudFactor";
import FactorScale from "./components/FactorScale";
import SpotCard from "./components/SpotCard";
import AddSpotForm from "./components/AddSpotForm";
import SunsetTypeBlock from "./components/SunsetTypeBlock";
import DetailPopup from "./components/DetailPopup";
import { PARAMETER_DETAILS } from "./config/parameterDetails";

export default function SunsetApp() {
  const [weekForecast, setWeekForecast] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("score");
  const [spots, setSpots] = useState(loadSpots);
  const [userLoc, setUserLoc] = useState(null);
  const [detailKey, setDetailKey] = useState(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}, { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Intersection observer
  useEffect(() => {
    const ids = ["score", "time", "factors", "spots"];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { rootMargin: "-25% 0px -60% 0px" });
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [weekForecast]);

  // Fetch weather
  useEffect(() => {
    fetchWeatherData()
      .then(({ weather, air }) => {
        const week = buildWeekForecast(weather, air);
        if (week.length > 0) { const t = buildToday(weather, air); week[0] = { ...week[0], ...t }; }
        setWeekForecast(week); setLoading(false);
      })
      .catch(err => { console.error(err); setError("Не удалось загрузить данные погоды."); setLoading(false); });
  }, []);

  const handleNavClick = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) { const top = el.getBoundingClientRect().top + window.scrollY - 150; window.scrollTo({ top, behavior: "smooth" }); }
  };

  const handleAddSpot = (spot) => { const n = [...spots, spot]; setSpots(n); saveSpots(n); };
  const handleDeleteSpot = (id) => { const n = spots.filter(s => s.id !== id); setSpots(n); saveSpots(n); };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f0c1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#fff", fontFamily: "system-ui" }}>
      <div style={{ fontSize: 40, animation: "pulse 1.5s infinite" }}>🌅</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Загружаю погоду...</div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
    </div>
  );

  if (error || !weekForecast?.length) return (
    <div style={{ minHeight: "100vh", background: "#0f0c1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#d9534f", fontFamily: "system-ui", padding: 40, textAlign: "center" }}>{error || "Нет данных"}</div>
  );

  const dayData = weekForecast[selectedDay];
  const score = calcScore(dayData);
  const verdict = getVerdict(score, dayData);
  const confidence = calcConfidence(dayData.sunset, now, dayData.cloudHours, selectedDay);
  const rawSunsetType = detectSunsetType(dayData);
  const sunsetType = score.total <= 50
    ? { type: "normal", name: "Обычный закат", emoji: "🌅", description: "", confidence: rawSunsetType.confidence }
    : rawSunsetType;
  const rankedSpots = rankSpots(spots, dayData, userLoc?.lat, userLoc?.lng, sunsetType?.type);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg,#0f0c1a 0%,#1a1230 20%,#2a1740 40%,#3d1d4a 55%,#4d2245 68%,#3a1835 85%,#1a0f22 100%)", fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{margin:0;background:#0f0c1a}
        html{scroll-behavior:smooth} button{font-family:inherit}
        @keyframes glow{0%,100%{filter:blur(40px) brightness(0.6)}50%{filter:blur(50px) brightness(0.9)}}
      `}</style>

      <FixedHeader forecast={weekForecast} selectedDay={selectedDay} onSelect={setSelectedDay} activeSection={activeSection} onNavClick={handleNavClick} />

      <div style={{ position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle,${verdict.color}22 0%,transparent 70%)`, animation: "glow 4s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 420, margin: "0 auto", padding: "0 20px 40px", position: "relative", zIndex: 1, paddingTop: 170 }}>

        {/* SCORE */}
        <div id="score">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
            <ScoreRing score={score.total} />
          </div>
          <SunsetTypeBlock sunsetType={sunsetType} />
          <VerdictBlock verdict={verdict} confidence={confidence} />
        </div>

        {/* TIME */}
        <div id="time">
          <Countdown sunset={dayData.sunset} now={now} selectedDay={selectedDay} />
          <SunsetTimeline goldenHour={dayData.goldenHour} sunset={dayData.sunset} />
        </div>

        {/* FACTORS */}
        <div id="factors" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5 }}>Что влияет на закат</h2>
          <CloudFactor clouds={score.factors.clouds} delay={200} onInfo={setDetailKey} />
          <FactorScale name="Влажность" icon="💧" value={score.factors.humidity.value} unit="%" min={20} max={100} idealMin={55} idealMax={75} hint="Капли воды преломляют свет → тёплые тона" delay={300} onInfo={() => setDetailKey("humidity")} />
          <FactorScale name="Видимость" icon="👁" value={score.factors.visibility.value} unit=" км" min={0} max={Math.max(Math.ceil(score.factors.visibility.value), 80)} idealMin={10} idealMax={20} hint="Лёгкая дымка рассеивает свет. Слишком чисто = бледно" delay={400} onInfo={() => setDetailKey("visibility")} />
          <FactorScale name="Ветер" icon="💨" value={score.factors.wind.value} unit=" км/ч" min={0} max={40} idealMin={0} idealMax={10} hint="Слабый ветер — облака держат форму" delay={500} onInfo={() => setDetailKey("wind")} />
          {(() => {
            const pVal = score.factors.pressure.value;
            const trendMap = {
              stable: { label: "стабильное", icon: "↔", color: "#4ade80" },
              rising: { label: "растёт", icon: "↑", color: "#f59e0b" },
              falling: { label: "падает", icon: "↓", color: "#f59e0b" },
              rising_after_drop: { label: "растёт после падения", icon: "↗", color: "#FF6B35" },
            };
            const t = trendMap[dayData.pressureTrend] || trendMap.stable;
            const deltaArrow = (v) => v == null ? null : Math.abs(v) <= 1 ? "→" : v > 0 ? "↑" : "↓";
            const fmtDelta = (v) => v == null ? "—" : `${v > 0 ? "+" : ""}${v}`;
            const d12 = dayData.pressureDelta12h, d24 = dayData.pressureDelta24h, f6 = dayData.pressureForecast6h;
            return (
              <div style={{ marginBottom: 14, background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px 16px 10px", opacity: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>📊 Давление<button onClick={() => setDetailKey("pressure")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer", padding: "0 0 0 6px", verticalAlign: "baseline" }}>ℹ️</button></span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.color, fontFamily: "monospace" }}>{typeof pVal === "number" && pVal % 1 !== 0 ? pVal.toFixed(1) : pVal} hPa</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, lineHeight: 1.3 }}>Динамика давления важнее абсолютного значения</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 6, fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                  {d12 != null && <span>{deltaArrow(d12)} {fmtDelta(d12)} hPa / 12ч</span>}
                  {d24 != null && <span>{deltaArrow(d24)} {fmtDelta(d24)} hPa / 24ч</span>}
                </div>
                {f6 != null && (
                  <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
                    Прогноз 6ч: {deltaArrow(f6)} {fmtDelta(f6)} hPa {Math.abs(f6) <= 1 ? "(стабильно)" : f6 > 0 ? "(рост)" : "(падение)"}
                  </div>
                )}
                <div style={{ fontSize: 14, color: t.color, fontWeight: 600 }}>
                  {t.label} {t.icon}
                  {dayData.pressureTrend === "rising_after_drop" && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>(фронт прошёл)</span>}
                </div>
              </div>
            );
          })()}
          <FactorScale name="Пыль PM10" icon="🏜" value={score.factors.dust.value} unit=" µg" min={0} max={120} idealMin={20} idealMax={60} hint="Сахарская пыль (calima) — усиливает красные тона" delay={700} onInfo={() => setDetailKey("dust")} />
        </div>

        {/* SPOTS */}
        <div id="spots" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5 }}>Куда идти</h2>
          {!userLoc && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 10 }}>Разреши геолокацию, чтобы видеть расстояние</div>}
          {rankedSpots.map((s, i) => <SpotCard key={s.id} spot={s} index={i} onDelete={handleDeleteSpot} />)}
          <AddSpotForm onAdd={handleAddSpot} />
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.12)", paddingBottom: 20, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 14 }}>
          Open-Meteo API · SunCalc · Valencia
        </div>
      </div>

      {detailKey && <DetailPopup detail={PARAMETER_DETAILS[detailKey]} onClose={() => setDetailKey(null)} />}
    </div>
  );
}
