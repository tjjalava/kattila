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
WITH temps AS (SELECT a.timestamp AT TIME ZONE 'Europe/Helsinki' AS timestamp,
                      a.power                                    AS power,
                      (a.options ->> 'temperatureUp')::NUMERIC   AS up,
                      (a.options ->> 'temperatureDown')::NUMERIC AS down,
                      b.temperature                              as temperature,
                      b.peripheral                               as peripheral
               FROM heating_plan a
                        LEFT JOIN temperature b
                                  ON a.timestamp + '1 hour'::INTERVAL = date_trunc('minute', b.timestamp)
               WHERE a.options <> '{}'
                 AND a.timestamp < now() - '1 hour'::interval
               ORDER BY a.timestamp DESC
               LIMIT 12),
     with_rows AS (SELECT *,
                          row_number() OVER (PARTITION BY peripheral ORDER BY timestamp) AS weight
                   FROM temps),
     diffs AS (SELECT peripheral,
                      (CASE WHEN peripheral = '100' THEN up - temperature ELSE down - temperature END) AS diff,
                      weight
               FROM with_rows
               WHERE power = 0)
SELECT peripheral, round(sum(diff * weight) / sum(weight), 1) AS drop_rate_per_hour
FROM diffs
GROUP BY peripheral
$$;
