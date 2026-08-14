---
title: ETAPA 3.2B-2A — CORREÇÃO DA FRONTEIRA HTTP TANSTACK/NITRO
---

## Phase 1: Infrastructure Analysis & Fix
1. **Investigate Nitro CORS:** Search for global CORS settings in `.lovable/project.json` or hidden Nitro configurations that might be intercepting `OPTIONS` requests.
2. **Override CORS for Endpoint:** If a global policy like `/api/public/**: { cors: true }` exists, add a more specific override for `/api/public/av-create-order` to disable automatic CORS, ensuring `OPTIONS` reaches the handler.
3. **Ensure Server Route Registration:** Confirm `src/routes/api/public/av-create-order.ts` is correctly registered and handles all HTTP methods (OPTIONS, POST, GET, etc.) explicitly.

## Phase 2: Route Logic Hardening
1. **Explicit OPTIONS Handling:** 
   - Return `24` with exact `Access-Control-Allow-Origin` and `Vary: Origin` for allowed origins.
   - Return `403 CORS_ERROR` without `Access-Control-Allow-Origin` for denied origins.
2. **Method Restriction:** 
   - Return `405 METHOD_NOT_ALLOWED` for GET, PUT, PATCH, DELETE.
   - Ensure these never fall back to SSR/HTML.
3. **Configuration Order & Fail-Closed:**
   - Validate `ALLOWED_ORIGINS` first.
   - Move `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` validation to just before the RPC call.
   - Return `500 INTERNAL_ERROR` (log: `CONFIG_MISSING`) if secrets are missing for a valid payload.

## Phase 3: Comprehensive Test Battery
1. **Execute L01-L26:** Individual validation tests for CORS, method, body size (64KB), JSON structure, and payload schema.
2. **Execute C01-C05:** Configuration edge cases (missing origins, malformed origin list, denied origin, missing secrets).
3. **Verify Integrity:** Confirm `public.av_orders` count remains 0 and no secrets are exposed.

## Technical Details
- **Endpoint:** `/api/public/av-create-order`
- **Body Limit:** 64KB (strict enforcement via Content-Length and byte counting).
- **Security:** `Vary: Origin` header, dynamic allowlist, canonical SHA-256 fingerprinting.
- **RPC:** `av_create_order` (only called if all HTTP/Logic validations pass and configuration is complete).
