import { test } from "node:test";
import assert from "node:assert/strict";
import { METRICS, overallQuality, stats, withGaps, zonesOf } from "./metrics.js";

const ok = { pH: 6.5, TDS: 50, Oxygen: 5, Conductivity: 100, Temperature: 12 };

test("overall quality", () => {
  assert.equal(overallQuality(ok, 5), "good");
  assert.equal(overallQuality({ ...ok, pH: 4 }, 5), "warning");
  assert.equal(overallQuality({ ...ok, pH: 4, TDS: 900 }, 5), "critical");
  assert.equal(overallQuality(ok, 200), "critical");
  assert.equal(overallQuality({ pH: 6.5 }, 5), "none");
});

test("gauge zones follow the thresholds", () => {
  const pH = METRICS.find((m) => m.key === "pH");
  const zones = zonesOf(pH);
  assert.deepEqual(zones.map((z) => z.status), ["critical", "good", "warning"]);
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
