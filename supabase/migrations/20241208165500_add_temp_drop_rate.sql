CREATE OR REPLACE FUNCTION public.get_temperature_drop_rates()
RETURNS TABLE (
    peripheral TEXT,
    drop_rate_per_hour NUMERIC,
    start_temp NUMERIC,
    end_temp NUMERIC
)
LANGUAGE sql
AS $$
    WITH latest_readings AS (
        -- Get the most recent reading for each peripheral
        SELECT DISTINCT ON (peripheral) 
            peripheral,
            temperature as end_temp,
            timestamp as end_time
        FROM temperature
        WHERE timestamp >= NOW() - INTERVAL '6 hours'
        ORDER BY peripheral, timestamp DESC
    ),
    earliest_readings AS (
        -- Get the earliest reading within 6 hours for each peripheral
        SELECT DISTINCT ON (peripheral)
            peripheral,
            temperature as start_temp,
            timestamp as start_time
        FROM temperature
        WHERE timestamp >= NOW() - INTERVAL '6 hours'
        ORDER BY peripheral, timestamp ASC
    )
    SELECT 
        l.peripheral,
        -- Calculate drop rate per hour (absolute value for clearer representation)
        ABS(ROUND(
            ((l.end_temp - e.start_temp) / 
            EXTRACT(EPOCH FROM (l.end_time - e.start_time)) * 3600)::numeric, 
            2
        )) as drop_rate_per_hour,
        e.start_temp,
        l.end_temp
    FROM latest_readings l
    JOIN earliest_readings e ON l.peripheral = e.peripheral
    WHERE l.end_time - e.start_time > INTERVAL '1 hour' -- Ensure we have at least 1 hour of data
    AND l.end_temp < e.start_temp -- Only include cases where temperature is dropping
    ORDER BY l.peripheral;
$$;

-- Add comment to explain the function
COMMENT ON FUNCTION public.get_temperature_drop_rates IS 
'Calculates temperature drop rates per hour for each peripheral over the last 6 hours. 
Only includes periods where temperature is actually decreasing.
Returns peripheral ID, drop rate per hour (as positive value), and starting and ending temperatures.'; 