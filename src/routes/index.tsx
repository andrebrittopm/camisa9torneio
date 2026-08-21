import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ModelsSection } from "@/components/ModelsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { fetchAvCatalog, type AvCatalogResponse } from "@/lib/av-catalog-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrderState } from "@/lib/order-state";
import { OrderConfigurator } from "@/components/OrderConfigurator";
import { CustomerDataForm } from "@/components/CustomerDataForm";
import { OrderItemsSummary } from "@/components/OrderItemsSummary";
import { OrderReview } from "@/components/OrderReview";
import { OrderSuccess } from "@/components/OrderSuccess";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei",
    meta: [
      {
        name: "description",
        content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance.",
      },
      { property: "og:title", content: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei" },
      {
        property: "og:description",
        content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:image",
        content:
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://camisa9torneio.lovable.app",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const currentStep = useOrderState((s) => s.currentStep);
  const items = useOrderState((s) => s.items);
  const customer = useOrderState((s) => s.customer);
  const editingItemId = useOrderState((s) => s.editingItemId);

  const setStep = useOrderState((s) => s.setStep);
  const addItem = useOrderState((s) => s.addItem);
  const updateItem = useOrderState((s) => s.updateItem);
  const setCustomer = useOrderState((s) => s.setCustomer);
  const removeItem = useOrderState((s) => s.removeItem);
  const setEditingItemId = useOrderState((s) => s.setEditingItemId);
  const resetOrder = useOrderState((s) => s.resetOrder);

  // ESTADO EM MEMÓRIA (Fix NEW-01)
  const [createdOrder, setCreatedOrder] = useState<any>(null); // Tipado como any para aceitar o unwrap sem refatorar o index agora
  const [receiptAccessToken, setReceiptAccessToken] = useState<string | null>(null);
  const [orderViewToken, setOrderViewToken] = useState<string | null>(null);

  const handleSuccess = (order: any, receiptToken: string | null, viewToken: string | null) => {
    setCreatedOrder(order);
    setReceiptAccessToken(receiptToken);
    setOrderViewToken(viewToken);
    setStep("success");
  };

  const handleNewOrder = () => {
    setCreatedOrder(null);
    setReceiptAccessToken(null);
    setOrderViewToken(null);
    resetOrder();
  };

  const [catalog, setCatalog] = useState<AvCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAvCatalog();
      setCatalog(data);
    } catch (err) {
      setError("Não foi possível carregar os modelos. Tente novamente.");
      toast.error("Erro ao carregar o catálogo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const activeModel = useMemo(() => {
    if (!catalog?.data?.models) return null;

    if (editingItemId) {
      const editingItem = items.find((i) => i.local_id === editingItemId);
      if (editingItem) {
        return catalog.data.models.find((m) => m.id === editingItem.shirt_model_id) || catalog.data.models[0];
      }
    }

    return catalog.data.models.find((m) => m.code === "TSHIRT-01") || catalog.data.models[0];
  }, [catalog, editingItemId, items]);

  const editingItem = useMemo(() => {
    return items.find((i) => i.local_id === editingItemId) || null;
  }, [items, editingItemId]);

  return (
    <div className="min-h-screen bg-navy text-white selection:bg-gold selection:text-navy">
      <div className="bg-black/80 text-[10px] font-mono p-4 border-b border-white/10 whitespace-pre-wrap overflow-x-hidden">
{`ETAPA 12.1-P15A — PUBLIC CHECKOUT UX FINAL AUDIT

MODO SOMENTE DIAGNÓSTICO.

NÃO alterar código.
NÃO editar arquivos.
NÃO alterar banco.
NÃO alterar RPC.
NÃO alterar secrets.
NÃO alterar Storage.
NÃO publicar.
NÃO escrever este relatório em comentários.
NÃO alterar src/routes/index.tsx.

==================================================
CONTEXTO ATUAL
==================================================

O checkout público principal está FUNCIONANDO em produção:

- criação do pedido = OK
- protocolo oficial = OK
- cliente = OK
- quantidade = OK
- total real = OK
- PIX = OK
- chave PIX = OK
- titular PIX = OK
- copiar chave = OK
- upload comprovante = OK
- comprovante recebido = OK
- payment_status → receipt_submitted = OK

BACKEND FUNCIONAL DEVE FICAR CONGELADO.

NÃO modificar:

src/routes/api/public/av-create-order.ts
src/routes/api/public/av-payment-info.ts
src/routes/api/public/av-payment-receipt.ts

NÃO modificar RPCs:

av_create_order
av_submit_payment_receipt

NÃO modificar:

av_payment_receipts
av_orders
av_order_items

==================================================
1. AUDITAR ORDER SUCCESS
==================================================

Inspecionar:

src/components/OrderSuccess.tsx

Verificar somente visual/texto/UX:

A) protocolo oficial aparece claramente
B) cliente aparece
C) total de peças aparece
D) total do pedido aparece
E) status do pedido está coerente
F) status do pagamento está coerente
G) PIX aparece somente quando aplicável
H) ReceiptUpload aparece somente quando aplicável
I) após receipt_submitted, interface comunica claramente:
   "Comprovante recebido"
   "Em análise"
J) não afirmar pagamento confirmado antes de conferência
K) não afirmar camisa garantida antes de confirmação do pagamento
L) não existir mensagem contraditória com payment_status

Reportar textos exatos problemáticos.

==================================================
2. PROCURAR MENSAGEM DE PAGAMENTO CONTRADITÓRIA
==================================================

Pesquisar no projeto por frases relacionadas a:

"aguardando a abertura do período de pagamentos"
"período de pagamentos"
"camisa garantida"
"pagamento confirmado"
"pedido garantido"
"reserva garantida"

Para cada ocorrência:

FILE:
LINE:
TEXT:
CONTEXT:
CURRENT STATUS:
CORRECT / MISLEADING / OUTDATED

Não alterar nada.

==================================================
3. AUDITAR ORDER PAYMENT
==================================================

Inspecionar:

src/components/OrderPayment.tsx

Confirmar:

PIX KEY:
renderiza corretamente

PIX HOLDER:
renderiza corretamente

PIX TYPE:
renderiza corretamente

TOTAL:
usa total real do pedido

COPY KEY:
funcional

COPY VALUE:
funcional

INSTRUÇÃO AO CLIENTE:
deixa claro que deve:
1. copiar a chave
2. pagar no banco
3. voltar à mesma página
4. enviar o comprovante

Verificar se essa instrução está visualmente legível no MOBILE.

==================================================
4. AUDITAR RECEIPT UPLOAD
==================================================

Inspecionar:

src/components/ReceiptUpload.tsx

Confirmar:

JPG:
SUPPORTED

PNG:
SUPPORTED

PDF:
SUPPORTED

10MB:
SUPPORTED

LOADING STATE:
PRESENT

DOUBLE CLICK PROTECTION:
PRESENT

SUCCESS STATE:
PRESENT

ERROR STATE:
PRESENT

Após sucesso, verificar se aparece claramente:

COMPROVANTE RECEBIDO
EM ANÁLISE

Verificar se ainda existe algum botão de upload indevido
após payment_status = receipt_submitted.

==================================================
5. AUDITAR TRANSIÇÃO DE STATUS NO FRONTEND
==================================================

Inspecionar como:

ReceiptUpload
→ onSuccess
→ OrderSuccess
→ state/local status

Verificar se após upload bem sucedido:

payment_status muda visualmente para receipt_submitted

sem reload.

Reportar:

STATUS UPDATE CALLBACK:
PASS / FAIL

SUCCESS UI AFTER RECEIPT:
PASS / FAIL

RELOAD REQUIRED:
YES / NO

==================================================
6. AUDITAR LINK SEGURO
==================================================

Inspecionar geração do link:

/order-view

Verificar somente:

handle usa display_order_number
token usa orderViewToken
não usa order_id público
não contém customer_name
não contém email
não contém WhatsApp

Não revelar token real.

Reportar:

ORDER VIEW HANDLE:
VALID / FAIL

PII IN URL:
NONE / FOUND

INTERNAL UUID IN URL:
NONE / FOUND

==================================================
7. MOBILE UX
==================================================

Revisar visualmente o fluxo para largura aproximada:

375 px
390 px
430 px

Verificar:

protocolo não corta
PIX não corta
CPF não corta
titular não corta
botões copiar utilizáveis
total visível
upload utilizável
preview do comprovante não estoura
textos não ficam ilegíveis
cards não geram overflow horizontal

Reportar problemas reais somente.

==================================================
8. ACESSIBILIDADE BÁSICA
==================================================

Verificar:

botões têm texto/aria-label adequado
inputs de arquivo são utilizáveis
feedback não depende somente de cor
contraste de textos importantes
focus após Pedido Recebido
loading possui feedback textual

Não alterar nada.

==================================================
9. CLASSIFICAR ACHADOS
==================================================

Para cada achado usar:

CRITICAL
HIGH
MEDIUM
LOW
COSMETIC

Não classificar como CRITICAL algo puramente visual.

Separar:

FUNCTIONAL
UX
COPY
ACCESSIBILITY
SECURITY

==================================================
10. NÃO TOCAR NO BACKEND
==================================================

Confirmar explicitamente:

CREATE ORDER BACKEND:
FROZEN

PIX BACKEND:
FROZEN

RECEIPT BACKEND:
FROZEN

DATABASE:
FROZEN

CAPABILITY TOKENS:
FROZEN

==================================================
11. SAÍDA
==================================================

Retornar:

ETAPA 12.1-P15A — PUBLIC CHECKOUT UX FINAL AUDIT

ORDER SUCCESS:
PASS / ISSUES

PAYMENT STATUS UX:
PASS / ISSUES

PIX UX:
PASS / ISSUES

RECEIPT UX:
PASS / ISSUES

STATUS TRANSITION:
PASS / ISSUES

ORDER VIEW LINK:
PASS / ISSUES

MOBILE:
PASS / ISSUES

ACCESSIBILITY:
PASS / ISSUES

CONTRADICTORY COPY FOUND:
YES / NO

ACHADOS:

01
SEVERITY:
CATEGORY:
FILE:
LINE:
CURRENT:
PROBLEM:
RECOMMENDED CHANGE:

02
...

BACKEND FROZEN:
YES / NO

DATABASE FROZEN:
YES / NO

FILES MODIFIED:
NONE

FINAL VERDICT:

A) PUBLIC CHECKOUT UX READY — NO CHANGES NEEDED
B) SMALL UX/COPY PATCH RECOMMENDED
C) FUNCTIONAL FRONTEND PATCH REQUIRED
D) SECURITY BLOCKER FOUND`}
      </div>
      <Header />

      <main>
        {currentStep === "idle" && (
          <>
            <HeroSection />
            <div id="camisa">
              <ModelsSection
                models={catalog?.data?.models || []}
                selectedModelId={null}
                onSelectModel={() => setStep("configurator")}
                eventInfo={catalog?.data?.event || ({} as any)}
              />
            </div>
            <HowItWorks />
            <FinalCTA />
          </>
        )}

        {currentStep === "configurator" && activeModel && catalog && (
          <OrderConfigurator
            selectedModel={activeModel}
            eventInfo={catalog.data.event}
            onAddItem={(item) => {
              addItem(item);
              setStep("summary");
            }}
            editingItem={editingItem}
            onUpdateItem={(localId, item) => {
              updateItem(localId, item);
              setEditingItemId(null);
              setStep("summary");
            }}
            onCancelEdit={() => {
              setEditingItemId(null);
              setStep("summary");
            }}
            onModelChange={() => {}}
          />
        )}

        {currentStep === "summary" && catalog && (
          <OrderItemsSummary
            items={items}
            eventInfo={catalog.data.event}
            onRemove={removeItem}
            onEdit={(localId) => {
              setEditingItemId(localId);
              setStep("configurator");
            }}
          />
        )}

        {currentStep === "summary" && items.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 pb-20 flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-16 rounded-2xl border-white/10 font-black uppercase tracking-widest"
              onClick={() => setStep("idle")}
            >
              Voltar
            </Button>
            <Button
              className="flex-[2] h-16 rounded-2xl bg-gold text-navy font-black uppercase tracking-widest hover:bg-gold/90"
              onClick={() => setStep("customer_data")}
            >
              Próximo Passo
            </Button>
          </div>
        )}

        {currentStep === "customer_data" && (
          <div className="max-w-xl mx-auto px-6 py-20 space-y-8">
            <CustomerDataForm data={customer} onChange={setCustomer} />
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-16 rounded-2xl border-white/10 font-black uppercase tracking-widest"
                onClick={() => setStep("summary")}
              >
                Voltar
              </Button>
              <Button
                className="flex-[2] h-16 rounded-2xl bg-gold text-navy font-black uppercase tracking-widest hover:bg-gold/90"
                disabled={!customer.name || !customer.whatsapp || !customer.email}
                onClick={() => setStep("review")}
              >
                Revisar Pedido
              </Button>
            </div>
          </div>
        )}

        {currentStep === "review" && catalog && (
          <OrderReview
            customer={customer}
            items={items}
            eventInfo={catalog.data.event}
            onBack={() => setStep("customer_data")}
            onSuccess={handleSuccess}
          />
        )}

        {currentStep === "success" && createdOrder && catalog && (
          <OrderSuccess
            order={createdOrder}
            catalog={catalog.data}
            localItems={items}
            receiptAccessToken={receiptAccessToken}
            orderViewToken={orderViewToken}
            onNewOrder={handleNewOrder}
          />
        )}
      </main>

      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
