# FAIVR audit remediation review packet for Kaihua

Date: 2026-04-05
Workspace: `/home/node/.openclaw/workspace-openai-faivr/Faivr`
Branch: `main`

## Executive summary

FAIVR now has a materially stronger post-audit code state than the last public re-review anchor.

There were two remediation waves:

1. **Closure-blocker fixes already landed earlier**
   - `6963f08` addressed the last known medium-severity blocker set from the re-review:
     - `F-02` value-decimal normalization in reputation summaries
     - `F-03` stale verification proof invalidation across revoke / expiry / owner drift
     - `F-05` zero-amount ERC20 fee-transfer settlement blocker

2. **Product-decision-dependent hardening landed now**
   - `988b9aa` implements the fee-module hardening pass that needed explicit policy choices:
     - `F-06` token support narrowed to ETH + approved ERC20s only
     - `F-07` failed ERC20 payouts no longer block settlement; they fall back to pending token withdrawals
     - `F-08` failed ETH pending withdrawals can now be redirected to a rescue address
     - `F-10` misleading fee metric renamed from `totalFeesCollected` to `totalFeesAccrued`

This is now in a state where an external reviewer should be able to reason cleanly about the intended trust model and settlement behavior.

## What changed in the latest hardening pass

### 1) Supported-token policy is now explicit

User decision: support only:
- ETH
- USDC
- USDT
- Frankencoin

Implementation effect:
- ETH remains implicitly supported via `address(0)`
- ERC20 funding now requires an admin-enabled allowlist entry via `setSupportedToken(token, true)`
- deploy script wiring now supports environment variables:
  - `USDC_TOKEN`
  - `USDT_TOKEN`
  - `FRANKENCOIN_TOKEN`

Why this matters:
- removes the old “accept arbitrary ERC20s” posture
- narrows the attack / incompatibility surface to explicitly intended assets

### 2) ERC20 funding now checks actual amount received

Implementation effect:
- funding measures contract balance before and after `safeTransferFrom`
- if `received != requested`, funding reverts via `TokenAmountMismatch(token, expected, received)`

Why this matters:
- fee-on-transfer / deflationary / weird-token accounting drift is rejected at funding time
- this directly closes the practical accounting problem behind `F-06`

### 3) Failed ERC20 payout transfers no longer block settlement

Implementation effect:
- settlement first tries direct ERC20 transfers to:
  - agent owner
  - protocol wallet
  - dev wallet
- if a transfer fails, the amount is credited into:
  - `pendingTokenWithdrawal(token, account)`
- recovery paths added:
  - `withdrawPendingToken(token)`
  - `withdrawPendingTokenTo(token, recipient)`

Why this matters:
- the old push-transfer fragility no longer prevents settlement completion
- this is the chosen fix for `F-07`

### 4) Failed ETH pending withdrawals can now be redirected

Implementation effect:
- existing pending ETH path remains
- new rescue path added:
  - `withdrawPendingTo(address payable recipient)`

Why this matters:
- if the original recipient is a contract wallet or smart account that rejects plain ETH, funds are no longer trapped retrying the same failing destination
- this is the chosen fix for `F-08`

### 5) Fee metric semantics are now honest

Implementation effect:
- renamed:
  - `totalFeesCollected(address token)`
  - to `totalFeesAccrued(address token)`
- ABI references updated in TS contract bindings and docs

Why this matters:
- removes a misleading public/accounting interpretation
- this is the chosen fix for `F-10`

## Earlier blocker fixes already in place

These were already handled before the latest hardening pass and remain part of the current state:

### `F-02` — reputation summary math
- summary aggregation now normalizes mixed `valueDecimals` before averaging
- avoids incorrect mixed-precision outputs

### `F-03` — stale verification proof
- revoked / expired / owner-drifted verification no longer presents as currently valid
- `revoke()` burns the verification NFT
- `getVerification()` and `isVerified()` reflect inactive state
- `tokenURI()` downgrades inactive state to historical proof, not active proof
- `syncVerification()` rebinds proof after owner transfer

### `F-05` — zero-amount ERC20 fee-transfer blocker
- zero-value ERC20 fee legs are skipped instead of always attempting transfer
- protects settlement in zero-fee / genesis paths and with tokens that reject zero transfers

## Files changed in the latest hardening pass

Primary code / interface files:
- `contracts/src/FaivrFeeModule.sol`
- `contracts/src/interfaces/IFaivrFeeModule.sol`
- `contracts/script/Deploy.s.sol`

Tests:
- `contracts/test/FaivrFeeModule.t.sol`
- `contracts/test/FaivrRouter.t.sol`

Docs / bindings:
- `web/lib/contracts.ts`
- `lib/contracts.ts`
- `docs/CONTRACT-ARCHITECTURE.md`
- `docs/SECURITY-FIXES.md`
- `SECURITY_FIXES.md`

## Local verification

Executed locally in `contracts/`:
- `forge test -vvv`

Result:
- **124/124 tests passing**
- **0 failed**
- **0 skipped**

Notable verification coverage now includes:
- unsupported-token rejection at funding time
- zero-amount ERC20 settlement fee skipping
- ERC20 payout failure fallback into pending token withdrawals
- ETH pending-withdrawal redirect path via `withdrawPendingTo(...)`
- deploy script / role wiring
- upgrade-layout preservation test for `FaivrFeeModule`

## Reviewer focus areas for Kaihua

If Kaihua wants to spend time efficiently, these are the highest-value checks:

### A. FeeModule upgrade-safety with appended storage
The latest hardening pass appended:
- `_supportedTokens`
- `_pendingTokenWithdrawals`

The storage gap was reduced accordingly.

Ask:
- verify the updated storage layout is acceptable for the intended upgrade path
- confirm the existing upgrade preservation test is sufficient for reviewer confidence

### B. Allowed-token rollout assumptions
The code now enforces an explicit ERC20 allowlist, but production safety still depends on:
- enabling only intended token addresses on the live network
- confirming the chosen USDC / USDT / Frankencoin addresses are canonical for deployment

Ask:
- confirm the allowlist policy is the right tradeoff for v1
- confirm there are no missing operational safeguards around token enablement

### C. Pending-withdrawal fallback semantics
The new posture is:
- attempt direct payout first
- if payout fails, do not block settlement
- credit the recipient into a pull-based pending balance

Ask:
- confirm this is the right failure-handling posture for both ETH and ERC20
- check for any edge-case accounting or griefing concern in the pending withdrawal paths

### D. Metric rename implications
The old name suggested realized revenue; the new name is intentionally narrower.

Ask:
- confirm `totalFeesAccrued` is the correct onchain semantics name
- note any downstream UI / analytics adjustments that should accompany the rename

## Remaining non-code / rollout items

These are not code blockers in the local repo, but they still matter before claiming full closure:

1. **Live deployment parity**
   - upgraded implementation must actually be deployed onchain
   - roles / registry wiring must match the expected setup

2. **Supported-token configuration onchain**
   - ETH is implicit
   - USDC / USDT / Frankencoin must be explicitly enabled with the correct network addresses

3. **External review closure**
   - D23E still needs to review the new public code state for formal closure

## Bottom line

The repo is no longer in the earlier “closure blocked by unresolved policy-dependent residuals” state.

Those decisions are now made and implemented:
- asset support is narrowed
- weird-token accounting is rejected at funding time
- failed payout transfers no longer block settlement
- ETH rescue is practical
- fee metric semantics are honest

The main remaining work is now:
- deployment parity
- onchain token configuration
- external reviewer sign-off
