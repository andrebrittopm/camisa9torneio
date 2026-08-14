# Integração Frontend - ETAPA 4.1B

## Arquitetura de Dados
- **Leitura Centralizada**: A `Index` route realiza o fetch inicial do catálogo via `useEffect`.
- **Prop Drilling Controlado**: Os dados são passados para `ModelsSection` e `CustomizationPreview`.
- **Estado de Loading**: Implementado via skeleton/spinner central para evitar dados fictícios.
- **Tratamento de Erro**: Interface de retry amigável integrada ao design.

## Mapeamento de UI
- **Preços**: Formatados via `Intl.NumberFormat('pt-BR')`.
- **Tamanhos**: Lidos dinamicamente de `available_sizes` de cada modelo.
- **Imagens**: Fallback para placeholder se `image_url` for null.
- **Categorias**: Tabs dinâmicas com contadores automáticos.
