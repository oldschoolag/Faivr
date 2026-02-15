# FAIVR — Audit & Plans

**Author:** Ben Claw, AI CTO  
**Date:** 2026-02-15  
**Scope:** ERC-8004 compliance audit, testing plan, UI upgrade roadmap, CI/CD pipeline

---

## Table of Contents

1. [ERC-8004 Compliance Audit](#1-erc-8004-compliance-audit)
2. [Testing Plan](#2-testing-plan)
3. [UI/UX Upgrade Plan](#3-uiux-upgrade-plan)
4. [CI/CD Plan](#4-cicd-plan)

---

## 1. ERC-8004 Compliance Audit

### 1.1 Summary

ERC-8004 specifies three singleton registries: **Identity**, **Reputation**, and **Validation**. FAIVR implements all three plus two extra contracts (Router, FeeModule) that are outside the ERC scope. The audit below compares our interfaces function-by-function against the spec.

**Verdict: FAIVR is NOT ERC-8004 compliant.** Our contracts use a completely different data model for Reputation and Validation, and the Identity Registry is missing several required functions. The contracts are a good foundation but need significant rework to achieve compliance.

---

### 1.2 Identity Registry — Gap Analysis

#### ERC-8004 Required Interface

| Function | Status | Notes |
|---|---|---|
| `register(string agentURI, MetadataEntry[] metadata) → uint256` | ❌ MISSING | We have `registerAgent(string)` — different name, missing metadata array overload |
| `register(string agentURI) → uint256` | ⚠️ PARTIAL | We have `registerAgent(string) payable` — name mismatch, extra `payable` |
| `register() → uint256` | ❌ MISSING | No-arg registration not supported |
| `setAgentURI(uint256, string)` | ⚠️ PARTIAL | We have `updateAgentURI` — name mismatch |
| `getMetadata(uint256, string) → bytes` | ❌ MISSING | No on-chain metadata support |
| `setMetadata(uint256, string, bytes)` | ❌ MISSING | No on-chain metadata support |
| `setAgentWallet(uint256, address, uint256, bytes)` | ❌ MISSING | No agent wallet with EIP-712 verification |
| `getAgentWallet(uint256) → address` | ❌ MISSING | |
| `unsetAgentWallet(uint256)` | ❌ MISSING | |

#### ERC-8004 Required Events

| Event | Status | Notes |
|---|---|---|
| `Registered(uint256 indexed agentId, string agentURI, address indexed owner)` | ⚠️ PARTIAL | We emit `AgentRegistered` — different name |
| `URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)` | ⚠️ PARTIAL | We emit `AgentURIUpdated(agentId, oldURI, newURI)` — different name and params |
| `MetadataSet(uint256 indexed, string indexed, string, bytes)` | ❌ MISSING | |

#### ERC-8004 Required Struct

```solidity
// ERC-8004 requires:
struct MetadataEntry {
    string metadataKey;
    bytes metadataValue;
}

// FAIVR: not defined
```

#### FAIVR-Only Features (Not in ERC-8004)

- `deactivateAgent()` / `reactivateAgent()` — ERC-8004 has no active/inactive concept (uses registration file `active` field)
- `isActive()`, `agentCount()`, `registeredAt()` — custom views, fine to keep as extensions
- `payable` on register — spec doesn't require payment

#### Required Changes

```solidity
// 1. Add MetadataEntry struct
struct MetadataEntry {
    string metadataKey;
    bytes metadataValue;
}

// 2. Rename + add overloads
function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId);
function register(string calldata agentURI) external returns (uint256 agentId);
function register() external returns (uint256 agentId);

// 3. Rename URI update
function setAgentURI(uint256 agentId, string calldata newURI) external;

// 4. Add metadata functions
function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory);
function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external;

// 5. Add agent wallet with EIP-712 verification
function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external;
function getAgentWallet(uint256 agentId) external view returns (address);
function unsetAgentWallet(uint256 agentId) external;

// 6. Fix events
event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue);

// 7. Clear agentWallet on transfer (override _update or _beforeTokenTransfer)
```

---

### 1.3 Reputation Registry — Gap Analysis

**The FAIVR reputation model is fundamentally different from ERC-8004.**

| Aspect | ERC-8004 | FAIVR |
|---|---|---|
| Value type | `int128` (signed, with `uint8 valueDecimals`) | `uint8 rating` (1-5 stars) |
| Tags | `tag1`, `tag2` string fields | None |
| Feedback per reviewer | Multiple allowed (indexed by `feedbackIndex`) | One per agent per reviewer (`AlreadyReviewed`) |
| Revocation | `revokeFeedback()` | Not supported |
| Responses | `appendResponse()` | Not supported |
| Filtering | `getSummary()` with clientAddresses + tag filters | `getAverageRating()` with no filtering |
| Auth | Any address can call `giveFeedback` | EIP-712 signature required |
| Endpoint field | Emitted in feedback | Not supported |
| feedbackURI/Hash | URI + keccak256 hash for integrity | `commentURI` only |

#### ERC-8004 Required Functions — All Missing

```solidity
// REQUIRED by ERC-8004:
function initialize(address identityRegistry_) external;
function getIdentityRegistry() external view returns (address);
function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external;
function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;
function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash) external;
function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);
function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked);
function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) external view returns (...);
function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex, address[] responders) external view returns (uint64 count);
function getClients(uint256 agentId) external view returns (address[]);
function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64);
```

#### ERC-8004 Required Events — All Missing

```solidity
event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash);
event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);
event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash);
```

#### Required Action

**Full rewrite.** The current Review-based model is incompatible. Options:
1. **Replace** `FaivrReputationRegistry` with an ERC-8004 compliant implementation
2. **Wrap** — keep current model internally but expose the ERC-8004 interface (complex, not recommended)
3. **Dual** — deploy a spec-compliant registry alongside the current one (recommended for migration)

---

### 1.4 Validation Registry — Gap Analysis

**Also fundamentally different from ERC-8004.**

| Aspect | ERC-8004 | FAIVR |
|---|---|---|
| Request ID | `bytes32 requestHash` (keccak256 of payload) | Auto-incrementing `uint256 requestId` |
| Validator | Specified per-request by requester (`validatorAddress`) | Whitelisted via role-based access |
| Who requests | Owner/operator of agentId | Anyone |
| Response value | `uint8 response` (0-100 spectrum) | `bool passed` |
| Multiple responses | Yes, same requestHash can get multiple responses | No, status locked after first attestation |
| Tags | `string tag` on response | None |
| Types | No enum — protocol-agnostic | `ValidationType` enum (MANUAL, RE_EXECUTION, ZKML, TEE) |
| Storage | requestHash → {validator, agentId, response, responseHash, lastUpdate, tag} | Custom Attestation struct |

#### ERC-8004 Required Functions — All Missing/Wrong

```solidity
// REQUIRED by ERC-8004:
function initialize(address identityRegistry_) external;
function getIdentityRegistry() external view returns (address);
function validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash) external;
function validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag) external;
function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string tag, uint256 lastUpdate);
function getSummary(uint256 agentId, address[] validatorAddresses, string tag) external view returns (uint64 count, uint8 averageResponse);
function getAgentValidations(uint256 agentId) external view returns (bytes32[] requestHashes);
function getValidatorRequests(address validatorAddress) external view returns (bytes32[] requestHashes);
```

#### ERC-8004 Required Events

```solidity
event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash);
event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag);
```

#### Required Action

**Full rewrite.** Key changes:
- Replace auto-increment IDs with `bytes32 requestHash`
- Remove `ValidationType` enum and whitelist-based validator management
- Allow requester to specify `validatorAddress` per request
- Response is `uint8` (0-100), not `bool`
- Allow multiple responses per requestHash
- Add `tag` to responses

---

### 1.5 Router & FeeModule

These are **not part of ERC-8004** (payments are explicitly declared orthogonal). They're FAIVR-specific and can stay as-is. However, the Router's internal calls will break when Identity/Reputation interfaces change for compliance.

---

### 1.6 Compliance Scorecard

| Registry | Compliance | Effort |
|---|---|---|
| Identity | ~30% | Medium — rename functions, add metadata + wallet |
| Reputation | ~5% | High — full rewrite of data model |
| Validation | ~10% | High — full rewrite of request/response model |
| Router | N/A | Update after registry changes |
| FeeModule | N/A | No changes needed |

---

## 2. Testing Plan

### 2.1 Current Test Coverage

| Test File | Tests | Coverage |
|---|---|---|
| `FaivrIdentityRegistry.t.sol` | 11 tests | Good — register, URI update, deactivate/reactivate, access control, upgrade |
| `FaivrReputationRegistry.t.sol` | 8 tests | Good — post review, duplicates, invalid rating, signatures, pagination |
| `FaivrValidationRegistry.t.sol` | 8 tests | Good — request, attestation, validator management, pagination |
| `FaivrFeeModule.t.sol` | 15 tests | Excellent — ETH/ERC20 fund, settle, reclaim, admin, pause, fees |
| `FaivrRouter.t.sol` | 2 tests | Minimal — only getContracts + zero address revert |

### 2.2 Smart Contract Test Gaps

**Priority 1 — Missing Tests:**

1. **Router `registerAndFund` flow** — no test exercises the actual multi-step flow
2. **Router `settleAndReview` flow** — no end-to-end test
3. **Cross-contract integration** — fund via Router, settle, check reputation state
4. **Fuzz tests** — fee calculations, rating bounds, deadline edge cases
5. **Reentrancy** — settle/reclaim with malicious recipient contracts
6. **Upgrade safety** — storage layout verification after upgrade

**Priority 2 — After ERC-8004 Rewrite:**

7. All new ERC-8004 compliant functions need full coverage
8. `giveFeedback` / `revokeFeedback` / `appendResponse` lifecycle
9. `validationRequest` / `validationResponse` with `requestHash`
10. Metadata get/set + reserved key protection
11. Agent wallet set/unset with EIP-712 verification
12. Wallet cleared on transfer

**Test Commands:**
```bash
# Run all tests
cd contracts && forge test -vvv

# Run with gas report
forge test --gas-report

# Coverage
forge coverage
```

### 2.3 Frontend E2E Test Plan

**Framework:** Playwright + Synpress (for wallet injection)

| Test | Steps | Assertions |
|---|---|---|
| **Wallet Connect** | Click "Connect Wallet" → approve in MetaMask | Address displayed in nav, green dot visible |
| **Agent List** | Load marketplace tab | 3 agent cards rendered (currently hardcoded) |
| **Agent Search** | Type in search field | Filtered results (needs implementation first) |
| **Register Agent** | Switch to "Onboard Agent" tab → fill form → click "Mint Identity NFT" | TX submitted, agent appears in list |
| **Fund Task** | Navigate to agent detail → fund with ETH | Task ID returned, balance deducted |
| **Settle Task** | As client, settle a funded task | Agent receives payout, fee split correct |
| **Reclaim Task** | Wait past deadline → reclaim | Full refund to client |
| **Disconnect** | Disconnect wallet | UI reverts to "Connect Wallet" button |

**Setup needed:**
```bash
npm install -D @playwright/test playwright @synthetixio/synpress
npx playwright install
```

### 2.4 CI Pipeline

See [Section 4](#4-cicd-plan) for the full GitHub Actions workflow.

---

## 3. UI/UX Upgrade Plan

### 3.1 Current Component Inventory

| Component | Location | Status |
|---|---|---|
| `RootLayout` | `app/layout.tsx` | Minimal — no font, no head meta |
| `Providers` | `app/providers.tsx` | Works — wagmi + react-query |
| `Home` (page) | `app/page.tsx` | Monolithic ~200 LOC |
| `NavButton` | `app/page.tsx` (inline) | Should be extracted |
| `AgentCard` | `app/page.tsx` (inline) | Should be extracted |
| `wagmi config` | `lib/wagmi.ts` | Minimal — injected only |
| `contracts` | `lib/contracts.ts` | ABI definitions, good |
| `cn` util | `lib/utils.ts` | Standard clsx+twMerge |

**Note:** `app/` and `web/` contain identical code — should consolidate to one.

### 3.2 Component Extraction Plan

```
components/
├── layout/
│   ├── Navbar.tsx           # Extract from page.tsx
│   ├── NavButton.tsx        # Already exists inline
│   └── Footer.tsx           # NEW
├── agent/
│   ├── AgentCard.tsx        # Extract from page.tsx
│   ├── AgentDetail.tsx      # NEW — detail page
│   ├── AgentGrid.tsx        # NEW — grid wrapper with loading states
│   └── AgentSearch.tsx      # NEW — search with debounce
├── onboarding/
│   ├── OnboardForm.tsx      # Extract from page.tsx
│   └── OnboardSuccess.tsx   # NEW — post-mint confirmation
├── escrow/
│   ├── FundTaskForm.tsx     # NEW
│   ├── TaskStatus.tsx       # NEW
│   └── SettleReclaim.tsx    # NEW
├── wallet/
│   ├── ConnectButton.tsx    # NEW — proper connect/disconnect
│   └── NetworkBadge.tsx     # NEW — chain indicator
└── ui/
    ├── Button.tsx           # NEW — design system
    ├── Input.tsx            # NEW
    ├── Card.tsx             # NEW
    ├── Badge.tsx            # NEW
    ├── Skeleton.tsx         # NEW — loading states
    └── Toast.tsx            # NEW — tx notifications
```

### 3.3 Design System

**Current:** Raw Tailwind classes, no design tokens, hardcoded colors.

**Target:**
```typescript
// lib/design-tokens.ts
export const colors = {
  brand: { 500: '#10b981' },  // emerald-500
  surface: { 0: '#050505', 1: 'rgba(255,255,255,0.05)', 2: 'rgba(255,255,255,0.1)' },
  text: { primary: '#ffffff', secondary: '#737373', muted: '#525252' },
};

export const radii = { sm: '0.75rem', md: '1rem', lg: '1.5rem', full: '9999px' };
```

### 3.4 Missing Features for Production

| Feature | Priority | Effort |
|---|---|---|
| **Real wallet connect** (ConnectKit/RainbowKit) | P0 | 2h |
| **On-chain data fetching** — read agents from contract events | P0 | 4h |
| **Agent detail page** — `/agent/[id]` with reviews, validation, tasks | P0 | 6h |
| **Transaction notifications** — toast on confirm/fail | P0 | 2h |
| **Fund/Settle/Reclaim UI** — escrow interaction forms | P0 | 4h |
| **Error boundaries** | P1 | 1h |
| **Loading/skeleton states** | P1 | 2h |
| **Mobile responsive nav** (hamburger menu) | P1 | 2h |
| **Dark/light mode toggle** | P2 | 1h |
| **Search with contract queries** | P1 | 3h |
| **Review submission form** | P1 | 3h |

### 3.5 Accessibility Gaps

- No `aria-label` on icon-only buttons
- No `<label htmlFor>` associations on form inputs
- No keyboard focus indicators beyond browser defaults
- No skip-to-content link
- Color contrast: `text-neutral-500` on `#050505` is ~4.2:1 (barely AA for large text, fails for body)
- No `role` attributes on the card grid
- Select element has no accessible label

### 3.6 Consolidation: `app/` vs `web/`

Both directories are identical. **Action:** Delete `app/` (root-level), keep `web/` as the canonical frontend. Update references and CI accordingly.

---

## 4. CI/CD Plan

### 4.1 Workflow Overview

```
push/PR → [Lint + Format] → [Build Contracts] → [Test Contracts] → [Build Frontend] → [Deploy Preview (Vercel)]
                                                                                              ↓ (main branch)
                                                                                       [Deploy Production]
```

### 4.2 GitHub Actions Workflow

See `.github/workflows/ci.yml` (created alongside this document).

**Jobs:**
1. **contracts** — Install Foundry, `forge fmt --check`, `forge build --sizes`, `forge test -vvv`, `forge coverage`
2. **frontend** — `npm ci`, `npm run build` (in `web/`)
3. **deploy** — Vercel deployment (production on `main`, preview on PRs)

### 4.3 Secrets Required

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Vercel API token for deployments |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### 4.4 Future Additions

- **Slither** static analysis for contracts
- **Playwright E2E** after frontend stabilizes
- **Contract deployment** to testnet on tag/release
- **Gas snapshot comparison** on PRs

---

## 5. Prioritized Action Items

| # | Task | Effort | Depends On |
|---|---|---|---|
| 1 | Consolidate `app/` → `web/` | 30m | — |
| 2 | Identity Registry: add ERC-8004 functions | 2d | — |
| 3 | Reputation Registry: full rewrite | 3d | — |
| 4 | Validation Registry: full rewrite | 2d | — |
| 5 | Update Router to new interfaces | 1d | 2,3,4 |
| 6 | Write tests for all new ERC-8004 functions | 3d | 2,3,4 |
| 7 | Extract frontend components | 1d | 1 |
| 8 | Add RainbowKit + on-chain data fetching | 1d | 7 |
| 9 | Build agent detail page + escrow UI | 2d | 8 |
| 10 | CI/CD pipeline (workflow file created) | 1h | — |
| 11 | Accessibility pass | 1d | 7 |
| 12 | Playwright E2E tests | 2d | 9 |

**Total estimated effort: ~3 weeks of focused work.**
