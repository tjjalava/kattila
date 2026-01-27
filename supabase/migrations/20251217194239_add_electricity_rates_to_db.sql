CREATE TABLE IF NOT EXISTS public.electricity_tarifs
(
    type           TEXT                                   NOT NULL,
    rate_per_kwh   NUMERIC                  DEFAULT 0     NOT NULL,
    rate_per_month NUMERIC                  DEFAULT 0     NOT NULL,
    effective_from DATE                                   NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (type, effective_from)
);
