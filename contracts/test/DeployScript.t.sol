// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {Deploy} from "../script/Deploy.s.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";
import {FaivrReputationRegistry} from "../src/FaivrReputationRegistry.sol";
import {FaivrValidationRegistry} from "../src/FaivrValidationRegistry.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {FaivrRouter} from "../src/FaivrRouter.sol";

contract DeployScriptTest is Test {
    function test_runAndReturn_separateAdminAndBroadcaster_wiresRoles() public {
        (address admin,) = makeAddrAndKey("admin");
        address broadcaster = makeAddr("broadcaster");
        address protocolWallet = makeAddr("protocolWallet");
        address devWallet = makeAddr("devWallet");

        vm.deal(admin, 100 ether);
        vm.deal(broadcaster, 100 ether);

        Deploy deployScript = new Deploy();
        Deploy.Deployment memory deployment = deployScript.runAndReturn(
            admin,
            protocolWallet,
            devWallet,
            broadcaster,
            0
        );

        FaivrIdentityRegistry identity = FaivrIdentityRegistry(deployment.identityProxy);
        FaivrReputationRegistry reputation = FaivrReputationRegistry(deployment.reputationProxy);
        FaivrValidationRegistry validation = FaivrValidationRegistry(deployment.validationProxy);
        FaivrFeeModule feeModule = FaivrFeeModule(deployment.feeProxy);
        FaivrRouter router = FaivrRouter(deployment.routerProxy);

        assertTrue(identity.hasRole(identity.DEFAULT_ADMIN_ROLE(), admin));
        assertFalse(identity.hasRole(identity.DEFAULT_ADMIN_ROLE(), broadcaster));
        assertTrue(reputation.hasRole(reputation.DEFAULT_ADMIN_ROLE(), admin));
        assertFalse(reputation.hasRole(reputation.DEFAULT_ADMIN_ROLE(), broadcaster));
        assertTrue(validation.hasRole(validation.DEFAULT_ADMIN_ROLE(), admin));
        assertFalse(validation.hasRole(validation.DEFAULT_ADMIN_ROLE(), broadcaster));
        assertTrue(feeModule.hasRole(feeModule.DEFAULT_ADMIN_ROLE(), admin));
        assertFalse(feeModule.hasRole(feeModule.DEFAULT_ADMIN_ROLE(), broadcaster));
        assertTrue(router.hasRole(router.DEFAULT_ADMIN_ROLE(), admin));
        assertFalse(router.hasRole(router.DEFAULT_ADMIN_ROLE(), broadcaster));

        assertTrue(identity.hasRole(identity.REGISTRAR_ROLE(), deployment.routerProxy));
        assertTrue(feeModule.hasRole(feeModule.ROUTER_ROLE(), deployment.routerProxy));
        assertTrue(reputation.hasRole(reputation.FEEDBACK_ROUTER_ROLE(), deployment.routerProxy));
        assertTrue(reputation.hasRole(reputation.SETTLEMENT_SOURCE_ROLE(), deployment.feeProxy));
        assertEq(feeModule.reputationRegistry(), deployment.reputationProxy);

        assertEq(address(router.identityRegistry()), deployment.identityProxy);
        assertEq(address(router.reputationRegistry()), deployment.reputationProxy);
        assertEq(router.validationRegistry(), deployment.validationProxy);
        assertEq(address(router.feeModule()), deployment.feeProxy);

        assertEq(reputation.getIdentityRegistry(), deployment.identityProxy);
        assertEq(validation.getIdentityRegistry(), deployment.identityProxy);
        assertEq(feeModule.identityRegistry(), deployment.identityProxy);
        assertEq(feeModule.protocolWallet(), protocolWallet);
        assertEq(feeModule.devWallet(), devWallet);
    }

    function test_runAndReturn_revertsWhenAdminPrivateKeyDoesNotMatch() public {
        (address admin,) = makeAddrAndKey("admin");
        address broadcaster = makeAddr("broadcaster");
        address protocolWallet = makeAddr("protocolWallet");
        address devWallet = makeAddr("devWallet");
        uint256 wrongAdminPrivateKey = 1;

        vm.deal(admin, 100 ether);
        vm.deal(broadcaster, 100 ether);

        Deploy deployScript = new Deploy();

        vm.expectRevert(
            abi.encodeWithSelector(
                Deploy.AdminPrivateKeyMismatch.selector,
                admin,
                vm.addr(wrongAdminPrivateKey)
            )
        );

        deployScript.runAndReturn(
            admin,
            protocolWallet,
            devWallet,
            broadcaster,
            wrongAdminPrivateKey
        );
    }
}
