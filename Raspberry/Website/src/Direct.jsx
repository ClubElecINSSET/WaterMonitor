import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { METRICS, PERIODS, duration, fmt, formatTick, formatTime, stats, statusOf, zonesOf } from "@/metrics";
import { Chip, DOT, Header, PeriodPicker, QualityPanel, Spark } from "@/parts";

// Value change since the previous non-empty measure
function delta(m, rows) {
  const filled = rows.filter((r) => r[m.key] != null);
  if (filled.length < 2) return "";
  const [prev, last] = filled.slice(-2);
  const diff = last[m.key] - prev[m.key];
  return `${diff >= 0 ? "+" : "−"}${fmt(Math.abs(diff), m.digits)} depuis ${formatTime(prev.ts)}`;
}

function Gauge({ m, value }) {
  const [lo, hi] = m.scale;
  const zones = zonesOf(m);
  const pos = value == null ? null : Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
  return (
    <span className="relative flex h-1.5 w-full">
      {zones.map((z, i) => (
        <span
          key={i}
          style={{ flex: `${z.to - z.from} 1 0` }}
          className={cn("opacity-60", DOT[z.status], i === 0 && "rounded-l-[3px]", i === zones.length - 1 && "rounded-r-[3px]")}
        />
      ))}
      {pos != null && (
        <span style={{ left: `calc(${pos.toFixed(1)}% - 2.5px)` }} className="absolute -top-[5px] h-4 w-[5px] rounded-[3px] bg-ink shadow-[0_0_0_2px_#fff]" />
      )}
    </span>
  );
}

function MetricTile({ m, rows, chart, latest, selected, onPick, dimmed }) {
  const value = latest?.[m.key];
  const status = statusOf(m, value);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "panel flex cursor-pointer flex-col items-start gap-2 border-[3px] px-4 py-3.5 text-left text-ink",
        selected ? "border-pink" : "border-white",
        dimmed && "opacity-60"
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-sm font-bold">{m.label}</span>
        <Chip status={status} />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[42px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{fmt(value, m.digits)}</span>
        <span className="text-[15px] font-semibold text-ink-soft">{m.unit}</span>
      </span>
      <span className="h-4 text-[12.5px] font-medium text-ink-soft">{delta(m, rows)}</span>
      <Spark values={chart.map((r) => r[m.key])} height={44} />
      <span className="flex w-full flex-col gap-1.5">
        <Gauge m={m} value={value} />
        <span className="text-xs font-medium text-ink-soft">Idéal : {m.ideal}</span>
      </span>
    </button>
  );
}

function Evolution({ m, chart, hours, span, setHours }) {
  const data = chart.map((r) => ({ ts: r.ts, v: r[m.key] }));
  const values = data.map((d) => d.v).filter((v) => v != null);
  const s = stats(values);
  const good = zonesOf(m).find((z) => z.status === "good");

  // Y range: the measures and the ideal band, clamped to the gauge scale, plus 12 % margin
  let lo = Math.max(m.scale[0], Math.min(s.min ?? good.from, good.from));
  let hi = Math.min(m.scale[1], Math.max(s.max ?? good.to, good.to));
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad;
  hi += pad;
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const end = Math.floor(Date.now() / 1000);
  const start = end - span * 3600;
  const last = data.findLastIndex((d) => d.v != null);

  return (
    <section aria-label="Évolution" className="panel flex min-h-0 flex-col gap-1.5 px-5 pt-4 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-[19px] font-extrabold">{m.unit ? `${m.label} (${m.unit})` : m.label}</h2>
          <span className="text-[13px] font-medium text-ink-soft">
            {PERIODS.find((p) => p.hours === hours).text} · zone verte = plage idéale
          </span>
        </div>
        <PeriodPicker hours={hours} setHours={setHours} />
        <dl className="m-0 flex gap-[22px]">
          {[["Min", s.min], ["Moyenne", s.avg], ["Max", s.max]].map(([label, v]) => (
            <div key={label} className="flex flex-col items-end">
              <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
              <dd className="m-0 text-[19px] font-extrabold tabular-nums">{fmt(v, m.digits)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {values.length < 2 ? (
        <p className="grid flex-1 place-items-center text-ink-soft">Pas assez de mesures sur cette période</p>
      ) : (
        <ChartContainer config={{ v: { label: m.label, color: "#2f62a8" } }} className="aspect-auto min-h-0 w-full flex-1 font-mono">
          <AreaChart data={data} margin={{ top: 10, right: 36, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e1ece7" />
            <ReferenceArea y1={Math.max(lo, good.from)} y2={Math.min(hi, good.to)} fill="#bfe6d4" fillOpacity={0.55} ifOverflow="hidden" />
            <XAxis
              dataKey="ts" type="number" domain={[start, end]} ticks={[start, (start + end) / 2, end]}
              tickFormatter={(ts) => formatTick(ts, span)} tickLine={false} axisLine={false} tick={{ fill: "#4d6b63", fontSize: 12 }}
            />
            <YAxis
              domain={[lo, hi]} ticks={ticks} width={48} tickLine={false} axisLine={false} tick={{ fill: "#4d6b63", fontSize: 12 }}
              tickFormatter={(v) => fmt(v, m.digits === 0 ? 0 : 1)}
            />
            <Area
              dataKey="v" type="linear" stroke="#2f62a8" strokeWidth={3} fill="#2f62a8" fillOpacity={0.1} isAnimationActive={false}
              dot={(p) => (p.index === last ? <circle key="last" cx={p.cx} cy={p.cy} r={7} fill="#fff" stroke="#d6157a" strokeWidth={3.5} /> : <g key={p.index} />)}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  );
}

function SystemPanel({ latest, ageMinutes, count }) {
  const missing = latest ? METRICS.filter((m) => latest[m.key] == null).map((m) => m.short) : [];
  const lines = [
    ["Dernière trame", latest ? formatTime(latest.ts, true) : "—"],
    ["Reçue il y a", latest ? duration(ageMinutes) : "—"],
    ["Capteurs en erreur", latest ? (missing.length ? missing.join(", ") : "Aucun") : "—"],
    ["Mesures en base", count.toLocaleString("fr-FR")],
  ];
  return (
    <section aria-label="Système" className="panel flex flex-1 flex-col gap-[9px] px-5 py-3.5 text-[13.5px]">
      <span className="text-xs font-extrabold tracking-widest uppercase">Système</span>
      {lines.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2.5">
          <span className="font-medium text-ink-soft">{label}</span>
          <span className={cn("font-mono", label === "Capteurs en erreur" && missing.length && "font-sans font-bold text-[#b8231b]")}>{value}</span>
        </div>
      ))}
    </section>
  );
}

export default function Direct({ route, link, rows, chart, hours, span, setHours, latest, ageMinutes, offline, count, quality }) {
  const [selected, setSelected] = useState("pH");
  const m = METRICS.find((x) => x.key === selected);
  return (
    <div className="flex h-full flex-col gap-3.5 px-6 pt-4 pb-[22px]">
      <Header route={route} link={link} />

      {offline && latest && (
        <div role="status" className="relative flex items-center gap-3.5 rounded-2xl bg-[#fde3e1] px-[18px] py-3 text-[15px] font-medium text-[#7a1712]">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#e5332a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 L22 20 H2 Z" /><path d="M12 10 v4" /><path d="M12 17 v0.5" />
          </svg>
          <span>
            <strong className="font-extrabold">Aucune trame reçue depuis {duration(ageMinutes)}.</strong> Valeurs affichées : dernière mesure connue ({formatTime(latest.ts)}). Vérifier l'alimentation de la bouée et le module XBee.
          </span>
        </div>
      )}

      <section aria-label="Mesures actuelles" className="relative grid grid-cols-5 gap-3">
        {METRICS.map((x) => (
          <MetricTile key={x.key} m={x} rows={rows} chart={chart} latest={latest} selected={x.key === selected} onPick={() => setSelected(x.key)} dimmed={offline} />
        ))}
      </section>

      <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-3">
        <Evolution m={m} chart={chart} hours={hours} span={span} setHours={setHours} />
        <aside className="flex min-h-0 flex-col gap-3">
          {/* Offline: the banner replaces the verdict, which would only say "—" (and leaves no room at 720 px) */}
          {!offline && <QualityPanel quality={quality} latest={latest} offline={offline} />}
          <SystemPanel latest={latest} ageMinutes={ageMinutes} count={count} />
        </aside>
      </div>
    </div>
  );
}
