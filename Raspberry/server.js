import { fileURLToPath } from "node:url";
import express from "express";
import mysql from "mysql2/promise";

// Credentials come from /etc/watermonitor/web.env (read-only DB user)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  socketPath: process.env.DB_SOCKET, // set by install.sh; overrides host/port
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  decimalNumbers: true, // SQL arithmetic returns DECIMAL; send it as JSON numbers
});

const app = express();
// Query values stay strings (or arrays of strings): the default parser builds objects from
// `?hours[toString]=x`, and parseInt() on those throws and crashed the whole server
app.set("query parser", "simple");
app.disable("x-powered-by");

// The last `limit` raw measures, oldest first, plus the total count and the server time.
// ts is a Unix timestamp in seconds (no timezone ambiguity).
app.get("/api/measures", async (req, res, next) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 200);
  try {
    const [rows] = await pool.query(
      `SELECT id, UNIX_TIMESTAMP(Time) AS ts, TDS, pH, Oxygen, Conductivity, Temperature
       FROM Data ORDER BY Time DESC, id DESC LIMIT ?`,
      [limit],
    );
    // shortcut: MAX(id) is instant while COUNT(*) scans ~86k new rows a day; wrong only if rows get deleted
    // now: the database clock, which stamped the rows, so the browser's clock does not matter
    const [[{ count, now }]] = await pool.query(
      "SELECT COALESCE(MAX(id), 0) AS count, UNIX_TIMESTAMP() AS now FROM Data",
    );
    res.json({ count, now, rows: rows.reverse() });
  } catch (err) {
    next(err);
  }
});

// Averages over the last `hours` (0 = since the first measure), in at most HISTORY_POINTS time buckets (charts)
const HISTORY_POINTS = 144;
async function history(asked) {
  let hours = asked;
  if (asked === 0) {
    // "Toujours": from the first measure (instant thanks to idx_data_time)
    const [[{ first }]] = await pool.query("SELECT UNIX_TIMESTAMP(MIN(Time)) AS first FROM Data");
    hours = first ? Math.max(1, Math.ceil((Date.now() / 1000 - first) / 3600)) : 24;
  }
  const bucket = Math.max(60, Math.ceil((hours * 3600) / HISTORY_POINTS)); // ≥ 1 min, so 1 h is not split finer than the data
  const [points] = await pool.query(
    `SELECT FLOOR(UNIX_TIMESTAMP(Time) / ?) * ? AS ts,
            AVG(TDS) AS TDS, AVG(pH) AS pH, AVG(Oxygen) AS Oxygen,
            AVG(Conductivity) AS Conductivity, AVG(Temperature) AS Temperature
     FROM Data
     WHERE Time >= NOW() - INTERVAL ? HOUR
     GROUP BY 1 ORDER BY 1`,
    [bucket, bucket, hours],
  );
  return { hours, bucket, points };
}

// Long periods scan millions of rows (~1 s per month of data on a PC, far more on a Pi): every
// screen and every visitor share one computation per period, kept for one bucket (30 s to 1 h).
// shortcut: a whole year is still computed from raw rows; add a summary table if "1 an" is too slow on the Pi
const historyCache = new Map(); // asked hours → { expires, result: Promise }
app.get("/api/history", async (req, res, next) => {
  const parsed = parseInt(req.query.hours, 10);
  const asked = Number.isNaN(parsed) ? 24 : parsed === 0 ? 0 : Math.min(Math.max(parsed, 1), 8760);
  let entry = historyCache.get(asked);
  if (!entry || entry.expires < Date.now()) {
    entry = { expires: Infinity, result: history(asked) }; // in flight: concurrent requests wait for this one
    historyCache.set(asked, entry);
    entry.result.then(
      ({ bucket }) => (entry.expires = Date.now() + Math.min(Math.max(bucket, 30), 3600) * 1000),
      () => historyCache.delete(asked),
    );
  }
  try {
    res.json(await entry.result);
  } catch (err) {
    next(err);
  }
});

if (process.env.NODE_ENV === "development") {
  // Dev: Vite serves the React app with hot reload, on the same port as the API
  const { createServer } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else {
  // Prod: the build committed in Website/dist (the Pi does not need to build anything)
  app.use(express.static(fileURLToPath(new URL("Website/dist", import.meta.url))));
}

// Express recognises an error handler by its 4 parameters
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Database unavailable" });
});

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`WaterMonitor listening on port ${port}`));
