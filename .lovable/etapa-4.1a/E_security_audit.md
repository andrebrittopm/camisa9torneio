---
name: Auditoria de Segurança - Catálogo Público
description: Validação de segurança da Etapa 4.1A
type: feature
---

# Auditoria de Segurança - ETAPA 4.1A

## 1. Exposição de Dados (PII/Secret)
- [x] Zero exposição de PII (customer data).
- [x] Zero exposição de Segredos (Supabase Keys).
- [x] Zero exposição de Dados Sensíveis de Pagamento (PIX).
- [x] Sanitização manual de campos do banco.

## 2. Acesso ao Banco
- [x] Browser NÃO acessa Supabase diretamente.
- [x] Server Route utiliza `service_role` apenas no contexto server-side.
- [x] RLS permanece ativo e bloqueando anon/authenticated nas tabelas.
- [x] Nenhuma permissão de SELECT pública foi concedida.

## 3. Rate Limiting
- [x] O catálogo é read-only e público.
- [x] Rate limiter de pedidos (POST) não é afetado.

## 4. CORS
- [x] Allowlist estrita para origins quando header Origin está presente.
- [x] Sem `Access-Control-Allow-Origin: *`.
