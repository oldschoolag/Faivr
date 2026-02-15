// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";
import {FaivrReputationRegistry} from "../src/FaivrReputationRegistry.sol";
import {FaivrValidationRegistry} from "../src/FaivrValidationRegistry.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {FaivrRouter} from "../src/FaivrRouter.sol";

contract FaivrRouterTest is Test {
    FaivrIdentityRegistry public identity;
    FaivrReputationRegistry public reputation;
    FaivrValidationRegistry public validation;
    FaivrFeeModule public feeModule;
    FaivrRouter public router;

    address public admin = makeAddr("admin");
    address public protocolWallet = makeAddr("protocol");
    address public devWallet = makeAddr("dev");
    address public alice = makeAddr("alice");

    function setUp() public {
        // Deploy identity
        FaivrIdentityRegistry identityImpl = new FaivrIdentityRegistry();
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(identityImpl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        identity = FaivrIdentityRegistry(address(identityProxy));

        // Deploy reputation (initialized with identity registry)
        FaivrReputationRegistry repImpl = new FaivrReputationRegistry();
        vm.prank(admin);
        ERC1967Proxy repProxy = new ERC1967Proxy(
            address(repImpl),
            abi.encodeCall(FaivrReputationRegistry.initialize, (address(identityProxy)))
        );
        reputation = FaivrReputationRegistry(address(repProxy));

        // Deploy validation
        FaivrValidationRegistry valImpl = new FaivrValidationRegistry();
        vm.prank(admin);
        ERC1967Proxy valProxy = new ERC1967Proxy(
            address(valImpl),
            abi.encodeCall(FaivrValidationRegistry.initialize, (address(identityProxy)))
        );
        validation = FaivrValidationRegistry(address(valProxy));

        // Deploy fee module
        FaivrFeeModule feeImpl = new FaivrFeeModule();
        ERC1967Proxy feeProxy = new ERC1967Proxy(
            address(feeImpl),
            abi.encodeCall(FaivrFeeModule.initialize, (
                admin, protocolWallet, devWallet, address(identityProxy)
            ))
        );
        feeModule = FaivrFeeModule(address(feeProxy));

        // Deploy router
        FaivrRouter routerImpl = new FaivrRouter();
        ERC1967Proxy routerProxy = new ERC1967Proxy(
            address(routerImpl),
            abi.encodeCall(FaivrRouter.initialize, (
                admin,
                address(identityProxy),
                address(repProxy),
                address(valProxy),
                address(feeProxy)
            ))
        );
        router = FaivrRouter(address(routerProxy));
    }

    function test_getContracts() public view {
        (address id, address rep, address val, address fee) = router.getContracts();
        assertEq(id, address(identity));
        assertEq(rep, address(reputation));
        assertEq(val, address(validation));
        assertEq(fee, address(feeModule));
    }

    function test_revert_initialize_zeroAddress() public {
        FaivrRouter impl = new FaivrRouter();
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ERC1967Proxy(
            address(impl),
            abi.encodeCall(FaivrRouter.initialize, (
                admin, address(0), address(reputation), address(validation), address(feeModule)
            ))
        );
    }
}
