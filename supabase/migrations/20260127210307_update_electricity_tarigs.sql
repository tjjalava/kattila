ALTER TABLE public.electricity_tarifs ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow read access to all users
CREATE POLICY "Allow public read access" ON public.electricity_tarifs
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON public.electricity_tarifs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON public.electricity_tarifs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
