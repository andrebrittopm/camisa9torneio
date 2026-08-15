# Plano de Implementação: Fluxo Seguro de Definição de Senha do SUPERADMIN

Implementação do fluxo oficial de recuperação/redefinição de senha do Supabase Auth para o SUPERADMIN provisionado, com validação de segurança e testes reais.

## Etapas de Implementação

1. **Configuração de Infraestrutura de Segurança**
   - Criar `src/routes/api/admin/auth/recovery.ts`: Endpoint para disparar o e-mail de recuperação do Supabase.
   - Criar `src/routes/api/admin/auth/reset-password.ts`: Endpoint para processar a atualização da senha após validação do token.
   - Ambos os endpoints usarão rate limit (escopo `admin-auth`) e log de auditoria.

2. **Criação da Rota de Redefinição (Frontend)**
   - Criar `src/routes/admin/reset-password.tsx`: Página para o usuário digitar a nova senha.
   - A página validará a presença da sessão de recuperação (injetada pelo Supabase via URL hash/fragment).

3. **Fluxo de Execução**
   - Chamar o endpoint de recovery para o e-mail `andrebrittocoxim@gmail.com`.
   - O Supabase enviará o e-mail oficial (o link redirecionará para `/admin/reset-password`).
   - O SUPERADMIN definirá a nova senha.

4. **Bateria de Testes Reais (Pós-Redefinição)**
   - Login real com as novas credenciais.
   - Acesso ao painel `/admin`.
   - Teste de Refresh e Nova Aba.
   - Validação do endpoint `/me` (PII Sanitized).
   - Validação de `requireAdmin` e `requireSuperAdmin`.
   - Logout e Re-login.

## Detalhes Técnicos

- **Segurança**: Uso de `service_role` apenas onde necessário (auditoria/perfil). Senha tratada exclusivamente pelo Supabase Auth.
- **Fail-Closed**: Se o perfil não for SUPERADMIN ou não estiver ativo, o acesso é negado mesmo com senha correta.
- **Logs**: Nenhuma senha ou token de acesso será registrado nos logs.

## Resumo de Entidades
- **SUPERADMIN**: andrebrittocoxim@gmail.com
- **Role**: SUPERADMIN
- **Status**: Ativo (av_admin_profiles)
