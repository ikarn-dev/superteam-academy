# Audit Report: On-Chain Integration & Solana Security

**Date:** 2026-03-03  
**Scope:** `context/solana/`, API routes for on-chain operations, `docs/SPEC.md`, `docs/ARCHITECTURE.md`  
**Severity Scale:** 🟢 Pass | 🟡 Advisory | 🔴 Critical

---

## 1. Program Architecture Alignment

### 1.1 Spec Compliance (SPEC.md v3.0)

| Spec Requirement | Implementation | Status |
|------------------|---------------|--------|
| Config PDA as singleton root | `deriveConfigPda()` — `["config"]` seeds | 🟢 Aligned |
| Course PDA with `course_id` seeds | `deriveCourse()` — `["course", course_id]` | 🟢 Aligned |
| Enrollment PDA per learner × course | `deriveEnrollment()` — `["enrollment", course_id, user]` | 🟢 Aligned |
| MinterRole PDA per minter | `deriveMinterRolePda()` — `["minter", minter]` | 🟢 Aligned |
| AchievementType PDA | `deriveAchievementTypePda()` — `["achievement", id]` | 🟢 Aligned |
| AchievementReceipt PDA | Seeds `["achievement_receipt", id, recipient]` | 🟢 Aligned |
| XP Token as Token-2022 | `TOKEN_2022_PROGRAM_ID` constant used | 🟢 Aligned |
| Metaplex Core for credentials | `MPL_CORE_PROGRAM_ID` constant used | 🟢 Aligned |

### 1.2 Instruction Implementation

| Instruction | API Route | Backend-Signed | Status |
|-------------|-----------|---------------|--------|
| `enroll` | Client-side (wallet adapter) | ❌ (learner signs) | 🟢 Correct |
| `complete_lesson` | `/api/lessons/complete` | ✅ backend_signer | 🟢 Correct |
| `finalize_course` | `/api/courses/finalize` | ✅ backend_signer | 🟢 Correct |
| `issue_credential` | `/api/credentials/issue` | ✅ backend_signer | 🟢 Correct |
| `upgrade_credential` | `/api/credentials/issue` (auto) | ✅ backend_signer | 🟢 Correct |
| `close_enrollment` | Client-side (wallet adapter) | ❌ (learner signs) | 🟢 Correct |
| `reward_xp` | `/api/achievements/award` (fallback) | ✅ minter | 🟢 Correct |
| `award_achievement` | `/api/achievements/award` | ✅ minter | 🟢 Correct |

---

## 2. Backend Signer Security

| Check | Status | Notes |
|-------|--------|-------|
| Private key from env var | 🟢 Pass | `BACKEND_SIGNER_PRIVATE_KEY` — base58 decoded |
| Error on missing/invalid key | 🟢 Pass | Descriptive error from `loadBackendSigner()` |
| Key rotation via `update_config` | 🟢 Pass | Spec supports rotation without program upgrade |
| Config PDA existence verification | 🟢 Pass | `verifyBackendSignerAccountExists()` |
| Key never exposed client-side | 🟢 Pass | Server-side only, no NEXT_PUBLIC prefix |
| KMS recommendation noted | 🟢 Info | Code comment recommends AWS KMS for production |

---

## 3. Anti-Cheat Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| Lesson bitmap prevents double completion | On-chain bit check | 🟢 Pass |
| XP amounts from Course PDA, not parameters | `course.xp_per_lesson` on-chain | 🟢 Pass |
| Backend co-signature required | All completion/credential routes | 🟢 Pass |
| Rate limiting before signing | `checkRateLimit()` on all routes | 🟢 Pass |
| Creator reward gating | `min_completions_for_reward` on Course PDA | 🟢 Pass |
| AchievementReceipt init collision | PDA collision prevents double award | 🟢 Pass |
| MinterRole cap enforcement | `max_xp_per_call` per MinterRole PDA | 🟢 Pass |
| Prerequisite enforcement | On-chain check at `enroll` | 🟢 Pass |

---

## 4. Wallet Ownership Security

| Check | Status | Notes |
|-------|--------|-------|
| Lesson completion requires ownership | 🟢 Pass | `linked_accounts` lookup |
| Course finalization requires ownership | 🟢 Pass | Same pattern |
| Achievement award requires ownership | 🟢 Pass | Same pattern |
| Credential issuance uses linked wallet | 🟢 Pass | Session user → `linked_accounts` |
| Prevents User A acting as User B | 🟢 Pass | 403 response on mismatch |

---

## 5. XP Token Account Management

| Check | Status | Notes |
|-------|--------|-------|
| `ensureXpAta()` creates ATA if missing | 🟢 Pass | Called before all XP operations |
| Both learner and creator ATAs ensured | 🟢 Pass | `finalize_course` ensures both |
| Token-2022 program ID used | 🟢 Pass | `TOKEN_2022_PROGRAM_ID` |
| XP balance query utilities | 🟢 Pass | `getXpBalance()` and `getXpBalances()` |

---

## 6. Credential NFT Security

| Check | Status | Notes |
|-------|--------|-------|
| Issue vs upgrade from on-chain data | 🟢 Pass | `checkCredentialStatus()` reads enrollment |
| Soulbound via PermanentFreezeDelegate | 🟢 Pass | Plugin applied during `createV2` CPI |
| Config PDA as update authority | 🟢 Pass | Only program can create/upgrade |
| Track collection mapping from env | 🟢 Pass | `getTrackCollection()` with validation |
| One credential per learner per track | 🟢 Pass | Enrollment tracks `credential_asset` |

---

## 7. RPC / Network Security

| Check | Status | Notes |
|-------|--------|-------|
| Required RPC URL in production | 🟢 Pass | `getRpcUrl()` throws without explicit URL |
| Devnet RPC warning | 🟢 Pass | Logged once if using default |
| Connection confirmation level | 🟢 Pass | `'confirmed'` throughout |

---

## Verdict: ✅ PASS — No outstanding issues

Full alignment with SPEC.md v3.0. All anti-cheat controls, wallet ownership checks, credential lifecycle, XP economics, and achievement system are correctly implemented.
