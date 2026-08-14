-- E_security_audit.md
# SECURITY AUDIT — ETAPA 3.3B-2A

## 1. PRIVACIDADE E ANONIMIZAÇÃO
- **PII**: Nenhum IP, Nome ou Dado Pessoal é armazenado na tabela `av_rate_limit_buckets`.
- **HASHING**: A tabela utiliza `bucket_key_hash` (TEXT) como chave primária, protegendo a identidade do originador.

## 2. CONTROLE DE ACESSO
- **TABLE**: `REVOKE ALL` para `PUBLIC`, `anon` e `authenticated`. Apenas `service_role` possui acesso.
- **RLS**: Habilitado (`ENABLE ROW LEVEL SECURITY`) sem policies públicas, criando um "deny by default" adicional.
- **FUNCTIONS**: `REVOKE EXECUTE` para todos os papéis públicos. `GRANT EXECUTE` exclusivo para `service_role`.
- **SECURITY DEFINER**: Utilizado para garantir atomicidade, com `search_path = ''` para evitar ataques de injeção de caminho.

## 3. INTEGRIDADE E CONCORRÊNCIA
- **ATOMICIDADE**: Garantida por transação única e função SQL.
- **LOCKING**: Utiliza `FOR UPDATE` com ordenação determinística (`ORDER BY bucket_key_hash`) para prevenir deadlocks.
- **RACE CONDITIONS**: Tratadas via `INSERT ... ON CONFLICT DO NOTHING`.

## 4. AUDITORIA DE CÓDIGO
- As funções utilizam referências totalmente qualificadas para `public.av_rate_limit_buckets`.
- Nenhuma SQL dinâmica é utilizada.
- Validações de parâmetros rigorosas no início de cada função.
