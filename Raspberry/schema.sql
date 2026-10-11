-- Safe to re-run: keeps existing data
CREATE TABLE IF NOT EXISTS Data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TDS FLOAT NULL,
    pH FLOAT NULL,
    Oxygen FLOAT NULL,
    Conductivity FLOAT NULL,
    Temperature FLOAT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_time ON Data (Time);
