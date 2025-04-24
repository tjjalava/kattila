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
WITH diffs AS (SELECT a.timestamp AT TIME ZONE 'Europe/Helsinki'                 AS timestamp,
                      a.power                                                    AS power,
                      (a.options ->> 'temperatureUp')::numeric - b.temperature   AS up,
                      (a.options ->> 'temperatureDown')::numeric - c.temperature AS down,
                      row_number() OVER (ORDER BY a.timestamp)                   AS weight
               FROM heating_plan a
                        LEFT JOIN temperature b
                                  ON a.timestamp + '1 hour'::INTERVAL = date_trunc('minute', b.timestamp) AND
                                     b.peripheral = '100'
                        LEFT JOIN temperature c
                                  ON a.timestamp + '1 hour'::INTERVAL = date_trunc('minute', c.timestamp) AND
                                     c.peripheral = '101'
               WHERE a.options <> '{}'
               ORDER BY a.timestamp DESC
               LIMIT 12),
     decreases AS (SELECT * FROM diffs WHERE power = 0)
SELECT '100' as peripheral, ROUND(SUM(up * weight) / SUM(weight), 1) AS drop_rate_per_hour
FROM decreases
UNION ALL
SELECT '101' as peripheral, ROUND(SUM(down * weight) / SUM(weight), 1) AS drop_rate_per_hour
FROM decreases
$$;
