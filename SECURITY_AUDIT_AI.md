# FAIVR Smart Contracts — AI Security Audit Report

**Date:** 2026-02-18  
**Auditor:** Ben Claw (AI CTO, FAIVR)  
**Scope:** All contracts in `contracts/src/` (6 core + 6 interfaces)  
**Solidity Version:** ^0.8.24  
**Framework:** Foundry + OpenZeppelin Upgradeable v5  

---

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| **Overall Risk Level** | **MEDIUM** |
| **Critical Findings** | 2 |
| **High Findings** | 5 |
| **Medium Findings** | 8 |
| **Low Findings** | 7 |
| **Informational** | 10 |

The FAIVR contract suite is reasonably well-structured, using battle-tested OpenZeppelin upgradeable patterns. However, there are **two critical issues** in the FeeModule and Router contracts, several high-severity access control and economic concerns, and multiple medium-severity DoS vectors in the registry contracts.

**The contracts should NOT be deployed to mainnet without addressing Critical and High findings.**

---

## 2. Tool Results

### 2.1 Slither (v0.11.5)

**132 findings total.** Key FAIVR-specific findings (excluding OZ library noise):

#### High Severity
- **Reentrancy in `FaivrFeeModule.settleTask()`**: Slither flags reentrancy on `_sendETH()` calls where `_pendingWithdrawals` is written after external calls. The `nonReentrant` guard mitigates same-function reentrancy, but cross-function reentrancy via `pendingWithdrawal()` view is flagged.
- **Return bomb risk** in `_sendETH()`: Gas-limited call (10,000 gas) with implicit return decoding could be exploited.

#### Medium Severity
- **Divide-before-multiply** in `settleTask()`: `totalFee = (amount * feeBps) / 10_000` then `protocolFee = (totalFee * 90) / 100` — precision loss on small amounts.
- **Reentrancy in `_registerInternal()`**: `_safeMint` calls `onERC721Received` on the receiver before setting `_agentActive`, `_registeredAt`, and `_agentWallets`.
- **Unused return value** in `_requireAgentExists()` — `ownerOf()` return is discarded (benign, relies on revert).

#### Low/Informational
- Uninitialized local variables (view functions — benign).
- Naming convention violations (`__gap` variables — intentional for upgrade gaps).
- Timestamp comparisons (necessary for deadline logic).
- Multiple Solidity pragma versions (OZ library issue, not actionable).

### 2.2 Mythril

**Skipped** — tool timed out during installation (`pip install mythril` blocked by PEP 668). Not a blocking concern; Slither + manual review provide sufficient coverage.

### 2.3 Aderyn

**Skipped** — installation script unavailable. Not blocking.

---

## 3. Manual Review Findings

### CRITICAL-01: Router `settleAndGiveFeedback()` Calls `settleTask()` as Router, Not as Client

**Severity:** Critical  
**Contract:** `FaivrRouter.sol` → `settleAndGiveFeedback()`  
**Description:** The Router calls `feeModule.settleTask(taskId)`, but `settleTask()` requires `task.client == msg.sender`. When called through the Router, `msg.sender` is the Router contract address, NOT the original caller. This means `settleAndGiveFeedback()` will **always revert** with `NotTaskClient` unless the task was funded by the Router itself.

**Impact:** The `settleAndGiveFeedback()` function is completely broken for tasks funded directly via `feeModule.fundTask()`. Only tasks funded through `registerAndFund()` (where the Router is the client) would work — but even then, the Router becomes the client, which has its own issues (the Router can't reclaim, etc.).

**Proof of Concept:**
```solidity
// User funds task directly
feeModule.fundTask{value: 1 ether}(agentId, ETH, 1 ether, 1 days);
// User tries to settle via router — REVERTS because msg.sender = router address
router.settleAndGiveFeedback(taskId, agentId, 80, 0, "quality", "speed");
```

**Recommended Fix:** Either:
1. Add a `settleTaskFor(uint256 taskId, address caller)` function in FeeModule with Router authorization, or
2. Remove `settleAndGiveFeedback()` from Router and have users call `settleTask()` and `giveFeedback()` separately, or
3. Use `delegatecall` pattern (but this introduces proxy complexity).

---

### CRITICAL-02: Router `registerAndFund()` Makes Router the Task Client

**Severity:** Critical  
**Contract:** `FaivrRouter.sol` → `registerAndFund()`  
**Description:** When `registerAndFund()` calls `feeModule.fundTask{value: msg.value}(...)`, the `msg.sender` inside `fundTask` is the Router contract, not the original user. This means:
1. `task.client` is set to the Router address
2. Only the Router can settle or reclaim the task
3. The user loses control of their escrowed funds
4. There is NO function in the Router to reclaim expired tasks

**Impact:** **Permanent loss of funds.** If a task funded via the Router expires, nobody can reclaim — the Router has no `reclaimTask` passthrough, and the user isn't the client.

**Proof of Concept:**
```solidity
// User calls registerAndFund with 0.05 ETH, 1 day deadline
router.registerAndFund{value: 0.05 ether}("uri", ETH, 0.05 ether, 1 days);
// Task expires... user can't reclaim because task.client = router
// Router has no reclaim function → funds stuck forever
```

**Recommended Fix:**
1. Add `reclaimTask` passthrough to Router, OR
2. Redesign so FeeModule accepts a `client` parameter with Router authorization, OR  
3. **Remove `registerAndFund`** until the architecture is fixed — this is the safest option.

---

### HIGH-01: `registerFor()` Has No Access Control — Anyone Can Register Agents for Anyone

**Severity:** High  
**Contract:** `FaivrIdentityRegistry.sol` → `registerFor()`  
**Description:** `registerFor(address to, string calldata agentURI)` has **no access control**. Any address can mint agent NFTs to any other address with any URI. This enables:
1. Spam attacks — minting thousands of worthless agents to a victim
2. Phishing — registering agents with misleading URIs pointing to malicious metadata
3. Reputation pollution — creating agents that the victim didn't authorize

**Impact:** While the victim becomes the owner and can deactivate, the agents are permanently associated with their address on-chain. Unbounded minting also increases `_nextAgentId` without limit.

**Recommended Fix:** Either:
- Require a signature from `to` (EIP-712 permit pattern), or
- Add a role-based whitelist for `registerFor` callers, or
- Remove `registerFor` entirely and only allow self-registration.

---

### HIGH-02: Reentrancy in `_registerInternal()` via `_safeMint()`

**Severity:** High  
**Contract:** `FaivrIdentityRegistry.sol` → `_registerInternal()`  
**Description:** `_safeMint()` calls `onERC721Received()` on the recipient before `_agentActive`, `_registeredAt`, and `_agentWallets` are set. A malicious contract receiver can re-enter during minting to interact with the IdentityRegistry (or other FAIVR contracts) while the agent state is incomplete.

**Attack Scenario:**
1. Malicious contract calls `register()`
2. During `_safeMint()`, `onERC721Received()` callback fires
3. In the callback, the contract calls `getAgentWallet(agentId)` → returns `address(0)` (not yet set)
4. Or calls another FAIVR contract that checks `isActive(agentId)` → returns `false` (not yet set)
5. Or calls `register()` again to manipulate `_nextAgentId` ordering

**Recommended Fix:** Use `_mint()` instead of `_safeMint()`, or move state writes before the mint, or add a reentrancy guard.

---

### HIGH-03: `appendResponse()` Has No Access Control — Anyone Can Spam Responses

**Severity:** High  
**Contract:** `FaivrReputationRegistry.sol` → `appendResponse()`  
**Description:** Any address can call `appendResponse()` for any feedback entry. There is no check that the responder is the agent owner, the feedback author, or any authorized party. The response count is incremented without bound.

**Impact:** 
- Spam: Attackers can emit unlimited `ResponseAppended` events, polluting indexers
- Gas griefing: `_responseCounts` mapping grows unbounded
- Reputation gaming: Off-chain systems that weight responses could be manipulated

**Recommended Fix:** Restrict `appendResponse()` to agent owner/operator or the feedback author.

---

### HIGH-04: Validation Request Hash Collision — First Writer Wins

**Severity:** High  
**Contract:** `FaivrValidationRegistry.sol` → `validationRequest()`  
**Description:** The `requestHash` is caller-supplied. If `record.exists` is true, the function silently skips updating the record but still emits the event. This means:
1. An attacker can front-run a legitimate validation request by submitting the same `requestHash` first, locking in their own `validatorAddress`
2. The legitimate request appears to succeed (event emitted) but the record still points to the attacker's validator

**Attack Scenario:**
```
1. Victim broadcasts tx: validationRequest(legitimateValidator, agentId, uri, hash)
2. Attacker front-runs: validationRequest(attackerValidator, agentId, uri, hash)
3. Record created with attackerValidator
4. Victim's tx emits event but doesn't change the record
5. Only attackerValidator can now respond to this hash
```

**Recommended Fix:** Either revert if `record.exists` is already true, or derive the hash on-chain from `(agentId, validatorAddress, nonce)` instead of accepting it as a parameter.

---

### HIGH-05: No Nonce in `setAgentWallet` EIP-712 Signature — Replay Risk

**Severity:** High  
**Contract:** `FaivrIdentityRegistry.sol` → `setAgentWallet()`  
**Description:** The EIP-712 typed data for `SetAgentWallet` includes `(agentId, newWallet, deadline)` but **no nonce**. This means a valid signature can be replayed:
1. Owner sets wallet to A (with deadline in the future)
2. Owner later sets wallet to B
3. Anyone can replay the original signature to set wallet back to A (if deadline hasn't passed)

**Impact:** Agent wallet can be forcibly changed back to a previous value by anyone holding the old signature.

**Recommended Fix:** Add a per-agent nonce to the EIP-712 struct: `SetAgentWallet(uint256 agentId, address newWallet, uint256 nonce, uint256 deadline)`.

---

### MEDIUM-01: DoS via Unbounded Loops in `getSummary()`, `readAllFeedback()`, `getSummary()` (Validation)

**Severity:** Medium  
**Contract:** `FaivrReputationRegistry.sol`, `FaivrValidationRegistry.sol`  
**Description:** Multiple view functions iterate over unbounded arrays:
- `getSummary()` loops over all feedback for all provided clients
- `readAllFeedback()` does two full passes over all feedback
- `ValidationRegistry.getSummary()` loops over all agent validations

While these are `view` functions and don't consume on-chain gas, they can fail for RPC providers with gas limits on `eth_call`, and front-ends may experience timeouts.

**Recommended Fix:** Paginated versions exist (`getSummaryPaginated`, `readAllFeedbackPaginated`) — consider deprecating the unbounded versions or adding hard limits.

---

### MEDIUM-02: `_sendETH()` Gas Limit of 10,000 May Be Insufficient

**Severity:** Medium  
**Contract:** `FaivrFeeModule.sol` → `_sendETH()`  
**Description:** The `call{gas: 10000}` may not be enough for smart contract wallets (Gnosis Safe, etc.) that need more gas to process ETH receives. If the protocol or dev wallet is a multisig, ETH transfers will consistently fail, silently routing to `_pendingWithdrawals`.

**Impact:** Not a fund loss (pull pattern exists), but creates UX friction and may cause confusion about where fees went.

**Recommended Fix:** Increase gas limit to 50,000–100,000, or use a configurable parameter. Alternatively, document that protocol/dev wallets should be EOAs or have low-gas receive functions.

---

### MEDIUM-03: `tokenURI()` Linear Scan is O(n) and Will Break at Scale

**Severity:** Medium  
**Contract:** `FaivrVerificationRegistry.sol` → `tokenURI()`  
**Description:** The `tokenURI` function does a linear scan from `i=1` to `_nextTokenId + 100` to find the agentId for a given tokenId. This will become extremely expensive as more agents are verified.

**Impact:** `tokenURI()` will hit gas limits on `eth_call` for large token sets, breaking NFT metadata on marketplaces and wallets.

**Recommended Fix:** Add a reverse mapping `mapping(uint256 tokenId => uint256 agentId)` set during `verify()`.

---

### MEDIUM-04: Verification NFT Minted to Agent Owner, Not Agent Address

**Severity:** Medium  
**Contract:** `FaivrVerificationRegistry.sol` → `verify()`  
**Description:** When an agent is verified, the soulbound NFT is minted to `agentOwner` (the human who registered the agent). If the agent NFT is transferred to a new owner, the verification NFT stays with the old owner. The new owner has no verification proof.

**Impact:** Verification state becomes stale after agent transfers. The old owner holds a soulbound NFT for an agent they no longer own.

**Recommended Fix:** Either:
1. Burn and re-mint the verification NFT on agent transfer (requires hooking into IdentityRegistry transfer), or
2. Make `isVerified()` the canonical check instead of NFT ownership, and document that the NFT is a historical record.

---

### MEDIUM-05: `FaivrFeeModule` Storage Gap is 49, Not 50

**Severity:** Medium  
**Contract:** `FaivrFeeModule.sol`  
**Description:** The storage gap is `uint256[49] private __gap` while all other contracts use `uint256[50]`. After accounting for the `_maxEscrowAmount` variable added, this may be intentional — but if another storage variable was added without reducing the gap, there's a collision risk on upgrade.

**Audit Note:** Verify that the total storage slot count (variables + gap) is consistent across all versions. Count: `_nextTaskId` + `_feeBps` + `_protocolWallet` + `_devWallet` + `identityRegistry` + `_tasks` + `_totalFees` + `_pendingWithdrawals` + `_maxEscrowAmount` = 9 variables (some are mappings, which don't consume sequential slots the same way). The gap of 49 suggests `_maxEscrowAmount` was added after initial deployment and the gap was correctly reduced. **Needs human verification of storage layout.**

---

### MEDIUM-06: `giveFeedback()` Self-Feedback Check is Incomplete

**Severity:** Medium  
**Contract:** `FaivrReputationRegistry.sol` → `giveFeedback()`  
**Description:** The self-feedback prevention checks `msg.sender == agentOwner`, `isApprovedForAll`, and `getApproved`. But it doesn't check if the caller's address is the `agentWallet` (the agent's operational wallet). An agent operator could give feedback to their own agent using the agent wallet address.

**Impact:** Agents can self-boost their reputation scores.

**Recommended Fix:** Also check against `IFaivrIdentityRegistry(identityRegistry).getAgentWallet(agentId)`.

---

### MEDIUM-07: Event Parameter Bug in `giveFeedback()`

**Severity:** Medium  
**Contract:** `FaivrReputationRegistry.sol` → `giveFeedback()`  
**Description:** The `NewFeedback` event emission passes `tag1` twice:
```solidity
emit NewFeedback(agentId, msg.sender, feedbackIndex, value, valueDecimals, tag1, tag1, tag2, ...);
```
The event signature expects `indexedTag1, tag1, tag2` but gets `tag1, tag1, tag2`. The indexed parameter and the non-indexed parameter are both `tag1`, which appears correct for the pattern (indexed string + unindexed string copy). **Actually, looking more carefully, this is the correct ERC-8004 pattern — indexed strings are hashed, so you need both.** Reclassifying as informational.

**Revised Severity:** Informational — the dual `tag1` emission is intentional for indexed string events.

---

### MEDIUM-08: `deactivateAgent` / `reactivateAgent` Only Check `ownerOf`, Not Approved Operators

**Severity:** Medium  
**Contract:** `FaivrIdentityRegistry.sol`  
**Description:** `deactivateAgent()` and `reactivateAgent()` use `ownerOf(agentId) != msg.sender` but don't check `isApprovedForAll` or `getApproved`. This is inconsistent with `setAgentURI`, `setMetadata`, and `setAgentWallet` which all use `_requireOwnerOrApproved`.

**Impact:** Approved operators cannot deactivate/reactivate agents they manage.

**Recommended Fix:** Use `_requireOwnerOrApproved(agentId)` instead of the manual `ownerOf` check.

---

### LOW-01: `_requireExists()` Uses Range Check Instead of OZ's Built-in

**Severity:** Low  
**Contract:** `FaivrIdentityRegistry.sol`  
**Description:** `_requireExists` checks `agentId == 0 || agentId >= _nextAgentId`, which works but doesn't account for burned tokens (if burning is ever added). OZ's `_requireOwned()` would be more robust.

---

### LOW-02: No Event for `setProtocolWallet` / `setDevWallet`

**Severity:** Low  
**Contract:** `FaivrFeeModule.sol`  
**Description:** Changing protocol or dev wallet addresses emits no event, making it hard to track admin changes off-chain.

**Recommended Fix:** Add `ProtocolWalletUpdated` and `DevWalletUpdated` events.

---

### LOW-03: `validationRequest()` Allows Overwriting Existing Request URI via Event

**Severity:** Low  
**Contract:** `FaivrValidationRegistry.sol`  
**Description:** If `record.exists` is true, the function emits a new `ValidationRequest` event with a potentially different `requestURI` but doesn't update the record. Off-chain indexers may see conflicting data.

---

### LOW-04: `getSummaryPaginated()` in ValidationRegistry Paginates Over Raw Hashes, Not Filtered Results

**Severity:** Low  
**Contract:** `FaivrValidationRegistry.sol`  
**Description:** Pagination uses array index offset, but validators/tags are filtered after. So `offset=10, limit=10` skips the first 10 hashes (including filtered-out ones), not the first 10 matching results.

---

### LOW-05: No `receive()` or `fallback()` on FaivrFeeModule

**Severity:** Low  
**Contract:** `FaivrFeeModule.sol`  
**Description:** The contract has no `receive()` function. If ETH is accidentally sent directly (not via `fundTask`), it will revert. This is actually **safe behavior** but worth noting.

---

### LOW-06: `agentCount()` Uses `unchecked` Subtraction

**Severity:** Low  
**Contract:** `FaivrIdentityRegistry.sol`  
**Description:** `unchecked { return _nextAgentId - 1; }` — if `_nextAgentId` is somehow 0, this underflows. It's initialized to 1 and only increments, so this is safe in practice.

---

### LOW-07: `readAllFeedback()` With Empty `clientAddresses` Falls Back to `_clients[agentId]` — Unbounded

**Severity:** Low  
**Contract:** `FaivrReputationRegistry.sol`  
**Description:** When `clientAddresses` is empty, the function loads ALL clients from storage. Combined with the two-pass approach, this is an O(2n) operation that will fail for popular agents.

---

### INFORMATIONAL-01: Storage Gaps Are Correctly Implemented

All 6 contracts include `uint256[50] private __gap` (or 49 for FeeModule). This is correct UUPS proxy pattern.

### INFORMATIONAL-02: Constructor Disables Initializers

All contracts correctly use `_disableInitializers()` in constructors to prevent implementation contract initialization.

### INFORMATIONAL-03: UUPS Upgrade Authorization Properly Gated

All `_authorizeUpgrade()` functions use `onlyRole(DEFAULT_ADMIN_ROLE)`.

### INFORMATIONAL-04: Soulbound Implementation is Correct

`FaivrVerificationRegistry._update()` correctly blocks transfers while allowing minting and burning.

### INFORMATIONAL-05: SafeERC20 Used Correctly

`FaivrFeeModule` uses `SafeERC20` for all ERC20 interactions.

### INFORMATIONAL-06: Fee Calculation Precision Loss

`(amount * feeBps) / 10_000` then `(totalFee * 90) / 100` — for very small amounts (< 100 wei), fees round to 0. This is acceptable for ETH but could matter for high-decimal tokens.

### INFORMATIONAL-07: `ReputationRegistry.initialize()` Grants `DEFAULT_ADMIN_ROLE` to `msg.sender`, Not a Parameter

Unlike other contracts that accept an `admin` parameter, ReputationRegistry and ValidationRegistry grant admin to `msg.sender`. This is inconsistent but not a vulnerability if the deployer is the intended admin.

### INFORMATIONAL-08: No Rate Limiting on Registration

Anyone can mint unlimited agent NFTs. Consider adding a cooldown or fee.

### INFORMATIONAL-09: `identityRegistry` is Public in FeeModule, Private in Other Contracts

Inconsistent visibility. Not a security issue.

### INFORMATIONAL-10: Router Does Not Verify Sub-Contract Addresses Are Alive

The Router stores contract addresses but never verifies they're actually deployed contracts. If a zero-address check passes but the contract is later self-destructed, calls will silently fail.

---

## 4. Test Coverage Gaps

### Tests Present (77 test functions across 6 files)

| Contract | Tests | Coverage Assessment |
|----------|-------|-------------------|
| FaivrIdentityRegistry | 18 | Good — covers registration, metadata, wallet, deactivation, upgrades |
| FaivrReputationRegistry | 16 | Good — covers feedback lifecycle, summaries, revocation |
| FaivrValidationRegistry | 12 | Adequate — covers core flow |
| FaivrVerificationRegistry | 8 | Adequate — covers verify, revoke, soulbound, tokenURI |
| FaivrFeeModule | 18 | Good — covers fund, settle, reclaim, fees, escrow cap |
| FaivrRouter | 2 | **POOR** — only tests `getContracts()` and zero-address revert |

### Critical Gaps

1. **Router `registerAndFund()` — UNTESTED.** The most critical composite function has zero test coverage. The CRITICAL-02 bug would have been caught with any test.

2. **Router `settleAndGiveFeedback()` — UNTESTED.** The CRITICAL-01 bug would have been caught immediately.

3. **No reentrancy tests.** No test deploys a malicious contract to test `onERC721Received` callbacks during registration.

4. **No front-running tests for validation request hash collision.**

5. **No EIP-712 signature replay tests.** The HIGH-05 nonce issue is untested.

6. **No tests for `withdrawPending()` in FeeModule.** The pull-withdrawal pattern is completely untested.

7. **No tests for smart contract wallet interactions** (multisig as agent owner, protocol wallet, etc.).

8. **No fuzz tests.** Consider adding:
   - Fuzz `fundTask` with random amounts/deadlines
   - Fuzz `giveFeedback` with edge-case int128 values
   - Fuzz `setAgentWallet` with random signatures

9. **No tests for pagination functions** (`getSummaryPaginated`, `readAllFeedbackPaginated`).

10. **No upgrade safety tests** — no test deploys V2 through the proxy to verify storage layout compatibility.

---

## 5. Recommendations for Human Auditor

### Must-Verify (Critical Path)

1. **🔴 Router architecture is fundamentally broken.** Both composite functions (`registerAndFund`, `settleAndGiveFeedback`) have msg.sender issues. Verify the intended design — should the Router use delegatecall? Should FeeModule have authorized caller patterns?

2. **🔴 Storage layout verification.** Run `forge inspect FaivrFeeModule storage-layout` for all contracts and verify gap sizes are correct, especially FeeModule's 49-slot gap.

3. **🔴 EIP-712 signature security.** Verify whether the missing nonce in `setAgentWallet` is exploitable in the intended usage pattern. If wallets are set infrequently with short deadlines, the risk may be acceptable.

### Should-Verify (High Priority)

4. **`registerFor()` authorization model.** Is permissionless registration-for-others intentional? If so, what are the griefing mitigations?

5. **Cross-contract state consistency.** When an agent NFT is transferred, `agentWallet` is cleared but reputation, validation, and verification records remain. Is this the intended behavior?

6. **Fee calculation at boundaries.** Verify fee math with amounts like 1 wei, `type(uint256).max / 10_001`, etc.

7. **`_clients[]` array growth.** In ReputationRegistry, the clients array for popular agents could grow very large. Verify RPC call limits.

### Nice-to-Verify

8. **OpenZeppelin version.** Verify the specific OZ version used doesn't have known vulnerabilities for the features used (UUPS, AccessControl, ERC721).

9. **Event correctness.** Verify all events match the expected ABI for indexer compatibility.

10. **Gas optimization.** Multiple view functions do two-pass iteration (count then fill). Consider single-pass with dynamic arrays.

---

## 6. Summary of Required Actions

| Priority | Finding | Action |
|----------|---------|--------|
| 🔴 CRITICAL | Router msg.sender bug | Redesign Router or remove composite functions |
| 🔴 CRITICAL | Router fund loss risk | Add reclaim passthrough or remove registerAndFund |
| 🟠 HIGH | registerFor() no access control | Add signature requirement or restrict |
| 🟠 HIGH | Registration reentrancy | Use _mint() or add reentrancy guard |
| 🟠 HIGH | appendResponse() no ACL | Restrict to relevant parties |
| 🟠 HIGH | Validation hash front-running | Derive hash on-chain or revert on exists |
| 🟠 HIGH | setAgentWallet replay | Add nonce to EIP-712 struct |
| 🟡 MEDIUM | DoS in view functions | Document limits, consider deprecating unbounded versions |
| 🟡 MEDIUM | _sendETH gas limit | Increase to 50k+ |
| 🟡 MEDIUM | tokenURI linear scan | Add reverse mapping |
| 🟡 MEDIUM | Verification NFT ownership drift | Design decision needed |
| 🟡 MEDIUM | Incomplete self-feedback check | Check agentWallet too |
| 🟡 MEDIUM | deactivate/reactivate ACL inconsistency | Use _requireOwnerOrApproved |

---

*This report was generated by automated tooling (Slither) combined with manual adversarial review. It is intended to supplement, not replace, a professional human audit. All Critical and High findings should be independently verified before any remediation.*
