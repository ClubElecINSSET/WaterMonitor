// API tests against a real MariaDB holding the demo data: npm run db && npm run seed && npm run test:api
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";

const PORT = 8098;
const api = (path) => fetch(`http://127.0.0.1:${PORT}${path}`);
let server;

before(async () => {
  // dev.env gives the DB settings; NODE_ENV and PORT set here win over it
  server = spawn(process.execPath, ["--env-file=dev.env", "server.js"], {
    env: { ...process.env, NODE_ENV: "production", PORT },
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => String(d).includes("listening") && resolve());
    server.on("exit", (code) => reject(new Error(`server exited (${code})`)));
  });
});

after(() => server.kill());

test("measures: last rows, oldest first, limit clamped", async () => {
  const { count, rows } = await (await api("/api/measures?limit=5")).json();
  assert.equal(rows.length, 5);
  assert.ok(count >= 1440);
  assert.ok(rows[0].ts <= rows[4].ts);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["Conductivity", "Oxygen", "TDS", "Temperature", "id", "pH", "ts"]);
  for (const [limit, expected] of [["-5", 1], ["1e9", 1], ["abc", 10], ["9999", 200]]) {
    const body = await (await api(`/api/measures?limit=${limit}`)).json();
    assert.equal(body.rows.length, expected, `limit=${limit}`);
  }
});

test("history: buckets of at least 1 min, at most 145 points", async () => {
  for (const [hours, bucket] of [[1, 60], [24, 600], [8760, 219000], [99999, 219000]]) {
    const body = await (await api(`/api/history?hours=${hours}`)).json();
    assert.equal(body.bucket, bucket, `hours=${hours}`);
    assert.ok(body.points.length <= 145, `hours=${hours}: ${body.points.length} points`);
    if (hours >= 24) assert.ok(body.points.length > 0, `hours=${hours}: no points`); // demo data may be a few hours old
  }
});

test("history: hours=0 covers everything since the first measure", async () => {
  const body = await (await api("/api/history?hours=0")).json();
  const day = await (await api("/api/history?hours=24")).json();
  assert.ok(body.hours >= 24, `${body.hours} h for 24 h of demo data`);
  assert.ok(body.points[0].ts <= day.points[0].ts, "starts at the first measure");
});

test("hostile query strings do not crash the server", async () => {
  // ?hours[toString]=x used to throw inside parseInt and kill Node
  for (const query of ["hours[toString]=x", "hours[a]=2", "hours=1&hours=8760", "hours=1;DROP TABLE Data"]) {
    assert.equal((await api(`/api/history?${query}`)).status, 200, query);
  }
  assert.equal((await api("/api/measures?limit[toString]=x")).status, 200);
  assert.equal((await api("/api/measures?limit=1")).status, 200, "still alive");
});

test("static files: the dashboard, nothing outside dist", async () => {
  assert.match(await (await api("/")).text(), /<div id="root">/);
  for (const path of ["/server.js", "/dev.env", "/..%2fserver.js", "/.git/config"]) {
    assert.equal((await api(path)).status, 404, path);
  }
  assert.equal((await api("/")).headers.get("x-powered-by"), null);
});
