// Thresholds tuned for the Parc d'Isle marsh. `scale` is only the range drawn on the gauges.
export const METRICS = [
  {
    key: "Temperature", label: "Température", short: "Temp.", unit: "°C", digits: 1, ideal: "< 15 °C", scale: [0, 35],
    status: (v) => (v < 15 ? "good" : v <= 25 ? "warning" : "critical"),
  },
  {
    key: "pH", label: "pH", short: "pH", unit: "", digits: 2, ideal: "5,5 – 7,0", scale: [4, 9],
    status: (v) => (v < 5.5 ? "critical" : v <= 7 ? "good" : "warning"),
  },
  {
    key: "Oxygen", label: "Oxygène dissous", short: "O₂", unit: "mg/L", digits: 1, ideal: "4 – 7 mg/L", scale: [0, 12],
    status: (v) => (v < 4 ? "critical" : v <= 7 ? "good" : "warning"),
  },
  {
    key: "TDS", label: "TDS", short: "TDS", unit: "ppm", digits: 0, ideal: "< 100 ppm", scale: [0, 700],
    status: (v) => (v < 100 ? "good" : v <= 500 ? "warning" : "critical"),
  },
  {
    key: "Conductivity", label: "Conductivité", short: "Cond.", unit: "µS/cm", digits: 0, ideal: "< 150 µS/cm", scale: [0, 700],
    status: (v) => (v < 150 ? "good" : v <= 500 ? "warning" : "critical"),
  },
];

export const STATUS_LABEL = { good: "Bon", warning: "À surveiller", critical: "Critique", none: "Indisponible" };
export const QUALITY_WORD = { good: "Bon", warning: "Moyen", critical: "Mauvais", none: "Inconnu" };
export const STALE_MINUTES = 60;
export const OFFLINE_MINUTES = 180;

export const statusOf = (m, v) => (v == null ? "none" : m.status(v));

export function fmt(value, digits) {
  if (value == null) return "—";
  return value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function duration(minutes) {
  if (minutes < 1) return "moins d'1 min";
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ${String(Math.floor(minutes % 60)).padStart(2, "0")} min`;
  return `${Math.floor(minutes / 1440)} j`;
}

export const formatTime = (ts, seconds = false) =>
  new Date(ts * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", ...(seconds && { second: "2-digit" }) });

// Same rules as before: ≥2 alerts or offline → critical; 1 alert, ≥2 warnings or stale → warning; ≥3 good → good
export function overallQuality(latest, ageMinutes) {
  const counts = { good: 0, warning: 0, critical: 0, none: 0 };
  for (const m of METRICS) counts[statusOf(m, latest[m.key])]++;
  if (ageMinutes >= OFFLINE_MINUTES || counts.critical >= 2) return "critical";
  if (counts.critical >= 1 || counts.warning >= 2 || ageMinutes >= STALE_MINUTES) return "warning";
  if (counts.good >= 3) return "good";
  return "none";
}

// Colored segments of the gauge, sampled from the status function so they never drift from it
export function zonesOf(m, samples = 200) {
  const [lo, hi] = m.scale;
  const zones = [];
  for (let i = 0; i <= samples; i++) {
    const v = lo + ((hi - lo) * i) / samples;
    const status = m.status(v);
    const last = zones[zones.length - 1];
    if (last?.status === status) last.to = v;
    else zones.push({ status, from: last ? last.to : v, to: v });
  }
  return zones;
}

export function stats(values) {
  if (!values.length) return { min: null, avg: null, max: null };
  return {
    min: Math.min(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    max: Math.max(...values),
  };
}

// hours = 0: since the first measure ever
export const PERIODS = [
  { hours: 1, label: "1 h", text: "Dernière heure" },
  { hours: 6, label: "6 h", text: "6 dernières heures" },
  { hours: 12, label: "12 h", text: "12 dernières heures" },
  { hours: 24, label: "1 jour", text: "24 dernières heures" },
  { hours: 168, label: "1 semaine", text: "7 derniers jours" },
  { hours: 720, label: "1 mois", text: "30 derniers jours" },
  { hours: 4380, label: "6 mois", text: "6 derniers mois" },
  { hours: 8760, label: "1 an", text: "Dernière année" },
  { hours: 0, label: "Toujours", text: "Depuis la première mesure" },
];

// Axis label: time for short periods, day + hour beyond a day, date beyond a week, month beyond a year
export function formatTick(ts, hours) {
  const date = new Date(ts * 1000);
  if (hours <= 24) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (hours <= 168) return `${date.toLocaleDateString("fr-FR", { weekday: "short" })} ${date.getHours()} h`;
  if (hours <= 8760) return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

// Insert an empty row where the buoy sent nothing for a while, so charts break the line there
export function withGaps({ bucket, points }) {
  const rows = [];
  for (const p of points) {
    const prev = rows[rows.length - 1];
    if (prev && p.ts - prev.ts > bucket * 2.5) rows.push({ ts: prev.ts + bucket });
    rows.push(p);
  }
  return rows;
}
