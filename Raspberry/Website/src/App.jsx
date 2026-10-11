import { useEffect, useMemo, useState } from "react";
import { OFFLINE_MINUTES, overallQuality, withGaps } from "@/metrics";
import { Stage } from "@/parts";
import Direct from "@/Direct";
import Historique from "@/Historique";
import Compact from "@/Compact";

const REFRESH_MS = 5000;
const HISTORY_REFRESH_MS = 30000; // averages over hours or days: no need to recompute them every 5 s
const ROUTES = { "#/": "direct", "#/historique": "historique", "#/compact": "compact" };

// No hash: the official 800×480 Pi display gets the compact screen
const currentRoute = () => ROUTES[window.location.hash] ?? (window.innerWidth <= 800 ? "compact" : "direct");

function useRoute() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

// Fetch `url` now and every `ms`; error is set while the last attempt failed
function usePoll(url, ms) {
  const [state, setState] = useState({ data: undefined, error: false });
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data) => alive && setState({ data, error: false }))
        .catch((err) => {
          console.error(err);
          if (alive) setState((s) => ({ ...s, error: true }));
        });
    load();
    const timer = setInterval(load, ms);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [url, ms]);
  return state;
}

export default function App() {
  const route = useRoute();
  const [hours, setHours] = useState(24);
  const { data, error } = usePoll(`api/measures?limit=${route === "historique" ? 50 : 10}`, REFRESH_MS);
  const { data: history } = usePoll(`api/history?hours=${hours}`, HISTORY_REFRESH_MS);
  const chart = useMemo(() => (history ? withGaps(history) : []), [history]);

  const rows = data?.rows ?? [];
  const latest = rows.length ? rows[rows.length - 1] : null;
  const ageMinutes = latest ? (data.now - latest.ts) / 60 : Infinity; // server clock, refreshed at each poll
  const offline = data !== undefined && ageMinutes >= OFFLINE_MINUTES;
  const link = error ? "error" : data === undefined ? "loading" : offline ? "offline" : "online";
  const view = {
    route,
    link,
    rows,
    latest,
    ageMinutes,
    offline,
    count: data?.count ?? 0,
    hours,
    setHours,
    chart,
    bucket: history?.bucket ?? 60,
    span: history?.hours ?? hours, // hours actually covered by the chart (resolves "Toujours")
    quality: latest ? overallQuality(latest, ageMinutes) : "none",
  };

  if (route === "compact") {
    return (
      <Stage width={800} height={480}>
        <Compact {...view} />
      </Stage>
    );
  }
  return (
    <Stage width={1280} height={720}>
      {route === "historique" ? <Historique {...view} /> : <Direct {...view} />}
    </Stage>
  );
}
