const SUNSET_TYPES = {
  blood_sun: {
    name: "Кровавое солнце",
    emoji: "\u{1F311}",
    description: "Красный диск солнца в пыльном небе. Эффект калимы.",
  },
  breakthrough: {
    name: "Прорыв",
    emoji: "\u26A1",
    description: "Солнце пробивается сквозь облака. Самый непредсказуемый и мощный тип.",
  },
  pink_fire: {
    name: "Розовый пожар",
    emoji: "\u{1F525}",
    description: "Небо будет гореть розовым и пурпурным после захода. Длится ~20 минут.",
  },
  dramatic_sheep: {
    name: "Драматичные барашки",
    emoji: "\u{1F411}",
    description: "Объёмное 3D-небо: золотые края облаков, тёмные основания, просветы синего.",
  },
  clean_gradient: {
    name: "Чистый градиент",
    emoji: "\u{1F308}",
    description: "Плавный переход цветов без облаков. Минималистично и спокойно.",
  },
  normal: {
    name: "Обычный закат",
    emoji: "\u{1F305}",
    description: "",
  },
};

export function detectSunsetType(w) {
  // 1. No sunset — low clouds block horizon
  if (w.cloudLow > 60) {
    const conf = 0.5 + Math.min(1, (w.cloudLow - 60) / 40) * 0.5;
    return { type: null, name: "Нет заката", emoji: "\u2601\uFE0F", description: "Низкие облака закрывают горизонт", confidence: conf };
  }

  // 2. Blood sun — Saharan dust (calima)
  if (w.pm10 >= 40 && w.visibility <= 15000) {
    const conf = Math.min(1, (w.pm10 - 40) / 60) * 0.5 + Math.min(1, (15000 - w.visibility) / 10000) * 0.5;
    return { ...SUNSET_TYPES.blood_sun, type: "blood_sun", confidence: Math.max(0.4, Math.min(1, conf)) };
  }

  // 3. Breakthrough — front passed, pressure rising after drop
  if (w.pressureTrend === "rising_after_drop" && (w.cloudMid + w.cloudHigh) >= 40 && w.cloudLow < 30) {
    const cloudFit = Math.min(1, (w.cloudMid + w.cloudHigh - 40) / 40);
    return { ...SUNSET_TYPES.breakthrough, type: "breakthrough", confidence: Math.max(0.5, Math.min(0.85, 0.5 + cloudFit * 0.35)) };
  }

  // 4. Pink fire — high cirrus, clear horizon
  if (w.cloudHigh >= 60 && w.cloudLow <= 10) {
    const conf = Math.min(1, (w.cloudHigh - 60) / 30) * 0.6 + (1 - w.cloudLow / 10) * 0.4;
    return { ...SUNSET_TYPES.pink_fire, type: "pink_fire", confidence: Math.max(0.5, Math.min(1, conf)) };
  }

  // 5. Dramatic sheep — mid clouds in sweet spot
  if (w.cloudMid >= 25 && w.cloudMid <= 55 && w.cloudLow <= 15 && w.cloudHigh < 60) {
    const midCenter = 1 - Math.abs(w.cloudMid - 40) / 15;
    return { ...SUNSET_TYPES.dramatic_sheep, type: "dramatic_sheep", confidence: Math.max(0.45, Math.min(0.9, midCenter)) };
  }

  // 6. Clean gradient — no clouds, good moisture
  if ((w.cloudHigh + w.cloudMid + w.cloudLow) <= 10 && w.humidity >= 45 && w.visibility >= 10000 && w.pm10 < 40) {
    const totalCloud = w.cloudHigh + w.cloudMid + w.cloudLow;
    const conf = (1 - totalCloud / 10) * 0.5 + Math.min(1, w.visibility / 20000) * 0.3 + (w.humidity >= 55 ? 0.2 : 0.1);
    return { ...SUNSET_TYPES.clean_gradient, type: "clean_gradient", confidence: Math.max(0.5, Math.min(1, conf)) };
  }

  // 7. Normal
  return { ...SUNSET_TYPES.normal, type: "normal", confidence: 0.5 };
}
