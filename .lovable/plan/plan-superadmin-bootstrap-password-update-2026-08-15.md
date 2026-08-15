# Plan: Superadmin Bootstrap Password Update

Implementation of the server-side infrastructure to update the first Superadmin's password using the `SUPERADMIN_BOOTSTRAP_PASSWORD` secret, bypassing the need for SMTP during the initial setup.

## User Review Required

> [!IMPORTANT]
> The `SUPERADMIN_BOOTSTRAP_PASSWORD` secret must be set via the Lovable dashboard. It should not be shared in chat.

- **Security**: The bootstrap endpoint is protected by Cloudflare Turnstile and Rate Limiting.
- **Fail-Closed**: If the secret is missing or incorrect, the process halts without modifying the database.
- **Audit**: All attempts (success or failure) are logged in `av_admin_audit_logs`.

## Proposed Changes

### 1. Backend Security

#### [New API Endpoint] `src/routes/api/admin/auth/bootstrap-password.ts`
- Implements the server-side logic to verify the bootstrap secret.
- Uses `supabaseAdmin` to fetch the first `SUPERADMIN` profile.
- Updates the corresponding `auth.users` password.
- Enforces strict CORS and payload limits (64KB).

### 2. Database Layer

#### [Audit Logs]
- Ensure bootstrap attempts are properly recorded.

### 3. Verification

#### [Test Script]
- A browser-based script will verify:
    1. The endpoint handles missing secrets gracefully.
    2. The endpoint blocks incorrect passwords.
    3. The endpoint successfully updates the password when correct.

## Technical Details

- **Secret Enforcement**: `process.env['SUPERADMIN_BOOTSTRAP_PASSWORD']` is read exclusively within the handler.
- **Rate Limiting Scope**: Uses the existing `admin-auth` scope.
- **RPC Consistency**: Relies on `av_admin_profiles` to identify the first legitimate Superadmin.
- **Fail-Safe**: If multiple Superadmins exist, it targets the first one created (oldest) as the bootstrap candidate.
