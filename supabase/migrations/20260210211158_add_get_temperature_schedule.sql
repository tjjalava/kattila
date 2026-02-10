CREATE OR REPLACE FUNCTION public.get_temperature_schedule(start_time timestamp with time zone, end_time timestamp with time zone)
    RETURNS TABLE
            (
                hour      timestamp with time zone,
                limitup   numeric,
                limitdown numeric
            )
    LANGUAGE sql
    SET search_path TO 'public'
AS
$function$
WITH hourly_periods AS (SELECT hour_start
                        FROM generate_series(
                                     date_trunc('hour', start_time),
                                     end_time,
                                     interval '1 hour'
                             ) AS hour_start)
SELECT hp.hour_start,
       s.limitup,
       s.limitdown
FROM hourly_periods hp
         LEFT JOIN schedule s ON s.range @> hp.hour_start
ORDER BY hp.hour_start;
$function$;
