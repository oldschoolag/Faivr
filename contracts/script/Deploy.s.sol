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
    error AdminPrivateKeyMismatch(address expectedAdmin, address derivedAdmin);

    struct Deployment {
        address identityProxy;
        address reputationProxy;
        address validationProxy;
        address feeProxy;
        address routerProxy;
    }

    function run() external {
        address admin = vm.envAddress("ADMIN");
        address protocolWallet = vm.envAddress("PROTOCOL_WALLET");
        address devWallet = vm.envAddress("DEV_WALLET");
        address broadcaster = vm.envOr("BROADCASTER", address(0));
        uint256 adminPrivateKey = vm.envOr("ADMIN_PRIVATE_KEY", uint256(0));

        _run(admin, protocolWallet, devWallet, broadcaster, adminPrivateKey);
    }

    function run(address admin, address protocolWallet, address devWallet, address broadcaster, uint256 adminPrivateKey)
        external
    {
        _run(admin, protocolWallet, devWallet, broadcaster, adminPrivateKey);
    }

    function runAndReturn(
        address admin,
        address protocolWallet,
        address devWallet,
        address broadcaster,
        uint256 adminPrivateKey
    ) external returns (Deployment memory deployment) {
        return _run(admin, protocolWallet, devWallet, broadcaster, adminPrivateKey);
    }

    function _run(
        address admin,
        address protocolWallet,
        address devWallet,
        address broadcaster,
        uint256 adminPrivateKey
    ) internal returns (Deployment memory deployment) {
        _startDeploymentBroadcast(broadcaster);
        deployment = _deploy(admin, protocolWallet, devWallet);
        vm.stopBroadcast();

        _startAdminBroadcast(admin, broadcaster, adminPrivateKey);
        _wireRoles(deployment);
        vm.stopBroadcast();

        _logSummary(admin, protocolWallet, devWallet, broadcaster, deployment);
    }

    function _startDeploymentBroadcast(address broadcaster) internal {
        if (broadcaster == address(0)) {
            vm.startBroadcast();
            return;
        }

        vm.startBroadcast(broadcaster);
    }

    function _startAdminBroadcast(address admin, address broadcaster, uint256 adminPrivateKey) internal {
        if (adminPrivateKey != 0) {
            address derivedAdmin = vm.addr(adminPrivateKey);
            if (derivedAdmin != admin) revert AdminPrivateKeyMismatch(admin, derivedAdmin);
            vm.startBroadcast(adminPrivateKey);
            return;
        }

        if (admin == broadcaster && admin != address(0)) {
            vm.startBroadcast(broadcaster);
            return;
        }

        vm.startBroadcast(admin);
    }

    function _deploy(address admin, address protocolWallet, address devWallet)
        internal
        returns (Deployment memory deployment)
    {
        // ── 1. Deploy implementations ────────────────────
        FaivrIdentityRegistry identityImpl = new FaivrIdentityRegistry();
        FaivrReputationRegistry reputationImpl = new FaivrReputationRegistry();
        FaivrValidationRegistry validationImpl = new FaivrValidationRegistry();
        FaivrFeeModule feeImpl = new FaivrFeeModule();
        FaivrRouter routerImpl = new FaivrRouter();

        // ── 2. Deploy proxies + initialize ───────────────
        ERC1967Proxy identityProxy =
            new ERC1967Proxy(address(identityImpl), abi.encodeCall(FaivrIdentityRegistry.initialize, (admin)));
        console.log("IdentityRegistry proxy:", address(identityProxy));

        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(reputationImpl), abi.encodeCall(FaivrReputationRegistry.initialize, (admin, address(identityProxy)))
        );
        console.log("ReputationRegistry proxy:", address(reputationProxy));

        ERC1967Proxy validationProxy = new ERC1967Proxy(
            address(validationImpl), abi.encodeCall(FaivrValidationRegistry.initialize, (admin, address(identityProxy)))
        );
        console.log("ValidationRegistry proxy:", address(validationProxy));

        ERC1967Proxy feeProxy = new ERC1967Proxy(
            address(feeImpl),
            abi.encodeCall(FaivrFeeModule.initialize, (admin, protocolWallet, devWallet, address(identityProxy)))
        );
        console.log("FeeModule proxy:", address(feeProxy));

        ERC1967Proxy routerProxy = new ERC1967Proxy(
            address(routerImpl),
            abi.encodeCall(
                FaivrRouter.initialize,
                (admin, address(identityProxy), address(reputationProxy), address(validationProxy), address(feeProxy))
            )
        );
        console.log("Router proxy:", address(routerProxy));

        deployment = Deployment({
            identityProxy: address(identityProxy),
            reputationProxy: address(reputationProxy),
            validationProxy: address(validationProxy),
            feeProxy: address(feeProxy),
            routerProxy: address(routerProxy)
        });
    }

    function _wireRoles(Deployment memory deployment) internal {
        // ── 3. Post-deploy role wiring ───────────────────
        FaivrIdentityRegistry identity = FaivrIdentityRegistry(deployment.identityProxy);
        FaivrReputationRegistry reputation = FaivrReputationRegistry(deployment.reputationProxy);
        FaivrFeeModule feeModule = FaivrFeeModule(deployment.feeProxy);

        identity.grantRole(identity.REGISTRAR_ROLE(), deployment.routerProxy);
        feeModule.grantRole(feeModule.ROUTER_ROLE(), deployment.routerProxy);
        reputation.grantRole(reputation.FEEDBACK_ROUTER_ROLE(), deployment.routerProxy);
        reputation.grantRole(reputation.SETTLEMENT_SOURCE_ROLE(), deployment.feeProxy);
        feeModule.setReputationRegistry(deployment.reputationProxy);
        _configureSupportedTokens(feeModule);
    }

    function _configureSupportedTokens(FaivrFeeModule feeModule) internal {
        address usdcToken = vm.envOr("USDC_TOKEN", address(0));
        address usdtToken = vm.envOr("USDT_TOKEN", address(0));
        address frankencoinToken = vm.envOr("FRANKENCOIN_TOKEN", address(0));

        if (usdcToken != address(0)) {
            feeModule.setSupportedToken(usdcToken, true);
            console.log("FeeModule token enabled:", usdcToken);
        }

        if (usdtToken != address(0)) {
            feeModule.setSupportedToken(usdtToken, true);
            console.log("FeeModule token enabled:", usdtToken);
        }

        if (frankencoinToken != address(0)) {
            feeModule.setSupportedToken(frankencoinToken, true);
            console.log("FeeModule token enabled:", frankencoinToken);
        }
    }

    function _logSummary(
        address admin,
        address protocolWallet,
        address devWallet,
        address broadcaster,
        Deployment memory deployment
    ) internal {
        // ── 4. Summary ──────────────────────────────────
        console.log("\n=== FAIVR Deployment Complete ===");
        console.log("Admin:              ", admin);
        console.log("Protocol Wallet:    ", protocolWallet);
        console.log("Dev Wallet:         ", devWallet);
        console.log("Broadcaster:        ", broadcaster);
        console.log("Identity (proxy):   ", deployment.identityProxy);
        console.log("Reputation (proxy): ", deployment.reputationProxy);
        console.log("Validation (proxy): ", deployment.validationProxy);
        console.log("FeeModule (proxy):  ", deployment.feeProxy);
        console.log("Router (proxy):     ", deployment.routerProxy);
    }
}
