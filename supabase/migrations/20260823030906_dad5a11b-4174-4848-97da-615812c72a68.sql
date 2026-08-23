DO $$
DECLARE
  v_tshirt_count integer;
  v_tank_count integer;
BEGIN
  SELECT count(*) INTO v_tshirt_count
  FROM public.av_shirt_models
  WHERE id = '68b9babb-d4e3-40d3-bb1a-f76dc1a512b7'
    AND code = 'TSHIRT-01';

  SELECT count(*) INTO v_tank_count
  FROM public.av_shirt_models
  WHERE id = '4a983315-0939-4323-a1f3-55c63514365f'
    AND code = 'TANK-01';

  IF v_tshirt_count <> 1 THEN
    RAISE EXCEPTION
      'Exactly one TSHIRT-01 expected, found %',
      v_tshirt_count;
  END IF;

  IF v_tank_count <> 1 THEN
    RAISE EXCEPTION
      'Exactly one TANK-01 expected, found %',
      v_tank_count;
  END IF;
END $$;

UPDATE public.av_shirt_models
SET name = 'CAMISA OFICIAL'
WHERE id = '68b9babb-d4e3-40d3-bb1a-f76dc1a512b7'
  AND code = 'TSHIRT-01';

UPDATE public.av_shirt_models
SET name = 'REGATA OFICIAL'
WHERE id = '4a983315-0939-4323-a1f3-55c63514365f'
  AND code = 'TANK-01';