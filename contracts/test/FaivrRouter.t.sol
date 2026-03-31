// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";
import {FaivrReputationRegistry} from "../src/FaivrReputationRegistry.sol";
import {FaivrValidationRegistry} from "../src/FaivrValidationRegistry.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {FaivrRouter} from "../src/FaivrRouter.sol";
import {IFaivrFeeModule} from "../src/interfaces/IFaivrFeeModule.sol";

contract RouterMockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract FaivrRouterTest is Test {
    FaivrIdentityRegistry public identity;
    FaivrReputationRegistry public reputation;
    FaivrValidationRegistry public validation;
    FaivrFeeModule public feeModule;
    FaivrRouter public router;
    RouterMockUSDC public usdc;

    address public admin = makeAddr("admin");
    address public protocolWallet = makeAddr("protocol");
    address public devWallet = makeAddr("dev");
    address public alice = makeAddr("alice");
    address public agentOwner = makeAddr("agentOwner");

    function setUp() public {
        FaivrIdentityRegistry identityImpl = new FaivrIdentityRegistry();
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(identityImpl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        identity = FaivrIdentityRegistry(address(identityProxy));

        FaivrReputationRegistry repImpl = new FaivrReputationRegistry();
        vm.prank(admin);
        ERC1967Proxy repProxy = new ERC1967Proxy(
            address(repImpl),
            abi.encodeCall(FaivrReputationRegistry.initialize, (address(identityProxy)))
        );
        reputation = FaivrReputationRegistry(address(repProxy));

        FaivrValidationRegistry valImpl = new FaivrValidationRegistry();
        vm.prank(admin);
        ERC1967Proxy valProxy = new ERC1967Proxy(
            address(valImpl),
            abi.encodeCall(FaivrValidationRegistry.initialize, (address(identityProxy)))
        );
        validation = FaivrValidationRegistry(address(valProxy));

        FaivrFeeModule feeImpl = new FaivrFeeModule();
        ERC1967Proxy feeProxy = new ERC1967Proxy(
            address(feeImpl),
            abi.encodeCall(FaivrFeeModule.initialize, (admin, protocolWallet, devWallet, address(identityProxy)))
        );
        feeModule = FaivrFeeModule(address(feeProxy));

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

        vm.startPrank(admin);
        identity.grantRole(identity.REGISTRAR_ROLE(), address(router));
        feeModule.grantRole(feeModule.ROUTER_ROLE(), address(router));
        feeModule.setMaxEscrowAmount(0);
        reputation.grantRole(reputation.ROUTER_ROLE(), address(router));
        vm.stopPrank();

        usdc = new RouterMockUSDC();
    }

    function test_getContracts() public view {
        (address id, address rep, address val, address fee) = router.getContracts();
        assertEq(id, address(identity));
        assertEq(rep, address(reputation));
        assertEq(val, address(validation));
        assertEq(fee, address(feeModule));
    }

    function test_registerAndFund_ETH() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        (uint256 agentId, uint256 taskId) = router.registerAndFund{value: 1 ether}(
            "ipfs://agent1",
            address(0),
            1 ether,
            1 days
        );

        assertEq(identity.ownerOf(agentId), alice);
        IFaivrFeeModule.Task memory task = feeModule.getTask(taskId);
        assertEq(task.agentId, agentId);
        assertEq(task.client, alice);
        assertEq(task.amount, 1 ether);
        assertTrue(task.status == IFaivrFeeModule.TaskStatus.FUNDED);
    }

    function test_revert_registerAndFund_ERC20_whenOnlyRouterApproved() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.approve(address(router), 1_000e6);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FaivrRouter.ApproveFeeModuleNotRouter.selector, address(feeModule), address(router)));
        router.registerAndFund("ipfs://agent1", address(usdc), 1_000e6, 1 days);

        assertEq(usdc.balanceOf(address(feeModule)), 0);
        vm.expectRevert();
        identity.ownerOf(1);
    }

    function test_registerAndFund_ERC20_whenFeeModuleApproved() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.approve(address(feeModule), 1_000e6);

        vm.prank(alice);
        (uint256 agentId, uint256 taskId) = router.registerAndFund("ipfs://agent1", address(usdc), 1_000e6, 1 days);

        assertEq(identity.ownerOf(agentId), alice);
        assertEq(usdc.balanceOf(address(feeModule)), 1_000e6);
        assertEq(feeModule.getTask(taskId).client, alice);
    }

    function test_settleAndGiveFeedback_recordsFeedbackForClient() public {
        vm.prank(agentOwner);
        uint256 agentId = identity.register("ipfs://agent1");

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        router.settleAndGiveFeedback(taskId, agentId, 87, 0, "starred", "quality");

        IFaivrFeeModule.Task memory task = feeModule.getTask(taskId);
        assertTrue(task.status == IFaivrFeeModule.TaskStatus.SETTLED);
        assertTrue(router.feedbackGivenForTask(taskId));

        (int128 value, uint8 decimals, string memory tag1, string memory tag2, bool revoked) =
            reputation.readFeedback(agentId, alice, 1);
        assertEq(value, 87);
        assertEq(decimals, 0);
        assertEq(tag1, "starred");
        assertEq(tag2, "quality");
        assertFalse(revoked);
        assertEq(reputation.getLastIndex(agentId, address(router)), 0);
    }

    function test_revert_settleAndGiveFeedback_doubleFeedback() public {
        vm.prank(agentOwner);
        uint256 agentId = identity.register("ipfs://agent1");

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        router.settleAndGiveFeedback(taskId, agentId, 87, 0, "starred", "quality");

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FaivrRouter.FeedbackAlreadyGiven.selector, taskId));
        router.settleAndGiveFeedback(taskId, agentId, 88, 0, "starred", "quality");
    }

    function test_revert_settleAndGiveFeedback_agentMismatch() public {
        vm.startPrank(agentOwner);
        uint256 agentId = identity.register("ipfs://agent1");
        uint256 otherAgentId = identity.register("ipfs://agent2");
        vm.stopPrank();

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FaivrRouter.TaskAgentMismatch.selector, taskId, agentId, otherAgentId));
        router.settleAndGiveFeedback(taskId, otherAgentId, 87, 0, "starred", "quality");
    }

    function test_revert_initialize_zeroAddress() public {
        FaivrRouter impl = new FaivrRouter();
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ERC1967Proxy(
            address(impl),
            abi.encodeCall(FaivrRouter.initialize, (admin, address(0), address(reputation), address(validation), address(feeModule)))
        );
    }
}
