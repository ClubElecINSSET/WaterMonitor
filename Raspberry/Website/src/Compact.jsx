import { METRICS, fmt, statusOf } from "@/metrics";
import { Chip, Clock, LinkPill, PeriodPicker, QualityPanel, Spark } from "@/parts";

// 800×480: the official Raspberry Pi touch display
export default function Compact({ link, chart, hours, setHours, latest, offline, quality }) {
  return (
    <div className="flex h-full flex-col gap-2.5 px-3.5 pt-2.5 pb-3.5">
      <header className="flex h-11 items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-script text-[22px] text-white">WaterMonitor</span>
          <span className="text-[22px] font-black uppercase">Parc d'Isle</span>
        </div>
        <PeriodPicker hours={hours} setHours={setHours} compact />
        <div className="flex items-center gap-2">
          <LinkPill link={link} compact />
          <Clock compact />
        </div>
      </header>

      <section aria-label="Mesures actuelles" className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2.5">
        <QualityPanel quality={quality} latest={latest} offline={offline} compact />
        {METRICS.map((m) => {
          const value = latest?.[m.key];
          return (
            <div key={m.key} className="panel flex min-h-0 flex-col justify-between gap-1.5 rounded-2xl px-3.5 py-3">
              <span className="flex items-center justify-between gap-1.5">
                <span className="text-[13.5px] font-bold">{m.label}</span>
                <Chip status={statusOf(m, value)} className="px-2 text-[11px]" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[44px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{fmt(value, m.digits)}</span>
                <span className="text-[15px] font-semibold text-ink-soft">{m.unit}</span>
              </span>
              <Spark values={chart.map((r) => r[m.key])} height={36} />
              <span className="text-[11.5px] font-medium text-ink-soft">Idéal : {m.ideal}</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
