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
      <div className="bg-black/80 text-[10px] font-mono p-4 border-b border-gold/20 whitespace-pre-wrap break-words overflow-hidden pointer-events-none select-none text-gold/40">
        ETAPA 12.1-P16A1 — ORDER VIEW REAL SCHEMA FIX

        CORREÇÃO ESTRITAMENTE LOCALIZADA.

        OBJETIVO:
        Fazer /order-view consultar o schema REAL do banco,
        preservando integralmente a capability HMAC existente.

        NÃO alterar criação de pedido nesta etapa.
        NÃO alterar receipt upload.
        NÃO alterar PIX.
        NÃO alterar banco.
        NÃO criar migrations.
        NÃO alterar RPCs.
        NÃO alterar capability helper.
        NÃO publicar automaticamente.
        NÃO inserir relatório no código.

        ==================================================
        SCHEMA REAL COMPROVADO
        ==================================================

        public.av_orders possui:

        id
        order_seq
        event_id
        customer_name
        whatsapp
        notes
        order_status
        payment_status
        subtotal
        total_amount
        created_at
        updated_at
        idempotency_key
        request_fingerprint
        customer_email

        NÃO possui:

        display_order_number
        total_quantity

        public.av_order_items possui:

        id
        event_id
        order_id
        shirt_model_id
        model_code
        model_name
        shirt_type
        size_option
        custom_size
        custom_name
        custom_number
        quantity
        unit_price
        line_total
        created_at

        NÃO possui:

        display_order_number

        ==================================================
        ARQUIVOS PERMITIDOS
        ==================================================

        Modificar SOMENTE:

        src/routes/api/public/av-order-view.ts
        src/routes/order-view.tsx

        Se qualquer outro arquivo precisar ser alterado:
        PARAR e informar.

        ==================================================
        1. PRESERVAR CAPABILITY SECURITY
        ==================================================

        MANTER exatamente o fluxo existente:

        handle
        token
        expires

        e:

        verifyOrderViewToken(
          handle,
          expiresAt,
          token,
          secret
        )

        NÃO alterar:

        src/lib/server/av-order-access.server.ts

        NÃO alterar formato do HMAC.

        NÃO remover expires.

        NÃO enfraquecer expiração.

        Validar token ANTES de consultar dados do pedido.

        ==================================================
        2. VALIDAR HANDLE
        ==================================================

        Após validar a capability HMAC, validar o handle público.

        Formato esperado:

        AV-YYYY-SEQUENCE

        Exemplos:

        AV-2026-0001
        AV-2026-0014
        AV-2026-10000

        Usar validação estrita equivalente a:

        ^AV-(\d{4})-(\d+)$

        Extrair:

        eventYear
        orderSeq

        Validar:

        eventYear = inteiro válido
        orderSeq = inteiro seguro > 0

        Handle inválido:

        400 INVALID_HANDLE

        Não consultar banco com handle inválido.

        ==================================================
        3. CORRIGIR BUSCA DO PEDIDO
        ==================================================

        REMOVER qualquer consulta a:

        av_orders.display_order_number

        porque essa coluna NÃO existe.

        REMOVER qualquer tentativa de selecionar:

        av_orders.total_quantity

        porque essa coluna NÃO existe.

        Buscar internamente o pedido usando:

        order_seq

        e confirmar que o evento relacionado corresponde
        ao eventYear extraído do handle.

        A consulta server-side pode selecionar internamente:

        id
        order_seq
        total_amount
        order_status
        payment_status

        e relação segura:

        event:av_events(
          event_name,
          event_year
        )

        IMPORTANTE:

        id pode ser usado INTERNAMENTE para buscar os itens,
        mas NÃO pode aparecer na resposta pública.

        Se houver mais de um candidato para order_seq,
        selecionar somente aquele cujo event.event_year
        corresponde ao ano contido no handle.

        Se nenhum corresponder:

        404 ORDER_NOT_FOUND

        NÃO retornar customer_name.
        NÃO retornar whatsapp.
        NÃO retornar customer_email.
        NÃO retornar notes.
        NÃO retornar event_id.
        NÃO retornar request_fingerprint.
        NÃO retornar idempotency_key.

        ==================================================
        4. BUSCAR ITENS PELO order_id
        ==================================================

        Hoje existe consulta incorreta equivalente a:

        .eq('display_order_number', handle)

        em av_order_items.

        REMOVER.

        Usar:

        .eq('order_id', internalOrderId)

        Selecionar somente:

        model_name
        shirt_type
        size_option
        custom_size
        custom_name
        custom_number
        quantity

        O internalOrderId deve permanecer SOMENTE no servidor.

        Nunca retornar order_id para o navegador.

        ==================================================
        5. NÃO IGNORAR itemsError
        ==================================================

        Hoje itemsError pode ocorrer e o endpoint ainda retorna:

        items: []

        Isso mascara falha de banco.

        Corrigir.

        Se itemsError:

        log server-side sanitizado com correlationId

        e retornar:

        HTTP 500
        {
          error: "INTERNAL_ERROR",
          correlation_id
        }

        NÃO retornar mensagem SQL ao navegador.

        ==================================================
        6. CALCULAR total_quantity SERVER-SIDE
        ==================================================

        Como av_orders NÃO possui total_quantity:

        derivar após carregar os itens:

        totalQuantity =
          soma de item.quantity

        Validar que cada quantity é número inteiro >= 0.

        Se houver estrutura inesperada:

        500 INTERNAL_ERROR

        ==================================================
        7. CONTRATO PÚBLICO FINAL
        ==================================================

        A resposta pública de sucesso deve conter SOMENTE algo equivalente a:

        {
          success: true,
          order: {
            display_order_number: handle,
            total_quantity: calculatedTotalQuantity,
            total_amount: order.total_amount,
            order_status: order.order_status,
            payment_status: order.payment_status,
            event: {
              event_name: ...
            },
            items: [
              {
                model_name,
                shirt_type,
                size_option,
                custom_size,
                custom_name,
                custom_number,
                quantity
              }
            ]
          },
          correlation_id
        }

        NUNCA incluir:

        id
        order_id
        event_id
        customer_name
        customer_email
        whatsapp
        notes
        request_fingerprint
        idempotency_key
        receipt_access_token
        order_view_token
        storage_path
        hash
        secrets

        ==================================================
        8. ORDER VIEW FRONTEND — PAYMENT STATUS
        ==================================================

        Em:

        src/routes/order-view.tsx

        REMOVER lógica baseada em:

        payment_status === 'paid'

        Esse NÃO é um status oficial.

        Usar os estados reais:

        awaiting_payment
        receipt_submitted
        payment_confirmed
        receipt_rejected

        Criar mapeamento explícito.

        awaiting_payment:
        label = "AGUARDANDO PAGAMENTO"
        estilo = amber

        receipt_submitted:
        label = "COMPROVANTE EM ANÁLISE"
        estilo = amber/gold

        payment_confirmed:
        label = "PAGAMENTO CONFIRMADO"
        estilo = emerald/green

        receipt_rejected:
        label = "COMPROVANTE NÃO APROVADO"
        estilo = rose/red

        Não afirmar pagamento confirmado para
        receipt_submitted.

        ==================================================
        9. SAUDAÇÃO SEM PII
        ==================================================

        Preservar a política atual:

        NÃO usar customer_name.

        Substituir a frase visual:

        "Olá, seu pedido está..."

        por algo neutro:

        "Seu pedido está em nossa base e sendo processado conforme o cronograma oficial."

        Nenhuma PII deve ser necessária.

        ==================================================
        10. REACT QUERY
        ==================================================

        Hoje a query depende de:

        handle
        token
        expires

        Portanto alterar queryKey para incluir os três:

        [
          'public-order-view',
          handle,
          token,
          expires
        ]

        Isso evita reutilização indevida de cache entre
        capabilities diferentes.

        Não persistir token em localStorage.

        ==================================================
        11. TAMANHO OUTRO
        ==================================================

        Como custom_size existe no schema e é seguro para
        o resumo do próprio pedido:

        quando:

        size_option === "OUTRO"

        e custom_size existir,

        mostrar o custom_size real ao usuário.

        Caso contrário mostrar size_option.

        Não alterar valores no banco.

        ==================================================
        12. PRIVACIDADE
        ==================================================

        Confirmar na resposta pública:

        CUSTOMER NAME:
        ABSENT

        EMAIL:
        ABSENT

        WHATSAPP:
        ABSENT

        INTERNAL ORDER UUID:
        ABSENT

        EVENT UUID:
        ABSENT

        RECEIPT TOKEN:
        ABSENT

        ORDER VIEW TOKEN:
        ABSENT

        ==================================================
        13. NÃO IMPLEMENTAR REUPLOAD
        ==================================================

        NÃO permitir upload de novo comprovante pelo
        /order-view nesta etapa.

        O order-view possui somente capability de leitura.

        Não misturar:

        order-view capability

        com:

        receipt-upload capability.

        ==================================================
        14. TYPECHECK / BUILD
        ==================================================

        Executar:

        TYPECHECK
        BUILD

        Esperado:

        TYPECHECK: PASS
        BUILD: PASS

        ==================================================
        15. ARQUIVOS MODIFICADOS
        ==================================================

        EXATAMENTE:

        src/routes/api/public/av-order-view.ts
        src/routes/order-view.tsx

        Nenhum outro arquivo.

        NÃO modificar:

        src/routes/index.tsx
        src/components/OrderSuccess.tsx
        src/components/OrderReview.tsx
        src/lib/av-order-client.ts
        src/routes/api/public/av-create-order.ts
        src/lib/server/av-order-access.server.ts

        ==================================================
        16. NÃO PUBLICAR
        ==================================================

        NÃO publicar automaticamente.

        ==================================================
        17. RESPOSTA
        ==================================================

        RESPONDER SOMENTE NO CHAT DO LOVABLE.

        NÃO renderizar este relatório.
        NÃO inserir comentário de auditoria.

        Retornar somente:

        P16A1 — ORDER VIEW REAL SCHEMA FIX

        HANDLE PARSER:
        PASS / FAIL

        CAPABILITY VERIFICATION:
        PRESERVED / FAIL

        AV_ORDERS INVALID COLUMNS:
        REMOVED / FAIL

        ORDER LOOKUP:
        order_seq + event_year / FAIL

        ITEM LOOKUP:
        order_id / FAIL

        ITEMS ERROR HANDLING:
        FAIL-CLOSED / FAIL

        TOTAL QUANTITY:
        DERIVED FROM ITEMS / FAIL

        PAYMENT_CONFIRMED:
        SUPPORTED / FAIL

        RECEIPT_SUBMITTED:
        SUPPORTED / FAIL

        RECEIPT_REJECTED:
        SUPPORTED / FAIL

        PUBLIC PII:
        NONE / FOUND

        INTERNAL UUID PUBLIC:
        NONE / FOUND

        QUERY KEY:
        HANDLE + TOKEN + EXPIRES / FAIL

        DATABASE:
        UNTOUCHED / FAIL

        RPC:
        UNTOUCHED / FAIL

        CAPABILITY HELPER:
        UNTOUCHED / FAIL

        TYPECHECK:
        PASS / FAIL

        BUILD:
        PASS / FAIL

        FILES MODIFIED:
        [...]

        FINAL VERDICT:

        A) READY FOR CODE REVIEW
        B) INCOMPLETE
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
