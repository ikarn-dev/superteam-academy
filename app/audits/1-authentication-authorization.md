# Audit Report: Authentication & Authorization

**Date:** 2026-03-03  
**Scope:** `backend/auth/`, `proxy.ts`, `app/api/auth/`, `backend/admin/`  
**Severity Scale:** 🟢 Pass | 🟡 Advisory | 🔴 Critical

---

## 1. Authentication Providers

### 1.1 OAuth (Google / GitHub)
| Check | Status | Notes |
|-------|--------|-------|
| OAuth secrets stored in env vars | 🟢 Pass | `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*` validated at startup via `env.ts` |
| Provider account linked to internal profile | 🟢 Pass | `linked_accounts` table with `provider + provider_id` lookup |
| Duplicate email detection | 🟢 Pass | `signIn` callback checks `profiles.email` before creating new user |
| Login count tracking | 🟢 Pass | Atomic `increment` via Prisma on every sign-in |
| Audit logging | 🟢 Pass | `logAuditEvent()` called for signup, login, and email-linked flows |

### 1.2 Solana Wallet Authentication
| Check | Status | Notes |
|-------|--------|-------|
| Nonce-based challenge | 🟢 Pass | `generateAuthMessage()` — 32-byte random nonce + timestamp per challenge |
| Nonce stored in Redis with TTL | 🟢 Pass | `setNonce()` — 5 min TTL via `@upstash/redis` |
| Nonce consumed atomically | 🟢 Pass | `deleteNonce()` called in `authorize()` after verification |
| Ed25519 signature verification | 🟢 Pass | `nacl.sign.detached.verify()` via `tweetnacl` library |
| Wallet address validation | 🟢 Pass | `isValidSolanaAddress()` — length 32–44, base58 regex, `PublicKey` constructor |
| Rate limiting per wallet | 🟢 Pass | `checkRateLimit('wallet-auth:${walletAddress}')` — 5 req/min |
| Account lockout | 🟢 Pass | 5 failed attempts → 15 min lockout via `lockout.ts` |
| Failed attempt tracking | 🟢 Pass | `recordFailedAttempt()` + `clearFailedAttempts()` on success |
| Pre-verify endpoint (non-consuming) | 🟢 Pass | `/api/auth/wallet/verify` checks signature without consuming nonce |

---

## 2. Session Management

| Check | Status | Notes |
|-------|--------|-------|
| JWT strategy (stateless) | 🟢 Pass | `session.strategy: 'jwt'` in NextAuth config |
| Session max age | 🟢 Pass | 7 days — appropriate for admin-role platform |
| `AUTH_SECRET` used for JWT signing | 🟢 Pass | Configured in `authOptions.secret` |
| Session invalidation on user deletion | 🟢 Pass | JWT callback sets `sessionInvalid: true` when `deleted_at` is set |
| Stale cookie cleanup | 🟢 Pass | `proxy.ts` deletes `next-auth.session-token` + `__Secure-*` variants |
| Role re-validation from DB | 🟢 Pass | Every JWT refresh queries `profiles` table for latest role/onboarding state |
| Session version tracking | 🟢 Pass | `session_version` field allows forced re-authentication |

---

## 3. Admin Authorization

| Check | Status | Notes |
|-------|--------|-------|
| DB-based whitelist (`admin_whitelist` table) | 🟢 Pass | Checked by email and wallet address |
| Env-based fallback (`ADMIN_WALLETS`) | 🟢 Pass | Functional with security warning; can be disabled via `DISABLE_ENV_ADMIN=true` |
| Admin flag set in JWT at sign-in | 🟢 Pass | `token.isAdmin` set in JWT callback using same DB logic |
| Admin flag refreshed on every JWT refresh | 🟢 Pass | Prevents stale admin access after whitelist removal |
| Route guard (`canAccessRoute`) | 🟢 Pass | Sync check from JWT — no DB hit in middleware |
| Admin routes protected in proxy.ts | 🟢 Pass | `/admin/*` checks token validity + `canAccessRoute()` |
| API admin routes independently protected | 🟢 Pass | Each `/api/admin/*` route calls `isAdmin(session)` independently |

---

## 4. Protected Route Enforcement

| Check | Status | Notes |
|-------|--------|-------|
| Protected routes defined | 🟢 Pass | `/dashboard`, `/settings`, `/courses`, `/onboarding` prefix-matched |
| Exact-match routes | 🟢 Pass | `/profile` exact match (own profile protected; `/profile/username` public) |
| Onboarding redirect | 🟢 Pass | Incomplete onboarding → `/onboarding`; completed users redirected away |
| Login redirect for authenticated users | 🟢 Pass | Redirects to dashboard or onboarding based on completion |
| Encrypted callback URL token | 🟢 Pass | `encryptCallbackUrl()` prevents open redirect attacks |
| Locale-aware routing | 🟢 Pass | Locale prefix stripped before route matching |

---

## 5. Account Deletion

| Check | Status | Notes |
|-------|--------|-------|
| Soft delete with grace period | 🟢 Pass | `deleted_at` timestamp set, 30-day recovery window |
| Rate limited | 🟢 Pass | `checkRateLimit('delete-account:${ip}')` |
| Audit logged | 🟢 Pass | `logAuditEvent()` with `account_deleted` action |
| Session invalidated after deletion | 🟢 Pass | JWT callback checks `deleted_at` on every refresh |

---

## 6. Findings Summary

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| AUTH-01 | 🟢 Info | `ADMIN_WALLETS` env fallback exists with security warning and `DISABLE_ENV_ADMIN` toggle | By design — emergency backdoor |
| AUTH-02 | 🟢 Info | In-memory nonce/lockout stores used in dev only | Redis required in production (503 if missing) |
| AUTH-03 | 🟢 Info | `getRoleFromToken()` always returns `'student'` | By design — single role currently |

---

## Verdict: ✅ PASS — No outstanding issues

Authentication and authorization are well-implemented with defense-in-depth:
- Nonce-based wallet auth with lockout + rate limiting
- JWT sessions with DB re-validation on every refresh
- Independent admin checks at both proxy and API route levels
- Audit logging for all auth events
- Soft deletion with session invalidation
