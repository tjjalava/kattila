alter table "public"."temperature" alter column "timestamp" set default now();

alter table "public"."temperature" alter column "timestamp" set data type timestamp with time zone using "timestamp"::timestamp with time zone;


