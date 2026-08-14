-- --------------------------------------------------
-- SEED SCRIPT
-- --------------------------------------------------

DO $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.av_events (
        event_number,
        event_year,
        event_name,
        location,
        unit_price,
        pix_key,
        pix_key_type,
        pix_holder_name,
        orders_open,
        active
    ) VALUES (
        9,
        2026,
        '9º Torneio Amigos do Vôlei - ACS',
        'Coxim/MS',
        35.00,
        '915.251.601-68',
        'CPF',
        'Célio R. da Silva Arruda',
        true,
        true
    )
    RETURNING id INTO v_event_id;

    INSERT INTO public.av_shirt_models (event_id, code, name, category, sort_order)
    VALUES 
        (v_event_id, 'TSHIRT-01', 'Camiseta Modelo 01', 'tshirt', 1),
        (v_event_id, 'TSHIRT-02', 'Camiseta Modelo 02', 'tshirt', 2),
        (v_event_id, 'TSHIRT-03', 'Camiseta Modelo 03', 'tshirt', 3),
        (v_event_id, 'TANK-01',   'Regata Modelo 01',   'tank',   4),
        (v_event_id, 'TANK-02',   'Regata Modelo 02',   'tank',   5),
        (v_event_id, 'TANK-03',   'Regata Modelo 03',   'tank',   6);

END $$;
