# EIPs & ERCs for Building an Open Agent Marketplace

**Research Date:** 2026-02-10  
**Source:** ethereum-magicians.org forum searches + EIP/ERC ecosystem knowledge  
**Scope:** Building blocks beyond ERC-8004 (Trustless Agents) and x402 (HTTP-native payments)

---

## 1. Identity & Authentication

### 🔑 Core Standards

| EIP/ERC | Title | Summary | Marketplace Relevance |
|---------|-------|---------|----------------------|
| **ERC-8126** | AI Agent Registration and Verification | Standard process for AI agents to register on Ethereum with verifiable credentials and undergo specialized verification checks (ETV, SCV, WAV, WV) | **Direct fit** — complements ERC-8004 with more granular verification types for agent identity. Active discussion (Jan 2026) |
| **ERC-8118** | Agent Authorization | Standard interface for authorizing autonomous agents (bots, AI systems) to perform specific on-chain actions on behalf of users (principals) | **Critical** — defines how users delegate authority to agents with scoped permissions. The "session key for agents" |
| **ERC-4337** | Account Abstraction via Entry Point | Smart contract wallets with custom validation logic, gas sponsorship, and batched operations | **Foundational** — agents need smart accounts, not EOAs. Enables gas-free UX, programmable tx validation, bundled operations |
| **EIP-7702** | Set EOA Account Code | Allows EOAs to temporarily mount smart contract logic per-transaction | **Enables** agents to upgrade EOAs with smart account capabilities (delegation, batching) without full migration to ERC-4337 |
| **ERC-6900** | Modular Smart Contract Accounts and Plugins | Standardizes plugin architecture for smart accounts — install/uninstall modules for validation, execution hooks | **Key infrastructure** — agents can be "plugins" that get installed into user accounts with specific permissions |
| **ERC-7710** | Smart Contract Delegation | `redeemDelegation` interface — on-chain delegation of specific capabilities from one account to another | **Essential** — lets users delegate specific on-chain actions to agents. More granular than full account access |
| **ERC-8139** | Authorization Objects | General, first-class authorization layer for permissioned execution (session keys, agent auth) | **New (Jan 2026)** — directly addresses the auth primitive that agent authorization and session keys both need |
| **ERC-7866** | Decentralised Profile Standard | DID-based (`did:<chain>:<address>`) interoperable profiles built on SBTs, chain-agnostic | **Agent profiles** — gives agents (and users) a standardized, cross-chain identity profile with metadata |

### 🆔 Soul-bound / Non-transferable Tokens (for agent credentials)

| EIP/ERC | Title | Summary | Marketplace Relevance |
|---------|-------|---------|----------------------|
| **ERC-5192** | Minimal Soulbound NFTs | Minimal interface for making ERC-721 tokens non-transferable (Final status) | **Credential primitive** — agent certifications, capability badges that can't be traded |
| **ERC-4973** | Account-bound Tokens | Non-transferable tokens representing identity, credentials, affiliations, reputation | **Agent identity anchors** — permanently bind credentials/reputation to an agent's address |
| **ERC-8129** | Non-Transferable Token | Fresh rethink of SBTs (Jan 2026) — purpose-built non-transferable standard rather than bolting locks onto ERC-721 | **Cleaner SBT primitive** if building agent credential NFTs from scratch |
| **ERC-5114** | Soulbound Badges | Badges attesting to information, bound to another token rather than an address | **Badge system** — attach capability badges to agent identity tokens (e.g., "verified code auditor") |
| **ERC-7858** | Expirable NFTs and SBTs | Adds time-based expiration to NFTs and SBTs | **Time-limited credentials** — agent certifications that expire and need renewal (e.g., "verified Q1 2026") |

---

## 2. Payments & Escrow

| EIP/ERC | Title | Summary | Marketplace Relevance |
|---------|-------|---------|----------------------|
| **ERC-8150** | Zero-Knowledge Agent Payment Verification | ZK proofs that agent-mediated payment batches match user-signed intents. Only verified batches settle | **Directly designed** for agent marketplace payments — ensures agents can't overspend user funds |
| **ERC-7720** | Deferred Token Transfer | Deposit ERC-20 tokens for withdrawal by a beneficiary at a future timestamp | **Escrow primitive** — agents deposit payment that counterparty claims after task completion |
| **ERC-8027** | Recurring Subscription NFT | NFT-based recurring subscription standard with on-chain payment tracking | **Subscription model** for ongoing agent services (monitoring, data feeds, recurring analysis) |
| **ERC-8102** | Permissioned Pull | Permissioned pull-payment standard — authorized parties can pull payments within defined constraints | **Agent billing** — services can pull payment for work done within pre-authorized limits |
| **ERC-7683** | Cross Chain Intents Standard | Unified format for cross-chain intent messages and settlement contracts | **Cross-chain agent payments** — agents on different chains can transact via standardized intents |
| **CMSP** | Capped Mandate Subscription Protocol | Non-custodial recurring payments with bounded consent — caps on amount/frequency | **Agent subscriptions** — let agents pay for services with user-defined spending caps |
| **ERC-8076** | Custodial Contract-Based Cross-Token Exchange | Escrow framework for cross-token exchanges between Payers and Liquidity Providers | **Agent-to-agent escrow** — programmatic settlement when agents transact in different tokens |

---

## 3. Reputation & Attestations

| EIP/ERC | Title | Summary | Marketplace Relevance |
|---------|-------|---------|----------------------|
| **ERC-8035** | MultiTrust Credential (MTC) — Core | On-chain multi-source trust credentials — aggregates trust signals from multiple providers | **Trust infrastructure** — agents accumulate trust from multiple sources; marketplace can query aggregate trust scores |
| **ERC-8107** | ENS Trust Registry for Agent Coordination | Web-of-trust validation using ENS names for ERC-8001 multi-party coordination. Transitive trust via signature chains | **Agent trust graph** — discover trusted agents through ENS-based transitive trust chains (like PGP web of trust) |
| **EAS** | Ethereum Attestation Service | Base-layer protocol for generic attestations — register any schema, issue attestations on-chain | **Flexible attestation layer** — rate agents, attest to service quality, verify capabilities with any schema |
| **ERC-6239** | Semantic Soulbound Tokens | Adds RDF triples to ERC-721/5192 metadata for machine-readable semantic meaning | **Machine-readable reputation** — agents can programmatically parse and reason about each other's credential semantics |
| **ERC-8004 Extension** | Verifiable AI System Transparency | Optional `aiTransparency` object for AgentCards — verifiable claims about AI models and infrastructure linked to on-chain proofs | **Model transparency** — agents declare what model they run, with TEE/ZK proofs of truthfulness |

---

## 4. Marketplace Infrastructure

| EIP/ERC | Title | Summary | Marketplace Relevance |
|---------|-------|---------|----------------------|
| **ERC-8122** | Minimal Agent Registry | Lightweight on-chain registry for discovering AI agents. Combines ERC-6909 + ERC-8048 (on-chain metadata) + ERC-7930 (registry IDs) + optional ERC-8049 (collections) | **Discovery layer** — THE registry for agents to list themselves and be found. Gas-efficient, fully on-chain |
| **ERC-8048** | On-chain Key/Value Agent Metadata | Stores arbitrary key-value metadata on-chain per token/agent | **Agent capability descriptions** — agents publish their capabilities, pricing, endpoints on-chain |
| **ERC-7930** | Globally Unique Registry Identifier | Universal namespace for registry entries across chains | **Cross-chain agent identity** — same agent ID resolves across L1/L2s |
| **ERC-7750** | Decentralized Employment System (DES) | On-chain employment records, job creation, salary management with escrow | **Task/job protocol** — adaptable for agent task assignments, completion tracking, payment release |
| **Secure Intents** | Cryptographic Framework for Autonomous Agent Coordination | Agents coordinate securely without trusted intermediaries using cryptographic intent matching | **Agent-to-agent coordination** — secure, trustless task negotiation between agents |
| **ERC-7757** | Instinct-Based Automatic Transactions | Standard for AI-driven automatic transactions based on shared on-chain rules ("instincts") | **Autonomous agent transactions** — agents execute transactions based on predefined behavioral rules |
| **Data Anchoring Tokens** | Usage-Metered Revenue Distribution for AI Assets | Tokens that unify ownership, usage rights, and value share with metered billing | **AI service monetization** — agents selling AI inference can meter usage and distribute revenue |

---

## 5. Data & Verifiable Compute

| EIP/ERC | Title | Summary | Marketplace Relevance |
|---------|-------|---------|----------------------|
| **ERC-7857** | NFT Standard for AI Agents with Private Metadata | NFTs where agent prompts/configs are stored privately (not in public metadata) — private transfer of agent IP | **Agent IP protection** — agents can be traded as NFTs while keeping proprietary prompts/models private |
| **ERC-8048** | On-chain Key/Value Metadata | (See above) Arbitrary on-chain data per token | **Verifiable agent configs** — store hashes of agent configurations on-chain for auditability |
| **ERC-7208** | On-chain Data Container | Flexible on-chain data storage with schema management and cross-contract access | **Rich agent metadata** — store structured agent data (capabilities, constraints, audit logs) on-chain |
| **ERC-8121** | Hooks — Cross-chain Function Calls | Specification for cross-chain function calls: what function, what params, which contract, which chain | **Cross-chain agent actions** — an agent on Optimism can trigger a verified action on Arbitrum |

---

## 6. Interoperability & Cross-chain

| EIP/ERC | Title | Summary | Marketplace Relevance |
|---------|-------|---------|----------------------|
| **ERC-7683** | Cross Chain Intents Standard | (Detailed above) Standard for cross-chain intent messages, being actively redesigned with "Programmable Fillers" | **Cross-chain marketplace** — agents and users on different chains can express intents and have them filled |
| **ERC-8121** | Hooks — Cross-chain Function Calls | (Detailed above) Fully specifies cross-chain calls | **Agent interop** — agent on chain A calls agent's contract on chain B with verified params |
| **ERC-7683 Redux** | Programmable Fillers | Redesign of ERC-7683 by Across/OpenZeppelin for more flexible intent settlement | **Evolved cross-chain intents** — agents can act as "fillers" that compete to fulfill cross-chain requests |
| **WeissChannels** | Cross-chain Execution for ERC-4337 | Ephemeral state channels for single-signature atomic cross-chain execution | **Instant cross-chain agent payments** — agents settle across chains without waiting for bridges |

---

## 7. Bonus: Emerging Agent-Specific Standards (ERC-8004 Ecosystem)

These are emerging standards specifically designed for the agent ecosystem, many directly referencing or extending ERC-8004:

| Standard | Title | Summary |
|----------|-------|---------|
| **ERC-8004 Collections (ERC-8049)** | Fixed-Supply Agent NFT Collections | Mint agent NFTs as curated collections with on-chain metadata |
| **ERC-8004 AI Transparency Extension** | Verifiable AI System Transparency | Structured, provable claims about agent AI models |
| **Self-Sovereign Agent NFTs** | AI Personhood Infrastructure | Agents maintain sovereign control over identity, memories, work products |
| **ERC-8004 + ERC-8001** | Multi-party Agent Coordination | Coordination protocols for multiple agents working together |
| **ERC-8143** | Third-Party Managed Credentials for Agents | KYC/Proof-of-Personhood records about agents managed by trusted third parties |

---

## Priority Tier List

### 🟢 Tier 1 — Must Have (directly enables core marketplace flows)
1. **ERC-8122** (Agent Registry) — how agents get discovered
2. **ERC-8118** (Agent Authorization) — how users grant agents permissions
3. **ERC-4337** (Account Abstraction) — how agents operate as smart accounts
4. **ERC-8035** (MultiTrust Credential) — how agents establish multi-source trust
5. **ERC-8150** (ZK Agent Payment Verification) — how agent payments are verified
6. **ERC-8126** (Agent Registration & Verification) — how agents prove they're legitimate

### 🟡 Tier 2 — High Value (enables important secondary flows)
7. **ERC-7710** (Smart Contract Delegation) — granular delegation to agents
8. **ERC-8107** (ENS Trust Registry) — web-of-trust agent discovery
9. **ERC-7683** (Cross Chain Intents) — cross-chain agent transactions
10. **ERC-5192/4973** (Soulbound tokens) — non-transferable agent credentials
11. **ERC-8027/8102** (Subscriptions/Pull Payments) — recurring agent billing
12. **EAS** (Attestation Service) — flexible reputation attestations

### 🔵 Tier 3 — Nice to Have (enhances specific features)
13. **ERC-7857** (Private Agent Metadata) — agent IP protection
14. **ERC-6900** (Modular Accounts) — plugin architecture for agent modules
15. **EIP-7702** (EOA code delegation) — lightweight AA for agents
16. **ERC-7930/8048** (Registry IDs + On-chain Metadata) — agent discoverability primitives
17. **ERC-8121** (Cross-chain Hooks) — cross-chain agent calls
18. **ERC-7858** (Expirable SBTs) — time-limited credentials

---

## Key Observations

1. **The ERC-8004 ecosystem is exploding** — since August 2025, a constellation of agent-specific ERCs has formed around it (8048, 8049, 8107, 8118, 8122, 8126, 8143, 8150). This is the center of gravity.

2. **Agent authorization is the hottest gap** — ERC-8118, ERC-8139, and ERC-7710 all address "how does a user safely delegate to an agent?" from different angles. No clear winner yet.

3. **Trust/reputation is multi-layered** — ERC-8035 (MultiTrust) + ERC-8107 (ENS Trust Registry) + EAS together form a comprehensive trust stack. ERC-8004's Reputation Registry is the anchor.

4. **Cross-chain is getting real** — ERC-7683 + ERC-8121 + WeissChannels mean agents won't be limited to one chain. The marketplace should be multi-chain from day one.

5. **ZK payments (ERC-8150) is brand new** — posted Feb 6, 2026. Directly inspired by ERC-8004. Worth watching closely as the payment verification layer.

6. **Missing piece: dispute resolution** — no ERC specifically addresses on-chain dispute resolution for agent services. This is an opportunity for a new standard.

---

*Forum links: All proposals can be found at `https://ethereum-magicians.org/t/<slug>/<topic_id>`*
