import { useState, useEffect } from "react";

export function useAnim(target, dur = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => { const t0 = performance.now(); function tick(now) { const p = Math.min((now - t0) / dur, 1); setV(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(tick); } requestAnimationFrame(tick); }, [target, dur]); return v;
}
