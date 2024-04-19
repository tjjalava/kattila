CREATE TABLE temperature (
    peripheral TEXT NOT NULL,
    temperature NUMERIC NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (peripheral, timestamp)
)
