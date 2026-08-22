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
      {/* ETAPA 15.5 — RESTAURAÇÃO VISUAL CONTROLADA DO LAYOUT APROVADO

IMPORTANTE — CORREÇÃO DE DIREÇÃO DO PROJETO

As ETAPAS 15.2 e 15.3 introduziram alterações de UX que modificaram excessivamente o layout visual da landing page.

O objetivo original NÃO era redesenhar a página.

Precisamos restaurar a aparência, organização, proporções e hierarquia visual que existiam AO FINAL DA ETAPA 15.1.

IMPORTANTE:

NÃO fazer rollback geral do projeto.

NÃO perder funcionalidades técnicas já aprovadas.

NÃO alterar backend.

A correção deve ser exclusivamente visual/estrutural no frontend.

---

1. BASE VISUAL DE REFERÊNCIA

Utilizar como referência o estado visual da aplicação existente AO FINAL DA ETAPA 15.1.

Ou seja:

ANTES das alterações visuais introduzidas pelas ETAPAS:

15.2 — Prévia ao Vivo da Personalização

15.3 — Revisão Visual do Pedido

Se houver histórico Git/local disponível:

comparar os diffs dessas etapas para identificar exatamente quais mudanças alteraram o layout.

NÃO restaurar cegamente arquivos inteiros se isso apagar funcionalidades posteriores importantes.

Fazer uma restauração controlada.

---

2. OBJETIVO VISUAL

A landing page deve voltar a ter:

* aparência original;
* mesma organização das seções;
* mesma hierarquia;
* mesmos espaçamentos;
* mesmas proporções;
* mesma identidade visual;
* fluxo simples;
* foco principal nos modelos de uniforme e no pedido.

NÃO criar um novo design.

NÃO modernizar novamente.

NÃO reinterpretar o layout.

Restaurar o visual que já estava aprovado.

---

3. REMOVER A ALTERAÇÃO VISUAL DA ETAPA 15.2

A ETAPA 15.2 adicionou uma grande:

"PRÉVIA DA PERSONALIZAÇÃO"

com layout lateral/sticky.

Essa implementação alterou demasiadamente a composição da página.

REMOVER essa prévia do layout principal.

Remover especialmente:

* painel lateral grande;
* sticky da prévia;
* divisão `lg:flex-row` criada especificamente para a prévia;
* bloco visual "Future Arena";
* qualquer espaço adicional criado exclusivamente para essa função.

Os campos existentes de:

NOME

NÚMERO

devem continuar funcionando normalmente.

NÃO remover os campos.

NÃO alterar seus estados.

NÃO alterar os dados enviados ao pedido.

---

4. PRÉVIA DE PERSONALIZAÇÃO

Nesta etapa NÃO precisamos manter uma prévia visual permanente.

Portanto:

pode remover a interface visual adicionada na ETAPA 15.2.

IMPORTANTE:

Não alterar:

customName
customNumber

Nem a lógica real de personalização.

Remover somente a camada visual adicional que mudou o layout.

---

5. ETAPA 15.3 — REVISÃO DO PEDIDO

A revisão é útil, mas NÃO deve redesenhar a landing page nem ocupar uma nova grande área permanente.

Manter a funcionalidade de revisão SOMENTE se puder funcionar de maneira discreta.

Preferência:

usar um MODAL / DIALOG / SHEET ao clicar no botão final de revisão/continuação.

A revisão NÃO deve se tornar uma grande seção permanente da landing page.

---

6. COMPORTAMENTO DA REVISÃO

Fluxo desejado:

Usuário preenche normalmente o pedido no layout original.

Ao chegar ao momento de finalizar:

clicar no botão correspondente.

Abrir uma revisão compacta em modal/dialog.

Mostrar:

* modelo;
* tamanho;
* nome;
* número;
* quantidade;
* valores;
* total.

Ações:

VOLTAR E EDITAR

CONFIRMAR PEDIDO

Assim preservamos a funcionalidade sem alterar a estrutura principal da página.

---

7. SE A REVISÃO JÁ FOR UMA ETAPA SEPARADA

Se atualmente `OrderReview` alterou significativamente a navegação principal:

converter sua apresentação para modal/dialog sem reescrever o motor.

Reutilizar:

OrderReview
OrderItemsSummary

quando possível.

Não duplicar componentes.

Não recriar lógica de cálculo.

---

8. PRESERVAR TOTALMENTE — MODELOS OFICIAIS

Continuar exibindo EXATAMENTE:

CAMISA OFICIAL — TSHIRT-01

REGATA OFICIAL — TANK-01

Não alterar catálogo.

Não reativar outros produtos.

---

9. PRESERVAR TOTALMENTE — ASSETS

NÃO alterar:

camisa_oficial_frente.png
camisa_oficial_costas.png
regata_oficial_frente.png
regata_oficial_costas.png

Preservar:

front_image_url
back_image_url

---

10. PRESERVAR TOTALMENTE — GALERIA

Manter tudo que estava aprovado até a ETAPA 15.1:

* Frente / Costas;
* lightbox;
* zoom 2.5x;
* reset de zoom;
* swipe mobile;
* drag;
* threshold de 60px;
* indicador discreto mobile;
* abertura sempre pela Frente.

NÃO modificar `ModelsSection` sem necessidade concreta.

---

11. PRESERVAR PERSONALIZAÇÃO REAL

Os campos:

Nome personalizado
Número personalizado

devem permanecer normalmente no configurador.

Preservar:

customName
customNumber

Não alterar:

validação;
payload;
armazenamento;
ordem;
lógica.

---

12. PRESERVAR CARRINHO / MÚLTIPLOS ITENS

O sistema atualmente suporta múltiplos itens.

Preservar integralmente.

Não modificar:

Adicionar item;
Nova seleção;
itens independentes;
quantidades;
personalizações individuais.

---

13. PRESERVAR REVISÃO FUNCIONAL

A revisão pode continuar existindo, porém como camada discreta antes da confirmação.

Não remover:

* cálculo;
* subtotal;
* total;
* "Não informado";
* miniaturas;
* voltar e editar;
* proteção contra duplo envio.

Somente corrigir sua APRESENTAÇÃO para não redesenhar a landing page.

---

14. PRESERVAR MOTOR DO PEDIDO

NÃO alterar:

submitAvOrder
selectedModelId
idempotency_key
request_fingerprint
create-order
av_create_order
RPCs
RLS
Supabase
Turnstile
CORS
Rate Limit
PIX
pagamentos
comprovantes

---

15. PRESERVAR METADADOS

Os metadados OG já foram auditados.

Não alterar novamente:

title
description
Open Graph
imagem OG

em:

src/routes/index.tsx

Exceto se for estritamente necessário remover apenas wiring visual introduzido pelas ETAPAS 15.2/15.3.

Não mexer nos metadados aprovados.

---

16. FOOTER

O label "Processo" já foi auditado e aprovado.

Manter.

Não redesenhar Footer.

---

17. NÃO FAZER

NÃO:

* criar novo layout;
* trocar paleta;
* trocar fontes;
* mudar identidade visual;
* criar novas seções;
* criar sidebar;
* criar dashboard;
* criar cards extras;
* adicionar novas animações;
* adicionar 360°;
* adicionar 3D;
* instalar bibliotecas;
* refatorar a landing page inteira.

---

18. MOBILE

Após a restauração, validar:

375px
390px
430px

Queremos novamente um fluxo vertical simples.

Confirmar:

* nenhuma grande prévia sticky ocupando a tela;
* campos facilmente acessíveis;
* scroll natural;
* visual dos uniformes em destaque;
* botões acessíveis;
* nenhuma seção desnecessariamente alta;
* nenhuma alteração brusca na identidade original.

---

19. DESKTOP

Validar:

768px
1024px
1440px

Confirmar que a composição voltou a se aproximar do layout anterior à ETAPA 15.2.

Não manter divisão lateral grande criada pela prévia.

---

20. COMPARAÇÃO VISUAL

Se houver histórico disponível:

comparar visualmente:

ESTADO AO FINAL DA 15.1

versus

ESTADO APÓS ESTA CORREÇÃO.

O resultado deve ser visualmente muito próximo ao estado da 15.1.

As diferenças aceitáveis são apenas:

* funcionalidades Frente/Costas já existentes;
* swipe;
* revisão apresentada discretamente quando solicitada.

---

21. ALTERAÇÃO MÍNIMA

Analisar especialmente os arquivos alterados nas ETAPAS 15.2 e 15.3:

src/components/OrderConfigurator.tsx

src/components/OrderReview.tsx

src/components/OrderItemsSummary.tsx

src/routes/index.tsx

Alterar SOMENTE o necessário.

Não tocar em outros componentes sem justificativa.

---

22. TESTE DO FLUXO

Após restaurar o layout:

Selecionar CAMISA.

Escolher tamanho.

Nome.

Número.

Quantidade.

Adicionar.

Selecionar REGATA.

Configurar.

Adicionar.

Continuar.

Abrir revisão compacta.

Voltar e editar.

Abrir novamente.

Confirmar que todos os dados continuam funcionando.

---

23. TESTES TÉCNICOS

Executar:

TypeScript/typecheck

Build

Verificar console.

---

24. IMPORTANTE

ESTA ETAPA NÃO É PARA MELHORAR O DESIGN.

É PARA:

RESTAURAR O DESIGN QUE JÁ ESTAVA APROVADO.

Preservando as funcionalidades técnicas úteis adicionadas posteriormente.

---

RELATÓRIO FINAL

Informar:

1. arquivos modificados;
2. quais alterações da ETAPA 15.2 foram removidas;
3. se a prévia visual sticky foi completamente removida;
4. como ficou o OrderConfigurator;
5. como a revisão do pedido passou a ser apresentada;
6. se OrderReview foi reutilizado;
7. se OrderItemsSummary foi reutilizado;
8. confirmação de que o layout principal voltou ao padrão anterior;
9. confirmação de que Camisa e Regata permanecem intactas;
10. confirmação de Frente/Costas;
11. confirmação de zoom;
12. confirmação de swipe;
13. confirmação de múltiplos itens;
14. confirmação dos campos Nome/Número;
15. confirmação de Voltar e Editar;
16. confirmação de Confirmar Pedido;
17. resultado mobile;
18. resultado desktop;
19. TypeScript/typecheck;
20. Build;
21. erros de console;
22. confirmação de exatamente 2 produtos;
23. confirmação de que metadados OG não foram removidos;
24. confirmação de que backend, segurança e pagamentos não foram alterados.

NÃO iniciar nenhuma etapa nova.

NÃO realizar auditoria de produção ainda.

Pare após restaurar o layout e entregar este relatório. */}


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

