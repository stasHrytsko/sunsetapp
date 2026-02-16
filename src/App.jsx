import { useState, useEffect } from "react";

// ============================================================
// SunCalc — inline
// ============================================================
const SunCalc = (() => {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const toJulian = d => d.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = j => new Date((j + 0.5 - J1970) * dayMs);
  const toDays = d => toJulian(d) - J2000;
  const rightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const azimuthCalc = (H, phi, dec) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const solarMeanAnomaly = d => rad * (357.5291 + 0.98560028 * d);
  const eclipticLongitude = M => { const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)); return M + C + rad * 102.9372 + Math.PI; };
  const sunCoords = d => { const M = solarMeanAnomaly(d), L = eclipticLongitude(M); return { dec: declination(L, 0), ra: rightAscension(L, 0) }; };
  const julianCycle = (d, lw) => Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const approxTransit = (Ht, lw, n) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
  const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const hourAngle = (h, phi, d) => Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
  function getSetJ(h, lw, phi, dec, n, M, L) { const w = hourAngle(h, phi, dec), a = approxTransit(w, lw, n); return solarTransitJ(a, M, L); }
  function getTimes(date, lat, lng) {
    const lw = rad * -lng, phi = rad * lat, d = toDays(date), n = julianCycle(d, lw), ds = approxTransit(0, lw, n);
    const M2 = solarMeanAnomaly(ds), L = eclipticLongitude(M2), dec = declination(L, 0);
    return { sunset: fromJulian(getSetJ(-0.833 * rad, lw, phi, dec, n, M2, L)), goldenHour: fromJulian(getSetJ(6 * rad, lw, phi, dec, n, M2, L)) };
  }
  function getPosition(date, lat, lng) { const lw = rad * -lng, phi = rad * lat, d = toDays(date), c = sunCoords(d), H = rad * (280.16 + 360.9856235 * d) - lw - c.ra; return { azimuth: azimuthCalc(H, phi, c.dec) / rad + 180 }; }
  return { getTimes, getPosition };
})();

// ============================================================
// Config & Spots storage
// ============================================================
const VALENCIA = { lat: 39.4699, lng: -0.3763 };

const DEFAULT_SPOTS = [
  { id: "1", name: "Playa de la Malvarrosa", type: "beach", desc: "Открытый горизонт, отражение в воде", lat: 39.4783, lng: -0.3252, icon: "🏖" },
  { id: "2", name: "La Albufera", type: "lake", desc: "Зеркальное озеро, двойной закат", lat: 39.3328, lng: -0.3517, icon: "🪷" },
  { id: "3", name: "Mirador del Miguelete", type: "tower", desc: "360° панорама, укрытие от ветра", lat: 39.4755, lng: -0.3755, icon: "🏛" },
  { id: "4", name: "Playa de la Patacona", type: "beach", desc: "Тихий пляж, меньше людей", lat: 39.4894, lng: -0.3215, icon: "🌊" },
  { id: "5", name: "Jardín del Turia", type: "park", desc: "Городской парк, удобный доступ", lat: 39.4802, lng: -0.3667, icon: "🌳" },
];

function loadSpots() { try { const s = localStorage.getItem("sunset_spots"); return s ? JSON.parse(s) : DEFAULT_SPOTS; } catch { return DEFAULT_SPOTS; } }
function saveSpots(spots) { localStorage.setItem("sunset_spots", JSON.stringify(spots)); }

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// API
// ============================================================
async function fetchWeatherData() {
  const { lat, lng } = VALENCIA;
  const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,visibility,wind_speed_10m,surface_pressure&timezone=Europe/Madrid&forecast_days=7`;
  const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5&hourly=pm10&timezone=Europe/Madrid&forecast_days=7`;
  const [wR, aR] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
  return { weather: await wR.json(), air: await aR.json() };
}

function buildWeekForecast(weather, air) {
  const days = [], ht = weather.hourly.time, at = air.hourly?.time || [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(); date.setDate(date.getDate() + d); date.setHours(12, 0, 0, 0);
    const sun = SunCalc.getTimes(date, VALENCIA.lat, VALENCIA.lng), sh = sun.sunset.getHours();
    const td = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const tk = `${td}T${String(sh).padStart(2, '0')}:00`;
    let idx = ht.indexOf(tk);
    if (idx === -1) { idx = ht.findIndex(t => t.startsWith(td)); if (idx !== -1) idx = Math.min(idx + sh, ht.length - 1); }
    if (idx === -1) continue;
    let pm10 = 15; const ai = at.indexOf(tk);
    if (ai !== -1 && air.hourly?.pm10?.[ai] != null) pm10 = air.hourly.pm10[ai];
    // Collect cloud hours for confidence stability calc
    const cloudHours = [-1, 0, 1].map(o => { const i = idx + o; return (i >= 0 && i < ht.length) ? (weather.hourly.cloud_cover_high[i] ?? 0) + (weather.hourly.cloud_cover_mid[i] ?? 0) : null; }).filter(v => v !== null);
    days.push({
      date, sunset: sun.sunset, goldenHour: sun.goldenHour,
      azimuth: Math.round(SunCalc.getPosition(sun.sunset, VALENCIA.lat, VALENCIA.lng).azimuth),
      cloudLow: weather.hourly.cloud_cover_low[idx] ?? 0, cloudMid: weather.hourly.cloud_cover_mid[idx] ?? 0,
      cloudHigh: weather.hourly.cloud_cover_high[idx] ?? 0, humidity: weather.hourly.relative_humidity_2m[idx] ?? 50,
      visibility: weather.hourly.visibility[idx] ?? 10000, windSpeed: weather.hourly.wind_speed_10m[idx] ?? 10,
      pressure: weather.hourly.surface_pressure[idx] ?? 1013, pm10, cloudHours,
    });
  }
  return days;
}

function buildToday(weather, air) {
  const c = weather.current;
  return { humidity: c.relative_humidity_2m, pressure: c.surface_pressure, windSpeed: c.wind_speed_10m,
    cloudLow: c.cloud_cover_low, cloudMid: c.cloud_cover_mid, cloudHigh: c.cloud_cover_high,
    visibility: c.visibility, pm10: air.current?.pm10 ?? 0 };
}

// ============================================================
// Scoring & Confidence
// ============================================================
function calcScore(w) {
  let cs = 0;
  if (w.cloudHigh >= 20 && w.cloudHigh <= 70) cs += 50; else if (w.cloudHigh > 0 && w.cloudHigh < 20) cs += 25; else if (w.cloudHigh > 70) cs += 30;
  if (w.cloudMid >= 20 && w.cloudMid <= 60) cs += 35; else if (w.cloudMid > 60) cs += 15;
  if (w.cloudLow < 30) cs += 15; else if (w.cloudLow < 60) cs += 5; else cs -= 10;
  cs = Math.max(0, Math.min(100, cs));
  const hs = w.humidity >= 55 && w.humidity <= 75 ? 100 : w.humidity >= 45 && w.humidity < 55 ? 75 : w.humidity > 75 && w.humidity <= 85 ? 60 : w.humidity < 40 ? 30 : 20;
  const vk = w.visibility / 1000;
  const vs = vk >= 8 && vk <= 15 ? 100 : vk > 15 && vk <= 25 ? 70 : vk > 25 ? 40 : vk >= 5 ? 50 : 20;
  const ws = w.windSpeed <= 10 ? 100 : w.windSpeed <= 15 ? 70 : w.windSpeed <= 25 ? 40 : 15;
  const ps = w.pressure >= 1010 && w.pressure <= 1020 ? 80 : w.pressure < 1010 ? 65 : 50;
  const ds = w.pm10 >= 20 && w.pm10 <= 60 ? 90 : w.pm10 > 60 && w.pm10 <= 100 ? 70 : w.pm10 > 100 ? 50 : w.pm10 < 10 ? 25 : 30;
  const total = Math.round(cs * 0.35 + hs * 0.20 + vs * 0.15 + ws * 0.10 + ps * 0.10 + ds * 0.10);
  return { total: Math.min(100, Math.max(0, total)), factors: {
    clouds: { score: cs, low: w.cloudLow, mid: w.cloudMid, high: w.cloudHigh },
    humidity: { score: hs, value: w.humidity }, visibility: { score: vs, value: vk },
    wind: { score: ws, value: w.windSpeed }, pressure: { score: ps, value: w.pressure },
    dust: { score: ds, value: w.pm10 },
  }};
}

function calcConfidence(sunset, now, cloudHours, dayIndex) {
  let base;
  if (dayIndex === 0) {
    const h = (sunset.getTime() - now.getTime()) / 3600000;
    if (h <= 0) base = 95; else if (h <= 2) base = 90; else if (h <= 6) base = 75; else base = 60;
  } else if (dayIndex === 1) base = 50;
  else if (dayIndex === 2) base = 40;
  else base = Math.max(20, 35 - (dayIndex - 3) * 5);
  let stab = 1.0;
  if (cloudHours?.length >= 2) {
    const spread = Math.max(...cloudHours) - Math.min(...cloudHours);
    if (spread > 50) stab = 0.55; else if (spread > 30) stab = 0.70; else if (spread > 15) stab = 0.85;
  }
  return Math.round(base * stab);
}

function getVerdict(score, w) {
  const t = score.total, f = score.factors, pros = [], cons = [];
  if (f.clouds.high >= 20 && f.clouds.high <= 70) pros.push("высокие облака поймают свет");
  if (f.clouds.mid >= 20 && f.clouds.mid <= 60) pros.push("средние облака добавят глубину");
  if (f.clouds.low >= 60) cons.push("низкие облака закроют солнце"); else if (f.clouds.low < 15) pros.push("горизонт чистый");
  if (f.humidity.value >= 55 && f.humidity.value <= 75) pros.push("влажность идеальна для рассеивания");
  else if (f.humidity.value > 85) cons.push("слишком влажно — мутно");
  else if (f.humidity.value < 40) cons.push("сухой воздух — бледные цвета");
  if (f.visibility.value >= 8 && f.visibility.value <= 15) pros.push("мягкая дымка усилит краски");
  else if (f.visibility.value > 25) cons.push("слишком чистый воздух — мало рассеивания");
  else if (f.visibility.value < 5) cons.push("плохая видимость");
  if (f.wind.value <= 10) pros.push("тихо — облака держат форму"); else if (f.wind.value > 15) cons.push("ветер разгонит облака");
  if (w.pm10 >= 20 && w.pm10 <= 60) pros.push("лёгкая пыль усилит красные тона");
  if (w.pm10 > 60) pros.push("calima — будет пурпурно");
  if (w.pressure < 1010) pros.push("смена воздушных масс — драматичное небо");
  let emoji, action, color;
  if (t >= 81) { emoji = "🔥"; action = "Иди прямо сейчас"; color = "#FF6B35"; }
  else if (t >= 66) { emoji = "✨"; action = "Стоит выйти"; color = "#F7C948"; }
  else if (t >= 41) { emoji = "🌤"; action = "На твоё усмотрение"; color = "#88B7D5"; }
  else { emoji = "😴"; action = "Можно пропустить"; color = "#8B95A5"; }
  return { emoji, action, color, pros: pros.slice(0, 3), cons: cons.slice(0, 2) };
}

function scoreColor(s) { return s >= 81 ? "#FF6B35" : s >= 66 ? "#F7C948" : s >= 41 ? "#88B7D5" : "#8B95A5"; }

function rankSpots(allSpots, w, userLat, userLng) {
  return allSpots.map(s => {
    let b = 0;
    if (w.cloudLow < 30 && s.type === "beach") b += 20;
    if ((w.cloudMid > 20 || w.cloudHigh > 20) && s.type === "lake") b += 25;
    if (w.windSpeed > 15 && s.type === "tower") b += 20;
    if (s.type === "beach" || s.type === "lake") b += 10;
    const km = (userLat && userLng) ? distanceKm(userLat, userLng, s.lat, s.lng) : null;
    return { ...s, bonus: b, km };
  }).sort((a, b) => b.bonus - a.bonus);
}

function fmt(d) { return d && !isNaN(d) ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "--:--"; }
function dayName(d, i) { return i === 0 ? "Сегодня" : i === 1 ? "Завтра" : d.toLocaleDateString("ru-RU", { weekday: "short" }); }
function dayEmoji(score) { return score >= 81 ? "🔥" : score >= 66 ? "✨" : score >= 41 ? "🌤" : "😴"; }

// ============================================================
// UI Components
// ============================================================
function useAnim(target, dur = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => { const t0 = performance.now(); function tick(now) { const p = Math.min((now - t0) / dur, 1); setV(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(tick); } requestAnimationFrame(tick); }, [target, dur]); return v;
}

function ScoreRing({ score, size = 160 }) {
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

function ConfidenceBadge({ confidence }) {
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

function VerdictBlock({ verdict, confidence }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${verdict.color}20`, borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{verdict.emoji}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: verdict.color }}>{verdict.action}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 10 }}>
        {verdict.pros.map((p, i) => <div key={"p" + i}><span style={{ color: "#4ade80" }}>+</span> {p}</div>)}
        {verdict.cons.map((c, i) => <div key={"c" + i}><span style={{ color: "#f59e0b" }}>−</span> {c}</div>)}
      </div>
      <ConfidenceBadge confidence={confidence} />
    </div>
  );
}

// --- Timeline with 4 points ---
function SunsetTimeline({ goldenHour, sunset }) {
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
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "16px 16px 12px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Когда смотреть</div>

      {/* Track */}
      <div style={{ position: "relative", height: 40, marginBottom: 8 }}>
        <div style={{ position: "absolute", top: 18, left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", top: 16, left: `${points[0].pct}%`, right: `${100 - points[3].pct}%`, height: 8, borderRadius: 4, background: "linear-gradient(90deg, #F7C94855, #F7C948, #FF6B35, #FF6B3588, #88174055)" }} />
        {points.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.pct}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: p.color, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(p.time)}</div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, marginTop: 2, boxShadow: `0 0 6px ${p.color}55` }} />
          </div>
        ))}
      </div>

      {/* Labels under points */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
        {points.map((p, i) => <span key={i} style={{ textAlign: "center", flex: 1 }}>{p.label}</span>)}
      </div>
    </div>
  );
}

// --- Countdown ---
function Countdown({ sunset, now, selectedDay }) {
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

// --- Fixed Header ---
function FixedHeader({ forecast, selectedDay, onSelect, activeSection, onNavClick }) {
  const sections = [
    { id: "score", label: "🎯 Оценка" },
    { id: "time", label: "⏰ Время" },
    { id: "factors", label: "📊 Факторы" },
    { id: "spots", label: "📍 Места" },
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
            const sc = calcScore(day), v = getVerdict(sc, day), active = i === selectedDay;
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
                <span style={{ fontSize: 10 }}>{dayEmoji(sc.total)}</span>
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

// --- Factor scales ---
function FactorScale({ name, icon, value, unit, min, max, idealMin, idealMax, hint, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const range = max - min, pos = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const iS = ((idealMin - min) / range) * 100, iW = ((idealMax - idealMin) / range) * 100;
  const ok = value >= idealMin && value <= idealMax, mc = ok ? "#4ade80" : "#f59e0b";
  return (
    <div style={{ marginBottom: 14, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px 16px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{icon} {name}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: mc, fontFamily: "monospace" }}>{typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value}{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, lineHeight: 1.3 }}>{hint}</div>
      <div style={{ position: "relative", height: 18, marginBottom: 3 }}>
        <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", top: 5, height: 8, borderRadius: 4, left: `${iS}%`, width: `${iW}%`, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.12)" }} />
        <div style={{ position: "absolute", top: 2, left: vis ? `${pos}%` : "0%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: mc, boxShadow: `0 0 8px ${mc}55`, transition: "left 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
        <span>{min}{unit}</span><span style={{ color: "rgba(74,222,128,0.3)" }}>{idealMin}–{idealMax} идеал</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function CloudFactor({ clouds, delay }) {
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

// --- Spots with distance + edit ---
function SpotCard({ spot, index, onDelete }) {
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

function AddSpotForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>+ Добавить место</button>;
  const submit = () => {
    if (name && lat && lng) { onAdd({ id: Date.now().toString(), name, lat: parseFloat(lat), lng: parseFloat(lng), type: "custom", desc: "Пользовательское место", icon: "📌" }); setName(""); setLat(""); setLng(""); setOpen(false); }
  };
  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12, fontFamily: "inherit", width: "100%" };
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginTop: 8 }}>
      <input placeholder="Название" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, marginBottom: 6 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input placeholder="Lat (39.47)" value={lat} onChange={e => setLat(e.target.value)} style={inp} />
        <input placeholder="Lng (-0.37)" value={lng} onChange={e => setLng(e.target.value)} style={inp} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={submit} style={{ flex: 1, padding: "8px", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, color: "#4ade80", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Добавить</button>
        <button onClick={() => setOpen(false)} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Отмена</button>
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function SunsetApp() {
  const [weekForecast, setWeekForecast] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("score");
  const [spots, setSpots] = useState(loadSpots);
  const [userLoc, setUserLoc] = useState(null);

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
  const rankedSpots = rankSpots(spots, dayData, userLoc?.lat, userLoc?.lng);

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
          <CloudFactor clouds={score.factors.clouds} delay={200} />
          <FactorScale name="Влажность" icon="💧" value={score.factors.humidity.value} unit="%" min={20} max={100} idealMin={55} idealMax={75} hint="Капли воды преломляют свет → тёплые тона" delay={300} />
          <FactorScale name="Видимость" icon="👁" value={score.factors.visibility.value} unit=" км" min={0} max={40} idealMin={8} idealMax={15} hint="Лёгкая дымка рассеивает свет. Слишком чисто = бледно" delay={400} />
          <FactorScale name="Ветер" icon="💨" value={score.factors.wind.value} unit=" км/ч" min={0} max={40} idealMin={0} idealMax={10} hint="Слабый ветер — облака держат форму" delay={500} />
          <FactorScale name="Давление" icon="📊" value={score.factors.pressure.value} unit="" min={990} max={1040} idealMin={1010} idealMax={1020} hint="Смена давления = смена воздушных масс" delay={600} />
          <FactorScale name="Пыль PM10" icon="🏜" value={score.factors.dust.value} unit=" µg" min={0} max={120} idealMin={20} idealMax={60} hint="Сахарская пыль (calima) — усиливает красные тона" delay={700} />
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
    </div>
  );
}
