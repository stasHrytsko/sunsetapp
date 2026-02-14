import { useState, useEffect, useCallback } from "react";

// ============================================================
// SunCalc — minimal inline implementation
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
  const eclipticLongitude = M => {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    return M + C + rad * 102.9372 + Math.PI;
  };
  const sunCoords = d => { const M = solarMeanAnomaly(d), L = eclipticLongitude(M); return { dec: declination(L, 0), ra: rightAscension(L, 0) }; };
  const julianCycle = (d, lw) => Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const approxTransit = (Ht, lw, n) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
  const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const hourAngle = (h, phi, d) => Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

  function getSetJ(h, lw, phi, dec, n, M, L) {
    const w = hourAngle(h, phi, dec), a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
  }

  function getTimes(date, lat, lng) {
    const lw = rad * -lng, phi = rad * lat, d = toDays(date);
    const n = julianCycle(d, lw), ds = approxTransit(0, lw, n);
    const Mds = solarMeanAnomaly(ds + J2000 - J2000 + 0); // keep simple
    const M2 = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M2), dec = declination(L, 0);
    const Jnoon = solarTransitJ(ds, M2, L);
    const Jset = getSetJ(-0.833 * rad, lw, phi, dec, n, M2, L);
    const sunset = fromJulian(Jset);
    const goldenJ = getSetJ(6 * rad, lw, phi, dec, n, M2, L);
    const goldenHour = fromJulian(goldenJ);
    return { sunset, goldenHour };
  }

  function getPosition(date, lat, lng) {
    const lw = rad * -lng, phi = rad * lat, d = toDays(date);
    const c = sunCoords(d), H = rad * (280.16 + 360.9856235 * d) - lw - c.ra;
    return { azimuth: azimuthCalc(H, phi, c.dec) / rad + 180 };
  }

  return { getTimes, getPosition };
})();

// ============================================================
// Config
// ============================================================
const VALENCIA = { lat: 39.4699, lng: -0.3763 };

// ============================================================
// API fetching
// ============================================================
async function fetchWeatherData() {
  const { lat, lng } = VALENCIA;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
    + `&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility`
    + `&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,visibility,wind_speed_10m,surface_pressure`
    + `&timezone=Europe/Madrid&forecast_days=7`;

  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}`
    + `&current=pm10,pm2_5`
    + `&hourly=pm10`
    + `&timezone=Europe/Madrid&forecast_days=7`;

  const [weatherRes, airRes] = await Promise.all([fetch(weatherUrl), fetch(airUrl)]);
  const weather = await weatherRes.json();
  const air = await airRes.json();

  return { weather, air };
}

// Pick hourly data closest to sunset for each day
function buildWeekForecast(weather, air) {
  const days = [];
  const hourlyTime = weather.hourly.time; // array of "YYYY-MM-DDTHH:00" strings
  const airTime = air.hourly?.time || [];

  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    date.setHours(12, 0, 0, 0);

    // Get sunset time for this day
    const sun = SunCalc.getTimes(date, VALENCIA.lat, VALENCIA.lng);
    const sunsetHour = sun.sunset.getHours();

    // Find the hourly index closest to sunset
    const targetDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const targetKey = `${targetDate}T${String(sunsetHour).padStart(2, '0')}:00`;

    let idx = hourlyTime.indexOf(targetKey);
    if (idx === -1) {
      // Fallback: find closest hour on this date
      idx = hourlyTime.findIndex(t => t.startsWith(targetDate));
      if (idx !== -1) idx = Math.min(idx + sunsetHour, hourlyTime.length - 1);
    }

    if (idx === -1) continue;

    // Find PM10 for same time
    let pm10 = 15; // default
    const airIdx = airTime.indexOf(targetKey);
    if (airIdx !== -1 && air.hourly?.pm10?.[airIdx] != null) {
      pm10 = air.hourly.pm10[airIdx];
    }

    const conf = Math.max(40, 85 - d * 7); // confidence drops with forecast distance

    days.push({
      date,
      sunset: sun.sunset,
      goldenHour: SunCalc.getTimes(date, VALENCIA.lat, VALENCIA.lng).goldenHour,
      azimuth: Math.round(SunCalc.getPosition(sun.sunset, VALENCIA.lat, VALENCIA.lng).azimuth),
      cloudLow: weather.hourly.cloud_cover_low[idx] ?? 0,
      cloudMid: weather.hourly.cloud_cover_mid[idx] ?? 0,
      cloudHigh: weather.hourly.cloud_cover_high[idx] ?? 0,
      humidity: weather.hourly.relative_humidity_2m[idx] ?? 50,
      visibility: weather.hourly.visibility[idx] ?? 10000,
      windSpeed: weather.hourly.wind_speed_10m[idx] ?? 10,
      pressure: weather.hourly.surface_pressure[idx] ?? 1013,
      pm10,
      conf,
    });
  }

  return days;
}

function buildToday(weather, air) {
  const c = weather.current;
  return {
    temp: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    pressure: c.surface_pressure,
    windSpeed: c.wind_speed_10m,
    cloudTotal: c.cloud_cover,
    cloudLow: c.cloud_cover_low,
    cloudMid: c.cloud_cover_mid,
    cloudHigh: c.cloud_cover_high,
    visibility: c.visibility,
    pm10: air.current?.pm10 ?? 0,
  };
}

// ============================================================
// Scoring
// ============================================================
function calcScore(w) {
  let cs = 0;
  if (w.cloudHigh >= 20 && w.cloudHigh <= 70) cs += 50; else if (w.cloudHigh > 0 && w.cloudHigh < 20) cs += 25; else if (w.cloudHigh > 70) cs += 30;
  if (w.cloudMid >= 20 && w.cloudMid <= 60) cs += 35; else if (w.cloudMid > 60) cs += 15;
  if (w.cloudLow < 30) cs += 15; else if (w.cloudLow < 60) cs += 5; else cs -= 10;
  cs = Math.max(0, Math.min(100, cs));
  let hs = w.humidity >= 55 && w.humidity <= 75 ? 100 : w.humidity >= 45 && w.humidity < 55 ? 75 : w.humidity > 75 && w.humidity <= 85 ? 60 : w.humidity < 40 ? 30 : 20;
  let vk = w.visibility / 1000;
  let vs = vk >= 8 && vk <= 15 ? 100 : vk > 15 && vk <= 25 ? 70 : vk > 25 ? 40 : vk >= 5 ? 50 : 20;
  let ws = w.windSpeed <= 10 ? 100 : w.windSpeed <= 15 ? 70 : w.windSpeed <= 25 ? 40 : 15;
  let ps = w.pressure >= 1010 && w.pressure <= 1020 ? 80 : w.pressure < 1010 ? 65 : 50;
  let ds = w.pm10 >= 20 && w.pm10 <= 60 ? 90 : w.pm10 > 60 && w.pm10 <= 100 ? 70 : w.pm10 > 100 ? 50 : w.pm10 < 10 ? 25 : 30;
  const total = Math.round(cs * 0.35 + hs * 0.20 + vs * 0.15 + ws * 0.10 + ps * 0.10 + ds * 0.10);
  return {
    total: Math.min(100, Math.max(0, total)), factors: {
      clouds: { score: cs, low: w.cloudLow, mid: w.cloudMid, high: w.cloudHigh },
      humidity: { score: hs, value: w.humidity }, visibility: { score: vs, value: vk },
      wind: { score: ws, value: w.windSpeed }, pressure: { score: ps, value: w.pressure },
      dust: { score: ds, value: w.pm10 },
    }
  };
}

function getVerdict(score, w) {
  const t = score.total, f = score.factors;
  const pros = [], cons = [];
  if (f.clouds.high >= 20 && f.clouds.high <= 70) pros.push("высокие облака поймают свет");
  if (f.clouds.mid >= 20 && f.clouds.mid <= 60) pros.push("средние облака добавят глубину");
  if (f.clouds.low >= 60) cons.push("низкие облака закроют солнце");
  else if (f.clouds.low < 15) pros.push("горизонт чистый");
  if (f.humidity.value >= 55 && f.humidity.value <= 75) pros.push("влажность идеальная для рассеивания");
  else if (f.humidity.value > 85) cons.push("слишком влажно — мутная картинка");
  else if (f.humidity.value < 40) cons.push("сухой воздух — бледные цвета");
  if (f.visibility.value >= 8 && f.visibility.value <= 15) pros.push("мягкая дымка усилит краски");
  else if (f.visibility.value > 25) cons.push("слишком чистый воздух — мало рассеивания");
  else if (f.visibility.value < 5) cons.push("видимость плохая");
  if (f.wind.value <= 10) pros.push("тихо — облака держат форму");
  else if (f.wind.value > 15) cons.push("ветер разгонит облака");
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

function scoreColor(s) { if (s >= 81) return "#FF6B35"; if (s >= 66) return "#F7C948"; if (s >= 41) return "#88B7D5"; return "#8B95A5"; }

function getSpots(w) {
  const all = [
    { name: "Playa de la Malvarrosa", type: "beach", desc: "Открытый горизонт, отражение в воде", time: "12 мин", lat: 39.4783, lng: -0.3252, icon: "🏖" },
    { name: "La Albufera", type: "lake", desc: "Зеркальное озеро, двойной закат", time: "22 мин", lat: 39.3328, lng: -0.3517, icon: "🪷" },
    { name: "Mirador del Miguelete", type: "tower", desc: "360° панорама, укрытие от ветра", time: "8 мин", lat: 39.4755, lng: -0.3755, icon: "🏛" },
    { name: "Playa de la Patacona", type: "beach", desc: "Тихий пляж, меньше людей", time: "15 мин", lat: 39.4894, lng: -0.3215, icon: "🌊" },
    { name: "Jardín del Turia", type: "park", desc: "Городской парк, удобный доступ", time: "5 мин", lat: 39.4802, lng: -0.3667, icon: "🌳" },
  ];
  return all.map(s => { let b = 0; if (w.cloudLow < 30 && s.type === "beach") b += 20; if ((w.cloudMid > 20 || w.cloudHigh > 20) && s.type === "lake") b += 25; if (w.windSpeed > 15 && s.type === "tower") b += 20; if (s.type === "beach" || s.type === "lake") b += 10; return { ...s, bonus: b }; }).sort((a, b) => b.bonus - a.bonus).slice(0, 3);
}

function fmt(d) { return d && !isNaN(d) ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "--:--"; }
function dayName(d, i) { if (i === 0) return "Сегодня"; if (i === 1) return "Завтра"; return d.toLocaleDateString("ru-RU", { weekday: "short" }); }

// ============================================================
// UI Components
// ============================================================
function useAnim(target, dur = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    function tick(now) { const p = Math.min((now - t0) / dur, 1); setV(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }, [target, dur]);
  return v;
}

function ScoreRing({ score, size = 180 }) {
  const anim = useAnim(score, 1400);
  const sw = 7, r = (size - sw * 2) / 2, c = 2 * Math.PI * r;
  const col = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={col} /><stop offset="100%" stopColor={col} stopOpacity="0.35" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#rg)" strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c - (anim / 100) * c} strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "'Playfair Display',Georgia,serif" }}>{anim}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: 1 }}>из 100</span>
      </div>
    </div>
  );
}

function VerdictBlock({ verdict, confidence }) {
  const cc = confidence >= 75 ? "#4ade80" : confidence >= 55 ? "#fbbf24" : "#f87171";
  const ct = confidence >= 75 ? "высокая" : confidence >= 55 ? "средняя" : "низкая";
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${verdict.color}20`, borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{verdict.emoji}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: verdict.color }}>{verdict.action}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, marginBottom: 12 }}>
        {verdict.pros.length > 0 && <div style={{ marginBottom: verdict.cons.length > 0 ? 6 : 0 }}>{verdict.pros.map((p, i) => (<span key={i}><span style={{ color: "#4ade80", marginRight: 4 }}>+</span>{p}{i < verdict.pros.length - 1 && <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 8px" }}>·</span>}</span>))}</div>}
        {verdict.cons.length > 0 && <div>{verdict.cons.map((c, i) => (<span key={i}><span style={{ color: "#f59e0b", marginRight: 4 }}>−</span>{c}{i < verdict.cons.length - 1 && <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 8px" }}>·</span>}</span>))}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: cc, boxShadow: `0 0 6px ${cc}66` }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Уверенность прогноза:</span>
        <span style={{ fontSize: 11, color: cc, fontWeight: 600 }}>{confidence}% — {ct}</span>
      </div>
    </div>
  );
}

function ViewingWindow({ viewStart, viewEnd, sunset }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Лучшее время для просмотра</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#F7C948", fontFamily: "monospace" }}>{fmt(viewStart)}</div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>выходи</div></div>
        <div style={{ flex: 1, margin: "0 12px", position: "relative", height: 10 }}>
          <div style={{ position: "absolute", top: 3, left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", top: 1, left: 0, right: 0, height: 8, borderRadius: 4, background: "linear-gradient(90deg, #F7C94866, #FF6B35, #FF6B3599, #88174066)" }} />
          <div style={{ position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>☀️</div>
        </div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#881740", fontFamily: "monospace" }}>{fmt(viewEnd)}</div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>финал</div></div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>~40 мин · золотой свет → закат → послесвечение</div>
    </div>
  );
}

function WeekCalendar({ forecast, selectedDay, onSelect }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {forecast.map((day, i) => {
          const score = calcScore(day); const v = getVerdict(score, day); const active = i === selectedDay;
          return (
            <button key={i} onClick={() => onSelect(i)} style={{
              flex: 1, background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
              border: active ? `1px solid ${v.color}44` : "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12, padding: "10px 2px", cursor: "pointer", transition: "all 0.25s ease",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transform: active ? "translateY(-2px)" : "none",
            }}>
              <span style={{ fontSize: 9, color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{dayName(day.date, i)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.4)" }}>{day.date.getDate()}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: v.color, fontFamily: "'Playfair Display',Georgia,serif" }}>{score.total}</span>
              <span style={{ fontSize: 11 }}>{v.emoji}</span>
              <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                {[1, 2, 3].map(n => (<div key={n} style={{ width: 4, height: 4, borderRadius: 2, background: day.conf >= (n * 30) ? "rgba(74,222,128,0.6)" : "rgba(255,255,255,0.1)" }} />))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FactorScale({ name, icon, value, unit, min, max, idealMin, idealMax, hint, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const range = max - min; const pos = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const idealStart = ((idealMin - min) / range) * 100; const idealWidth = ((idealMax - idealMin) / range) * 100;
  const isIdeal = value >= idealMin && value <= idealMax; const mc = isIdeal ? "#4ade80" : "#f59e0b";
  return (
    <div style={{ marginBottom: 16, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s ease", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{icon} {name}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: mc, fontFamily: "monospace" }}>{typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value}{unit}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", marginBottom: 10, lineHeight: 1.4 }}>{hint}</div>
      <div style={{ position: "relative", height: 20, marginBottom: 4 }}>
        <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", top: 6, height: 8, borderRadius: 4, left: `${idealStart}%`, width: `${idealWidth}%`, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.12)" }} />
        <div style={{ position: "absolute", top: 3, left: vis ? `${pos}%` : "0%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: mc, boxShadow: `0 0 10px ${mc}55`, transition: "left 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
        <span>{min}{unit}</span><span style={{ color: "rgba(74,222,128,0.35)" }}>{idealMin}–{idealMax} идеал</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function CloudFactor({ clouds, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const layers = [
    { name: "Высокие (cirrus)", val: clouds.high, good: clouds.high >= 20 && clouds.high <= 70, hint: "Ловят свет → яркие краски", ideal: "20–70%" },
    { name: "Средние", val: clouds.mid, good: clouds.mid >= 20 && clouds.mid <= 60, hint: "Добавляют глубину цвета", ideal: "20–60%" },
    { name: "Низкие", val: clouds.low, good: clouds.low < 30, hint: "Блокируют солнце — меньше = лучше", ideal: "<30%" },
  ];
  return (
    <div style={{ marginBottom: 16, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s ease", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px 16px 12px" }}>
      <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 3 }}>☁️ Облачность</div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", marginBottom: 12, lineHeight: 1.4 }}>Высокие и средние облака рассеивают свет → оранжевый и красный. Низкие — закрывают солнце.</div>
      {layers.map((l, i) => (
        <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{l.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>идеал {l.ideal}</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: l.good ? "#4ade80" : "#f59e0b" }}>{l.val}%</span>
            </div>
          </div>
          <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: vis ? `${l.val}%` : "0%", height: "100%", borderRadius: 2, background: l.good ? "linear-gradient(90deg,#4ade80,#22c55e)" : "linear-gradient(90deg,#fbbf24,#f59e0b)", transition: "width 1s ease-out" }} />
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>{l.hint}</div>
        </div>
      ))}
    </div>
  );
}

function SpotCard({ spot, index }) {
  const [h, setH] = useState(false);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=driving`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "block", background: h ? "rgba(255,255,255,0.1)" : index === 0 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", marginBottom: 10, textDecoration: "none", border: index === 0 ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent", transform: h ? "translateY(-2px)" : "none", transition: "all 0.25s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>
            {spot.icon} {spot.name}
            {index === 0 && <span style={{ marginLeft: 8, fontSize: 10, color: "#F7C948", background: "rgba(247,201,72,0.12)", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>лучший</span>}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{spot.desc}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>🚗 {spot.time}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>маршрут →</div>
        </div>
      </div>
    </a>
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

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    fetchWeatherData()
      .then(({ weather, air }) => {
        const week = buildWeekForecast(weather, air);
        // Patch day 0 with current data for max accuracy
        if (week.length > 0) {
          const today = buildToday(weather, air);
          week[0] = { ...week[0], ...today, cloudLow: today.cloudLow, cloudMid: today.cloudMid, cloudHigh: today.cloudHigh };
        }
        setWeekForecast(week);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Не удалось загрузить данные погоды. Проверь интернет.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0c1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#fff", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 40, animation: "pulse 1.5s infinite" }}>🌅</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Загружаю погоду для Валенсии...</div>
        <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      </div>
    );
  }

  if (error || !weekForecast || weekForecast.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0c1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#d9534f", fontFamily: "system-ui", padding: 40, textAlign: "center" }}>
        {error || "Нет данных"}
      </div>
    );
  }

  const dayData = weekForecast[selectedDay];
  const score = calcScore(dayData);
  const verdict = getVerdict(score, dayData);
  const spots = getSpots(dayData);

  const viewStart = new Date(dayData.sunset.getTime() - 25 * 60000);
  const viewEnd = new Date(dayData.sunset.getTime() + 15 * 60000);

  const diff = dayData.sunset.getTime() - now.getTime();
  const timeLeft = selectedDay > 0 ? "—" : (diff > 0 ? (Math.floor(diff / 3600000) > 0 ? `${Math.floor(diff / 3600000)}ч ${Math.floor((diff % 3600000) / 60000)}мин` : `${Math.floor(diff / 60000)} мин`) : "уже был");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg,#0f0c1a 0%,#1a1230 20%,#2a1740 40%,#3d1d4a 55%,#4d2245 68%,#3a1835 85%,#1a0f22 100%)", fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{margin:0;background:#0f0c1a}
        button{font-family:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{filter:blur(40px) brightness(0.6)}50%{filter:blur(50px) brightness(0.9)}}
        .fu{animation:fadeUp .7s ease-out forwards;opacity:0}
        .d1{animation-delay:.05s}.d2{animation-delay:.15s}.d3{animation-delay:.25s}.d4{animation-delay:.35s}.d5{animation-delay:.45s}.d6{animation-delay:.55s}
      `}</style>

      <div style={{ position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle,${verdict.color}22 0%,transparent 70%)`, animation: "glow 4s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 420, margin: "0 auto", padding: "0 20px 40px", position: "relative", zIndex: 1 }}>

        <div className="fu d1" style={{ paddingTop: 44, marginBottom: 6, textAlign: "center" }}>
          <div style={{ display: "inline-block", fontSize: 10, textTransform: "uppercase", letterSpacing: 3.5, color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
            Valencia · {now.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
          </div>
        </div>

        <h1 className="fu d1" style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 30, fontWeight: 400, textAlign: "center", marginBottom: 24 }}>Закат сегодня</h1>

        <div className="fu d2"><WeekCalendar forecast={weekForecast} selectedDay={selectedDay} onSelect={setSelectedDay} /></div>

        <div className="fu d3" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <ScoreRing score={score.total} />
        </div>

        <div className="fu d3"><VerdictBlock verdict={verdict} confidence={dayData.conf} /></div>

        <div className="fu d4"><ViewingWindow viewStart={viewStart} viewEnd={viewEnd} sunset={dayData.sunset} /></div>

        <div className="fu d4" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 8px", marginBottom: 28, display: "flex", justifyContent: "space-around" }}>
          {[
            { l: "Golden Hour", v: fmt(dayData.goldenHour), c: "#F7C948" },
            { l: "Закат", v: fmt(dayData.sunset), c: "#FF6B35" },
            { l: "Осталось", v: timeLeft, c: "rgba(255,255,255,0.75)" },
            { l: "Азимут", v: `${dayData.azimuth}°`, c: "rgba(255,255,255,0.55)" },
          ].map((x, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>{x.l}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: x.c, fontFamily: "'Playfair Display',Georgia,serif" }}>{x.v}</div>
            </div>
          ))}
        </div>

        <div className="fu d5" style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5 }}>Что влияет на закат</h2>
          <CloudFactor clouds={score.factors.clouds} delay={300} />
          <FactorScale name="Влажность" icon="💧" value={score.factors.humidity.value} unit="%" min={20} max={100} idealMin={55} idealMax={75} hint="Капли воды преломляют свет → оранжевые и красные тона" delay={400} />
          <FactorScale name="Видимость" icon="👁" value={score.factors.visibility.value} unit=" км" min={0} max={40} idealMin={8} idealMax={15} hint="Лёгкая дымка рассеивает свет мягко. Слишком чисто = бледно" delay={500} />
          <FactorScale name="Ветер" icon="💨" value={score.factors.wind.value} unit=" км/ч" min={0} max={40} idealMin={0} idealMax={10} hint="Слабый ветер — облака держат форму и ловят свет" delay={600} />
          <FactorScale name="Давление" icon="📊" value={score.factors.pressure.value} unit="" min={990} max={1040} idealMin={1010} idealMax={1020} hint="Смена давления = смена воздушных масс = драматичное небо" delay={700} />
          <FactorScale name="Пыль PM10" icon="🏜" value={score.factors.dust.value} unit=" µg" min={0} max={120} idealMin={20} idealMax={60} hint="Сахарская пыль (calima) — усиливает красные и пурпурные оттенки" delay={800} />
        </div>

        <div className="fu d6" style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5 }}>Куда идти</h2>
          {spots.map((s, i) => <SpotCard key={s.name} spot={s} index={i} />)}
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.15)", paddingBottom: 24, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
          Open-Meteo API · SunCalc · Valencia
        </div>
      </div>
    </div>
  );
}