set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_temperature_drop_rates()
 RETURNS TABLE(peripheral text, drop_rate_per_hour numeric)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$WITH temps AS (SELECT a.timestamp AT TIME ZONE 'Europe/Helsinki' AS timestamp,
                      a.power                                    AS power,
                      (a.options ->> 'temperatureUp')::NUMERIC   AS up,
                      (a.options ->> 'temperatureDown')::NUMERIC AS down,
                      b.temperature                              as temperature,
                      b.peripheral                               as peripheral
               FROM heating_plan a
                        JOIN temperature b
                                  ON a.timestamp + '1 hour'::INTERVAL = date_trunc('minute', b.timestamp)
               WHERE a.locked = true                   
               ORDER BY a.timestamp DESC
               LIMIT 24),
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
GROUP BY peripheral$function$
;


