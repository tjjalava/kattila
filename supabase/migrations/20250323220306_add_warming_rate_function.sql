CREATE OR REPLACE FUNCTION public.get_temperature_increase_rates(
    interval_hours INTERVAL DEFAULT '24 hours'::INTERVAL
)
    RETURNS TABLE
            (
                peripheral       TEXT,
                state            INTEGER,
                increase_per_kwh NUMERIC
            )
    LANGUAGE sql
    SECURITY INVOKER SET search_path = 'public'
AS
$$
WITH start AS (SELECT timestamp
               FROM resistor_state
               WHERE timestamp < NOW() - interval_hours
               ORDER BY timestamp DESC
               LIMIT 1),
     rawranges AS (SELECT a.timestamp                                                    AS timestamp,
                          LEAD(a.timestamp) OVER (ORDER BY a.timestamp)                  AS end_ts,
                          CASE WHEN up = TRUE THEN 6 WHEN DOWN = true THEN 12 ELSE 0 END AS state,
                          ROW_NUMBER() OVER (ORDER BY a.timestamp)                       AS range
                   FROM resistor_state a,
                        start b
                   WHERE a.timestamp >= b.timestamp),
     ranges AS (SELECT (CASE WHEN range = 1 THEN NOW() - interval_hours ELSE timestamp END) AS timestamp,
                       COALESCE(end_ts, NOW())                                              AS end_ts,
                       state,
                       range
                FROM rawranges
                WHERE state <> 0),
     temps AS (SELECT a.timestamp AS timestamp, a.end_ts, a.state, a.range, b.temperature, b.peripheral
               FROM ranges a,
                    temperature b
               WHERE b.timestamp >= a.timestamp
                 AND b.timestamp < a.end_ts
                 AND b.temperature < 70),
     maxmin AS (SELECT timestamp,
                       end_ts,
                       state,
                       MAX(temperature)                                as max,
                       MIN(temperature)                                as min,
                       peripheral,
                       EXTRACT(EPOCH FROM (end_ts - timestamp)) / 3600 AS hours
                FROM temps
                GROUP BY range, peripheral, timestamp, end_ts, state),
     semires AS (SELECT timestamp,
                        end_ts,
                        state,
                        max,
                        min,
                        peripheral,
                        hours,
                        (max - min) / hours AS diff_in_hours
                 FROM maxmin)
SELECT peripheral, state, ROUND(AVG(diff_in_hours) / state, 1) AS increase_per_kwh
FROM semires
GROUP BY peripheral, state
$$;
