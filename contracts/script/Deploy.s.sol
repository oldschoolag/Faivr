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
            abi.encodeCall(FaivrReputationRegistry.initialize, (admin))
        );
        console.log("ReputationRegistry proxy:", address(reputationProxy));

        ERC1967Proxy validationProxy = new ERC1967Proxy(
            address(validationImpl),
            abi.encodeCall(FaivrValidationRegistry.initialize, (admin))
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

        vm.stopBroadcast();

        // ── 3. Summary ──────────────────────────────────
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
