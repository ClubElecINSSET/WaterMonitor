import { useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { METRICS, QUALITY_WORD, fmt, formatTime, overallQuality, stats, statusOf } from "@/metrics";
import { Dot, Header } from "@/parts";

const QUALITY_CHIP = {
  good: "bg-[#dff3ea] text-[#0d6e51]",
  warning: "bg-[#fdeedc] text-[#9a5200]",
  critical: "bg-[#fde3e1] text-[#b8231b]",
  none: "bg-line text-ink-soft",
};

// Time of a measure, with the day when it is not today
function when(ts) {
  const date = new Date(ts * 1000);
  const time = formatTime(ts, true);
  return date.toDateString() === new Date().toDateString()
    ? time
    : `${date.toLocaleDateString("fr-FR", { weekday: "short" })} ${time}`;
}

export default function Historique({ route, link, rows }) {
  const [newestFirst, setNewestFirst] = useState(true);
  const shown = newestFirst ? [...rows].reverse() : rows;

  return (
    <div className="flex h-full flex-col gap-3.5 px-6 pt-4 pb-[22px]">
      <Header route={route} link={link} />

      <section aria-label="Statistiques" className="relative grid grid-cols-5 gap-3">
        {METRICS.map((m) => {
          const s = stats(rows.map((r) => r[m.key]).filter((v) => v != null));
          return (
            <div key={m.key} className="panel flex flex-col gap-2 px-4 py-3">
              <span className="text-sm font-bold">
                {m.label} <span className="font-semibold text-ink-soft">{m.unit}</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[["Min", s.min], ["Moy.", s.avg], ["Max", s.max]].map(([label, v]) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[11.5px] font-semibold text-ink-soft">{label}</span>
                    <span className="text-lg font-extrabold tabular-nums">{fmt(v, m.digits)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section aria-label="Relevés" className="panel relative flex min-h-0 flex-1 flex-col gap-2.5 px-5 pt-3.5 pb-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-[19px] font-extrabold">Relevés de la bouée</h2>
            <span className="text-[13px] font-medium text-ink-soft">{rows.length} dernières mesures · table Data</span>
          </div>
          <div className="flex items-center gap-[18px]">
            <div className="flex items-center gap-3.5 text-[12.5px] font-semibold">
              <span className="inline-flex items-center gap-1.5"><Dot status="good" />Bon</span>
              <span className="inline-flex items-center gap-1.5"><Dot status="warning" />À surveiller</span>
              <span className="inline-flex items-center gap-1.5"><Dot status="critical" />Critique</span>
            </div>
            <Button onClick={() => setNewestFirst(!newestFirst)} className="min-h-11 rounded-full px-[18px] text-sm font-bold">
              <ArrowDownUp className="size-4" strokeWidth={2.2} />
              {newestFirst ? "Plus récentes d’abord" : "Plus anciennes d’abord"}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <Table className="text-[15px] tabular-nums">
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="border-b-2 border-mint hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1.5 text-[12.5px] font-bold text-ink-soft">N°</TableHead>
                <TableHead className="h-auto px-2 py-1.5 text-[12.5px] font-bold text-ink-soft">Heure</TableHead>
                {METRICS.map((m) => (
                  <TableHead key={m.key} className="h-auto px-2 py-1.5 text-right text-[12.5px] font-bold text-ink-soft">
                    {m.short} {m.unit}
                  </TableHead>
                ))}
                <TableHead className="h-auto px-2 py-1.5 text-right text-[12.5px] font-bold text-ink-soft">Qualité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => {
                const q = overallQuality(r, 0);
                return (
                  <TableRow key={r.id} className="border-line hover:bg-transparent">
                    <TableCell className="px-2 py-[7px] font-mono text-[13px] text-ink-soft">#{r.id}</TableCell>
                    <TableCell className="px-2 py-[7px] font-mono text-sm">{when(r.ts)}</TableCell>
                    {METRICS.map((m) => (
                      <TableCell key={m.key} className="px-2 py-[7px] text-right font-semibold">
                        <span className="inline-flex items-center justify-end gap-2">
                          {fmt(r[m.key], m.digits)}
                          <Dot status={statusOf(m, r[m.key])} className="size-[9px]" />
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="px-2 py-[7px] text-right">
                      <Badge className={cn("rounded-full border-0 px-2.5 py-[3px] text-[12.5px] font-bold", QUALITY_CHIP[q])}>{QUALITY_WORD[q]}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!rows.length && <p className="py-8 text-center text-ink-soft">Aucune mesure en base.</p>}
        </div>
      </section>
    </div>
  );
}
