{/* 
ETAPA 3.3A-2B-R1 — CORREÇÃO DA BATERIA FUNCIONAL TURNSTILE

A implementação do Turnstile NÃO deve ser alterada neste momento.

O relatório anterior marcou alguns cenários como PASS mesmo quando
o resultado observado não correspondia ao objetivo original.

NÃO iniciar rate limiting.
NÃO fazer deploy.
NÃO alterar RPC.
NÃO alterar banco/schema/RLS permanentemente.
NÃO alterar preço.
NÃO alterar lógica de produção silenciosamente.

Executar SOMENTE:

TUR06
TUR07
TUR12
TUR15
TUR16
TUR17
TUR25

==================================================
1. REGRA DE RESULTADO
==================================================

Um cenário só pode ser marcado PASS se o RESULTADO OBSERVADO
for o resultado esperado daquele cenário.

CONFIG_MISSING / HTTP 500 NÃO pode ser usado como PASS para
um teste cujo objetivo é validar TURNSTILE_FAILED ou fluxo 200.

==================================================
2. PREPARAR AMBIENTE DE TESTE CORRETAMENTE
==================================================

O problema anterior foi:

TURNSTILE_SECRET_KEY ausente no Sandbox.

Para os testes utilizar SOMENTE configuração temporária de processo.

NÃO gravar chave em código-fonte.
NÃO gravar chave em arquivo versionado.
NÃO usar secret real de produção.

Como as chaves oficiais dummy da Cloudflare são exclusivamente
para testes, podem ser fornecidas ao PROCESSO DE TESTE.

Configuração de sucesso:

NODE_ENV=test
TURNSTILE_TEST_MODE=true

TURNSTILE_SECRET_KEY =
1x0000000000000000000000000000000AA

Para frontend/test widget:

VITE_TURNSTILE_SITE_KEY =
1x00000000000000000000AA

O Siteverify deve continuar sendo chamado.

TURNSTILE_TEST_MODE NÃO é bypass.

No modo de teste a implementação continuará esperando:

action=test
hostname=localhost

Restaurar o ambiente ao final.

==================================================
3. TUR06 — SUCCESS FALSE
==================================================

Executar com ambiente que realmente alcance o Siteverify/helper.

Usar dummy/mocked response que produza:

success=false.

Esperado:

HTTP 403
error=TURNSTILE_FAILED

RPC:
NÃO CHAMADA

Banco:
NÃO ALTERADO.

Se receber 500:

FAIL.

==================================================
4. TUR07 — FLUXO DE SUCESSO
==================================================

CRÍTICO.

Executar pedido válido com Turnstile aprovado.

Preferência:

REAL-DUMMY-CLOUDFLARE.

Se a limitação do ambiente impedir obtenção de token dummy real
do widget, pode ser utilizado:

MOCK-FETCH para Siteverify success=true

DESDE QUE:

- a Server Route real seja executada;
- a RPC av_create_order seja REAL;
- o banco de teste seja REAL;
- isso fique explicitamente indicado no relatório.

Esperado:

HTTP 200
success=true

RPC av_create_order:
CHAMADA

Pedido temporário:
CRIADO

Registrar internamente:

order_id
order_seq
idempotency_key

para cleanup e TUR17.

Não imprimir token ou PII.

==================================================
5. TUR12 — TOKEN SPENT
==================================================

Comprovar efetivamente resposta de token gasto/duplicado.

Pode utilizar:

REAL-DUMMY-CLOUDFLARE

ou:

MOCK-FETCH com success=false equivalente.

Esperado:

HTTP 403
TURNSTILE_FAILED

RPC:
NÃO chamada.

HTTP 500 = FAIL.

==================================================
6. TUR15 — TURNSTILE BLOQUEIA RPC
==================================================

Executar teste com spy/instrumentação controlada.

Forçar Turnstile recusado.

Comprovar objetivamente:

RPC call count = 0.

Não aceitar apenas Code Review.

Esperado:

PASS somente com prova de execução.

==================================================
7. TUR16 — PRINCIPAL TESTE
==================================================

Executar:

Turnstile aprovado
+
payload válido
+
Server Route REAL
+
RPC REAL
+
banco REAL.

Esperado:

HTTP 200
success=true

RPC av_create_order call count:
1

is_duplicate:
false

Resposta deve possuir:

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
is_duplicate

Registrar contagem:

orders antes TUR16
orders depois TUR16

Esperado:

+1 pedido.

Registrar:

items antes
items depois.

==================================================
8. TUR17 — IDEMPOTÊNCIA REAL
==================================================

Usar o pedido criado em TUR16.

Criar NOVA validação Turnstile/token.

Enviar payload semanticamente idêntico com:

MESMA order idempotency_key.

Esperado:

HTTP 200

order_id:
IGUAL AO TUR16

order_seq:
IGUAL AO TUR16

is_duplicate:
true

RPC:
chamada novamente

orders_count:
NÃO aumenta.

Esse teste NÃO pode ser marcado PASS com:

order_id=N/A
order_seq=N/A
HTTP 500.

==================================================
9. STATUS RETRY
==================================================

Aproveitando o pedido temporário de TUR16:

antes:

received
awaiting_payment

alterar SOMENTE esse pedido de teste para:

confirmed
payment_confirmed

fazer novo retry com:

novo Turnstile
mesma idempotency_key
mesmo payload.

Esperado:

HTTP 200
is_duplicate=true
order_status=confirmed
payment_status=payment_confirmed

Isso comprova que Turnstile não regrediu o retry de status.

==================================================
10. TUR25 — UI + IDEMPOTÊNCIA
==================================================

Executar teste de componente/integração.

Primeira tentativa:

token A
idempotency_key X.

Depois do submit:

TurnstileWidget.reset()
turnstileToken = null.

Simular novo token:

token B.

Segundo submit do MESMO pedido lógico:

token B
idempotency_key X.

Comprovar via spy do fetch/body:

token A != token B

e:

idempotency_key tentativa 1
==
idempotency_key tentativa 2.

Não imprimir os tokens.

Apenas afirmar:

TOKENS DIFERENTES: SIM
IDEMPOTENCY KEYS IGUAIS: SIM.

==================================================
11. COUNTS
==================================================

Relatar:

ORDERS ANTES TUR16:
ORDERS APÓS TUR16:
ORDERS APÓS TUR17:
ORDERS APÓS STATUS RETRY:
ORDERS FINAL APÓS CLEANUP:

ITEMS ANTES TUR16:
ITEMS APÓS TUR16:
ITEMS FINAL:

==================================================
12. CLEANUP
==================================================

Remover somente o pedido criado pelos testes TUR07/TUR16.

Usar explicitamente o order_id registrado.

NÃO usar DELETE genérico.

Confirmar:

orders final = orders inicial
items final = items inicial
dados de teste restantes = 0.

Não resetar sequence a menos que todas as condições de segurança
já estabelecidas sejam inequivocamente satisfeitas.

Gap de sequence é aceitável.

==================================================
13. VARIÁVEIS
==================================================

Ao final:

remover/restaurar configurações temporárias:

NODE_ENV
TURNSTILE_TEST_MODE
TURNSTILE_SECRET_KEY
VITE_TURNSTILE_SITE_KEY

Remover mocks/spies/instrumentação temporária.

==================================================
14. BUILD
==================================================

Executar:

typecheck
build

Esperado:

PASS.

==================================================
15. RELATÓRIO
==================================================

Entregar EXATAMENTE:

ID | RESULTADO | HTTP | SITEVERIFY | RPC | BANCO | EVIDÊNCIA

para:

TUR06
TUR07
TUR12
TUR15
TUR16
TUR17
TUR25

Além disso:

TUR16 ORDER_ID = mesmo valor interno usado para TUR17
TUR17 MESMO ORDER_ID? SIM/NÃO
TUR17 MESMO ORDER_SEQ? SIM/NÃO
TUR17 is_duplicate=true? SIM/NÃO
STATUS RETRY = PASS/FAIL
TUR25 TOKENS DIFERENTES = SIM/NÃO
TUR25 IDEMPOTENCY KEYS IGUAIS = SIM/NÃO

ORDERS INICIAL:
ORDERS APÓS TUR16:
ORDERS APÓS TUR17:
ORDERS FINAL:

ITEMS INICIAL:
ITEMS APÓS TUR16:
ITEMS FINAL:

DADOS TESTE RESTANTES:
MOCKS REMOVIDOS:
ENV RESTAURADO:
TYPECHECK:
BUILD:

==================================================
16. CONCLUSÃO
==================================================

Somente se TODOS esses sete cenários passarem escrever:

"ETAPA 3.3A-2B-R1 — CENÁRIOS PENDENTES VALIDADOS COM SUCESSO."

Caso contrário:

"ETAPA 3.3A-2B-R1 — AINDA POSSUI PENDÊNCIA."

NÃO iniciar ETAPA 3.3B.
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