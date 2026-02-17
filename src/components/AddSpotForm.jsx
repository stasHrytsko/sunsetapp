import { useState } from "react";

export default function AddSpotForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>+ Добавить место</button>;
  const submit = () => {
    if (name && lat && lng) { onAdd({ id: Date.now().toString(), name, lat: parseFloat(lat), lng: parseFloat(lng), type: "custom", desc: "Пользовательское место", icon: "\u{1F4CC}" }); setName(""); setLat(""); setLng(""); setOpen(false); }
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
