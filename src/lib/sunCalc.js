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

export default SunCalc;
