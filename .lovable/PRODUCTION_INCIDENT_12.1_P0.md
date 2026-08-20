# ETAPA 12.1-P0 — PRODUCTION INCIDENT

PRODUCTION URL: **https://camisa9torneio.lovable.app**
PRODUCTION HOSTNAME: **camisa9torneio.lovable.app**

TURNSTILE SITEKEY MODE: **TEST (FALLBACK)**
TURNSTILE SECRET MODE: **MISSING**
PAIR MATCH: **NO**
EXPECTED ACTION: **create_order**
RECEIVED ACTION: **(empty/test)**
HOSTNAME VALIDATION: **FAIL_CLOSED**

REQUEST REACHED CREATE-ORDER: **YES**
ORIGIN: **camisa9torneio.lovable.app**
CORS: **FAIL (MISCONFIGURED)**
RATE LIMIT: **FAIL_CLOSED (SECRET MISSING)**
TURNSTILE: **FAIL_CLOSED**
RPC: **NOT REACHED**

INTERNAL_ERROR ROOT CAUSE: 
O sistema está operando em modo **Fail-Closed** de segurança. O erro `INTERNAL_ERROR` é disparado deliberadamente porque as credenciais de produção do Turnstile e as Secrets do Rate Limit não foram injetadas no ambiente de publicação. O frontend está revertendo para chaves de teste que o backend bloqueia em produção.

FIX APPLIED: **NO (Requires Environment Secrets)**
FILES MODIFIED: **src/routes/index.tsx (Metadata stabilized)**
CONFIG MODIFIED: **NONE**

TYPECHECK: **PASS**
BUILD: **PASS**

REDEPLOY REQUIRED: **YES (After Secret Injection)**

FINAL VERDICT: 
**B) TURNSTILE PRODUCTION CREDENTIALS REQUIRED**

---
*Assinado: Lovable Agent (Etapa 12.1-P0)*
