# ETAPA 4.2A — CONFIGURADOR DE CAMISA + ITENS DO PEDIDO NO FRONTEND

Implementar o fluxo completo de configuração de pedido no frontend, permitindo múltiplos itens personalizados, dados do cliente e revisão local, utilizando dados reais do catálogo sem persistência no servidor ou localStorage.

## Technical Details

### State Management
- **Order State**: Centralized in `src/routes/index.tsx` using React state (no `localStorage`).
- **Structure**:
  - `customer`: `{ name, whatsapp, notes }`
  - `items`: `Array<{ local_id, shirt_model_id, size_option, custom_size, custom_name, custom_number, quantity, _metadata }>`
  - `editingItemId`: `string | null` for edit mode.

### Components
1. **`OrderConfigurator.tsx`**: 
   - Handles shirt configuration (model, size, customization, quantity).
   - Validates "OUTRO" size visibility based on `selectedModel.allow_custom_size`.
   - Preserves "07", "00" for numbers.
2. **`CustomerDataForm.tsx`**: 
   - Collects Name, WhatsApp (with mask), and Notes.
3. **`OrderItemsSummary.tsx`**: 
   - Lists added items with Edit/Remove functionality.
   - Calculates Total Pieces and Estimated Total.
4. **`OrderReview.tsx`**: 
   - Summary view before "confirmation".

### Constraints & Security
- **No Backend Calls**: `POST /api/public/av-create-order` is strictly prohibited.
- **Privacy**: No PII in `console.log`, analytics, or URL.
- **Fail-Safe**: If `orders_available` is false, block adding items.

## User Review Required

> [!IMPORTANT]
> - The submission button in the Review section will be disabled (or non-functional) per instructions, as backend integration happens in Stage 4.2B.
> - Page refresh will clear all data (no `localStorage`).

1. **WhatsApp Mask**: Use `(XX) XXXXX-XXXX` standard.
2. **Custom Size**: Placeholder "Ex.: 3G, 4G, Infantil 12" when "OUTRO" is selected.
3. **Quantity**: Minimum 1, no upper commercial limit.

## Implementation Steps

1. **Core State**: Define interfaces and initialize state in `src/routes/index.tsx`.
2. **Components**: Create `OrderConfigurator`, `CustomerDataForm`, `OrderItemsSummary`, and `OrderReview` under `src/components/`.
3. **Refactor `CustomizationPreview`**: Make it a pure visual component or part of `OrderConfigurator`.
4. **Validation**: Implement strict validation for Adding/Updating items and for the "Continue" button.
5. **UI Integration**: Update `src/routes/index.tsx` to switch between "Configuration" and "Review" views.
6. **Documentation**: Populate `.lovable/etapa-4.2a/` with required audit files.
7. **Verification**: Run `ORDERUI01-ORDERUI25` tests, `typecheck`, and `build`.
