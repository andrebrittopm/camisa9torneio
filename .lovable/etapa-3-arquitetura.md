# Análise da Arquitetura - Motor Seguro de Pedidos (Etapa 3.1)

A arquitetura proposta estabelece um fluxo rigoroso de segurança e integridade de dados para o processamento de pedidos do **9º Torneio Amigos do Vôlei**.

## 1. Fluxo de Execução
O sistema utiliza uma abordagem de "Backend-as-a-Proxy" para isolar as tabelas sensíveis:
- **Client**: Envia apenas dados comerciais não sensíveis (IDs de referência e escolhas do usuário).
- **Edge Function (`av-create-order`)**: Atua como gatekeeper, validando a estrutura do payload e injetando a `service_role` de forma segura no ambiente do servidor.
- **PostgreSQL RPC (`av_create_order`)**: Centraliza toda a lógica de negócio, garantindo atomicidade (tudo ou nada) e prevenindo manipulação de preços ou metadados pelo cliente.

## 2. Garantias de Segurança
- **Proteção de Preço**: O `unit_price` é lido diretamente da tabela `av_events` no momento da inserção, ignorando qualquer valor enviado pelo frontend.
- **Isolamento de RLS**: As tabelas `av_orders` e `av_order_items` permanecem com acesso negado para `anon` e `authenticated`. Apenas a RPC via `SECURITY DEFINER` (chamada pela Edge Function com `service_role`) pode escrever.
- **Sanitização**: Uso de `SET search_path = ''` na RPC para evitar ataques de sequestro de caminho de busca.

## 3. Integridade e Idempotência
- **Atomicidade**: Uso de transação SQL implícita na função PL/pgSQL. Falhas em itens individuais (ex: modelo inexistente ou tamanho inválido) cancelam a criação de todo o pedido.
- **Idempotency Key**: Implementação de um índice único na coluna `idempotency_key`. Em caso de colisões (retry/clique duplo), o banco bloqueia a nova inserção e a lógica da RPC recupera o pedido já existente, retornando-o com sucesso sem duplicar registros.

## 4. Validação de Regras de Negócio
- **Eventos**: Verificação de status `active`, `orders_open` e data limite (`order_deadline`).
- **Modelos**: Verificação de existência e vínculo obrigatório com o `event_id` fornecido.
- **Tamanhos**: Validação cruzada entre `size_option` e o array `available_sizes` do modelo. Suporte a `custom_size` apenas quando permitido e selecionado como 'OUTRO'.

## 5. Próximas Etapas e Risos
- **Riscos**: Timeouts em conexões extremamente lentas durante a execução da RPC (mitigado pela idempotência).
- **Testes**: O plano de testes foca em tentativas de injeção de preços, pedidos para eventos encerrados e colisões de chaves de idempotência.

---
**NENHUMA ALTERAÇÃO FOI EXECUTADA.**
