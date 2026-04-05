# FAIVR deployment parity status — 2026-04-05

## Summary

Deployment parity is **not complete** on Base mainnet.

The live proxies are still behind the current repo state, and the live role/config wiring does not yet reflect the intended post-remediation setup.

I verified this directly against Base mainnet using read-only RPC calls.

## Live proxy map

- Identity proxy: `0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6`
  - current implementation: `0xe792bc277bac71c886a2661b638dfe259abbe37d`
- Reputation proxy: `0x00280bc9cFF156a8E8E9aE7c54029B74902a829c`
  - current implementation: `0x4414d1b8a8a0198f53def1386ff40fed3be62807`
- Validation proxy: `0x95DF02B02e2D777E0fcB80F83c061500C112F05b`
  - current implementation: `0x15a21c7388d3230e67d36bd80d4b5a0b13c92432`
- FeeModule proxy: `0xD68D402Bb450A79D8e639e41F0455990A223E47F`
  - current implementation: `0xecfeb0decd1affaa913025327c799f8c3bdfb21b`
- Router proxy: `0x7EC51888ecd3E47c6F4cF324474041790C8aB7fa`
  - current implementation: `0xd8604525f4a26de9769042b26610566d189f9527`
- Verification proxy: `0x6654FA7d6eE8A0f6641a5535AeE346115f06e161`
  - current implementation: `0x29d27e7656607fa9dca316ffd654dabc29e5678e`

## Live admin path

The current live admin is still the original deployer EOA:
- `0x580e2BD60625F146bC32C75A63DBe0f61810CCdA`

Confirmed:
- `DEFAULT_ADMIN_ROLE` is still granted to that address on the live proxies checked.

Interpretation:
- this is **not** currently gated by a timelock from what the live AccessControl state shows
- execution is possible as soon as that signer is available

## Evidence that live FeeModule is still old

Read-only checks against live FeeModule (`0xD68D402Bb450A79D8e639e41F0455990A223E47F`):

- `feePercentage()` works
- `totalFeesCollected(address)` works
- `totalFeesAccrued(address)` **reverts**
- `reputationRegistry()` **reverts**

Interpretation:
- the live FeeModule is still on the older pre-hardening implementation
- the latest hardening pass is **not** live yet

## Live config / role gaps currently observed

The intended router wiring is **not** live yet.

Confirmed false on mainnet:
- Identity `REGISTRAR_ROLE` -> Router proxy
- FeeModule `ROUTER_ROLE` -> Router proxy
- Reputation `FEEDBACK_ROUTER_ROLE` -> Router proxy
- Reputation `SETTLEMENT_SOURCE_ROLE` -> FeeModule proxy

Interpretation:
- even beyond raw implementation upgrades, the expected cross-contract role wiring must be applied during parity execution

## Canonical token addresses for the allowlist step

- ETH: implicit support in FeeModule (`address(0)`) — no config needed
- USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - confirmed from Circle/Base references
- USDT on Base: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`
  - Base bridged USDT
- Frankencoin on Base: `0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553`
  - confirmed from Frankencoin token page

## Execution artifact prepared

I created an upgrade/config script:
- `contracts/script/UpgradeMainnetParity.s.sol`

What it does:
1. deploys fresh implementations for:
   - Identity
   - Reputation
   - Validation
   - FeeModule
   - Router
   - Verification
2. upgrades all six live proxies through the current admin EOA
3. applies the intended live role wiring:
   - Identity `REGISTRAR_ROLE` -> Router
   - FeeModule `ROUTER_ROLE` -> Router
   - Reputation `FEEDBACK_ROUTER_ROLE` -> Router
   - Reputation `SETTLEMENT_SOURCE_ROLE` -> FeeModule
4. configures FeeModule post-upgrade:
   - `setReputationRegistry(reputationProxy)`
   - `setSupportedToken(USDC, true)`
   - `setSupportedToken(USDT, true)`
   - `setSupportedToken(FRANKENCOIN, true)`

## Why execution is not finished yet

**Single blocker:** the admin signer is not loaded in this lane.

I verified:
- no `ADMIN_PRIVATE_KEY` is present in the current environment
- no local Foundry keystore for the live admin is present here

So the remaining blocker is **access**, not diagnosis or implementation.

## Exact execution command once signer is available

From `contracts/`:

```sh
forge script script/UpgradeMainnetParity.s.sol:UpgradeMainnetParity --rpc-url https://mainnet.base.org --broadcast -vvvv
```

Required environment:
- `ADMIN_PRIVATE_KEY` for `0x580e2BD60625F146bC32C75A63DBe0f61810CCdA`

Optional overrides (defaults already baked into the script):
- `USDC_TOKEN`
- `USDT_TOKEN`
- `FRANKENCOIN_TOKEN`

## What to verify immediately after broadcast

1. all six proxies point to newly deployed implementations
2. FeeModule answers:
   - `reputationRegistry()`
   - `isSupportedToken(USDC)` => true
   - `isSupportedToken(USDT)` => true
   - `isSupportedToken(FRANKENCOIN)` => true
   - `totalFeesAccrued(address)`
3. role wiring is live:
   - Identity registrar role on Router
   - Fee router role on Router
   - Reputation feedback-router role on Router
   - Reputation settlement-source role on FeeModule
4. small live smoke checks pass

## Bottom line

Deployment parity can be finished quickly now, but it cannot be **broadcast** from this lane without the live admin signer.

Everything else is prepared:
- live parity gap identified
- exact token addresses confirmed
- exact upgrade/config script authored and compiled
- exact post-upgrade verification checklist prepared
