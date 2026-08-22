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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/134e51cc-4df3-4151-ab64-d073785a4be6/camisa_oficial_frente.png",
      },
      {
        name: "twitter:image",
        content:
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/134e51cc-4df3-4151-ab64-d073785a4be6/camisa_oficial_frente.png",
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
  
  // Modal de Revisão
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const handleSuccess = (order: any, receiptToken: string | null, viewToken: string | null, viewExpiresAt: number | null) => {
    setCreatedOrder(order);
    setReceiptAccessToken(receiptToken);
    setOrderViewToken(viewToken);
    setOrderViewExpiresAt(viewExpiresAt);
    setIsReviewOpen(false);
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
      {/* CORREÇÃO PRIORITÁRIA — RECUPERAR ELEMENTOS VISUAIS DA LANDING PAGE

O projeto sofreu alterações recentes e elementos importantes que já existiam e estavam aprovados desapareceram da página.

NÃO quero um novo design.

NÃO quero uma nova estrutura.

Quero recuperar a landing page que já estávamos desenvolvendo e continuar a partir dela.

---

OBJETIVO IMEDIATO

Recuperar na página pública:

1. A apresentação inicial/hero que existia anteriormente;
2. A frase principal que aparecia no início da página;
3. A área onde o visitante conseguia visualizar as camisas;
4. A CAMISA OFICIAL;
5. A REGATA OFICIAL.

Esses elementos precisam voltar a ficar VISÍVEIS na landing page.

---

1. USE O HISTÓRICO DO PROJETO

Verifique o histórico Git/versões anteriores do projeto e identifique a última versão em que:

* o hero inicial estava correto;
* a frase principal aparecia no topo;
* as camisas apareciam visualmente na página;
* o layout estava seguindo a identidade visual do torneio.

Use essa versão APENAS como referência visual.

NÃO faça rollback completo.

Recupere somente os elementos que desapareceram.

---

2. NÃO INVENTAR A FRASE

A frase/texto que existia no início da landing page deve ser recuperada do histórico.

NÃO criar uma frase nova.

NÃO reescrever o conteúdo.

NÃO substituir por texto genérico.

Restaurar o texto que já existia na versão anterior aprovada.

---

3. CAMISAS DEVEM VOLTAR A APARECER

A landing page precisa novamente mostrar claramente os dois produtos oficiais:

CAMISA OFICIAL — TSHIRT-01

REGATA OFICIAL — TANK-01

O visitante deve conseguir visualizar os produtos ANTES de começar a configurar o pedido.

Não deixar as camisas escondidas somente dentro do formulário/configurador.

---

4. IMAGENS OFICIAIS

Utilizar os assets atuais já aprovados.

CAMISA OFICIAL:

front_image_url
back_image_url

REGATA OFICIAL:

front_image_url
back_image_url

No card/vitrine principal utilizar a imagem da FRENTE.

Não voltar para imagens antigas ou placeholders.

---

5. VITRINE DOS MODELOS

Restaurar a seção visual onde o usuário vê os uniformes.

Ela deve apresentar claramente:

CAMISA OFICIAL

REGATA OFICIAL

com suas respectivas imagens.

O visitante deve entender imediatamente:

"Esses são os modelos disponíveis para o 9º Torneio."

---

6. INTERAÇÃO JÁ EXISTENTE

Preservar as funcionalidades que já estão funcionando:

* abrir imagem;
* Frente / Costas;
* lightbox;
* zoom 2.5x;
* swipe;
* drag;
* reset do zoom;
* abertura pela Frente.

NÃO remover essas funções.

---

7. FLUXO PRINCIPAL

A experiência da página deve voltar a ser simples:

ENTRAR NA LANDING PAGE

↓

VER APRESENTAÇÃO DO 9º TORNEIO

↓

VER CAMISA OFICIAL E REGATA OFICIAL

↓

ESCOLHER MODELO

↓

ESCOLHER TAMANHO

↓

INFORMAR NOME E NÚMERO

↓

QUANTIDADE

↓

ADICIONAR AO PEDIDO

↓

REVISAR

↓

FINALIZAR

Esse é o foco do projeto.

---

8. NÃO ESCONDER OS MODELOS

Verificar se alguma alteração recente em:

ModelsSection
OrderConfigurator
index.tsx
condicionais de renderização
tabs
estado do fluxo

passou a esconder a vitrine de modelos.

Corrigir somente o necessário para que ela volte a aparecer.

---

9. PRESERVAR O QUE ESTÁ FUNCIONANDO

NÃO alterar:

* banco de dados;
* IDs;
* catálogo;
* TSHIRT-01;
* TANK-01;
* múltiplos itens;
* carrinho;
* nome;
* número;
* tamanho;
* quantidade;
* revisão;
* cálculo;
* PIX;
* comprovante;
* create-order;
* av_create_order;
* RPC;
* RLS;
* Turnstile;
* CORS;
* rate limit;
* idempotência.

---

10. NÃO FAZER REDESIGN

NÃO:

* criar sidebar;
* criar dashboard;
* trocar a estrutura geral;
* trocar paleta;
* mudar toda a tipografia;
* criar novas seções;
* remover seções antigas aprovadas;
* reorganizar a página inteira;
* adicionar novas funcionalidades.

O objetivo é RECUPERAR.

Não redesenhar.

---

11. RESPONSIVIDADE

Após restaurar os elementos, validar:

375px
390px
430px
768px
1024px
1440px

As duas camisas precisam estar visíveis e bem apresentadas principalmente no celular.

---

12. TESTE O FLUXO

Após a correção:

Abrir a página inicial.

Confirmar que aparece o hero/frase inicial.

Descer a página.

Confirmar que aparecem:

CAMISA OFICIAL
REGATA OFICIAL

Abrir CAMISA.

Testar Frente/Costas.

Fechar.

Abrir REGATA.

Testar Frente/Costas.

Selecionar um modelo.

Confirmar que o configurador continua funcionando.

---

13. ALTERAÇÃO MÍNIMA

Antes de alterar código:

identifique exatamente POR QUE os elementos desapareceram.

Faça a menor correção possível.

Não reescreva componentes inteiros se não for necessário.

---

14. TESTES

Executar:

TypeScript/typecheck
Build

Verificar console.

---

RELATÓRIO FINAL

Informe:

1. por que a frase inicial havia desaparecido;
2. por que as camisas haviam desaparecido;
3. qual versão/histórico foi usado como referência;
4. quais arquivos foram modificados;
5. confirmação de que a frase original foi restaurada;
6. confirmação de que CAMISA OFICIAL está visível;
7. confirmação de que REGATA OFICIAL está visível;
8. confirmação de que as imagens atuais foram preservadas;
9. confirmação de Frente/Costas;
10. confirmação de zoom;
11. confirmação de swipe;
12. confirmação de seleção dos produtos;
13. resultado mobile;
14. resultado desktop;
15. TypeScript/typecheck;
16. Build;
17. erros de console;
18. confirmação de que o fluxo de pedido permaneceu intacto;
19. confirmação de que backend e segurança não foram alterados.

IMPORTANTE:

A prioridade desta correção é fazer a landing page VOLTAR A PARECER UMA LANDING PAGE DE PEDIDOS DE CAMISETAS DO TORNEIO.

Não iniciar nenhuma outra melhoria.

Pare após restaurar esses elementos. */}

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
                onClick={() => setIsReviewOpen(true)}
              >
                Revisar Pedido
              </Button>
            </div>

            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-navy border-white/10 p-0 rounded-[32px]">
                <DialogHeader className="p-8 pb-0">
                  <DialogTitle className="sr-only">Revisão do Pedido</DialogTitle>
                </DialogHeader>
                {catalog && (
                  <div className="pb-8">
                    <OrderReview
                      customer={customer}
                      items={items}
                      eventInfo={catalog.data.event}
                      catalogModels={catalog.data.models}
                      onBack={() => setIsReviewOpen(false)}
                      onSuccess={handleSuccess}
                      isMultiModel={catalog.data.models.length > 1}
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
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


