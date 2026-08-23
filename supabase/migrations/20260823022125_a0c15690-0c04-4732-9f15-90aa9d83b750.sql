-- REGATA-R2 — Activate TANK-01 and set image paths
-- Confirming existence of exactly one record for safety
DO $$
DECLARE
    tank_count INTEGER;
BEGIN
    SELECT count(*) INTO tank_count 
    FROM public.av_shirt_models 
    WHERE id = '4a983315-0939-4323-a1f3-55c63514365f' AND code = 'TANK-01';

    IF tank_count <> 1 THEN
        RAISE EXCEPTION 'Exactly one TANK-01 record expected, found %', tank_count;
    END IF;
END $$;

-- Update the specific record
UPDATE public.av_shirt_models 
SET 
    active = true,
    front_image_url = '/models/tank-01-front.png',
    back_image_url = '/models/tank-01-back.png'
WHERE id = '4a983315-0939-4323-a1f3-55c63514365f' 
  AND code = 'TANK-01';

-- Verify update
DO $$
DECLARE
    is_active BOOLEAN;
BEGIN
    SELECT active INTO is_active 
    FROM public.av_shirt_models 
    WHERE id = '4a983315-0939-4323-a1f3-55c63514365f';

    IF NOT is_active THEN
        RAISE EXCEPTION 'Update failed: TANK-01 is not active';
    END IF;
END $$;
