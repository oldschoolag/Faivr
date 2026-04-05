// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";
import {FaivrReputationRegistry} from "../src/FaivrReputationRegistry.sol";
import {FaivrValidationRegistry} from "../src/FaivrValidationRegistry.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {FaivrRouter} from "../src/FaivrRouter.sol";
import {FaivrVerificationRegistry} from "../src/FaivrVerificationRegistry.sol";

contract UpgradeMainnetParity is Script {
    address internal constant EXPECTED_ADMIN = 0x580e2BD60625F146bC32C75A63DBe0f61810CCdA;

    address internal constant IDENTITY_PROXY = 0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6;
    address internal constant REPUTATION_PROXY = 0x00280bc9cFF156a8E8E9aE7c54029B74902a829c;
    address internal constant VALIDATION_PROXY = 0x95DF02B02e2D777E0fcB80F83c061500C112F05b;
    address internal constant FEE_PROXY = 0xD68D402Bb450A79D8e639e41F0455990A223E47F;
    address internal constant ROUTER_PROXY = 0x7EC51888ecd3E47c6F4cF324474041790C8aB7fa;
    address internal constant VERIFICATION_PROXY = 0x6654FA7d6eE8A0f6641a5535AeE346115f06e161;

    address internal constant DEFAULT_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant DEFAULT_USDT = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2;
    address internal constant DEFAULT_FRANKENCOIN = 0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553;

    struct UpgradeState {
        address identityImpl;
        address reputationImpl;
        address validationImpl;
        address feeImpl;
        address routerImpl;
        address verificationImpl;
        address usdc;
        address usdt;
        address frankencoin;
    }

    function run() external returns (UpgradeState memory state) {
        uint256 adminPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address admin = vm.addr(adminPrivateKey);
        require(admin == EXPECTED_ADMIN, "UpgradeMainnetParity: unexpected admin key");

        state.usdc = vm.envOr("USDC_TOKEN", DEFAULT_USDC);
        state.usdt = vm.envOr("USDT_TOKEN", DEFAULT_USDT);
        state.frankencoin = vm.envOr("FRANKENCOIN_TOKEN", DEFAULT_FRANKENCOIN);

        vm.startBroadcast(adminPrivateKey);

        state.identityImpl = address(new FaivrIdentityRegistry());
        state.reputationImpl = address(new FaivrReputationRegistry());
        state.validationImpl = address(new FaivrValidationRegistry());
        state.feeImpl = address(new FaivrFeeModule());
        state.routerImpl = address(new FaivrRouter());
        state.verificationImpl = address(new FaivrVerificationRegistry());

        FaivrIdentityRegistry identity = FaivrIdentityRegistry(IDENTITY_PROXY);
        FaivrReputationRegistry reputation = FaivrReputationRegistry(REPUTATION_PROXY);
        FaivrValidationRegistry validation = FaivrValidationRegistry(VALIDATION_PROXY);
        FaivrFeeModule feeModule = FaivrFeeModule(FEE_PROXY);
        FaivrRouter router = FaivrRouter(ROUTER_PROXY);
        FaivrVerificationRegistry verification = FaivrVerificationRegistry(VERIFICATION_PROXY);

        identity.upgradeToAndCall(state.identityImpl, "");
        reputation.upgradeToAndCall(state.reputationImpl, "");
        validation.upgradeToAndCall(state.validationImpl, "");
        feeModule.upgradeToAndCall(state.feeImpl, "");
        router.upgradeToAndCall(state.routerImpl, "");
        verification.upgradeToAndCall(state.verificationImpl, "");

        _wireRoles(identity, reputation, feeModule);
        _configureFeeModule(feeModule, reputation, state.usdc, state.usdt, state.frankencoin);

        vm.stopBroadcast();

        console2.log("Parity upgrade complete.");
        console2.log("Identity impl", state.identityImpl);
        console2.log("Reputation impl", state.reputationImpl);
        console2.log("Validation impl", state.validationImpl);
        console2.log("Fee impl", state.feeImpl);
        console2.log("Router impl", state.routerImpl);
        console2.log("Verification impl", state.verificationImpl);
        console2.log("USDC enabled", state.usdc);
        console2.log("USDT enabled", state.usdt);
        console2.log("Frankencoin enabled", state.frankencoin);
    }

    function _wireRoles(FaivrIdentityRegistry identity, FaivrReputationRegistry reputation, FaivrFeeModule feeModule)
        internal
    {
        if (!identity.hasRole(identity.REGISTRAR_ROLE(), ROUTER_PROXY)) {
            identity.grantRole(identity.REGISTRAR_ROLE(), ROUTER_PROXY);
        }

        if (!feeModule.hasRole(feeModule.ROUTER_ROLE(), ROUTER_PROXY)) {
            feeModule.grantRole(feeModule.ROUTER_ROLE(), ROUTER_PROXY);
        }

        if (!reputation.hasRole(reputation.FEEDBACK_ROUTER_ROLE(), ROUTER_PROXY)) {
            reputation.grantRole(reputation.FEEDBACK_ROUTER_ROLE(), ROUTER_PROXY);
        }

        if (!reputation.hasRole(reputation.SETTLEMENT_SOURCE_ROLE(), FEE_PROXY)) {
            reputation.grantRole(reputation.SETTLEMENT_SOURCE_ROLE(), FEE_PROXY);
        }
    }

    function _configureFeeModule(
        FaivrFeeModule feeModule,
        FaivrReputationRegistry reputation,
        address usdc,
        address usdt,
        address frankencoin
    ) internal {
        if (feeModule.reputationRegistry() != address(reputation)) {
            feeModule.setReputationRegistry(address(reputation));
        }

        _enableTokenIfNeeded(feeModule, usdc);
        _enableTokenIfNeeded(feeModule, usdt);
        _enableTokenIfNeeded(feeModule, frankencoin);
    }

    function _enableTokenIfNeeded(FaivrFeeModule feeModule, address token) internal {
        require(token != address(0), "UpgradeMainnetParity: token is zero address");
        if (!feeModule.isSupportedToken(token)) {
            feeModule.setSupportedToken(token, true);
        }
    }
}
