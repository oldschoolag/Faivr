# FAIVR Smart Contracts — Automated Security Audit Report

**Date:** 2026-02-16  
**Auditor:** Automated (Slither + Manual Review)  
**Contracts:** FaivrIdentityRegistry, FaivrReputationRegistry, FaivrValidationRegistry, FaivrFeeModule, FaivrRouter  
**Solidity:** ^0.8.24 | Foundry | OpenZeppelin Upgradeable | UUPS Proxies  

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 3 |
| Medium | 6 |
| Low | 7 |
| Informational | 5 |

**Overall Assessment:** The codebase is well-structured with good use of OpenZeppelin upgradeable patterns. No critical vulnerabilities were found. However, several high and medium severity issues exist around DoS vectors, unsafe casting, and access control gaps that should be addressed before mainnet deployment.

---

## High Severity

### H-01: Unbounded Loop DoS in `readAllFeedback()` and `getSummary()`

**Severity:** High  
**Location:** `FaivrReputationRegistry.sol:148-173` (getSummary), `FaivrReputationRegistry.sol:181-248` (readAllFeedback)  
**Description:** Both functions iterate over all feedback entries for all provided client addresses in nested loops. As feedback accumulates, these view functions will exceed block gas limits, effectively becoming unusable. `readAllFeedback()` does two full passes (count + fill), doubling the cost. While these are `view` functions and don't risk state corruption, they are likely called by other contracts or relied upon by the frontend.  
**Recommendation:**  
- Add pagination parameters (`offset`, `limit`) to both functions.
- Consider maintaining running tallies for `getSummary()` to avoid iteration entirely.

### H-02: Unbounded Loop DoS in `ValidationRegistry.getSummary()`

**Severity:** High  
**Location:** `FaivrValidationRegistry.sol:119-155`  
**Description:** `getSummary()` iterates over all `_agentValidations[agentId]` entries with a nested loop over `validatorAddresses`. As validations accumulate, this becomes unusable. The `_agentValidations` array also grows unboundedly with no cleanup mechanism.  
**Recommendation:** Add pagination or maintain incremental counters per validator/tag combination.

### H-03: Unsafe Downcast in `getSummary()` — Potential Overflow Truncation

**Severity:** High  
**Location:** `FaivrValidationRegistry.sol:152` — `uint8(total / count)`  
**Location:** `FaivrReputationRegistry.sol:168` — `int128(total / int256(int64(count)))`  
**Description:**  
- In ValidationRegistry, `total` is a `uint256` accumulating `uint8` response values (0-100). With enough entries, `total / count` could theoretically exceed 255, though practically the average of values 0-100 stays in range. More critically, if `count` is small and values are large, no check exists.
- In ReputationRegistry, `total` is `int256` accumulating `int128` values. The downcast to `int128` can silently truncate if the average exceeds `int128` range, which is possible with extreme values.

**Recommendation:** Add explicit bounds checks before downcasting, or use `SafeCast`.

---

## Medium Severity

### M-01: FaivrRouter `registerAndFund()` Registers Agent Owned by Router, Not Caller

**Severity:** Medium  
**Location:** `FaivrRouter.sol:55-66`  
**Description:** `registerAndFund()` calls `identityRegistry.register(agentURI)` which mints the NFT to `msg.sender` — but `msg.sender` is the Router contract, not the end user. The agent NFT will be owned by the Router with no transfer mechanism. Similarly, `settleAndGiveFeedback()` calls `feeModule.settleTask(taskId)` where the FeeModule checks `task.client != msg.sender` — but `msg.sender` is the Router, not the original funder.  
**Recommendation:** The Router needs to either:
1. Accept the agent NFT and transfer it to the caller, or
2. Use a pattern where registration is done directly by the user and the Router only orchestrates post-registration steps, or
3. The sub-contracts need to support a `on behalf of` pattern.

### M-02: `settleTask()` Sends ETH to Agent Owner via Low-Level Call — Potential Griefing

**Severity:** Medium  
**Location:** `FaivrFeeModule.sol:137-143`  
**Description:** `settleTask()` sends ETH to three addresses (`agentOwner`, `_protocolWallet`, `_devWallet`) using `_sendETH()` which uses a low-level `.call{value:}`. If the agent owner is a contract that reverts on receive (or consumes excessive gas), the entire settlement reverts, blocking the client from settling and potentially locking funds until the deadline expires.  
**Recommendation:**  
- Use a pull-based withdrawal pattern for agent payouts, or
- Use a fixed gas stipend (e.g., `call{value: amount, gas: 2300}`), or
- Allow settlement to succeed even if the agent payout transfer fails (escrow the amount).

### M-03: Missing Zero-Address Check on `identityRegistry` in Initialize

**Severity:** Medium  
**Location:** `FaivrFeeModule.sol:59,75`, `FaivrReputationRegistry.sol:54,59`, `FaivrValidationRegistry.sol:51,56`  
**Description:** The `identityRegistry` parameter in `initialize()` is not checked for `address(0)`. If set to zero, all agent lookups will fail, but the contracts cannot be re-initialized. A proxy redeployment would be required.  
**Recommendation:** Add `if (identityRegistry_ == address(0)) revert ZeroAddress();` checks.

### M-04: `appendResponse()` Has No Access Control — Anyone Can Append

**Severity:** Medium  
**Location:** `FaivrReputationRegistry.sol:112-123`  
**Description:** `appendResponse()` can be called by any address. While the response is attributed to `msg.sender`, this allows spam responses on any feedback entry. The `_responseCounts` mapping grows unboundedly per responder, and events are emitted for each call, potentially polluting indexers.  
**Recommendation:** Consider restricting responses to the agent owner/operator, or adding a whitelist/role for authorized responders.

### M-05: `validationRequest()` Can Overwrite Existing Request Without Resetting Response

**Severity:** Medium  
**Location:** `FaivrValidationRegistry.sol:72-89`  
**Description:** If `validationRequest()` is called with an existing `requestHash`, the event is re-emitted but the stored `validatorAddress` and `agentId` are NOT updated (only set on first creation). However, the comment says "this is updating the request." This creates confusion: the validator and agent fields are immutable after first set, but a new event suggests an update occurred.  
**Recommendation:** Either revert on duplicate `requestHash`, or explicitly update all fields and reset the response.

### M-06: Divide-Before-Multiply Precision Loss in Fee Calculation

**Severity:** Medium  
**Location:** `FaivrFeeModule.sol:122-124`  
**Description:**  
```solidity
uint256 totalFee = (task.amount * _feeBps) / 10_000;
uint256 protocolFee = (totalFee * 90) / 100;
uint256 devFee = totalFee - protocolFee;
```
The two-step division causes precision loss. For small amounts, `totalFee` could round to 0, meaning no fees are collected. The `protocolFee` calculation also truncates.  
**Recommendation:** Compute in a single step: `protocolFee = (amount * feeBps * 90) / (10_000 * 100)` and derive devFee similarly, or accept the dust and document it.

---

## Low Severity

### L-01: Reentrancy in `_registerInternal()` via `_safeMint()`

**Severity:** Low  
**Location:** `FaivrIdentityRegistry.sol:88-104`  
**Description:** `_safeMint()` calls `onERC721Received` on the recipient if it's a contract, before state variables (`_agentActive`, `_registeredAt`, `_agentWallets`, `_metadata`) are set. A malicious contract could re-enter `register()` to mint multiple agents in unexpected states. Impact is low since each re-entrant call gets a new `agentId` and the state for each is set correctly after return.  
**Recommendation:** Move `_safeMint()` to the end of `_registerInternal()`, or use `_mint()` instead (which skips the callback).

### L-02: `deactivateAgent()` / `reactivateAgent()` Only Allow Owner, Not Approved Operators

**Severity:** Low  
**Location:** `FaivrIdentityRegistry.sol:161-172`  
**Description:** These functions check `ownerOf(agentId) != msg.sender` directly, while other functions like `setAgentURI()` and `setMetadata()` use `_requireOwnerOrApproved()` which also allows approved operators. This inconsistency may prevent delegated management.  
**Recommendation:** Use `_requireOwnerOrApproved()` for consistency, or document the intentional restriction.

### L-03: `_requireExists()` Doesn't Account for Burned Tokens

**Severity:** Low  
**Location:** `FaivrIdentityRegistry.sol:225-227`  
**Description:** `_requireExists()` only checks `agentId == 0 || agentId >= _nextAgentId`. If ERC721 burning is ever added (or via the inherited `_burn()`), a burned token would pass this check but `ownerOf()` would revert. Currently burning is not exposed, but it's inherited.  
**Recommendation:** Use `_ownerOf(agentId) != address(0)` or call the parent's existence check.

### L-04: No Nonce in `setAgentWallet` EIP-712 Signature — Replay Risk

**Severity:** Low  
**Location:** `FaivrIdentityRegistry.sol:137-155`  
**Description:** The EIP-712 struct for `SetAgentWallet` uses `(agentId, newWallet, deadline)` but no nonce. If a wallet is set, then unset, the same signature (if not expired) could be replayed to re-set it. The `deadline` provides some mitigation but doesn't prevent reuse within the validity window.  
**Recommendation:** Add a nonce per agentId to the EIP-712 struct, incrementing on each `setAgentWallet` call.

### L-05: `reclaimTask()` Not Pausable

**Severity:** Low  
**Location:** `FaivrFeeModule.sol:150`  
**Description:** `reclaimTask()` lacks the `whenNotPaused` modifier, unlike `fundTask()` and `settleTask()`. While this could be intentional (allow reclaims during emergencies), it's worth documenting the design decision.  
**Recommendation:** Add `whenNotPaused` for consistency, or document why reclaims should work when paused.

### L-06: ReputationRegistry `initialize()` Grants `DEFAULT_ADMIN_ROLE` to `msg.sender`, Not a Parameter

**Severity:** Low  
**Location:** `FaivrReputationRegistry.sol:57`, `FaivrValidationRegistry.sol:54`  
**Description:** Unlike `FaivrFeeModule` and `FaivrIdentityRegistry` which accept an `admin` parameter, these two contracts grant `DEFAULT_ADMIN_ROLE` to `msg.sender`. In a deployment script where a deployer EOA calls `initialize()` through a proxy, the deployer becomes admin. This is fine if intentional, but inconsistent with the other contracts.  
**Recommendation:** Accept an explicit `admin` parameter for consistency.

### L-07: Unused `DISPUTED` Task Status

**Severity:** Low  
**Location:** `IFaivrFeeModule.sol:5` — `enum TaskStatus { FUNDED, SETTLED, RECLAIMED, DISPUTED }`  
**Description:** The `DISPUTED` status is defined in the enum but never used in the FeeModule implementation. This suggests incomplete functionality.  
**Recommendation:** Either implement dispute resolution or remove the enum value (noting this changes ABI).

---

## Informational

### I-01: Storage Gap Correctness

**Severity:** Informational  
**Description:** All five contracts include `uint256[50] private __gap` for upgrade safety. This is correct. However, the gap size should be verified against total storage slot usage to ensure future variables can be added. Each contract should document how many slots are used and how many remain.

### I-02: `NewFeedback` Event Emits `tag1` Twice

**Severity:** Informational  
**Location:** `FaivrReputationRegistry.sol:94`  
**Description:** The `NewFeedback` event is emitted with `tag1` in both the `indexedTag1` and `tag1` positions, passing `tag1` for both. Looking at the interface, the event signature expects `indexedTag1` and `tag1` separately — this is correct (indexed string is hashed, non-indexed is readable). No bug, just noting the pattern.

### I-03: `getResponseCount()` Returns 0 When No Responders Provided

**Severity:** Informational  
**Location:** `FaivrReputationRegistry.sol:256-262`  
**Description:** When called with an empty `responders` array, the function returns 0 instead of the total count across all responders. This is documented in the comment but may surprise callers.

### I-04: Slither False Positives (OpenZeppelin Library)

**Severity:** Informational  
**Description:** Slither flagged several issues in OpenZeppelin library code (Math.mulDiv incorrect-exp, assembly usage, naming conventions). These are all false positives or known patterns in the audited OZ v5.x library and require no action.

### I-05: No `receive()` or `fallback()` on FeeModule

**Severity:** Informational  
**Location:** `FaivrFeeModule.sol`  
**Description:** The FeeModule accepts ETH only via `fundTask()` (which is `payable`). There's no `receive()` function, meaning direct ETH transfers will revert. This is correct behavior but worth noting — if ETH is accidentally sent to the contract address, it cannot be recovered.

---

## Slither Raw Findings (FAIVR-Specific, Excluding OZ Library)

| Detector | Severity | Finding |
|----------|----------|---------|
| arbitrary-send-eth | High | `_sendETH()` sends to arbitrary user — **covered in M-02** |
| divide-before-multiply | Medium | `settleTask()` fee calculation — **covered in M-06** |
| uninitialized-local | Medium | `idx`, `totalCount`, `total`, `found` — all intentionally zero-initialized (false positives) |
| unused-return | Medium | `_requireAgentExists()` ignores `ownerOf` return — intentional (uses revert) |
| missing-zero-check | Low | `identityRegistry_` in 3 initializers — **covered in M-03** |
| reentrancy-benign | Low | `_registerInternal` via `_safeMint` — **covered in L-01** |
| reentrancy-events | Low | Events after `_safeMint` external call — **covered in L-01** |
| timestamp | Low | Block.timestamp comparisons — acceptable for deadline logic |
| naming-convention | Info | `__gap` variables — intentional upgrade pattern |
| unused-state | Info | `__gap` variables — intentional storage gaps |

---

## Recommendations Summary

1. **Priority 1 (Pre-Mainnet):** Fix Router ownership issue (M-01), add pagination to view functions (H-01, H-02), add zero-address checks (M-03)
2. **Priority 2 (Pre-Mainnet):** Add pull-payment pattern for ETH settlements (M-02), add nonce to EIP-712 sig (L-04), add SafeCast for downcasts (H-03)
3. **Priority 3 (Nice-to-Have):** Restrict `appendResponse()` (M-04), fix validation request overwrite (M-05), align initializer patterns (L-06)
4. **Consider:** Formal verification of fee arithmetic, fuzz testing of edge cases, upgrade simulation tests

---

*Report generated automatically. Manual expert review recommended before production deployment.*
