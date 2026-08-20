# Plano de Recuperação: Incidente de Produção 12.1-P0

O incidente de `INTERNAL_ERROR` e a falha do Turnstile em produção foram diagnosticados como um problema de **injeção de variáveis de ambiente**. O sistema opera em modo *Fail-Closed* para garantir a segurança dos dados e pagamentos.

## Problema
O site publicado está operando sem as credenciais de produção do Cloudflare Turnstile e sem as configurações de domínio necessárias para validar a origem (CORS) e o hostname. Isso faz com que o motor de pedidos bloqueie preventivamente qualquer transação.

## Ações imediatas (Usuário)
Para normalizar o sistema, as seguintes **Variáveis de Ambiente** devem ser configuradas no painel do Lovable/Cloudflare:

1.  **VITE_TURNSTILE_SITE_KEY**: Chave pública do Turnstile para o domínio oficial.
2.  **TURNSTILE_SECRET_KEY**: Chave secreta do Turnstile (API secreta).
3.  **ALLOWED_ORIGINS**: `https://camisa9torneio.lovable.app` (ou o domínio customizado final).
4.  **TURNSTILE_EXPECTED_HOSTNAMES**: `camisa9torneio.lovable.app` (apenas o hostname).
5.  **AV_ORDER_ACCESS_SECRET**: Uma chave de no mínimo 32 caracteres (Ex: gerar no terminal com `openssl rand -hex 32`).
6.  **AV_RATE_LIMIT_SECRET**: Uma chave de no mínimo 32 caracteres para o controle de fluxo.

## Ajustes técnicos (Agente)
Realizarei os seguintes ajustes no código para facilitar o diagnóstico e garantir a resiliência durante a transição:
- Atualizar metadados sociais (`og:image`, `twitter:image`, `canonical`) para usar o domínio de produção `https://camisa9torneio.lovable.app`.
- Adicionar logs de aviso mais claros quando credenciais estiverem em modo fallback em produção.
- Garantir que o `TurnstileWidget` não tente renderizar com a chave de teste se estiver em um domínio que não seja localhost/preview.

## Detalhes Técnicos
```text
Causa Raiz: Fail-Closed no validador Turnstile devido a CONFIG_MISSING.
Componente: src/lib/server/av-turnstile.ts (Linha 47) e src/routes/api/public/av-create-order.ts (Linha 208).
```
