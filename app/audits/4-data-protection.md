# Audit Report: Data Protection & Privacy

**Date:** 2026-03-03  
**Scope:** `backend/auth/`, `context/env.ts`, `context/solana/backend-signer.ts`, API error handling  
**Severity Scale:** 🟢 Pass | 🟡 Advisory | 🔴 Critical

---

## 1. Sensitive Data in Responses

| Check | Status | Notes |
|-------|--------|-------|
| Error details hidden in production | 🟢 Pass | `safeErrorDetails()` returns `undefined` in production |
| No stack traces in API responses | 🟢 Pass | All error handlers use safe formatting |
| Internal IDs not exposed unnecessarily | 🟢 Pass | Only user-owned data returned per session |
| Backend signer key never exposed to client | 🟢 Pass | `loadBackendSigner()` only runs server-side |
| Admin wallets returned only to authenticated admins | 🟢 Pass | `/api/admin/authority` checks `isAdmin(session)` |
| Hidden test case outputs masked | 🟢 Pass | Code execution returns `[hidden]` for hidden test cases |

---

## 2. Secret Management

| Check | Status | Notes |
|-------|--------|-------|
| Environment variables for all secrets | 🟢 Pass | `AUTH_SECRET`, OAuth secrets, `BACKEND_SIGNER_PRIVATE_KEY`, `CRON_SECRET`, etc. |
| Startup validation of required env vars | 🟢 Pass | `validateEnv()` auto-runs on import, throws in production |
| Security warnings at startup | 🟢 Pass | Warns about: missing NEXTAUTH_URL, ADMIN_WALLETS usage, devnet RPC |
| Backend signer key decoding | 🟢 Pass | `loadBackendSigner()` throws descriptive error if key is invalid |
| No secrets in client-side bundles | 🟢 Pass | Only `NEXT_PUBLIC_*` vars exposed (RPC URL, app URL, Supabase anon key) |
| CRON_SECRET mandatory | 🟢 Pass | Endpoint rejects if secret not configured |

---

## 3. Database Security

| Check | Status | Notes |
|-------|--------|-------|
| Prisma ORM (no raw SQL) | 🟢 Pass | All DB access parameterized |
| Soft delete for account deletion | 🟢 Pass | 30-day grace period via `deleted_at` timestamp |
| Deleted users filtered in queries | 🟢 Pass | `deleted_at: null` filter on profile lookups |
| Audit trail persisted | 🟢 Pass | `audit_logs` table with user ID, action, IP, user agent, metadata |
| Unique constraints for double-claim prevention | 🟢 Pass | `user_id_achievement_id` unique index |
| Pagination on list queries | 🟢 Pass | `PAGE_SIZE = 20` on thread listing with `skip/take` |

---

## 4. Wallet Ownership Verification

| Check | Status | Notes |
|-------|--------|-------|
| Lesson completion: wallet ownership checked | 🟢 Pass | `linked_accounts` table: user_id + provider=wallet + provider_id |
| Course finalization: wallet ownership checked | 🟢 Pass | Same pattern |
| Achievement award: wallet ownership checked | 🟢 Pass | Same pattern |
| Credential issuance: wallet linked check | 🟢 Pass | `linked_accounts` for wallet provider |
| No cross-user data access | 🟢 Pass | All queries scoped to `session.user.id` |

---

## 5. Encryption & Secure Transmission

| Check | Status | Notes |
|-------|--------|-------|
| HTTPS enforced (Vercel) | 🟢 Pass | Vercel enforces TLS by default |
| HSTS header | 🟢 Pass | 2-year max-age with preload |
| `__Secure-` cookie prefix handled | 🟢 Pass | Both cookie variants managed |
| Callback URL encryption | 🟢 Pass | `encryptCallbackUrl()` prevents open redirect attacks |
| JWT signed with `AUTH_SECRET` | 🟢 Pass | Standard HMAC signing via NextAuth |

---

## 6. On-Chain Data Protection

| Check | Status | Notes |
|-------|--------|-------|
| Backend signer as co-signer (not sole authority) | 🟢 Pass | Anti-cheat without over-centralizing control |
| XP amounts read from on-chain Course PDA | 🟢 Pass | Not from user-supplied parameters |
| Credential NFTs soulbound | 🟢 Pass | `PermanentFreezeDelegate` plugin prevents transfer |
| XP tokens non-transferable | 🟢 Pass | Token-2022 `NonTransferable` extension |

---

## 7. Privacy Compliance

| Check | Status | Notes |
|-------|--------|-------|
| Account deletion (soft delete + 30-day grace) | 🟢 Pass | GDPR-aligned right to erasure |
| Minimal data collection | 🟢 Pass | Only name, email, avatar, wallet address collected |
| Public profile limited to username | 🟢 Pass | `/profile/[username]` shows public data only |
| Session data scoped to authenticated user | 🟢 Pass | No cross-user data leakage |

---

## Verdict: ✅ PASS — No outstanding issues

Data protection is thorough with proper secret management, production error hiding, wallet ownership verification, HSTS + encrypted callbacks, audit logging, and soft deletion for GDPR compliance.
