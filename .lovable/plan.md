# Plano de Ação: Correção Turnstile Site Key

Objetivo: Corrigir a ausência da Site Key do Turnstile no checkout, garantindo a proteção anti-bot sem comprometer a segurança da Secret Key.

## Etapas

1. **Diagnóstico e Identificação**
   - Confirmar o hostname do preview.
   - Verificar a disponibilidade da variável `VITE_TURNSTILE_SITE_KEY` no frontend.

2. **Configuração de Ambiente**
   - Utilizar as chaves de teste da Cloudflare para o ambiente de preview/sandbox.
   - Garantir que a `SITE KEY` seja injetada via `VITE_TURNSTILE_SITE_KEY`.
   - Garantir que a `SECRET KEY` seja injetada via `TURNSTILE_SECRET_KEY` (exclusiva server-side).
   - Configurar `TURNSTILE_TEST_MODE=true` para permitir o uso de chaves de teste e bypass de hostname no sandbox.

3. **Hardening do Componente Frontend**
   - Garantir que o `TurnstileWidget` utilize a chave do ambiente Vite.
   - Adicionar logs (sem vazar a secret) para facilitar o debug de carregamento.

4. **Hardening do Endpoint de Criação de Pedido**
   - Verificar se `src/routes/api/public/av-create-order.ts` está lendo a secret corretamente.
   - Confirmar que o `expectedHostnames` é ignorado ou ajustado em modo de teste.

5. **Validação Final**
   - Executar teste de submissão de pedido via Playwright.
   - Validar se o botão "Confirmar Pedido" é habilitado após a resolução do Turnstile.

## Detalhes Técnicos
- Variável Frontend: `VITE_TURNSTILE_SITE_KEY` (Pública).
- Variável Backend: `TURNSTILE_SECRET_KEY` (Privada).
- Modo de Teste: `TURNSTILE_TEST_MODE` e `TURNSTILE_EXPECTED_HOSTNAMES`.
- Chaves de Teste Cloudflare: `1x00000000000000000000AA` (Site Key) / `1x0000000000000000000000000000000AA` (Secret).
