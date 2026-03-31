// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";
import {FaivrReputationRegistry} from "../src/FaivrReputationRegistry.sol";
import {FaivrValidationRegistry} from "../src/FaivrValidationRegistry.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {FaivrRouter} from "../src/FaivrRouter.sol";

/// @title Deploy
/// @notice Deploys all FAIVR contracts behind ERC1967 proxies
contract Deploy is Script {
    function run() external {
        address admin = vm.envAddress("ADMIN");
        address protocolWallet = vm.envAddress("PROTOCOL_WALLET");
        address devWallet = vm.envAddress("DEV_WALLET");

        vm.startBroadcast();

        // ── 1. Deploy implementations ────────────────────
        FaivrIdentityRegistry identityImpl = new FaivrIdentityRegistry();
        FaivrReputationRegistry reputationImpl = new FaivrReputationRegistry();
        FaivrValidationRegistry validationImpl = new FaivrValidationRegistry();
        FaivrFeeModule feeImpl = new FaivrFeeModule();
        FaivrRouter routerImpl = new FaivrRouter();

        // ── 2. Deploy proxies + initialize ───────────────
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(identityImpl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        console.log("IdentityRegistry proxy:", address(identityProxy));

        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(reputationImpl),
            abi.encodeCall(FaivrReputationRegistry.initialize, (address(identityProxy)))
        );
        console.log("ReputationRegistry proxy:", address(reputationProxy));

        ERC1967Proxy validationProxy = new ERC1967Proxy(
            address(validationImpl),
            abi.encodeCall(FaivrValidationRegistry.initialize, (address(identityProxy)))
        );
        console.log("ValidationRegistry proxy:", address(validationProxy));

        ERC1967Proxy feeProxy = new ERC1967Proxy(
            address(feeImpl),
            abi.encodeCall(FaivrFeeModule.initialize, (
                admin,
                protocolWallet,
                devWallet,
                address(identityProxy)
            ))
        );
        console.log("FeeModule proxy:", address(feeProxy));

        ERC1967Proxy routerProxy = new ERC1967Proxy(
            address(routerImpl),
            abi.encodeCall(FaivrRouter.initialize, (
                admin,
                address(identityProxy),
                address(reputationProxy),
                address(validationProxy),
                address(feeProxy)
            ))
        );
        console.log("Router proxy:", address(routerProxy));

        // ── 3. Optional router wiring ────────────────────
        FaivrIdentityRegistry identity = FaivrIdentityRegistry(address(identityProxy));
        FaivrReputationRegistry reputation = FaivrReputationRegistry(address(reputationProxy));
        FaivrFeeModule feeModule = FaivrFeeModule(address(feeProxy));
        FaivrRouter router = FaivrRouter(address(routerProxy));

        try identity.grantRole(identity.REGISTRAR_ROLE(), address(router)) {
            console.log("Granted REGISTRAR_ROLE to router");
        } catch {
            console.log("WARNING: could not grant REGISTRAR_ROLE to router; run grantRole from ADMIN if router registration flows are needed.");
        }

        try feeModule.grantRole(feeModule.ROUTER_ROLE(), address(router)) {
            console.log("Granted ROUTER_ROLE to router on FeeModule");
        } catch {
            console.log("WARNING: could not grant ROUTER_ROLE to router on FeeModule; run grantRole from ADMIN if router funding flows are needed.");
        }

        try reputation.grantRole(reputation.ROUTER_ROLE(), address(router)) {
            console.log("Granted ROUTER_ROLE to router on ReputationRegistry");
        } catch {
            console.log("WARNING: could not grant ROUTER_ROLE to router on ReputationRegistry; run grantRole from the current reputation admin before using settleAndGiveFeedback.");
        }

        vm.stopBroadcast();

        // ── 4. Summary ───────────────────────────────────
        console.log("\n=== FAIVR Deployment Complete ===");
        console.log("Admin:              ", admin);
        console.log("Protocol Wallet:    ", protocolWallet);
        console.log("Dev Wallet:         ", devWallet);
        console.log("Identity (proxy):   ", address(identityProxy));
        console.log("Reputation (proxy): ", address(reputationProxy));
        console.log("Validation (proxy): ", address(validationProxy));
        console.log("FeeModule (proxy):  ", address(feeProxy));
        console.log("Router (proxy):     ", address(routerProxy));
    }
}
