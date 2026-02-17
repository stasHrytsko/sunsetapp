export function fmt(d) {
  return d && !isNaN(d) ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "--:--";
}

export function dayName(d, i) {
  return i === 0 ? "Сегодня" : i === 1 ? "Завтра" : d.toLocaleDateString("ru-RU", { weekday: "short" });
}

export function dayEmoji(score) {
  return score >= 81 ? "\u{1F525}" : score >= 66 ? "\u2728" : score >= 41 ? "\u{1F324}" : "\u{1F634}";
}
