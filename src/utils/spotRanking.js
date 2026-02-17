function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function rankSpots(allSpots, w, userLat, userLng) {
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
