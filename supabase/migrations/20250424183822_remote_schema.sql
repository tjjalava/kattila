

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_temperature_drop_rates"() RETURNS TABLE("peripheral" "text", "drop_rate_per_hour" numeric)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
WITH temps AS (SELECT a.timestamp AT TIME ZONE 'Europe/Helsinki' AS timestamp,
                      a.power                                    AS power,
                      (a.options ->> 'temperatureUp')::NUMERIC   AS up,
                      (a.options ->> 'temperatureDown')::NUMERIC AS down,
                      b.temperature                              as temperature,
                      b.peripheral                               as peripheral
               FROM heating_plan a
                        JOIN temperature b
                                  ON a.timestamp + '1 hour'::INTERVAL = date_trunc('minute', b.timestamp)
               WHERE a.options <> '{}'
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
GROUP BY peripheral
$$;


ALTER FUNCTION "public"."get_temperature_drop_rates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_temperature_increase_rates"("interval_hours" interval DEFAULT '24:00:00'::interval) RETURNS TABLE("peripheral" "text", "state" integer, "diff_per_hour" numeric, "increase_per_kwh" numeric)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
WITH start AS (SELECT timestamp
               FROM resistor_state
               WHERE timestamp < NOW() - interval_hours
               ORDER BY timestamp DESC
               LIMIT 1),
     rawranges AS (SELECT a.timestamp                                                    AS timestamp,
                          LEAD(a.timestamp) OVER (ORDER BY a.timestamp)                  AS end_ts,
                          CASE WHEN up = TRUE THEN 6 WHEN DOWN = true THEN 12 ELSE 0 END AS state,
                          ROW_NUMBER() OVER (ORDER BY a.timestamp)                       AS range
                   FROM resistor_state a
                            JOIN start b
                                 ON a.timestamp >= b.timestamp),
     ranges AS (SELECT timestamp,
                       COALESCE(end_ts, NOW()) AS end_ts,
                       state,
                       range
                FROM rawranges
                WHERE state <> 0),
     pretemps AS (SELECT a.timestamp AS timestamp, a.end_ts, a.state, a.range, b.temperature, b.peripheral
                  FROM ranges a
                           JOIN temperature b
                                ON b.timestamp >= a.timestamp
                                    AND b.timestamp < a.end_ts),
     temps AS (SELECT *
               FROM pretemps
               WHERE (state = 6 AND peripheral = '101')
                  OR (state = 12 AND peripheral = '100')
                  OR temperature < 68),
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
                        (max - min) / hours AS diff_per_hour
                 FROM maxmin)
SELECT peripheral, state,
       ROUND(AVG(diff_per_hour), 1) as diff_per_hour,
       ROUND(AVG(diff_per_hour) / state, 2) AS increase_per_kwh
FROM semires
GROUP BY peripheral, state
$$;


ALTER FUNCTION "public"."get_temperature_increase_rates"("interval_hours" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_temperatures"("resolution" interval DEFAULT '00:15:00'::interval) RETURNS TABLE("t" timestamp without time zone, "yla" numeric, "ala" numeric)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_temperatures"("resolution" interval) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."heating_plan" (
    "timestamp" timestamp with time zone NOT NULL,
    "price" numeric(6,3) NOT NULL,
    "power" integer NOT NULL,
    "actual_power" numeric(4,2) NOT NULL,
    "cost" numeric(6,2) NOT NULL,
    "t_up" numeric(3,1) NOT NULL,
    "t_down" numeric(3,1) NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "transmission_price" numeric(6,3) DEFAULT 0 NOT NULL,
    "total_price" numeric(6,3) DEFAULT 0 NOT NULL,
    "options" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."heating_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resistor_state" (
    "id" integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "down" boolean NOT NULL,
    "up" boolean NOT NULL,
    "down_temp" numeric NOT NULL,
    "up_temp" numeric NOT NULL
);


ALTER TABLE "public"."resistor_state" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."resistor_state_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."resistor_state_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."resistor_state_id_seq" OWNED BY "public"."resistor_state"."id";



CREATE TABLE IF NOT EXISTS "public"."temperature" (
    "peripheral" "text" NOT NULL,
    "temperature" numeric NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."temperature" OWNER TO "postgres";


ALTER TABLE ONLY "public"."resistor_state" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."resistor_state_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."heating_plan"
    ADD CONSTRAINT "heating_plan_pkey" PRIMARY KEY ("timestamp");



ALTER TABLE ONLY "public"."resistor_state"
    ADD CONSTRAINT "resistor_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temperature"
    ADD CONSTRAINT "temperature_pkey" PRIMARY KEY ("peripheral", "timestamp");



CREATE POLICY "Backstage pass" ON "public"."temperature" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."heating_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resistor_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."temperature" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






































































































































































































GRANT ALL ON FUNCTION "public"."get_temperature_drop_rates"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_temperature_drop_rates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_temperature_drop_rates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_temperature_increase_rates"("interval_hours" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."get_temperature_increase_rates"("interval_hours" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_temperature_increase_rates"("interval_hours" interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_temperatures"("resolution" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."get_temperatures"("resolution" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_temperatures"("resolution" interval) TO "service_role";





















GRANT ALL ON TABLE "public"."heating_plan" TO "anon";
GRANT ALL ON TABLE "public"."heating_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."heating_plan" TO "service_role";



GRANT ALL ON TABLE "public"."resistor_state" TO "anon";
GRANT ALL ON TABLE "public"."resistor_state" TO "authenticated";
GRANT ALL ON TABLE "public"."resistor_state" TO "service_role";



GRANT ALL ON SEQUENCE "public"."resistor_state_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."resistor_state_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."resistor_state_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."temperature" TO "anon";
GRANT ALL ON TABLE "public"."temperature" TO "authenticated";
GRANT ALL ON TABLE "public"."temperature" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;

--
-- Dumped schema changes for auth and storage
--

