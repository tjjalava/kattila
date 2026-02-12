CREATE TABLE IF NOT EXISTS public.schedule
(
    id         SERIAL PRIMARY KEY,
    range      TSTZRANGE NOT NULL,
    limitup    NUMERIC,
    limitdown  NUMERIC
);

-- Enable Row Level Security
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous users: read-only access
CREATE POLICY "Allow anonymous read access"
    ON public.schedule
    FOR SELECT
    TO anon
    USING (true);

-- Policy for authenticated users: full access
CREATE POLICY "Allow authenticated select access"
    ON public.schedule
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert access"
    ON public.schedule
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update access"
    ON public.schedule
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access"
    ON public.schedule
    FOR DELETE
    TO authenticated
    USING (true);

