set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_temperatures(resolution interval DEFAULT '00:15:00'::interval)
 RETURNS TABLE(t timestamp without time zone, yla numeric, ala numeric)
 LANGUAGE sql
AS $function$
    with 
        yla_lampo as (select
                        date_bin(resolution, timestamp, timestamp '2024-01-01') at time zone 'Europe/Helsinki' as time,
                        avg(temperature) as temp
    from
      temperature
    where
      peripheral = '100'
    group by time),
  ala_lampo as (select
      date_bin(resolution, timestamp, timestamp '2024-01-01') at time zone 'Europe/Helsinki' as time,
      avg(temperature) as temp
    from
      temperature
    where
      peripheral = '101'
    group by time)
select a.time as t, a.temp as yla, b.temp as ala
from yla_lampo a
join ala_lampo b on a.time = b.time;
$function$
;


