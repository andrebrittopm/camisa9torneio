# Plano de Ação - ETAPA 4.4C: Catálogo Simplificado (Modelo Único TSHIRT-01)

Este plano descreve a simplificação do fluxo público para oferecer exclusivamente a Camiseta Oficial (TSHIRT-01), desativando os demais modelos no banco de dados e removendo seleções desnecessárias na interface.

## 1. Banco de Dados (av_shirt_models)

- Confirmar existência de `TSHIRT-01`.
- Atualizar `active = true` para `TSHIRT-01`.
- Atualizar `active = false` para `TSHIRT-02`, `TSHIRT-03`, `TANK-01`, `TANK-02`, `TANK-03`.
- **Por que:** Preserva o histórico sem deletar registros. A RPC de criação de pedido já valida se o modelo está ativo.

## 2. API de Catálogo (`/api/public/av-catalog`)

- O endpoint `GET` já filtra por `active = true`, portanto retornará apenas 1 modelo.
- Remover o override temporário da imagem da `TSHIRT-02` no endpoint.
- Manter o override da `TSHIRT-01` (Frente).

## 3. Interface e UX (Frontend)

### Seção de Modelos (`src/components/ModelsSection.tsx`)
- Detectar se há apenas 1 modelo.
- Remover abas (Camisetas/Regatas) e contadores.
- Substituir o grid/galeria por uma apresentação premium de modelo único.
- Textos atualizados: "Escolha seu estilo" -> "Conheça a Camiseta Oficial".
- Remover botão "Selecionar" (será automático).
- Garantir que "Frente/Costas" funcione para a TSHIRT-01.

### Fluxo de Pedido (`src/routes/index.tsx`)
- Selecionar automaticamente o primeiro (e único) modelo retornado pelo catálogo.
- Rolar do Hero diretamente para a seção da Camiseta/Configurador.

### Configurador (`src/components/OrderConfigurator.tsx`)
- Remover a visualização/troca de modelo.
- Preservar escolha de tamanho, nome, número e quantidade.

## 4. Textos e Metadados
- Atualizar plurais para singular na Landing Page.
- Atualizar `src/routes/index.tsx` com os metadados da Etapa 4.4C.

## 5. Validação (Matrix SINGLE01-20)
- Verificar se apenas 1 modelo é carregado.
- Testar fluxo completo de pedido com o modelo único.
- Validar responsividade mobile (fluxo mais direto).
- Garantir que o Admin não foi afetado.

## Detalhes Técnicos
- **Migração SQL:** `UPDATE public.av_shirt_models SET active = (code = 'TSHIRT-01');`
- **Frontend:** Condicional `models.length === 1` para simplificar componentes.
- **Segurança:** O backend rejeitará códigos inativos via RPC.
