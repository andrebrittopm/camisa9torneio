-- Update TSHIRT-01 and TANK-01 names to official versions
UPDATE public.av_shirt_models 
SET name = 'CAMISA OFICIAL' 
WHERE id = '68b9babb-d4e3-40d3-bb1a-f76dc1a512b7' AND code = 'TSHIRT-01';

UPDATE public.av_shirt_models 
SET name = 'REGATA OFICIAL' 
WHERE id = '4a983315-0939-4323-a1f3-55c63514365f' AND code = 'TANK-01';