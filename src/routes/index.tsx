ETAPA 13.1 — CADASTRAR IMAGEM REAL DA PRIMEIRA REGATA OFICIAL

OBJETIVO:
Substituir o placeholder/mockup do primeiro modelo da categoria REGATA pela imagem real que estou anexando neste comando.

IMPORTANTE:
Esta etapa é exclusivamente visual e de catálogo.

NÃO alterar:

* fluxo de criação de pedidos;
* create-order;
* RPC av_create_order;
* Supabase;
* políticas RLS;
* idempotência;
* Turnstile;
* CORS;
* rate limit;
* pagamento;
* upload de comprovante;
* autenticação;
* painel administrativo;
* valores dos produtos;
* tamanhos;
* personalização;
* estrutura atual do formulário.

---

1. MODELO

Utilizar a imagem anexada como imagem oficial do PRIMEIRO MODELO DA CATEGORIA REGATA.

Nome de exibição:

REGATA OFICIAL — MODELO 01

Categoria:

REGATA

Preço:
Manter o preço atualmente configurado no evento/banco.

---

2. IMAGEM

A imagem possui:

* frente da regata;
* costas da regata;
* identidade visual azul, amarelo e branco;
* logo Amigos do Vôlei;
* exemplo de personalização com nome e número.

Não recriar a arte.

Não gerar uma nova camisa.

Não modificar cores, logos ou layout.

Usar exatamente a imagem anexada como imagem comercial do produto.

---

3. MODELSSECTION

No card correspondente ao primeiro modelo de Regata:

Substituir o placeholder atual pela nova imagem.

A imagem deverá:

* preencher bem a área disponível;
* manter proporção original;
* usar object-contain;
* não sofrer cortes;
* ficar centralizada;
* possuir boa visualização em desktop e mobile;
* não distorcer a camisa.

Manter o mesmo padrão visual dos demais cards.

---

4. VISUALIZAÇÃO AMPLIADA

Ao tocar/clicar na imagem do modelo, permitir uma visualização maior.

Pode utilizar modal/lightbox.

A visualização ampliada deve:

* mostrar a imagem completa;
* preservar proporção;
* permitir fechar facilmente;
* funcionar corretamente no celular;
* não interferir na seleção do modelo.

---

5. SELEÇÃO DO MODELO

Ao selecionar esta Regata:

* manter o funcionamento atual do OrderConfigurator;
* carregar corretamente o ID real do modelo;
* manter preço vindo do catálogo/evento;
* permitir tamanho;
* quantidade;
* nome personalizado;
* número personalizado.

A troca da imagem NÃO pode criar um novo modelo fictício no frontend caso já exista um registro correspondente no catálogo.

Utilizar o modelo real retornado pelo fetchAvCatalog.

---

6. RESPONSIVIDADE

Validar especialmente:

375px
390px
430px
768px
Desktop

A imagem deve permanecer nítida, centralizada e sem overflow.

---

7. PREPARAÇÃO PARA OS PRÓXIMOS MODELOS

Não implementar ainda o 360°.

Porém, manter a arquitetura preparada para posteriormente suportar:

front_image_url
back_image_url
gallery_images
model_3d_url

Nesta etapa utilizaremos apenas a imagem comercial anexada.

---

8. REGRA DE SEGURANÇA DA ALTERAÇÃO

Faça a menor alteração possível.

Não realizar refatorações desnecessárias.

Não alterar componentes que não sejam necessários para exibir esta imagem.

Não modificar nenhuma funcionalidade já validada.

---

AO FINAL, INFORME:

1. arquivos modificados;
2. qual modelo do catálogo recebeu a imagem;
3. onde a imagem foi armazenada/utilizada;
4. se ModelsSection foi atualizado;
5. se OrderConfigurator continua utilizando o ID real do catálogo;
6. resultado do TypeScript/typecheck;
7. resultado do build;
8. confirmação de que nenhuma lógica de pedido/pagamento/backend foi alterada.

Não avance para o próximo modelo.
Pare após concluir esta etapa.
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
  const [orderViewExpiresAt, setOrderViewExpiresAt] = useState<number | null>(null);

  const handleSuccess = (order: any, receiptToken: string | null, viewToken: string | null, viewExpiresAt: number | null) => {
    setCreatedOrder(order);
    setReceiptAccessToken(receiptToken);
    setOrderViewToken(viewToken);
    setOrderViewExpiresAt(viewExpiresAt);
    setStep("success");
  };

  const handleNewOrder = () => {
    setCreatedOrder(null);
    setReceiptAccessToken(null);
    setOrderViewToken(null);
    setOrderViewExpiresAt(null);
    resetOrder();
  };

  const [catalog, setCatalog] = useState<AvCatalogResponse | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
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
    if (!catalog?.data?.models || catalog.data.models.length === 0) return null;

    if (editingItemId) {
      const editingItem = items.find((i) => i.local_id === editingItemId);
      if (editingItem) {
        return catalog.data.models.find((m) => m.id === editingItem.shirt_model_id) || catalog.data.models[0];
      }
    }

    if (selectedModelId) {
      const selected = catalog.data.models.find((m) => m.id === selectedModelId);
      if (selected) return selected;
    }

    return catalog.data.models[0] || null;
  }, [catalog, editingItemId, items, selectedModelId]);

  const editingItem = useMemo(() => {
    return items.find((i) => i.local_id === editingItemId) || null;
  }, [items, editingItemId]);

  return (
    <div className="min-h-screen bg-navy text-white selection:bg-gold selection:text-navy">
      <Header />

      <main>
        {currentStep === "idle" && (
          <>
            <HeroSection />
            <div id="camisa">
              <ModelsSection
                models={catalog?.data?.models || []}
                selectedModelId={selectedModelId}
                onSelectModel={(model) => {
                  setSelectedModelId(model.id);
                  setEditingItemId(null);
                  setStep("configurator");
                }}
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
            isMultiModel={catalog.data.models.length > 1}
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
            isMultiModel={catalog.data.models.length > 1}
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
            isMultiModel={catalog.data.models.length > 1}
          />
        )}

        {currentStep === "success" && createdOrder && catalog && (
          <OrderSuccess
            order={createdOrder}
            catalog={catalog.data}
            localItems={items}
            receiptAccessToken={receiptAccessToken}
            orderViewToken={orderViewToken}
            orderViewExpiresAt={orderViewExpiresAt}
            onNewOrder={handleNewOrder}
          />
        )}
      </main>

      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
