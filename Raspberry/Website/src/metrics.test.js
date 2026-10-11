import { test } from "node:test";
import assert from "node:assert/strict";
import { METRICS, formatBucket, overallQuality, stats, withGaps, zonesOf } from "./metrics.js";

const ok = { pH: 6.5, TDS: 50, Oxygen: 5, Conductivity: 100, Temperature: 12 };

test("overall quality", () => {
  assert.equal(overallQuality(ok, 1), "good");
  assert.equal(overallQuality({ ...ok, pH: 4 }, 1), "warning");
  assert.equal(overallQuality({ ...ok, pH: 4, TDS: 900 }, 1), "critical");
  assert.equal(overallQuality(ok, 5), "good");
  assert.equal(overallQuality(ok, 15), "warning"); // no frame for 15 min
  assert.equal(overallQuality(ok, 30), "critical"); // offline
  assert.equal(overallQuality({ pH: 6.5 }, 1), "none");
});

test("gauge zones follow the thresholds", () => {
  const pH = METRICS.find((m) => m.key === "pH");
  const zones = zonesOf(pH);
  assert.deepEqual(
    zones.map((z) => z.status),
    ["critical", "good", "warning"],
  );
  assert.ok(Math.abs(zones[1].from - 5.5) < 0.03 && Math.abs(zones[1].to - 7) < 0.03);
});

test("stats", () => {
  assert.deepEqual(stats([1, 2, 6]), { min: 1, avg: 3, max: 6 });
  assert.deepEqual(stats([]), { min: null, avg: null, max: null });
});

test("withGaps breaks long silences only", () => {
  const rows = withGaps({ bucket: 600, points: [{ ts: 0 }, { ts: 600 }, { ts: 6000 }] });
  assert.deepEqual(rows, [{ ts: 0 }, { ts: 600 }, { ts: 1200 }, { ts: 6000 }]);
});

test("chart tooltip label says which time span a point covers", () => {
  process.env.TZ = "Europe/Paris"; // the Pi's timezone
  const ts = Date.UTC(2026, 9, 11, 16, 32) / 1000; // 18:32 in Paris
  assert.equal(formatBucket(ts, 60), "dim. 11 oct., 18:32");
  assert.equal(formatBucket(ts, 600), "dim. 11 oct., 18:32 – 18:42");
  assert.equal(formatBucket(ts, 219000), "dim. 11 oct. – mer. 14 oct.");
});
