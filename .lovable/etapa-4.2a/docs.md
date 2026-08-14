# A_components.md
## Componentes da Etapa 4.2A

- **OrderConfigurator.tsx**: Gerencia a seleção de tamanho (incluindo "OUTRO"), customização de nome/número e quantidade.
- **CustomerDataForm.tsx**: Captura nome, WhatsApp e observações do cliente.
- **OrderItemsSummary.tsx**: Lista os itens adicionados localmente com opções de edição e remoção.
- **OrderReview.tsx**: Estágio final de revisão visual antes da confirmação (sem envio real).
- **CustomizationPreview.tsx**: Refatorado para ser um componente puramente visual de prévia.

# B_state_model.md
## Modelo de Estado Local
```typescript
type OrderItem = {
  local_id: string; // UUID v4 gerado no frontend
  shirt_model_id: string;
  model_code: string;
  model_name: string;
  category: 'tshirt' | 'tank';
  size_option: string;
  custom_size: string | null;
  custom_name: string | null;
  custom_number: string | null;
  quantity: number;
};

type CustomerData = {
  name: string;
  whatsapp: string;
  notes: string;
};
```
Estado mantido via React context/hooks em memória, sem persistência em localStorage ou cookies.

# C_validation_rules.md
## Regras de Validação Frontend
- **Tamanho**: Obrigatório. "OUTRO" só é permitido se `allow_custom_size` for true. `custom_size` obrigatório se "OUTRO" selecionado.
- **Nome/Número**: Opcionais. Número preservado como string para manter "07".
- **Quantidade**: Mínimo 1. Inteiro.
- **Cliente**: Nome (não vazio após trim) e WhatsApp (mínimo 10 dígitos numéricos) obrigatórios para prosseguir para revisão.
- **Pedidos Encerrados**: Bloqueio total de adições se `orders_available` for false.

# D_test_matrix_ORDERUI01_ORDERUI25.md
## Matriz de Testes ORDERUI01–ORDERUI25
| ID | Cenário | Resultado Esperado |
|---|---|---|
| ORDERUI01 | Nome obrigatório | Botão Continuar desabilitado sem nome |
| ORDERUI02 | WhatsApp obrigatório | Botão Continuar desabilitado sem WhatsApp válido |
| ORDERUI03 | Origem do modelo | Deve vir do catálogo real |
| ORDERUI04 | Opções de tamanho | Devem vir do `selectedModel.available_sizes` |
| ORDERUI05 | OUTRO / custom_size | Input aparece e é obrigatório se selecionado |
| ORDERUI06 | Troca de tamanho | `custom_size` limpa ao voltar para padrão |
| ORDERUI07 | custom_name opcional | Item adicionado sem nome |
| ORDERUI08 | custom_number "07" | Preserva o zero à esquerda |
| ORDERUI09 | custom_number "00" | Preserva ambos os zeros |
| ORDERUI10 | custom_number "10A" | Aceita letras no número |
| ORDERUI11 | Quantity > 1 | Subtotal visual reflete quantidade |
| ORDERUI12 | Sem teto comercial | Aceita quantidades altas (ex: 50) |
| ORDERUI13 | Adicionar item | Cria nova linha no resumo |
| ORDERUI14 | Personalizações diferentes | Permanecem em linhas separadas |
| ORDERUI15 | Remover item | Apenas o item selecionado é removido |
| ORDERUI16 | Editar item | Carrega dados no configurador e substitui ao salvar |
| ORDERUI17 | total_quantity | Soma de todas as quantities dos itens |
| ORDERUI18 | total estimado | Preço unitário x total_quantity |
| ORDERUI19 | Payload audit | Preços e nomes de modelos não constam no payload base |
| ORDERUI20 | orders_available=false | Botão "Adicionar" vira "Pedidos Encerrados" |
| ORDERUI21 | Review view | Mostra dados do cliente e lista de itens correta |
| ORDERUI22 | Sem chamadas API | Network tab não registra POST av-create-order |
| ORDERUI23 | Sem Turnstile | Widget não renderizado na página |
| ORDERUI24 | Privacidade PII | Sem console.log ou query string com dados |
| ORDERUI25 | Refresh | Limpa todo o estado local |
