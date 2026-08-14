# ARQUITETURA FINALIZADA (RESULTADO) — ETAPA 3.3B-1R1

## 1. INFRAESTRUTURA E CONFIANÇA
- **PROXY CONFIÁVEL**: SIM (Cloudflare via Lovable Gateway).
- **FONTE IP CONFIÁVEL**: `CF-Connecting-IP`.
- **PER-CLIENT LIMIT POSSÍVEL**: SIM.
- **GLOBAL LIMIT POSSÍVEL**: SIM.

## 2. ARQUITETURA RECOMENDADA
- **TIPO**: Application-layer Distributed Rate Limiting.
- **STORAGE**: Supabase/Postgres (Tabela: `av_rate_limit_buckets`).
- **ALGORITMO**: Sliding Window Counter (Janelas fixas de 1min acumuladas).
- **ESCOPOS**: 
    - `order:client:burst` (5/min)
    - `order:client:sustained` (20/15min)
    - `order:global:burst` (100/min - Normal)
- **FAIL POLICY**:
    - **Fail-Closed**: Erros de configuração crítica (Secret ausente).
    - **Fail-Open do Limiter**: Erros de storage (Prossegue obrigatoriamente para Turnstile).
- **PRIVACY MODEL**: HMAC-SHA-256(IP + Secret Server-Side). Zero IPs brutos em DB/Logs.

## 3. IDENTIFICADORES E SEGREDO
- **IDENTIFICADOR**: `CF-Connecting-IP` (validado pela plataforma).
- **SEGREDO**: `AV_RATE_LIMIT_HASH_SECRET` (Versão v1 injetada na chave).

## 4. ORDEM DE PROTEÇÃO FINAL
1. CORS/Origin Check.
2. Body Size Check (64KB).
3. JSON/Syntax Check.
4. **RATE LIMITING** (Consome bucket).
5. **TURNSTILE SITEVERIFY**.
6. Fingerprinting.
7. RPC `av_create_order`.

---
**CONCLUSÃO**: ETAPA 3.3B-1R1 — ARQUITETURA FINALIZADA PARA AUDITORIA.
NENHUMA ALTERAÇÃO DE PRODUÇÃO EXECUTADA.
