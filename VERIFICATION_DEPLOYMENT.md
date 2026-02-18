# VerificationRegistry Deployment — Base Mainnet

**Date:** 2026-02-18
**Chain:** Base Mainnet (8453)
**Deployer:** 0x580e2BD60625F146bC32C75A63DBe0f61810CCdA

## Addresses

| Contract | Address |
|---|---|
| Implementation | `0x29d27E7656607fa9dcA316ffd654DabC29e5678e` |
| **Proxy (use this)** | `0x6654FA7d6eE8A0f6641a5535AeE346115f06e161` |

## Initialization Parameters

- **Admin:** `0x580e2BD60625F146bC32C75A63DBe0f61810CCdA`
- **Identity Registry:** `0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6`
- **Expiry Period:** 90 days (default)

## Contract Details

- **Name:** FAIVR Verified Agent
- **Symbol:** FVERIFY
- **Type:** ERC721 Soulbound (non-transferable) + UUPS Upgradeable
- **Roles:** DEFAULT_ADMIN_ROLE, VERIFIER_ROLE (both granted to admin)

## Broadcast

Transactions saved to: `contracts/broadcast/DeployVerification.s.sol/8453/run-latest.json`
