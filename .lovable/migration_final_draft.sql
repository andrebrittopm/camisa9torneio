-- --------------------------------------------------
-- 1. FUNCTIONS & TRIGGERS
-- --------------------------------------------------

-- Generic function to handle updated_at
CREATE OR REPLACE FUNCTION public.av_handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------
-- 2. TABLES
-- --------------------------------------------------

-- Table: av_events
CREATE TABLE public.av_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_number INTEGER NOT NULL CHECK (event_number > 0),
    event_year INTEGER NOT NULL CHECK (event_year >= 2026),
    event_name TEXT NOT NULL CHECK (length(trim(event_name)) > 0),
    location TEXT,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 35.00 CHECK (unit_price >= 0),
    pix_key TEXT,
    pix_key_type TEXT,
    pix_holder_name TEXT,
    orders_open BOOLEAN NOT NULL DEFAULT true,
    order_deadline TIMESTAMPTZ NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_number, event_year)
);

-- Table: av_shirt_models
CREATE TABLE public.av_shirt_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.av_events(id) ON DELETE RESTRICT,
    code TEXT NOT NULL CHECK (length(trim(code)) > 0),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    category TEXT NOT NULL CHECK (category IN ('tshirt', 'tank')),
    front_image_url TEXT NULL,
    back_image_url TEXT NULL,
    thumbnail_url TEXT NULL,
    model_3d_url TEXT NULL,
    available_sizes TEXT[] NOT NULL DEFAULT ARRAY['PP','P','M','G','GG','XG','XXG'],
    allow_custom_size BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, code),
    UNIQUE (id, event_id) -- Composite Unique for FK integrity
);

-- Table: av_orders
CREATE TABLE public.av_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_seq BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    event_id UUID NOT NULL REFERENCES public.av_events(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL CHECK (length(trim(customer_name)) > 0),
    whatsapp TEXT NOT NULL CHECK (length(trim(whatsapp)) > 0),
    notes TEXT,
    order_status TEXT NOT NULL DEFAULT 'received' CHECK (order_status IN ('received', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (payment_status IN ('awaiting_payment', 'receipt_submitted', 'payment_confirmed', 'receipt_rejected')),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, event_id) -- Composite Unique for FK integrity
);

-- Table: av_order_items
CREATE TABLE public.av_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    order_id UUID NOT NULL,
    shirt_model_id UUID NOT NULL,
    model_code TEXT NOT NULL CHECK (length(trim(model_code)) > 0),
    model_name TEXT NOT NULL CHECK (length(trim(model_name)) > 0),
    shirt_type TEXT NOT NULL CHECK (shirt_type IN ('tshirt', 'tank')),
    size_option TEXT NOT NULL CHECK (size_option IN ('PP','P','M','G','GG','XG','XXG','OUTRO')),
    custom_size TEXT,
    custom_name TEXT,
    custom_number TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(12,2) GENERATED ALWAYS AS ((unit_price * quantity)::NUMERIC(12,2)) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Composite FK for multi-event integrity
    CONSTRAINT fk_order_event FOREIGN KEY (order_id, event_id) 
        REFERENCES public.av_orders(id, event_id) ON DELETE CASCADE,
        
    CONSTRAINT fk_model_event FOREIGN KEY (shirt_model_id, event_id) 
        REFERENCES public.av_shirt_models (id, event_id) ON DELETE RESTRICT,

    -- Strict size constraint
    CONSTRAINT check_custom_size CHECK (
        (size_option = 'OUTRO' AND custom_size IS NOT NULL AND length(trim(custom_size)) > 0) OR
        (size_option <> 'OUTRO' AND custom_size IS NULL)
    )
);

-- Table: av_payment_receipts
CREATE TABLE public.av_payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.av_orders(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_file_name TEXT,
    mime_type TEXT,
    size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID -- No FK yet
);

-- --------------------------------------------------
-- 3. TRIGGERS
-- --------------------------------------------------

CREATE TRIGGER tr_av_events_updated_at BEFORE UPDATE ON public.av_events FOR EACH ROW EXECUTE FUNCTION public.av_handle_updated_at();
CREATE TRIGGER tr_av_shirt_models_updated_at BEFORE UPDATE ON public.av_shirt_models FOR EACH ROW EXECUTE FUNCTION public.av_handle_updated_at();
CREATE TRIGGER tr_av_orders_updated_at BEFORE UPDATE ON public.av_orders FOR EACH ROW EXECUTE FUNCTION public.av_handle_updated_at();

-- --------------------------------------------------
-- 4. INDICES
-- --------------------------------------------------

CREATE INDEX idx_av_events_active ON public.av_events(active);

CREATE INDEX idx_av_shirt_models_event_id ON public.av_shirt_models(event_id);

CREATE INDEX idx_av_orders_event_id ON public.av_orders(event_id);
CREATE INDEX idx_av_orders_created_at ON public.av_orders(created_at);
CREATE INDEX idx_av_orders_whatsapp ON public.av_orders(whatsapp);
CREATE INDEX idx_av_orders_event_order_status ON public.av_orders(event_id, order_status);
CREATE INDEX idx_av_orders_event_payment_status ON public.av_orders(event_id, payment_status);

CREATE INDEX idx_av_order_items_order_id ON public.av_order_items(order_id);
CREATE INDEX idx_av_order_items_shirt_model_id ON public.av_order_items(shirt_model_id);
CREATE INDEX idx_av_order_items_event_id ON public.av_order_items(event_id);

CREATE INDEX idx_av_payment_receipts_order_id ON public.av_payment_receipts(order_id);

-- --------------------------------------------------
-- 5. PRIVILEGES & RLS
-- --------------------------------------------------

-- Enable RLS for all tables
ALTER TABLE public.av_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.av_shirt_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.av_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.av_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.av_payment_receipts ENABLE ROW LEVEL SECURITY;

-- Revoke all from public roles
REVOKE ALL ON public.av_events FROM anon, authenticated;
REVOKE ALL ON public.av_shirt_models FROM anon, authenticated;
REVOKE ALL ON public.av_orders FROM anon, authenticated;
REVOKE ALL ON public.av_order_items FROM anon, authenticated;
REVOKE ALL ON public.av_payment_receipts FROM anon, authenticated;

