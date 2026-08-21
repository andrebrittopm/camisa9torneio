P18-A — REGATA / MULTI-MODEL READINESS AUDIT

AV_SHIRT_MODELS SCHEMA:
- id: uuid (PK, default gen_random_uuid())
- event_id: uuid (FK, NOT NULL)
- code: text (NOT NULL)
- name: text (NOT NULL)
- category: text (NOT NULL, enum: tshirt, tank)
- front_image_url, back_image_url, thumbnail_url, model_3d_url: text (NULLABLE)
- available_sizes: text[] (NOT NULL)
- allow_custom_size: boolean (NOT NULL, default true)
- active: boolean (NOT NULL, default true)
- sort_order: integer (NOT NULL, default 0)
- created_at, updated_at: timestamptz (NOT NULL, default now())

CURRENT MODELS:
- TSHIRT-01: Camiseta Modelo 01 (active: true, category: tshirt)
- TSHIRT-02: Camiseta Modelo 02 (active: false, category: tshirt)
- TSHIRT-03: Camiseta Modelo 03 (active: false, category: tshirt)
- TANK-01: Regata Modelo 01 (active: false, category: tank)
- TANK-02: Regata Modelo 02 (active: false, category: tank)

MULTIPLE MODELS PER EVENT:
SUPPORTED

PRICE AUTHORITY:
EVENT

PRICE SOURCE:
public.av_events.unit_price

CATALOG MULTI-MODEL:
PASS (Queries all active models for event_id, no hardcode limit in fetch logic)

PUBLIC UI MULTI-MODEL:
PARTIAL (ModelsSection supports .map() and category tabs, but Index.tsx activeModel memo has fallback/default to TSHIRT-01)

MIXED ORDER:
SUPPORTED (Order items reference shirt_model_id individually)

ORDER ITEM MODEL ID:
PRESENT

RPC MULTI-MODEL:
PASS (Iterates p_items and validates each shirt_model_id against DB)

RPC HARD-CODED TSHIRT-01:
NO

IMAGE SOURCE:
BOTH (Catalog API returns front_image_url, but overrides TSHIRT-01 with a hardcoded local path)

ADMIN MULTI-MODEL:
PASS (Displays item.modelName and uses getAdminProductDisplayName helper)

HISTORICAL ORDERS SAFE:
YES

RECOMMENDED REGATA INTERNAL CODE:
TANK-01 (Matches existing inactive pattern)

SAME PRICE IMPACT:
NO CHANGE (Current unit_price is sourced from the event)

DIFFERENT PRICE IMPACT:
SCHEMA/RPC EVOLUTION (Requires moving unit_price to av_shirt_models or av_order_items and updating calculation logic)

SECURITY CHANGES REQUIRED:
NO
DETAIL:
Architecture is already model-agnostic; no security boundary changes required for new models within the same event.

FILES REQUIRED FOR FUTURE IMPLEMENTATION:

DATABASE:
NONE (If price remains per event) / SMALL (If price per model)

SERVER:
src/routes/api/public/av-catalog.ts (Remove image override)

PUBLIC FRONTEND:
src/routes/index.tsx (Update activeModel logic)
src/components/ModelsSection.tsx (Enable tank tab)

ADMIN:
NONE (B4 labels already handle product names)

ASSETS:
REGATA WEBP/PNG

RISKS:
Price mismatch if Manga/Regata have different costs without schema update.

RECOMMENDED IMPLEMENTATION PLAN:
1. Upload regata assets. 2. Activate TANK-01 in DB. 3. Update catalog API to stop overriding images. 4. Refine UI activeModel selection logic.

FILES MODIFIED:
NONE

DATABASE MODIFIED:
NO

FINAL VERDICT:
A) READY FOR P18-B IMPLEMENTATION