# CLIENT IDENTIFIER STRATEGY (C) — ETAPA 3.3B-1

## 1. HEADERS DE IP (DISCOVERY)
O runtime Nitro/Cloudflare expõe o IP via headers específicos.

- **HEADERS DETECTADOS/DISPONÍVEIS**:
    - `CF-Connecting-IP` (Padrão Cloudflare, alta confiabilidade se atrás do proxy).
    - `X-Forwarded-For` (Pode conter múltiplos IPs, menos confiável se não saneado).
    - `True-Client-IP` (Alternativa Cloudflare).

## 2. CONFIABILIDADE
- **PROXY CONFIÁVEL CONFIRMADO?**: SIM (Lovable infra).
- **HEADER SOBRESCRITO PELO PROXY?**: SIM (Cloudflare garante `CF-Connecting-IP`).
- **CLIENTE CONSEGUE FORJAR DIRETAMENTE?**: NÃO, se o server apenas ler o header injetado pelo proxy final.
- **CONFIANÇA SUFICIENTE PARA RATE LIMIT?**: SIM.

## 3. MECANISMO DE PRIVACIDADE (HASHING)
Para evitar armazenamento de PII (Endereço IP), utilizaremos:

1. **INPUT**: `CF-Connecting-IP` + `AV_RATE_LIMIT_HASH_SECRET`.
2. **PROCESS**: HMAC-SHA-256.
3. **STORAGE**: Apenas os primeiros 32 caracteres do hash (ou hash completo).

## 4. IDENTIFICADORES PROPOSTOS
- **CLIENT_KEY**: `sha256(ip + secret)`
- **BUCKET_KEY**: `client_key + ":" + endpoint_name`
- **GLOBAL_KEY**: `"global:" + endpoint_name`

Nenhum dado pessoal (Nome, WhatsApp, IP original) entrará na tabela de rate limiting.