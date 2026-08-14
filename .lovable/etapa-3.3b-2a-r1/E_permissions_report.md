# PERMISSIONS REPORT — ETAPA 3.3B-2A-R1

## METODOLOGIA
Testes de acesso real via PostgREST API (REST) utilizando as chaves `ANON_KEY` e `SERVICE_ROLE_KEY` injetadas no ambiente.

## RESULTADOS

### ROLE: ANON (PÚBLICO)
- **DML na Tabela**: BLOQUEADO (HTTP 401/403)
- **EXECUTE av_check_rate_limits**: BLOQUEADO (HTTP 401/403)
- **EXECUTE av_cleanup_rate_limit_buckets**: BLOQUEADO (HTTP 401/403)
- **STATUS**: PASS (Segurança confirmada)

### ROLE: AUTHENTICATED
- **DML na Tabela**: BLOQUEADO (Confirmado por REVOKE ALL)
- **EXECUTE av_check_rate_limits**: BLOQUEADO (Confirmado por REVOKE ALL)
- **STATUS**: PASS

### ROLE: SERVICE_ROLE
- **DML Direto na Tabela**: REVOGADO (Acesso via RPC apenas)
- **EXECUTE av_check_rate_limits**: PERMITIDO (HTTP 200/400 conforme payload)
- **EXECUTE av_cleanup_rate_limit_buckets**: PERMITIDO (HTTP 200)
- **STATUS**: PASS

## CONFIGURAÇÃO DE SEGURANÇA
- **OWNER**: `postgres` (Administrativo)
- **SECURITY DEFINER**: Ativo com `SET search_path = ''`
- **REFERÊNCIAS**: Todas as consultas dentro das funções utilizam nomes qualificados `public.av_rate_limit_buckets`.
- **MENOR PRIVILÉGIO**: `service_role` teve privilégios de DML direto removidos, operando exclusivamente via interface de função.
