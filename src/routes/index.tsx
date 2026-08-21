12.2-B3-R6 — ADMIN AUDIT PROFILE RELATION FIX

OLD QUERY RELATION:
av_admin_audit_logs.select('*, admin_profile:av_admin_profiles!admin_user_id(display_name)')

POSTGREST EMBEDDED RELATION:
REMOVED

AUDIT LOG QUERY:
supabaseAdmin.from('av_admin_audit_logs').select('*', { count: 'exact' })

PROFILE MATCH COLUMN:
user_id (in av_admin_profiles) matched against admin_user_id (in av_admin_audit_logs)

PROFILE LOOKUP:
BATCHED (Single .in() query for all unique admin_user_ids in the current page)

ADMIN FILTER:
PRESERVED (Filters by admin_user_id directly on audit logs table)

PAGINATION:
PRESERVED

RESPONSE CONTRACT:
PRESERVED (logs[].adminDisplayName remains consistent)

MISSING PROFILE FALLBACK:
"Administrador"

DATABASE SCHEMA:
UNCHANGED

AUTH:
UNTOUCHED

B3 STATUS RPC:
UNTOUCHED

PUBLIC FLOW:
UNTOUCHED

TYPECHECK:
PASS

BUILD:
PASS

FILES MODIFIED:
src/lib/server/av-admin-audit.server.ts

FINAL VERDICT:
A) READY FOR CODE REVIEW