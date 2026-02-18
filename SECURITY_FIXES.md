# FAIVR Smart Contract Security Fixes

Summary of all changes applied from the security audit. All 92 tests pass after fixes.

---

## Findings

### C-01 — Zero-Address Initialization Guard
**Severity:** Critical  
**Files:** `FaivrReputationRegistry.sol`, `FaivrValidationRegistry.sol`, `FaivrFeeModule.sol`  
**Change:** Added `if (identityRegistry_ == address(0)) revert ZeroAddress()` checks in `initialize()` functions. FaivrFeeModule also validates `protocolWallet_` and `devWallet_` are non-zero.  
**Frontend impact:** None (deploy-time only).

### C-02 — Escrow Cap on FeeModule
**Severity:** Critical  
**File:** `FaivrFeeModule.sol`  
**Change:** Added `_maxEscrowAmount` (default 0.1 ETH) with `EscrowCapExceeded` error. New functions: `setMaxEscrowAmount()` (FEE_MANAGER_ROLE), `maxEscrowAmount()` view.  
**Frontend impact:** `fundTask` and `fundTaskFor` will revert if `amount > maxEscrowAmount`. Frontend must check cap before funding.

### H-01 — Pull-Over-Push ETH Transfers in FeeModule
**Severity:** High  
**File:** `FaivrFeeModule.sol`  
**Change:** `_sendETH()` now uses gas-limited call (10k gas). On failure, funds are escrowed in `_pendingWithdrawals` instead of reverting. New functions: `pendingWithdrawal(address)`, `withdrawPending()`.  
**Frontend impact:** After settlement, agent owners/wallets should check `pendingWithdrawal()` and call `withdrawPending()` if ETH transfer failed.

### H-02 — Reentrancy in Identity Registration
**Severity:** High  
**File:** `FaivrIdentityRegistry.sol`  
**Change:** State (`_agentActive`, `_registeredAt`, `_agentWallets`) is now set **before** `_safeMint()` to prevent reentrancy via ERC-721 `onERC721Received` callback.  
**Frontend impact:** None.

### H-03 — Unrestricted `appendResponse` in ReputationRegistry
**Severity:** High  
**File:** `FaivrReputationRegistry.sol`  
**Change:** `appendResponse()` now requires caller to be either the agent owner/operator or the feedback author (`clientAddress`). Reverts with `NotFeedbackOwner()` otherwise.  
**Frontend impact:** Only agent owners or the original feedback author can call `appendResponse`. Update UI to reflect who can respond.

### H-04 — On-Chain Request Hash in ValidationRegistry
**Severity:** High  
**File:** `FaivrValidationRegistry.sol`  
**Change:** `validationRequest()` now ignores the caller-supplied `requestHash` parameter and computes it on-chain as `keccak256(abi.encode(msg.sender, validatorAddress, agentId, nonce))`. A per-agent `_requestNonces` mapping provides uniqueness. The computed hash is emitted in the `ValidationRequest` event.  
**Frontend impact:** **Breaking.** The `requestHash` parameter is ignored. Frontend must read the hash from the `ValidationRequest` event or `getAgentValidations()` after calling `validationRequest()`. All subsequent calls (`validationResponse`, `getValidationStatus`) must use the on-chain hash.

### H-05 — EIP-712 Signature Replay in setAgentWallet
**Severity:** High  
**File:** `FaivrIdentityRegistry.sol`  
**Change:** Added per-agent `_walletNonces` mapping. The EIP-712 typehash changed from `SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)` to `SetAgentWallet(uint256 agentId,address newWallet,uint256 nonce,uint256 deadline)`. New view: `walletNonce(uint256 agentId)`.  
**Frontend impact:** **Breaking.** When signing `setAgentWallet`, the wallet must include `nonce` (from `walletNonce(agentId)`) in the EIP-712 struct. Old signatures without nonce will be rejected.

---

## Additional Changes

### Router Delegation Pattern (FaivrRouter.sol)
- `registerAndFund()` now calls `registerFor()` (REGISTRAR_ROLE) instead of `register()`, so the agent is minted to `msg.sender` (the user) rather than the Router contract.
- `fundTask` → `fundTaskFor` and `settleTask` → `settleTaskFor` for proper client attribution.
- **Frontend impact:** Router must have `REGISTRAR_ROLE` and `ROUTER_ROLE` granted. Users interacting via Router are now properly recorded as owners/clients.

### New `registerFor()` on IdentityRegistry
- Allows REGISTRAR_ROLE to mint agents on behalf of another address.
- **Frontend impact:** New function available for delegated registration flows.

### Pagination Functions
- Added `getSummaryPaginated()` and `readAllFeedbackPaginated()` to ReputationRegistry.
- Added `getSummaryPaginated()` to ValidationRegistry.
- **Frontend impact:** New read-only functions available for large datasets.

### Safe Casting in Summaries
- `getSummary()` in ReputationRegistry now uses safe int128 casting with overflow check instead of unchecked cast.
- `getSummary()` in ValidationRegistry now uses safe uint8 casting.

---

## Storage Layout Changes

⚠️ **The following contracts had new storage variables added before `__gap`, reducing gap size by 1 each:**

| Contract | New Variable | Gap Change |
|---|---|---|
| `FaivrIdentityRegistry` | `_walletNonces` | `__gap[50]` → `__gap[49]` |
| `FaivrValidationRegistry` | `_requestNonces` | `__gap[50]` → `__gap[49]` |
| `FaivrFeeModule` | `_pendingWithdrawals`, `_maxEscrowAmount` | `__gap[50]` → `__gap[49]` (−1 net, 2 added) |

These are upgrade-safe as the total slot count is preserved.
