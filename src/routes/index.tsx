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
      {/* RECUPERAÇÃO EXATA DO PROJETO — RESTAURAR B4B

Quero interromper todas as alterações posteriores e RESTAURAR EXATAMENTE a versão do projeto correspondente ao ponto identificado no histórico como:

B4B

Referência da conversa/desenvolvimento:

“Pode publicar a B4B.”

ESTE É O PONTO EXATO QUE DEVE SER RECUPERADO.

Não quero uma reconstrução aproximada.
Não quero corrigir a versão atual.
Não quero combinar B4B com funcionalidades posteriores.
Não quero redesign.

Quero o projeto exatamente como estava na B4B.

---

1. LOCALIZAR B4B NO HISTÓRICO

Utilize o histórico real do projeto:

* version history;
* Git history;
* commits;
* snapshots/checkpoints;
* histórico interno do Lovable.

Localize a versão correspondente ao momento em que a B4B estava concluída e pronta para publicação.

A referência é:

“Pode publicar a B4B.”

Não utilizar ETAPA 15.1, 15.2, 15.3, 15.4, 16.1 ou qualquer versão posterior como base.

A BASE CORRETA É B4B.

---

2. CRIAR BACKUP ANTES

Antes de restaurar:

crie um snapshot/branch de segurança do estado atual.

Exemplo:

backup-before-b4b-restore

Isso serve somente para segurança.

Depois prossiga com a restauração.

---

3. RESTAURAÇÃO DEVE SER EXATA

Restaure os arquivos da aplicação para o estado exato da B4B.

Não tente reproduzir visualmente a B4B usando o código atual.

Não faça alterações manuais para “deixar parecido”.

Utilize o snapshot/revisão real daquela versão.

Queremos recuperar:

* layout;
* hero;
* textos;
* frase inicial;
* posicionamento dos elementos;
* apresentação das camisas;
* formulário;
* navegação;
* identidade visual;
* componentes;
* comportamento da página;

EXATAMENTE como estavam na B4B.

---

4. NÃO PRESERVAR FUNCIONALIDADES POSTERIORES

Não misture a B4B com recursos criados depois dela.

Se uma funcionalidade NÃO EXISTIA na B4B:

não deve permanecer apenas porque foi adicionada posteriormente.

Isso inclui qualquer alteração posterior em:

* prévia de personalização;
* revisão redesenhada;
* sticky;
* novos layouts;
* reorganização de OrderConfigurator;
* mudanças posteriores na ModelsSection;
* alterações de UX;
* novos componentes visuais;
* mudanças estruturais.

PRIORIDADE:

FIDELIDADE TOTAL À B4B.

---

5. BANCO E DADOS

NÃO fazer rollback destrutivo do banco de dados.

NÃO apagar pedidos.

NÃO excluir tabelas.

NÃO alterar secrets.

NÃO alterar configurações de produção.

NÃO executar migrations de rollback automaticamente.

Neste momento, restaurar prioritariamente o CÓDIGO/FRONTEND/APLICAÇÃO para a B4B.

Se a versão B4B exigir alguma configuração específica incompatível com o banco atual:

NÃO improvisar.

Informe no relatório antes de alterar banco ou infraestrutura.

---

6. NÃO FAZER NOVAS MELHORIAS

Durante a restauração:

NÃO melhorar design.

NÃO modernizar componentes.

NÃO alterar cores.

NÃO alterar textos.

NÃO alterar espaçamentos.

NÃO adicionar funcionalidades.

NÃO corrigir coisas que não impeçam a B4B de funcionar.

NÃO adaptar para as etapas posteriores.

A B4B já estava aprovada.

Queremos aquela versão.

---

7. APÓS RESTAURAR

Executar:

TypeScript/typecheck

Build

Abrir a aplicação restaurada e conferir visualmente.

Confirmar que a página voltou a corresponder à B4B.

---

8. TESTAR SEM REDESENHAR

Verificar apenas se:

* página inicial abre;
* hero original aparece;
* frase original aparece;
* produtos/modelos aparecem como na B4B;
* seleção funciona;
* formulário funciona;
* navegação funciona;
* não existem erros críticos de console.

Se algum problema funcional ocorrer por incompatibilidade com configuração atual:

NÃO iniciar refatoração.

Documentar o problema.

---

9. PUBLICAÇÃO

Depois de restaurar com sucesso e confirmar:

TYPECHECK: PASS
BUILD: PASS

publique a B4B restaurada no mesmo ambiente de produção.

Não publique nenhuma versão híbrida.

A versão publicada deve corresponder ao snapshot B4B recuperado.

---

10. RELATÓRIO FINAL

Informar:

B4B SNAPSHOT FOUND:
YES / NO

IDENTIFICADOR DA VERSÃO:
commit/snapshot/version identificado

BACKUP DO ESTADO ATUAL:
CREATED / NOT CREATED

B4B RESTORED:
YES / NO

TYPECHECK:
PASS / FAIL

BUILD:
PASS / FAIL

HERO B4B:
RESTORED / FAIL

TEXTO/FRASE INICIAL B4B:
RESTORED / FAIL

LAYOUT B4B:
RESTORED / FAIL

PRODUTOS/MODELOS B4B:
RESTORED / FAIL

ORDER FLOW B4B:
PASS / FAIL

PRODUCTION DEPLOY:
SUCCESS / FAIL / NOT EXECUTED

DATABASE MODIFIED:
NO

SECRETS MODIFIED:
NO

MIGRATIONS EXECUTED:
NO

ALTERAÇÕES POSTERIORES MANTIDAS:
NONE

FINAL STATUS:

B4B FULLY RESTORED

ou

B4B RESTORE INCOMPLETE

PARE APÓS RESTAURAR E PUBLICAR A B4B.

NÃO CONTINUE DESENVOLVENDO. */}

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


