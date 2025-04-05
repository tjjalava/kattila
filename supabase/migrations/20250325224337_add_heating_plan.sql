CREATE TABLE public.heating_plan
(
    timestamp    TIMESTAMP WITH TIME ZONE NOT NULL,
    price        NUMERIC(6, 3)            NOT NULL,
    power        INTEGER                  NOT NULL,
    actual_power NUMERIC(4, 2)            NOT NULL,
    cost         NUMERIC(6, 2)            NOT NULL,
    t_up         NUMERIC(3, 1)            NOT NULL,
    t_down       NUMERIC(3, 1)            NOT NULL,
    locked       BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT current_timestamp,
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (timestamp)
);
