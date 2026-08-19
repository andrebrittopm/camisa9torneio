# Plano de Implementação — ETAPA 11.1 — REFINAMENTO PREMIUM VISUAL/TEXTUAL

Este plano detalha os refinamentos visuais e textuais aprovados após a auditoria 11.0, focando em terminologia oficial, consistência de CTAs, ajustes de responsividade (especialmente em 360px) e preparação para auditoria externa. O núcleo técnico e o backend permanecem CONGELADOS.

## 1. Terminologia Oficial e Busca Lexical
Padronizar a interface pública para "Camisa Oficial" e "Camisa(s)", eliminando ocorrências de "Camiseta".

- **ModelsSection.tsx**: Mudar "Conheça a Camiseta Oficial" para "Conheça a Camisa Oficial".
- **HowItWorks.tsx**: Mudar "Camiseta Oficial" para "Camisa Oficial".
- **HeroSection.tsx**: Verificar e garantir o uso de "Camisa".
- **OrderReview.tsx**: Mudar "Revise sua Camiseta" para "Revise sua Camisa".
- **OrderItemsSummary.tsx**: Garantir label "CAMISA OFICIAL".
- **OrderSuccess.tsx**: Mudar "Camiseta Garantida!" para "Camisa Garantida!".
- **Footer.tsx**: Ajustar link para "#camisa".
- **Header.tsx**: Ajustar link para "#camisa".
- **Index.tsx**: Ajustar âncora `id="camisas"` para `id="camisa"` e referências no scroll.

## 2. Refinamento de Responsividade (Breakpoints 360px - 430px)
Ajustes finos para evitar quebras agressivas e melhorar a área útil.

- **HeroSection.tsx**: Ajustar o tamanho da fonte e line-height do subtítulo para telas pequenas (mobile), garantindo equilíbrio visual em 360px.
- **CustomerDataForm.tsx**: Revisar o padding lateral do container `p-10` para algo mais responsivo (ex: `p-6 md:p-10`) para evitar que o conteúdo encoste nas bordas em 360px.
- **OrderConfigurator.tsx**: Verificar grids de tamanhos e inputs no mobile.

## 3. Estratégia de CTA e Hierarquia Visual
Padronizar textos de botões conforme a etapa do funil e garantir hierarquia clara.

- **HeroSection.tsx**: CTA primário: `QUERO MINHA CAMISA`.
- **ModelsSection.tsx**: CTA de ação: `PERSONALIZAR MINHA CAMISA` (ou `SELECIONAR` conforme fluxo).
- **OrderReview.tsx**: CTA final: `CONFIRMAR PEDIDO`.
- **ReceiptUpload.tsx**: Labels: `ENVIAR COMPROVANTE`, `ENVIANDO COMPROVANTE...`.
- **OrderSuccess.tsx**: CTA de acompanhamento: `ACOMPANHAR PEDIDO` (se disponível no futuro, por ora manter `Compartilhar no WhatsApp`).
- **Ações Administrativas**: Manter diferenciação visual para ações destrutivas (vermelho) no detalhe do pedido.

## 4. Padronização de Status (User-Facing)
Unificar as labels de status para o cliente final.

- **OrderSuccess.tsx** e **OrderView.tsx**:
    - Pagamento: `Aguardando pagamento`, `Comprovante enviado`, `Pagamento confirmado`, `Comprovante rejeitado`.
    - Pedido: `Pedido recebido`, `Pedido confirmado`, `Em produção`, `Pronto`, `Entregue`, `Cancelado`.
- **OrderView.tsx**: Aumentar contraste do texto de expiração do link.

## 5. Documentação e Handoff
Criar os arquivos de documentação para auditoria externa.

- `.lovable/etapa-11.1/COPY_DICTIONARY.md`: Dicionário oficial de copy.
- `.lovable/etapa-11.1/VISUAL_CHANGELOG.md`: Registro detalhado das mudanças visuais.
- `.lovable/etapa-11.1/GOOGLE_AI_REVIEW_HANDOFF.md`: Pacote de handoff para auditoria independente.

## Detalhes Técnicos (Para Desenvolvedores)
- Utilizar classes utilitárias do Tailwind v4 para responsividade.
- Nenhuma alteração em `createServerFn`, `supabase--migration` ou lógica de banco.
- Mudanças focadas em componentes React sob `src/components/` e `src/routes/`.
- Preservar integridade de `order-state.ts` e `av-order-client.ts`.
- Validar builds com `bun run build` e typecheck.
