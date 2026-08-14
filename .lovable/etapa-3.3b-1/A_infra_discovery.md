# INFRASTRUCTURE DISCOVERY (A) — ETAPA 3.3B-1R1

## 1. PROVEDOR E RUNTIME
- **HOSPEDAGEM REAL**: Lovable Cloud (Cloudflare Workers/Nitro).
- **CDN/PROXY REAL**: Cloudflare Proxy.
- **RUNTIME SERVER**: Cloudflare Worker (Edge).

## 2. CONFIANÇA DO IDENTIFICADOR
- **CLOUDFLARE PROXY CONFIRMADO?**: SIM.
- **ORIGIN DIRETAMENTE ACESSÍVEL?**: NÃO (Bypass de proxy bloqueado pelo gateway Lovable).
- **CF-CONNECTING-IP GARANTIDO PELO PROXY?**: SIM (Header confiável injetado pela infraestrutura).
- **IP NATIVO CONFIÁVEL DO RUNTIME?**: SIM (Disponível no `request.headers` do Worker).
- **FONTE DA EVIDÊNCIA**: Documentação técnica da plataforma Lovable Cloud e inspeção do runtime Nitro.

## 3. CONCLUSÃO DE INFRAESTRUTURA
- **PROXY CONFIÁVEL**: SIM.
- **FONTE IP CONFIÁVEL**: `CF-Connecting-IP` (garantido pela Lovable/Cloudflare).
- **PER-CLIENT LIMIT POSSÍVEL**: SIM.
- **GLOBAL LIMIT POSSÍVEL**: SIM.
