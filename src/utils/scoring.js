export function calcScore(w) {
  let cs = 0;
  if (w.cloudHigh >= 20 && w.cloudHigh <= 70) cs += 50; else if (w.cloudHigh > 0 && w.cloudHigh < 20) cs += 25; else if (w.cloudHigh > 70 && w.cloudLow < 30) cs += 45; else if (w.cloudHigh > 70) cs += 25;
  if (w.cloudMid >= 20 && w.cloudMid <= 60) cs += 35;
  else if (w.cloudMid > 60 && w.cloudLow < 30) cs += 28;
  else if (w.cloudMid > 60) cs += 12;  if (w.cloudLow < 30) cs += 15; else if (w.cloudLow < 60) cs += 5; else cs -= 10;
  cs = Math.max(0, Math.min(100, cs));
  const hs = w.humidity >= 55 && w.humidity <= 75 ? 100 : w.humidity >= 45 && w.humidity < 55 ? 75 : w.humidity > 75 && w.humidity <= 85 ? 60 : w.humidity < 40 ? 30 : 20;
  const vk = w.visibility / 1000;
  const vs = vk >= 8 && vk <= 15 ? 100 : vk > 15 && vk <= 25 ? 70 : vk > 25 ? 40 : vk >= 5 ? 50 : 20;
  const ws = w.windSpeed <= 10 ? 100 : w.windSpeed <= 15 ? 70 : w.windSpeed <= 25 ? 40 : 15;
  const ps = w.pressure >= 1010 && w.pressure <= 1020 ? 80 : w.pressure < 1010 ? 65 : 50;
  const ds = w.pm10 >= 20 && w.pm10 <= 60 ? 90 : w.pm10 > 60 && w.pm10 <= 100 ? 70 : w.pm10 > 100 ? 50 : w.pm10 < 10 ? 25 : 30;
  const cloudyCeiling = (w.cloudHigh + w.cloudMid) > 50;
  const vWeight = cloudyCeiling ? 0.05 : 0.15;
  const wWeight = cloudyCeiling && w.cloudHigh > 50 ? 0.05 : 0.10;
  const extra = (0.15 - vWeight) + (0.10 - wWeight);
  const total = Math.round(cs * (0.35 + extra) + hs * 0.20 + vs * vWeight + ws * wWeight + ps * 0.10 + ds * 0.10);
    return { total: Math.min(100, Math.max(0, total)), factors: {
    clouds: { score: cs, low: w.cloudLow, mid: w.cloudMid, high: w.cloudHigh },
    humidity: { score: hs, value: w.humidity }, visibility: { score: vs, value: vk },
    wind: { score: ws, value: w.windSpeed }, pressure: { score: ps, value: w.pressure },
    dust: { score: ds, value: w.pm10 },
  }};
}

export function calcConfidence(sunset, now, cloudHours, dayIndex) {
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

export function getVerdict(score, w) {
  const t = score.total, f = score.factors, pros = [], cons = [];
  const totalCloud = f.clouds.low + f.clouds.mid + f.clouds.high;

  // Pros — in priority order (max 2)
  if (f.clouds.mid >= 20 && f.clouds.mid <= 55 || f.clouds.high > 40) pros.push("облака создадут объём и текстуру");
  if (f.humidity.value >= 55 && f.humidity.value <= 75) pros.push("влажность в идеале — сочные краски");
  if (f.clouds.low < 10) pros.push("горизонт чистый");
  if (f.wind.value <= 10 && totalCloud > 10) pros.push("тихо — облака держат форму");
  if (w.pm10 >= 10 && w.pm10 <= 35) pros.push("лёгкая пыль добавит тёплые тона");

  // Cons — in priority order (max 1)
  if (f.clouds.low > 20) cons.push("низкие облака могут закрыть горизонт");
  if (f.visibility.value > 40 && totalCloud < 20) cons.push("слишком чистый воздух — мало рассеивания");
  if (f.humidity.value < 50) cons.push("влажность ниже идеала — цвета будут бледнее");
  if (w.pm10 > 60) cons.push("сильная пыль — небо будет мутным");

  let emoji, action, color;
  if (t >= 81) { emoji = "\u{1F525}"; action = "Иди прямо сейчас"; color = "#FF6B35"; }
  else if (t >= 66) { emoji = "\u2728"; action = "Стоит выйти"; color = "#F7C948"; }
  else if (t >= 41) { emoji = "\u{1F324}"; action = "На твоё усмотрение"; color = "#88B7D5"; }
  else { emoji = "\u{1F634}"; action = "Можно пропустить"; color = "#8B95A5"; }
  return { emoji, action, color, pros: pros.slice(0, 2), cons: cons.slice(0, 1) };
}

export function scoreColor(s) {
  return s >= 81 ? "#FF6B35" : s >= 66 ? "#F7C948" : s >= 41 ? "#88B7D5" : "#8B95A5";
}
