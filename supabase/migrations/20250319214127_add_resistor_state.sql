CREATE TABLE resistor_state (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT current_timestamp,
    down BOOLEAN NOT NULL,
    up BOOLEAN NOT NULL,
    down_temp NUMERIC NOT NULL,
    up_temp NUMERIC NOT NULL
);
