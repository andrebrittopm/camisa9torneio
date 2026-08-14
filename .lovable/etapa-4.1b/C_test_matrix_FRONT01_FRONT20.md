# Matriz de Testes Frontend - ETAPA 4.1B

| ID | Cenário | Resultado Esperado |
|:---|:---|:---|
| FRONT01 | Fetch Catalog | Chamada para /api/public/av-catalog identificada |
| FRONT02 | No Direct Supabase | Nenhuma importação de @supabase/supabase-js no frontend |
| FRONT03 | Single Load | Catálogo carregado uma única vez no mount da página |
| FRONT04 | Event Number | Exibe "09" ou conforme retorno real |
| FRONT05 | Event Year | Exibe "2026" ou conforme retorno real |
| FRONT06 | Price Format | Exibe "R$ 35,00" formatado corretamente |
| FRONT07 | T-Shirt Count | Mostra 3 modelos na categoria Camiseta |
| FRONT08 | Tank Count | Mostra 3 modelos na categoria Regata |
| FRONT09 | Tab Switch | Alterna visibilidade entre categorias |
| FRONT10 | Model Select | Clicar em card atualiza o modelo selecionado |
| FRONT11 | Preview Sync | CustomizationPreview reflete o modelo clicado |
| FRONT12 | Sizes Source | Lista de tamanhos muda conforme o modelo |
| FRONT13 | Placeholder | Mostra "Modelo oficial em breve" se image_url é null |
| FRONT14 | 3D Graceful | Interface não quebra se model_3d_url é null |
| FRONT15 | Skeleton | Nenhuma camisa fictícia visível durante o load |
| FRONT16 | Error State | Mensagem de erro amigável se API falha |
| FRONT17 | Retry | Botão de tentar novamente funcional |
| FRONT18 | Deadline Check | Se orders_available=false, CTA exibe "Pedidos Encerrados" |
| FRONT19 | PIX Hidden | Nenhuma menção a chaves PIX no DOM/Redux/State |
| FRONT20 | No Order Side Effect | Nenhum pedido criado nesta etapa |
