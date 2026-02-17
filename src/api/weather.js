import SunCalc from "../lib/sunCalc";
import { VALENCIA } from "../config/locations";

export async function fetchWeatherData() {
  const { lat, lng } = VALENCIA;
  const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,visibility,wind_speed_10m,surface_pressure&timezone=Europe/Madrid&forecast_days=7`;
  const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5&hourly=pm10&timezone=Europe/Madrid&forecast_days=7`;
  const [wR, aR] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
  return { weather: await wR.json(), air: await aR.json() };
}

export function buildWeekForecast(weather, air) {
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

export function buildToday(weather, air) {
  const c = weather.current;
  return { humidity: c.relative_humidity_2m, pressure: c.surface_pressure, windSpeed: c.wind_speed_10m,
    cloudLow: c.cloud_cover_low, cloudMid: c.cloud_cover_mid, cloudHigh: c.cloud_cover_high,
    visibility: c.visibility, pm10: air.current?.pm10 ?? 0 };
}
