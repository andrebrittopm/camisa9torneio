{/* 
ETAPA 3.3A-2B — TESTES FUNCIONAIS CONTROLADOS DO CLOUDFLARE TURNSTILE

A ETAPA 3.3A-2A FOI APROVADA.

Agora executar a bateria funcional TUR01–TUR25.

IMPORTANTE:

NÃO fazer deploy público.
NÃO usar chaves reais de produção.
NÃO alterar RPC.
NÃO alterar schema.
NÃO alterar RLS.
NÃO alterar preço.
NÃO implementar rate limiting ainda.
NÃO deixar dados de teste no banco ao final.

==================================================
1. PRÉ-CHECK
==================================================

Antes de qualquer teste:

confirmar:

- NODE_ENV NÃO é production;
- TURNSTILE_TEST_MODE pode ser utilizado com segurança;
- banco atual não possui pedidos reais de produção que possam
  ser confundidos com dados de teste;
- registrar count inicial de:

public.av_orders
public.av_order_items

NÃO resetar sequence agora.

==================================================
2. CHAVES OFICIAIS DE TESTE
==================================================

Usar SOMENTE as chaves dummy oficiais da Cloudflare.

SUCESSO:

VITE_TURNSTILE_SITE_KEY:
1x00000000000000000000AA

TURNSTILE_SECRET_KEY:
1x0000000000000000000000000000000AA

FALHA:

Sitekey:
2x00000000000000000000AB

Secret:
2x0000000000000000000000000000000AA

TOKEN JÁ GASTO / DUPLICADO:

Sitekey:
1x00000000000000000000AA

Secret:
3x0000000000000000000000000000000AA

Para os testes dummy:

TURNSTILE_TEST_MODE=true

NÃO inserir essas secrets no código-fonte.

Usar apenas configuração temporária de ambiente.

==================================================
3. REGRA DO TEST MODE
==================================================

Confirmar durante os testes:

NODE_ENV !== production

e:

TURNSTILE_TEST_MODE=true

No modo dummy, o backend deve esperar:

action = "test"
hostname = "localhost"

O Siteverify CONTINUA sendo chamado.

Não existe bypass.

==================================================
4. TESTE TUR01
==================================================

Token ausente.

Enviar payload estruturalmente válido,
mas sem turnstile_token.

Esperado:

HTTP 400
error = INVALID_REQUEST

Confirmar:

Siteverify NÃO chamada
RPC NÃO chamada
nenhum pedido criado.

==================================================
5. TUR02
==================================================

turnstile_token numérico.

Esperado:

400 INVALID_REQUEST

Siteverify NÃO chamada.
RPC NÃO chamada.

==================================================
6. TUR03
==================================================

turnstile_token vazio:

""

Esperado:

400 INVALID_REQUEST

Siteverify NÃO chamada.
RPC NÃO chamada.

==================================================
7. TUR04
==================================================

turnstile_token com 2049 caracteres.

Esperado:

400 INVALID_REQUEST

Siteverify NÃO chamada.
RPC NÃO chamada.

==================================================
8. TUR05
==================================================

Simular TURNSTILE_SECRET_KEY ausente.

Esperado:

500 INTERNAL_ERROR

log:

stage=turnstile_config
code=CONFIG_MISSING

RPC NÃO chamada.

Restaurar a secret de teste imediatamente após este cenário.

==================================================
9. TUR06
==================================================

Usar combinação dummy que falha.

Esperado:

403 TURNSTILE_FAILED

log seguro:

stage=turnstile
code=FAILED

Não exibir error-codes Cloudflare ao cliente.

RPC NÃO chamada.

==================================================
10. TUR07
==================================================

Usar combinação dummy always-pass.

Pedido válido.

Esperado:

Siteverify success.

Depois fluxo continua normalmente.

Esperado final:

HTTP 200

success=true.

Registrar order_id e idempotency_key exclusivamente
para controle interno do teste.

Não imprimir PII desnecessária.

==================================================
11. TUR08 — ACTION MISMATCH
==================================================

Este cenário deve ser testado por MOCK/UNIT TEST do helper,
não tentando alterar comportamento da Cloudflare real.

Mockar Siteverify:

{
  success: true,
  hostname: "localhost",
  action: "wrong_action"
}

Com configuração esperada:

action = "test"

Esperado:

403/resultado TURNSTILE_FAILED

stage=turnstile
code=ACTION_MISMATCH

RPC NÃO chamada.

==================================================
12. TUR09 — HOSTNAME MISMATCH
==================================================

Também usar mock/unit test.

Resposta simulada:

{
  success: true,
  hostname: "evil.example",
  action: "test"
}

Esperado:

TURNSTILE_FAILED

stage=turnstile
code=HOSTNAME_MISMATCH.

==================================================
13. TUR10 — TIMEOUT
==================================================

Mockar fetch/Siteverify para exceder 8 segundos
ou abortar via AbortController.

Esperado:

TURNSTILE_UNAVAILABLE

HTTP equivalente na Server Route:

503

log:

stage=turnstile
code=TIMEOUT.

Não esperar timeout real da Cloudflare se isso tornar o teste
instável.

==================================================
14. TUR11
==================================================

Mockar Siteverify com resposta HTTP 200 cujo JSON é inválido.

Esperado:

503 TURNSTILE_UNAVAILABLE

log:

INVALID_RESPONSE.

==================================================
15. TUR12 — TOKEN DUPLICADO
==================================================

Usar secret oficial:

3x0000000000000000000000000000000AA

com dummy token compatível.

Esperado:

403 TURNSTILE_FAILED.

O cliente NÃO deve receber:

timeout-or-duplicate.

Log somente:

stage=turnstile
code=FAILED.

RPC NÃO chamada.

==================================================
16. TUR13 — TOKEN LOG SAFETY
==================================================

Inspecionar logs gerados pelos cenários.

Confirmar que NUNCA aparece:

- turnstile_token;
- valor completo do dummy token;
- request body.

RESULTADO PASS somente se ausência comprovada.

==================================================
17. TUR14 — SECRET LOG SAFETY
==================================================

Confirmar que nenhuma destas aparece em logs/respostas:

TURNSTILE_SECRET_KEY
dummy secret
SUPABASE_SERVICE_ROLE_KEY.

==================================================
18. TUR15 — BLOCKED BEFORE RPC
==================================================

Para um cenário Turnstile recusado:

provar que:

av_create_order NÃO foi chamada.

Pode provar por:

- spy/mock;
- contador/instrumentação temporária de teste;
- ausência inequívoca de pedido;

sem modificar permanentemente a RPC.

Esperado:

RPC count = 0.

==================================================
19. TUR16 — SUCESSO / RPC UMA VEZ
==================================================

Pedido válido + Turnstile always-pass.

Esperado:

Siteverify chamada 1 vez.
RPC av_create_order chamada exatamente 1 vez.

HTTP 200.

Validar resposta:

success=true

data contém:

order_id
order_seq
display_order_number
event_year
customer_name
total_quantity
subtotal
total_amount
order_status
payment_status
is_duplicate=false

Preço deve continuar vindo do banco.

==================================================
20. TUR17 — RETRY IDEMPOTENTE
==================================================

Após TUR16:

gerar NOVO token Turnstile.

Reenviar payload semanticamente idêntico com:

MESMA idempotency_key DO PEDIDO.

Esperado:

HTTP 200
mesmo order_id
mesmo order_seq
is_duplicate=true

Siteverify chamada novamente.

RPC chamada novamente para resolver a idempotência,
mas nenhum segundo pedido criado.

==================================================
21. TUR18 — PAYLOAD INVÁLIDO ANTES DO SITEVERIFY
==================================================

Exemplo:

event_id inválido.

Mesmo que turnstile_token esteja presente.

Esperado:

400 INVALID_REQUEST

Siteverify NÃO chamada.

RPC NÃO chamada.

==================================================
22. TUR19
==================================================

Mock Siteverify HTTP 500.

Esperado:

503 TURNSTILE_UNAVAILABLE

log:

HTTP_ERROR

Não logar response.status bruto se o código aprovado
não o faz.

==================================================
23. TUR20
==================================================

HTTP 200 + body não parseável como JSON.

Esperado:

503 TURNSTILE_UNAVAILABLE

INVALID_RESPONSE.

==================================================
24. TUR21
==================================================

Testar separadamente:

result = null

e:

result = []

Esperado em ambos:

503 TURNSTILE_UNAVAILABLE

INVALID_RESPONSE.

==================================================
25. TUR22 — PRODUÇÃO SEM HOSTNAME
==================================================

NÃO fazer deploy.

Executar teste unitário do helper simulando:

NODE_ENV=production

TURNSTILE_EXPECTED_HOSTNAMES vazio.

Esperado:

CONFIG_MISSING

equivalente HTTP:

500 INTERNAL_ERROR.

Siteverify NÃO chamada.

Restaurar NODE_ENV/configuração imediatamente.

==================================================
26. TUR23 — TEST MODE EM PRODUÇÃO
==================================================

Teste unitário:

NODE_ENV=production
TURNSTILE_TEST_MODE=true

Esperado:

CONFIG_ERROR

500 INTERNAL_ERROR

Siteverify NÃO chamada.

Restaurar ambiente depois.

==================================================
27. TUR24 — RESET PÓS-SUBMIT
==================================================

Testar o checkout/componente.

Após uma tentativa HTTP que chegou ao backend:

confirmar:

turnstileToken torna-se null

e:

turnstile.reset(widgetId)

é chamado.

O botão não pode permitir novo submit
até novo token ser gerado.

==================================================
28. TUR25 — NOVO TOKEN, MESMO PEDIDO
==================================================

Após reset:

obter novo token Turnstile.

Confirmar que o retry utiliza:

NOVO turnstile_token

e:

MESMA idempotency_key do pedido lógico.

Não gerar segundo pedido.

==================================================
29. TESTE DE ACTION/HOSTNAME DUMMY
==================================================

Durante TUR07/TUR16/TUR17 confirmar internamente
que a resposta dummy da Cloudflare é compatível com:

action=test
hostname=localhost.

Não imprimir token.

==================================================
30. CONTAGEM DE BANCO
==================================================

Registrar após TUR16:

quantos pedidos de teste existem.

Após TUR17:

confirmar que o count NÃO aumentou.

Idempotência deve impedir segundo pedido.

==================================================
31. STATUS RETRY
==================================================

Se for seguro reproduzir novamente:

após TUR16 alterar temporariamente apenas o pedido DE TESTE para:

order_status = confirmed
payment_status = payment_confirmed

executar retry com:

mesma idempotency_key
novo token Turnstile.

Esperado:

confirmed
payment_confirmed
is_duplicate=true

Depois restaurar/limpar pedido.

Isso confirma que Turnstile não regrediu o STATUS RETRY
já validado anteriormente.

==================================================
32. NÃO TESTAR PRODUÇÃO REAL
==================================================

NÃO usar:

sitekey real
secret real
hostname real

nesta etapa.

Somente dummy keys ou mocks controlados.

==================================================
33. CLEANUP
==================================================

Ao final remover EXCLUSIVAMENTE:

pedidos e itens criados pelos testes desta etapa.

Usar order_ids explicitamente registrados.

NÃO executar DELETE genérico.

Confirmar:

nenhuma PII de teste permaneceu.

Restaurar todas as variáveis/configurações temporárias.

==================================================
34. SEQUENCE
==================================================

Após cleanup:

verificar se existiam pedidos reais antes dos testes.

SE E SOMENTE SE:

- banco estava vazio antes;
- banco está vazio depois;
- nenhuma inserção real ocorreu paralelamente;
- é seguro resetar;

restaurar sequence para que o próximo pedido real seja 1.

NÃO chamar nextval apenas para conferir.

Se houver qualquer dúvida:

NÃO resetar sequence.

Gap de sequence é aceitável.

==================================================
35. BUILD FINAL
==================================================

Após testes e cleanup:

executar novamente:

typecheck/build relevante.

Esperado:

PASS.

==================================================
36. RELATÓRIO FINAL
==================================================

Entregar tabela:

ID | RESULTADO | HTTP/RETORNO | SITEVERIFY? | RPC? | OBSERVAÇÃO

com TUR01 até TUR25.

Não agrupar cenários.

Além da tabela, informar:

ORDERS COUNT ANTES:
ORDERS COUNT DEPOIS:
ITEMS COUNT ANTES:
ITEMS COUNT DEPOIS:
DADOS DE TESTE REMANESCENTES:
SEQUENCE ALTERADA?:
BUILD FINAL:
TYPECHECK FINAL:

==================================================
37. CRITÉRIO DE APROVAÇÃO
==================================================

Somente finalizar:

"ETAPA 3.3A-2B — TURNSTILE FUNCIONALMENTE VALIDADO"

se TUR01-TUR25 passarem e cleanup estiver comprovado.

Caso qualquer teste falhe:

"ETAPA 3.3A-2B — POSSUI PENDÊNCIA"

e listar exatamente:

ID
esperado
observado
causa provável

NÃO corrigir silenciosamente.

NÃO iniciar rate limiting ainda.
*/}
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ModelsSection } from "@/components/ModelsSection";
import { CustomizationPreview } from "@/components/CustomizationPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Amigos do Vôlei - 9º Torneio ACS" },
      { name: "description", content: "Landing page oficial para as camisas do 9º Torneio Amigos do Vôlei." },
      { property: "og:title", content: "Amigos do Vôlei - 9º Torneio ACS" },
      { property: "og:description", content: "Garanta sua camisa oficial do torneio mais aguardado de Coxim/MS." },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-navy text-ice selection:bg-gold selection:text-navy overflow-x-hidden scroll-smooth">
      {/* Background Decor & Textures */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-tech opacity-10" />
        <div className="absolute top-0 left-0 right-0 h-screen bg-gradient-to-b from-royal/10 via-transparent to-navy" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-royal/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>
      
      <Header />
      
      <main>
        <HeroSection />
        <ModelsSection />
        <CustomizationPreview />
        <HowItWorks />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
