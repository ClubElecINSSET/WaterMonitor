-- Demo data over the last 24 hours, one measure per minute: sudo mysql watermonitor < test_values.sql
INSERT INTO Data (Time, TDS, pH, Oxygen, Conductivity, Temperature)
SELECT NOW() - INTERVAL seq MINUTE,
       ROUND(80 + 40 * SIN(seq / 120) + RAND() * 10, 2),
       ROUND(6.6 + 0.3 * SIN(seq / 180) + RAND() * 0.1, 2),
       ROUND(6.0 + 1.5 * SIN(seq / 150) + RAND() * 0.3, 2),
       ROUND(140 + 30 * SIN(seq / 135) + RAND() * 10, 2),
       ROUND(14 + 3 * SIN(seq / 225) + RAND() * 0.5, 2)
FROM seq_0_to_1439;
