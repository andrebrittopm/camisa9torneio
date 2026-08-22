/**
 * EXPORT-R1 — IMPLEMENTAÇÃO SEGURA DA PLANILHA DE PRODUÇÃO
 *
 * MODO:
 * IMPLEMENTAÇÃO CIRÚRGICA
 * PREVIEW ONLY
 * NO PUBLISH
 * NO DATABASE CHANGES
 * NO MIGRATIONS
 * NO EXISTING RPC CHANGES
 *
 * ==================================================
 * CONTEXTO
 * ==================================================
 *
 * A auditoria EXPORT-R0 confirmou:
 *
 * ORDER TABLE:
 * public.av_orders
 *
 * ITEMS TABLE:
 * public.av_order_items
 *
 * MODELS:
 * public.av_shirt_models
 *
 * ELIGIBILIDADE:
 * payment_status = 'payment_confirmed'
 * AND order_status != 'cancelled'
 *
 * DEPENDÊNCIA XLSX:
 * não instalada
 *
 * BIBLIOTECA RECOMENDADA:
 * exceljs
 *
 * OBJETIVO:
 *
 * Adicionar em:
 *
 * Admin → Pedidos
 *
 * um botão:
 *
 * EXPORTAR PRODUÇÃO
 *
 * O arquivo deve ser gerado server-side, somente leitura,
 * sem modificar qualquer pedido ou fluxo existente.
 *
 * ==================================================
 * 1. LIMPEZA DO RELATÓRIO
 * ==================================================
 *
 * Se algum relatório EXPORT-R0 foi inserido como comentário
 * em arquivo de runtime, remover SOMENTE esse comentário.
 *
 * Não inserir novos relatórios dentro de:
 *
 * src/routes/index.tsx
 * componentes
 * rotas
 * helpers de runtime
 *
 * ==================================================
 * 2. DEPENDÊNCIA
 * ==================================================
 *
 * Instalar exceljs usando o gerenciador de pacotes já
 * adotado pelo projeto.
 *
 * Modificar somente:
 *
 * package.json
 * lockfile correspondente
 *
 * Não instalar bibliotecas de PDF nesta etapa.
 *
 * Garantir que exceljs seja importado exclusivamente em
 * código server-side e não entre no bundle do navegador.
 *
 * ==================================================
 * 3. ESCOPO DO EVENTO
 * ==================================================
 *
 * Exportar somente pedidos pertencentes ao evento atual
 * do 9º Torneio.
 *
 * Usar o event_id real do contexto administrativo ou
 * identificar com segurança o evento ativo.
 *
 * Não misturar pedidos de outros eventos.
 *
 * Não confiar apenas em event_year se houver mais de um
 * evento no mesmo ano.
 *
 * ==================================================
 * 4. AUTENTICAÇÃO
 * ==================================================
 *
 * A geração deve ocorrer exclusivamente no servidor.
 *
 * Preservar:
 *
 * getRequest()
 * requireAdmin(request)
 *
 * Não consultar Supabase diretamente pelo navegador.
 *
 * Não enviar service role key ao client.
 *
 * ==================================================
 * 5. CONSULTA SOMENTE LEITURA
 * ==================================================
 *
 * Consultar todos os pedidos elegíveis, sem depender da
 * paginação visual da tabela administrativa.
 *
 * Aplicar:
 *
 * payment_status = 'payment_confirmed'
 * order_status != 'cancelled'
 * event_id = evento atual
 *
 * Buscar apenas os campos necessários para a produção.
 *
 * NÃO selecionar:
 *
 * customer_name
 * customer_phone
 * WhatsApp
 * e-mail
 * notes
 * tracking_token
 * storage_path
 * comprovantes
 * metadata
 * correlation_id
 *
 * Não executar:
 *
 * INSERT
 * UPDATE
 * DELETE
 * RPC de status
 * RPC de exclusão
 *
 * ==================================================
 * 6. CÓDIGO PÚBLICO
 * ==================================================
 *
 * Gerar o código visual do pedido exatamente no padrão
 * já utilizado pelo painel:
 *
 * AV-YYYY-XXXX
 *
 * Usar:
 *
 * event_year
 * order_seq
 *
 * Não consultar uma coluna chamada public_id sem confirmar
 * que ela realmente existe.
 *
 * Preferencialmente reutilizar o helper já existente para
 * displayOrderNumber.
 *
 * ==================================================
 * 7. ABA PRODUÇÃO
 * ==================================================
 *
 * Criar a aba:
 *
 * Produção
 *
 * Uma linha por av_order_items, preservando quantity.
 *
 * Colunas nesta ordem:
 *
 * 1. Pedido
 * 2. Data do pedido
 * 3. Modelo
 * 4. Tipo
 * 5. Tamanho
 * 6. Nome
 * 7. Número
 * 8. Quantidade
 * 9. Status
 *
 * Regras:
 *
 * custom_name vazio/null:
 * SEM NOME
 *
 * custom_number vazio/null:
 * SEM NÚMERO
 *
 * size_option = custom:
 * usar custom_size
 *
 * Tamanho custom vazio:
 * NÃO permitir valor undefined; usar fallback sanitizado
 *
 * Nome e número devem ser gravados como texto literal.
 *
 * Não permitir que valores iniciados por:
 *
 * =
 * +
 * -
 * @
 *
 * sejam interpretados como fórmula de planilha.
 *
 * ==================================================
 * 8. ABA RESUMO
 * ==================================================
 *
 * Criar a aba:
 *
 * Resumo
 *
 * Agrupar as peças por:
 *
 * Modelo
 * Tipo
 * Tamanho
 *
 * Colunas:
 *
 * 1. Modelo
 * 2. Tipo
 * 3. Tamanho
 * 4. Total de peças
 *
 * O total deve somar:
 *
 * av_order_items.quantity
 *
 * Adicionar no final:
 *
 * TOTAL GERAL DE PEÇAS
 *
 * Validar que o total geral da aba Resumo corresponde à
 * soma da coluna Quantidade da aba Produção.
 *
 * ==================================================
 * 9. FORMATAÇÃO
 * ==================================================
 *
 * Aplicar formatação profissional e simples:
 *
 * - cabeçalho azul escuro
 * - texto branco
 * - destaque amarelo compatível com o projeto
 * - primeira linha congelada
 * - autofiltro
 * - largura adequada das colunas
 * - quebra de texto quando necessário
 * - data no formato brasileiro
 * - quantidade como número inteiro
 *
 * Ordenar a aba Produção por:
 *
 * Tipo/Modelo
 * Tamanho
 * Código do pedido
 *
 * Ordem preferencial de tamanhos:
 *
 * PP
 * P
 * M
 * G
 * GG
 * XG
 * XXG
 * CUSTOMIZADOS
 *
 * Nome do arquivo:
 *
 * producao-camisas-9-torneio-AAAA-MM-DD.xlsx
 *
 * ==================================================
 * 10. DOWNLOAD
 * ==================================================
 *
 * Implementar endpoint/rota server-side seguindo o padrão
 * real já utilizado pelo projeto.
 *
 * Retornar o arquivo binário com os headers corretos:
 *
 * Content-Type:
 * application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 *
 * Content-Disposition:
 * attachment; filename="producao-camisas-9-torneio-AAAA-MM-DD.xlsx"
 *
 * Não converter o arquivo inteiro para base64 se o framework
 * permitir retornar bytes/ArrayBuffer diretamente.
 *
 * ==================================================
 * 11. INTERFACE
 * ==================================================
 *
 * Adicionar na página:
 *
 * Admin → Pedidos
 *
 * um botão:
 *
 * EXPORTAR PRODUÇÃO
 *
 * Posicionar próximo aos filtros, sem modificar o restante
 * do layout.
 *
 * Estados:
 *
 * normal:
 * EXPORTAR PRODUÇÃO
 *
 * carregando:
 * GERANDO PLANILHA...
 *
 * Durante o carregamento:
 *
 * - bloquear clique duplicado
 * - manter a listagem visível
 * - não navegar para outra página
 *
 * Se não existirem pedidos elegíveis, mostrar:
 *
 * Nenhum pedido confirmado disponível para exportação.
 *
 * Em caso de falha:
 *
 * Não foi possível gerar a planilha. Tente novamente.
 *
 * Não mostrar stack trace ou erro interno.
 *
 * ==================================================
 * 12. NÃO CRIAR EFEITOS COLATERAIS
 * ==================================================
 *
 * A exportação NÃO deve:
 *
 * - alterar status
 * - marcar pedido como exportado
 * - criar auditoria
 * - excluir pedido
 * - modificar comprovante
 * - escrever no Storage
 * - invalidar checkout
 * - limpar carrinho
 * - alterar dashboard
 * - alterar tracking público
 *
 * Banco de dados:
 * SOMENTE LEITURA
 *
 * ==================================================
 * 13. PRESERVAR INTEGRALMENTE
 * ==================================================
 *
 * NÃO alterar:
 *
 * - landing page
 * - imagens das camisas
 * - zoom
 * - navegação
 * - carrinho
 * - revisão do pedido
 * - criação do pedido
 * - pagamento PIX
 * - upload de comprovante
 * - link de acompanhamento
 * - dashboard administrativo
 * - auditoria
 * - fluxo de produção
 * - exclusão administrativa
 * - autenticação
 * - RPCs existentes
 *
 * ==================================================
 * 14. VALIDAÇÃO
 * ==================================================
 *
 * Gerar uma planilha real em ambiente de Preview sem
 * alterar dados.
 *
 * Confirmar:
 *
 * - arquivo abre no Excel/LibreOffice
 * - duas abas existem
 * - código AV-YYYY-XXXX correto
 * - SEM NOME correto
 * - SEM NÚMERO correto
 * - tamanho personalizado correto
 * - quantidade maior que 1 preservada
 * - somente pagamentos confirmados
 * - cancelados ausentes
 * - outros eventos ausentes
 * - total da Produção igual ao total do Resumo
 * - nenhuma PII presente
 * - nenhuma escrita no banco
 *
 * Executar:
 *
 * TYPECHECK
 * BUILD
 *
 * Não publicar.
 *
 * ==================================================
 * RESPOSTA
 * ==================================================
 *
 * Responder somente:
 *
 * EXPORT-R1 — XLSX PRODUCTION EXPORT
 *
 * SERVER ENTRY POINT:
 * [...]
 *
 * ADMIN AUTH:
 * [...]
 *
 * EVENT SCOPE:
 * [...]
 *
 * ELIGIBILITY:
 * [...]
 *
 * ORDER CODE GENERATION:
 * [...]
 *
 * XLSX LIBRARY:
 * [...]
 *
 * WORKBOOK SHEETS:
 * [...]
 *
 * PRODUCTION COLUMNS:
 * [...]
 *
 * SUMMARY GROUPING:
 * [...]
 *
 * CUSTOM SIZE:
 * [...]
 *
 * EMPTY NAME:
 * [...]
 *
 * EMPTY NUMBER:
 * [...]
 *
 * FORMULA INJECTION PROTECTION:
 * PASS / FAIL
 *
 * PII EXCLUDED:
 * [...]
 *
 * DATABASE WRITES:
 * NONE / [...]
 *
 * EXISTING RPC CHANGES:
 * NONE / [...]
 *
 * DOWNLOAD METHOD:
 * [...]
 *
 * EMPTY RESULT HANDLING:
 * [...]
 *
 * TYPECHECK:
 * PASS / FAIL
 *
 * BUILD:
 * PASS / FAIL
 *
 * FILES CREATED:
 * [...]
 *
 * FILES MODIFIED:
 * [...]
 *
 * DATABASE MODIFIED:
 * NO / YES
 *
 * FINAL VERDICT:
 * A) READY FOR CODE REVIEW
 * B) IMPLEMENTATION INCOMPLETE
 * C) REGRESSION DETECTED
 */
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
      <Header />

      <main>
        {currentStep === "idle" && (
          <>
            <HeroSection />
            <div>
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
          <div className="max-w-4xl mx-auto px-6 pt-20 md:pt-24">
            <OrderItemsSummary
              items={items}
              eventInfo={catalog.data.event}
              onRemove={removeItem}
              onEdit={(localId) => {
                setEditingItemId(localId);
                setStep("configurator");
              }}
            />
          </div>
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
