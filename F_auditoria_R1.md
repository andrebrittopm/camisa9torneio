# AUDITORIA DE REVISÃO (F) — ETAPA 3.3B-1R1

## 1. ESCOPO DA REVISÃO
Esta auditoria revisa a proposta de rate limiting distribuído, focando na confiança do identificador do cliente e no refinamento da política de falhas e algoritmos.

## 2. CORREÇÕES REALIZADAS NA ARQUITETURA
- **Privacidade vs Autenticidade**: HMAC agora é explicitamente definido como proteção de privacidade, não como autenticador de origem. A confiança depende da fonte do IP.
- **Definição de Camadas**: Postgres/Supabase é reclassificado como "Application-layer distributed rate limiting", não como proteção DDoS de borda.
- **Fail-Policy Detalhada**: Distinção clara entre erros de configuração (Fail-Closed) e erros transitórios de storage (Fail-Open do Limiter, mantendo Turnstile).
- **Algoritmo**: Substituição do termo genérico "Sliding Window" por uma especificação técnica de janelas fixas acumuladas (Sliding Window Counter) ou buckets atômicos.
- **Hot Row Mitigation**: Identificada a necessidade de mitigar contenção no bucket global.

## 3. IDENTIFICAÇÃO DE INFRAESTRUTURA REAL
- **HOSPEDAGEM REAL**: Lovable Cloud (Cloudflare Workers via Nitro).
- **CDN/PROXY REAL**: Cloudflare (implícito na infraestrutura da plataforma).
- **ORIGIN DIRETAMENTE ACESSÍVEL?**: Não, o tráfego é roteado pelo gateway da plataforma.
- **CF-CONNECTING-IP GARANTIDO?**: SIM, injetado pelo gateway Cloudflare da Lovable.
- **IP NATIVO DO RUNTIME?**: Disponível via objeto de contexto do Nitro/Worker.

## 4. CONCLUSÃO DA AUDITORIA R1
A arquitetura foi ajustada para não presumir confiança cega em cabeçalhos forjáveis e para separar claramente as responsabilidades de proteção da aplicação.