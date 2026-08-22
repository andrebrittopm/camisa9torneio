# ETAPA 15.5 — RESTAURAÇÃO VISUAL CONTROLADA DO LAYOUT APROVADO

Restaurar o layout visual aprovado ao final da ETAPA 15.1, removendo a prévia de personalização lateral e convertendo a revisão do pedido para uma interface de modal, preservando as funcionalidades técnicas de múltiplos itens, personalização e segurança.

## Alterações Propostas

### 1. `src/components/OrderConfigurator.tsx`
- **Remover** o contêiner de prévia visual (painel lateral sticky com "Visualização Ilustrativa", nome "ATLETA" e número "10").
- **Restaurar** o layout de coluna única, removendo as classes `flex-col lg:flex-row` e as larguras `lg:w-1/3` / `lg:w-2/3`.
- **Manter** intacta a lógica de estado (`customName`, `customNumber`, `sizeOption`, `quantity`) e a funcionalidade de adicionar/atualizar itens.

### 2. `src/routes/index.tsx`
- **Importar** componentes de `Dialog` (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`).
- **Refatorar** o passo `review`: em vez de renderizar `OrderReview` diretamente no fluxo principal, ele será apresentado dentro de um `Dialog`.
- O botão "Revisar Pedido" no passo `customer_data` abrirá o modal.
- A tela de sucesso continuará sendo o destino final após a confirmação.
- **Atualizar** o comentário de cabeçalho para refletir a conclusão da ETAPA 15.5.

### 3. `src/components/OrderReview.tsx`
- **Ajustar** a estilização para garantir que o componente se comporte bem dentro de um modal (scroll interno se necessário, remoção de margens externas excessivas).
- **Manter** toda a lógica de submissão, Turnstile (desativado temporariamente conforme código atual), idempotência e tratamento de erros.

### 4. `src/components/OrderItemsSummary.tsx`
- **Garantir** que o resumo dos itens continue utilizando as miniaturas (`front_image_url`) e labels corretos.

## Detalhes Técnicos
- Utilização de `src/components/ui/dialog.tsx` para a implementação da revisão.
- Nenhuma alteração em `av_create_order` ou qualquer lógica de backend.
- Preservação total dos metadados OG e da identidade visual "Future Arena" (cores navy/gold).

## Critérios de Aceite
- O layout do configurador deve ser vertical e focado nos campos de entrada.
- A prévia visual lateral deve ter sido removida.
- A revisão do pedido deve aparecer em um modal sobreposto ao formulário de dados do cliente.
- O fluxo de múltiplos itens deve permanecer funcional (selecionar, configurar, adicionar, revisar, confirmar).
- Build e Typecheck devem passar sem erros.
