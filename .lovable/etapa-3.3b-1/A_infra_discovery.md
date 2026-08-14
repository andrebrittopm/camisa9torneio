# INFRASTRUCTURE DISCOVERY (A) — ETAPA 3.3B-1

## 1. PROVEDOR E RUNTIME
- **PROVEDOR/HOSPEDAGEM APARENTE**: Lovable Cloud (Cloudflare Workers via Nitro/TanStack Start).
- **RUNTIME SERVER**: Cloudflare Worker (Edge Runtime).
- **PLATAFORMA**: TanStack Start v1 (Nitro engine).

## 2. ARMAZENAMENTO DISTRIBUÍDO
- **REDIS/UPSTASH**: Não encontrado no `package.json`.
- **CLOUDFLARE KV**: Disponível via runtime do Worker, mas sem dependências explícitas no `package.json`.
- **CLOUDFLARE WAF**: Provável, dado o uso de subdomínios `lovable.app`, mas não configurável via código.
- **SUPABASE/POSTGRES**: Confirmado e em uso. É o armazenamento persistente primário.
- **DURABLE OBJECTS**: Não configurado.

## 3. DEPENDÊNCIAS RELEVANTES
- `@supabase/supabase-js`: ^2.112.3
- `nitro`: 3.0.260603-beta
- `typescript`: ^5.8.3
- Sem bibliotecas de rate limit (ex: `upstash/ratelimit`, `limiter`) instaladas.

## 4. VARIÁVEIS DE AMBIENTE (SOMENTE NOMES)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Server-side only)
- `TURNSTILE_SECRET_KEY`
- `API_KEY` (Platform internal)

## 5. CONCLUSÃO DA DESCOBERTA
- **ARMAZENAMENTO DISTRIBUÍDO JÁ DISPONÍVEL**: Supabase (PostgreSQL).
- **DEPENDÊNCIA REDIS/KV EXISTENTE**: NÃO.
- **CLOUDFLARE PROXY/WAF CONFIRMADO?**: SIM (Nível infra Lovable).
