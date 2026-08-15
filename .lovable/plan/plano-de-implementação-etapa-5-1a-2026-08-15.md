# Plano de Implementação — Etapa 5.1A

Implementação da base de autenticação e identidade administrativa para o 9º Torneio Amigos do Vôlei.

## 1. Banco de Dados e Segurança (SQL)
- Criar `public.av_admin_profiles` para perfis administrativos (SUPERADMIN/ADMIN).
- Criar `public.av_admin_audit_logs` para rastreabilidade imutável.
- Aplicar RLS restritivo: bloqueio total para `anon`/`authenticated`, acesso apenas via `service_role` (Server-Side).

## 2. Infraestrutura Server-Side
- Criar `src/lib/server/av-admin-auth.server.ts`:
  - Helper `getAdminContext(request)`: Valida sessão Supabase -> Busca perfil -> Verifica `active` -> Retorna permissões.
  - Helpers `requireAdmin` e `requireSuperAdmin` para proteção de rotas e server functions.
- Criar `src/lib/server/av-admin-audit.server.ts`:
  - Helper `logAdminAction`: Registro atômico de eventos na auditoria.

## 3. Autenticação e Sessão (Server Routes)
- `POST /api/admin/auth/login`: 
  - Rate limiting específico para login (account/global).
  - Autenticação Supabase Auth.
  - Validação de perfil administrativo (Fail-Closed).
  - Registro de auditoria.
- `POST /api/admin/auth/logout`: Invalidação de sessão.
- `GET /api/admin/auth/me`: Retorno sanitizado do perfil atual.

## 4. Interface Administrativa (Frontend)
- `src/routes/admin/login.tsx`: Tela de login com estética "Future Arena".
- `src/routes/admin/route.tsx`: Layout administrativo com proteção server-side (redirect para login se não autenticado).
- `src/routes/admin/index.tsx`: Dashboard base com placeholders.

## Detalhes Técnicos
- **Sessão:** Baseada em cookies Supabase (via TanStack Start middleware).
- **Rate Limit:** Token Bucket HMAC-SHA-256 para emails de login.
- **PII:** Isolamento total. Audit logs sem segredos ou tokens.
- **CORS:** Restrito à origem do projeto para rotas admin.

## Matriz de Testes (ADMINAUTH01-30)
- Validação de todos os cenários de acesso, falhas, bloqueios de perfis inativos e integridade de auditoria.
