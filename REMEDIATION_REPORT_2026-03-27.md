# FAIVR remediation report — 2026-03-27

## Scope completed

Focused remediation against the current `main` working tree in `/home/node/.openclaw/Faivr`, using `origin/feat/shopify-ops-agent-v1` only as a source of candidate ideas.

## Remote branch comparison notes

Compared `origin/main` vs `origin/feat/shopify-ops-agent-v1`.

Audit-relevant observations:
- **Useful / partially useful:** `contracts/script/Deploy.s.sol` in the remote branch fixes the wrong initializer arguments for reputation/validation and also attempts extra router wiring.
- **Not blindly ported:** the remote branch also contains broad marketplace/chat/product changes unrelated to the audit brief and not obviously trust-improving.
- **Important nuance:** the remote branch's router-wiring idea is incomplete against current `main` because router flows also need identity `REGISTRAR_ROLE`, not just fee-module permissions.

## Code remediations applied

### Contracts / deployment
- Fixed `Deploy.s.sol` so `FaivrReputationRegistry.initialize(...)` and `FaivrValidationRegistry.initialize(...)` receive the identity registry address instead of the admin address.
- Added **best-effort** post-deploy router wiring in `Deploy.s.sol` for:
  - `FaivrIdentityRegistry.REGISTRAR_ROLE`
  - `FaivrFeeModule.ROUTER_ROLE`
- The new role grants are wrapped in `try/catch` so deployments do not hard-fail if the broadcaster is not the configured admin.

### Verification flow honesty / shared state
- Switched the challenge flow to a **shared in-memory store** so `/api/verify/challenge` and `/api/verify/check` actually reference the same data.
- Removed the unsupported public **Twitter/X verification** path from the active verification flow.
- Reworded verification responses and UI to make clear this is an **off-chain preview only**.
- `/api/verify/status/[agentId]` now explicitly says it is **not authoritative** instead of pretending to be a live status endpoint.

### Homepage / trust signals
- Removed unsupported homepage stat fallbacks like hardcoded review counts and fallback agent totals.
- Reduced homepage stats to values that can be sourced from the configured deployment now:
  - on-chain agent count
  - protocol fee
- Added a note that reviews / volume / verification are intentionally omitted until authoritative data is wired.
- Cleaned example agent cards so they no longer claim unsupported performance or network coverage.
- Added explicit marketplace messaging when the UI is showing **example listings** rather than live on-chain listings.

### Task UI correctness
- Fixed task deadline handling in `web/components/escrow/TaskManager.tsx` so the UI uses the stored deadline timestamp directly instead of adding `fundedAt` twice.

### Support admin exposure
- Disabled the public `/support-admin` UI by default.
- Added server-side guards for:
  - `GET /api/support/feedback`
  - `GET /api/support/admin/qa`
  - `POST /api/support/admin/qa`
- New guard requires both:
  - `FAIVR_ENABLE_SUPPORT_ADMIN=true`
  - `FAIVR_SUPPORT_ADMIN_TOKEN`
- Public feedback submission (`POST /api/support/feedback`) remains available.

### Docs / copy / legal access
- Updated docs and support knowledge-base copy to stop overstating verification.
- Removed/softened false soulbound language in public-facing docs and Genesis copy where it was clearly unsupported.
- Added site-accessible legal routes:
  - `/terms`
  - `/privacy`
  - `/risk-disclosure`
- Added footer links to those legal pages.
- Softened one misleading README claim about the launch vertical being already verified on-chain.

## Files changed

- `README.md`
- `contracts/script/Deploy.s.sol`
- `web/app/api/support/admin/qa/route.ts`
- `web/app/api/support/feedback/route.ts`
- `web/app/api/verify/challenge/route.ts`
- `web/app/api/verify/check/route.ts`
- `web/app/api/verify/status/[agentId]/route.ts`
- `web/app/docs/page.tsx`
- `web/app/genesis/page.tsx`
- `web/app/page.tsx`
- `web/app/privacy/page.tsx`
- `web/app/risk-disclosure/page.tsx`
- `web/app/support-admin/page.tsx`
- `web/app/terms/page.tsx`
- `web/components/agent/AgentCard.tsx`
- `web/components/escrow/TaskManager.tsx`
- `web/components/layout/Footer.tsx`
- `web/components/legal/LegalDocument.tsx`
- `web/components/verification/VerifyAgentModal.tsx`
- `web/hooks/useAgents.ts`
- `web/hooks/useContractStats.ts`
- `web/lib/legal.ts`
- `web/lib/support/admin.ts`
- `web/lib/support/knowledge.ts`
- `web/lib/verification/challenges.ts`

## Validation run

### Completed
- `git diff --check` ✅
- `npm ci --include=dev` in `web/` ✅
- `npm run build` in `web/` ✅

### Build warnings still present
`next build` completed with warnings from upstream dependency resolution:
- `@metamask/sdk` missing `@react-native-async-storage/async-storage`
- `pino` missing `pino-pretty`

These warnings were pre-existing dependency hygiene issues in the frontend toolchain and were **not** part of this remediation pass.

### Could not run
- `forge test` / Solidity test suite: **UNCERTAIN: forge is not installed on this host**

## Likely audit status after this pass

### Likely closed
- Deploy script wrong initialization target for reputation/validation
- Verification challenge/check routes not sharing challenge state
- Misleading homepage fallback stats
- Mock/example cards marked as verified / overstated example performance
- Task deadline UI math bug
- Public support-admin exposure via unauthenticated page and admin APIs
- Missing legal pages on the website
- Public verification flow overstating what it actually does
- Public docs claiming soulbound verification/identity behavior where unsupported in the current app

### Partial / improved but not fully closed
- Deployment/router wiring: improved in deploy script, but still depends on deploy-time admin/broadcaster realities and was not exercised on-chain here
- Genesis program trust copy: significantly softened, but the underlying Genesis implementation and operating model still deserve a focused audit pass
- Verification: public UI is now honest, but fully authoritative on-chain verification UX is still not shipped

### Still open / not addressed in this window
- Full smart-contract re-audit of Genesis semantics and router flows
- Any live deployment drift between repo and production environment
- Dependency security warnings in the Next.js stack
- End-to-end on-chain verification issuance / renewal flow
- Any claims that require production data validation outside this repo review

## Re-audit blockers / honest notes

- **UNCERTAIN:** I did not validate the live deployed website against this exact working tree.
- **UNCERTAIN:** I did not run Foundry tests because Forge is unavailable on this host.
- A focused re-audit request should probably center on:
  1. deployment script corrections,
  2. trust-copy cleanup / public surface honesty,
  3. support-admin exposure closure,
  4. deadline UI fix,
  5. any remaining Genesis / router contract concerns as a smaller follow-up scope.
