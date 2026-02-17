import { DEFAULT_SPOTS } from "../config/locations";

export function loadSpots() {
  try {
    const s = localStorage.getItem("sunset_spots");
    return s ? JSON.parse(s) : DEFAULT_SPOTS;
  } catch {
    return DEFAULT_SPOTS;
  }
}

export function saveSpots(spots) {
  localStorage.setItem("sunset_spots", JSON.stringify(spots));
}
