create table "public"."meteo" (
    "timestamp" timestamp with time zone not null,
    "temperature" numeric not null
);


alter table "public"."meteo" enable row level security;

alter table "public"."temperature" enable row level security;

CREATE UNIQUE INDEX meteo_pkey ON public.meteo USING btree ("timestamp");

alter table "public"."meteo" add constraint "meteo_pkey" PRIMARY KEY using index "meteo_pkey";

grant delete on table "public"."meteo" to "anon";

grant insert on table "public"."meteo" to "anon";

grant references on table "public"."meteo" to "anon";

grant select on table "public"."meteo" to "anon";

grant trigger on table "public"."meteo" to "anon";

grant truncate on table "public"."meteo" to "anon";

grant update on table "public"."meteo" to "anon";

grant delete on table "public"."meteo" to "authenticated";

grant insert on table "public"."meteo" to "authenticated";

grant references on table "public"."meteo" to "authenticated";

grant select on table "public"."meteo" to "authenticated";

grant trigger on table "public"."meteo" to "authenticated";

grant truncate on table "public"."meteo" to "authenticated";

grant update on table "public"."meteo" to "authenticated";

grant delete on table "public"."meteo" to "service_role";

grant insert on table "public"."meteo" to "service_role";

grant references on table "public"."meteo" to "service_role";

grant select on table "public"."meteo" to "service_role";

grant trigger on table "public"."meteo" to "service_role";

grant truncate on table "public"."meteo" to "service_role";

grant update on table "public"."meteo" to "service_role";

create policy "Backstage pass"
on "public"."temperature"
as permissive
for all
to authenticated
using (true)
with check (true);



