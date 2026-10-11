import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { METRICS, PERIODS, QUALITY_WORD, STATUS_LABEL, statusOf } from "@/metrics";

// Literal class names so Tailwind generates them
export const DOT = { good: "bg-[#1a9e74]", warning: "bg-[#ef8a17]", critical: "bg-[#e5332a]", none: "bg-[#9aa9a4]" };
const CHIP = {
  good: "bg-[#dff3ea] text-[#0d6e51]",
  warning: "bg-[#fdeedc] text-[#9a5200]",
  critical: "bg-[#fde3e1] text-[#b8231b]",
  none: "bg-line text-ink-soft",
};
const ON_DARK_TEXT = { good: "text-[#7fe0b8]", warning: "text-[#ffb25c]", critical: "text-[#ff8a80]", none: "text-mint" };
const ON_DARK_BG = { good: "bg-[#7fe0b8]", warning: "bg-[#ffb25c]", critical: "bg-[#ff8a80]", none: "bg-mint/30" };

// The screens are drawn at a fixed size, then scaled to fill whatever display the Pi has
export function Stage({ width, height, children }) {
  const fit = () => Math.min(window.innerWidth / width, window.innerHeight / height);
  const [scale, setScale] = useState(fit);
  useEffect(() => {
    const onResize = () => setScale(fit());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });
  return (
    <div className="grid h-svh w-screen place-items-center overflow-hidden bg-ground">
      <div style={{ width, height, transform: `scale(${scale})` }} className="relative shrink-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function Chip({ status, className }) {
  return (
    <Badge className={cn("rounded-full border-0 px-2.5 py-0.5 text-[11.5px] font-bold", CHIP[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function Dot({ status, className }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", DOT[status], className)} aria-hidden="true" />;
}

export function Clock({ compact = false }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (compact) return <span className="rounded-xl bg-ink px-3 py-1 font-mono text-lg text-white">{time}</span>;
  return (
    <span className="flex flex-col items-end rounded-2xl bg-ink px-4 py-1.5 leading-tight text-white">
      <span className="font-mono text-[21px]">{time}</span>
      <span className="text-[11.5px] font-semibold text-mint">
        {now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
      </span>
    </span>
  );
}

// "Bouée en ligne" / "hors ligne" / "Serveur injoignable"
export function LinkPill({ link, compact = false }) {
  const text = {
    online: compact ? "En ligne" : "Bouée en ligne",
    offline: compact ? "Hors ligne" : "Bouée hors ligne",
    error: "Serveur injoignable",
    loading: "Connexion…",
  }[link];
  const bad = link === "offline" || link === "error";
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-bold",
        compact ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2 text-sm",
        bad ? "bg-[#e5332a] text-white" : "bg-white text-[#0d6e51]"
      )}
    >
      <span
        className={cn(
          "size-2.5 rounded-full",
          bad ? "bg-white" : link === "online" ? "bg-[#1a9e74] shadow-[0_0_0_3px_#d4f0e3]" : "bg-[#9aa9a4]"
        )}
      />
      {text}
    </span>
  );
}

function Leaves() {
  return (
    <svg width="260" height="120" viewBox="0 0 260 120" aria-hidden="true" className="pointer-events-none absolute -top-1.5 left-[300px] opacity-30">
      <g fill="none" stroke="#0b3d33" strokeWidth="1.4">
        <path d="M4 112 C 70 92, 140 60, 252 10" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M60 94 c -6 -18, 4 -30, 18 -34 c 2 16, -6 28, -18 34 z" />
        <path d="M70 90 c 14 6, 30 2, 38 -10 c -14 -6, -30 -2, -38 10 z" />
        <path d="M120 66 c -4 -18, 8 -30, 22 -32 c 0 16, -8 28, -22 32 z" />
        <path d="M132 60 c 14 6, 30 0, 38 -12 c -14 -6, -30 0, -38 12 z" />
        <path d="M186 38 c -2 -16, 10 -26, 22 -26 c -2 14, -10 24, -22 26 z" />
        <circle cx="236" cy="22" r="3" />
        <circle cx="246" cy="30" r="2.4" />
      </g>
    </svg>
  );
}

// Header of the two 1280×720 screens
export function Header({ route, link }) {
  const tab = (href, label, active) => (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-h-11 rounded-full px-6 py-[11px] text-[15px] font-bold no-underline",
        active ? "bg-pink text-white" : "text-ink"
      )}
    >
      {label}
    </a>
  );
  return (
    <>
      <Leaves />
      <header className="relative flex h-[62px] items-center justify-between gap-6">
        <div className="flex min-w-[300px] flex-col leading-none">
          <span className="ml-0.5 font-script text-[27px] text-white">WaterMonitor</span>
          <span className="text-[30px] font-black uppercase tracking-[-0.01em]">Parc d'Isle</span>
        </div>
        <nav aria-label="Vues" className="flex gap-1 rounded-full bg-white p-1">
          {tab("#/", "Direct", route === "direct")}
          {tab("#/historique", "Historique", route === "historique")}
        </nav>
        <div className="flex min-w-[300px] items-center justify-end gap-2.5">
          <LinkPill link={link} />
          <Clock />
        </div>
      </header>
    </>
  );
}

// Dark "Qualité générale" panel: big word, sub line, one pip per metric
export function QualityPanel({ quality, latest, offline, compact = false }) {
  const nGood = latest ? METRICS.filter((m) => statusOf(m, latest[m.key]) === "good").length : 0;
  const word = offline || !latest ? "—" : QUALITY_WORD[quality].toUpperCase();
  const sub = !latest
    ? "Aucune mesure en base"
    : offline
      ? "Pas de mesure récente"
      : `${nGood} paramètre${nGood > 1 ? "s" : ""} sur 5 dans ${compact ? "l'idéal" : "la plage idéale"}`;
  return (
    <section
      aria-label="Qualité générale"
      className={cn(
        "flex flex-col bg-ink text-white",
        compact ? "min-h-0 justify-between gap-1.5 rounded-2xl px-3.5 py-3" : "gap-2.5 rounded-[18px] px-5 py-4"
      )}
    >
      <span className={cn("font-script text-mint", compact ? "text-xl" : "text-[22px]")}>Qualité générale</span>
      <span
        className={cn(
          "leading-none font-black",
          compact ? "text-[40px]" : "text-[46px] tracking-[0.01em]",
          offline || !latest ? "text-mint" : ON_DARK_TEXT[quality]
        )}
      >
        {word}
      </span>
      <span className={cn("font-medium text-mint-soft", compact ? "text-[12.5px]" : "text-[13.5px]")}>{sub}</span>
      <div className={cn("grid grid-cols-5", compact ? "gap-[5px]" : "gap-1.5")}>
        {METRICS.map((m) => (
          <span key={m.key} className="flex flex-col items-stretch gap-[5px]">
            <span className={cn("h-2 rounded", ON_DARK_BG[statusOf(m, latest?.[m.key])])} />
            {!compact && <span className="text-center text-[11px] font-semibold text-mint">{m.short}</span>}
          </span>
        ))}
      </div>
    </section>
  );
}

// Mini curve of the last measures (index-based, like the design)
export function Spark({ values, height }) {
  const pts = values.filter((v) => v != null);
  if (pts.length < 2) return <div style={{ height }} />;
  const lo = Math.min(...pts);
  const range = Math.max(...pts) - lo || 1;
  const points = pts.map((v, i) => `${((i * 200) / (pts.length - 1)).toFixed(1)},${(height - 4 - ((v - lo) / range) * (height - 8)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 200 ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true" className="block">
      <polyline points={points} fill="none" stroke="#2f62a8" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Chart period picker: a pill that opens a card of periods, shared by every chart of the screen.
// Not a Radix popover: its portal would escape the Stage scaling.
export function PeriodPicker({ hours, setHours, compact = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Période des graphiques"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-full bg-white font-bold whitespace-nowrap text-ink hover:bg-line",
          compact ? "px-3 text-[12.5px]" : "px-4 text-sm"
        )}
      >
        <CalendarClock className="size-4" aria-hidden="true" />
        {PERIODS.find((p) => p.hours === hours).label}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <>
          {/* fixed inside the scaled Stage covers the Stage: tapping anywhere else closes the card */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="group" aria-label="Période des graphiques" className="panel absolute top-full left-1/2 z-50 mt-2 grid w-max -translate-x-1/2 grid-cols-3 gap-1.5 p-2.5 shadow-xl">
            {PERIODS.map((p) => (
              <button
                key={p.hours}
                type="button"
                aria-pressed={p.hours === hours}
                title={p.text}
                onClick={() => {
                  setHours(p.hours);
                  setOpen(false);
                }}
                className="h-11 min-w-22 rounded-full px-3 text-sm font-bold text-ink hover:bg-line aria-pressed:bg-pink aria-pressed:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
