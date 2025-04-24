DROP FUNCTION IF EXISTS public.get_temperature_drop_rates(interval_hours INTERVAL);

CREATE OR REPLACE FUNCTION public.get_temperature_drop_rates()
    RETURNS TABLE
            (
                peripheral         TEXT,
                drop_rate_per_hour NUMERIC
            )
    LANGUAGE sql
    SECURITY INVOKER SET search_path = 'public'
AS
$$
WITH diffs AS (SELECT a.timestamp AT TIME ZONE 'Europe/Helsinki' AS timestamp,
                      a.power                                    AS power,
                      d.temperature - b.temperature              AS up,
                      e.temperature - c.temperature              AS down
               FROM heating_plan a
                        LEFT JOIN temperature b
                                  ON a.timestamp + '1 hour'::INTERVAL = date_trunc('minute', b.timestamp) AND
                                     b.peripheral = '100'
                        LEFT JOIN temperature c
                                  ON a.timestamp + '1 hour'::INTERVAL = date_trunc('minute', c.timestamp) AND
                                     c.peripheral = '101'
                        LEFT JOIN temperature d
                                  ON a.timestamp = date_trunc('minute', d.timestamp) AND d.peripheral = '100'
                        LEFT JOIN temperature e
                                  ON a.timestamp = date_trunc('minute', e.timestamp) AND e.peripheral = '101'
               WHERE a.timestamp < now() - '1 hour'::INTERVAL
               ORDER BY a.timestamp DESC
               LIMIT 12),
     with_rows AS (SELECT *, row_number() OVER (ORDER BY timestamp) AS weight FROM diffs),
     decreases AS (SELECT * FROM with_rows WHERE power = 0)
SELECT '100' as peripheral, ROUND(SUM(up * weight) / SUM(weight), 1) AS drop_rate_per_hour
FROM decreases
UNION ALL
SELECT '101' as peripheral, ROUND(SUM(down * weight) / SUM(weight), 1) AS drop_rate_per_hour
FROM decreases
$$;
