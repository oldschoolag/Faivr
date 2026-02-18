// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {IFaivrFeeModule} from "../src/interfaces/IFaivrFeeModule.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";

/// @dev Mock USDC for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract FaivrFeeModuleTest is Test {
    FaivrFeeModule public feeModule;
    FaivrIdentityRegistry public identity;
    MockUSDC public usdc;

    address public admin = makeAddr("admin");
    address public protocolWallet = makeAddr("protocol");
    address public devWallet = makeAddr("dev");
    address public alice = makeAddr("alice"); // client
    address public agentOwner = makeAddr("agentOwner");
    uint256 public agentId;

    function setUp() public {
        // Deploy identity registry
        FaivrIdentityRegistry identityImpl = new FaivrIdentityRegistry();
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(identityImpl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        identity = FaivrIdentityRegistry(address(identityProxy));

        // Register an agent
        vm.prank(agentOwner);
        agentId = identity.register("ipfs://agent1");

        // Deploy fee module
        FaivrFeeModule feeImpl = new FaivrFeeModule();
        ERC1967Proxy feeProxy = new ERC1967Proxy(
            address(feeImpl),
            abi.encodeCall(FaivrFeeModule.initialize, (
                admin, protocolWallet, devWallet, address(identity)
            ))
        );
        feeModule = FaivrFeeModule(address(feeProxy));

        // Remove escrow cap for testing
        vm.prank(admin);
        feeModule.setMaxEscrowAmount(0);

        // Deploy mock USDC
        usdc = new MockUSDC();
    }

    // ── Fund Task (ETH) ─────────────────────────────────

    function test_fundTask_ETH() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        assertEq(taskId, 1);
        IFaivrFeeModule.Task memory task = feeModule.getTask(taskId);
        assertEq(task.agentId, agentId);
        assertEq(task.client, alice);
        assertEq(task.amount, 1 ether);
        assertTrue(task.status == IFaivrFeeModule.TaskStatus.FUNDED);
    }

    function test_revert_fundTask_zeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        feeModule.fundTask(agentId, address(0), 0, 1 days);
    }

    function test_revert_fundTask_msgValueMismatch() public {
        vm.deal(alice, 2 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("MsgValueMismatch()"));
        feeModule.fundTask{value: 0.5 ether}(agentId, address(0), 1 ether, 1 days);
    }

    function test_revert_fundTask_ethSentForERC20() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("MsgValueMismatch()"));
        feeModule.fundTask{value: 1 ether}(agentId, address(usdc), 1000e6, 1 days);
    }

    // ── Fund Task (ERC20) ────────────────────────────────

    function test_fundTask_ERC20() public {
        usdc.mint(alice, 1000e6);
        vm.prank(alice);
        usdc.approve(address(feeModule), 1000e6);

        vm.prank(alice);
        uint256 taskId = feeModule.fundTask(agentId, address(usdc), 1000e6, 1 days);

        assertEq(usdc.balanceOf(address(feeModule)), 1000e6);
        IFaivrFeeModule.Task memory task = feeModule.getTask(taskId);
        assertEq(task.token, address(usdc));
        assertEq(task.amount, 1000e6);
    }

    // ── Settle Task (ETH) ────────────────────────────────

    function test_settleTask_ETH() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        uint256 agentBefore = agentOwner.balance;
        uint256 protBefore = protocolWallet.balance;
        uint256 devBefore = devWallet.balance;

        vm.prank(alice);
        feeModule.settleTask(taskId);

        // 2.5% fee total = 0.025 ETH
        // 90% protocol = 0.0225 ETH, 10% dev = 0.0025 ETH
        // Agent gets 0.975 ETH
        uint256 totalFee = 1 ether * 250 / 10_000; // 0.025 ETH
        uint256 protFee = totalFee * 90 / 100;
        uint256 devFee = totalFee - protFee;
        uint256 agentPayout = 1 ether - totalFee;

        assertEq(agentOwner.balance - agentBefore, agentPayout);
        assertEq(protocolWallet.balance - protBefore, protFee);
        assertEq(devWallet.balance - devBefore, devFee);

        IFaivrFeeModule.Task memory task = feeModule.getTask(taskId);
        assertTrue(task.status == IFaivrFeeModule.TaskStatus.SETTLED);
    }

    // ── Settle Task (ERC20) ──────────────────────────────

    function test_settleTask_ERC20() public {
        usdc.mint(alice, 10_000e6);
        vm.prank(alice);
        usdc.approve(address(feeModule), 10_000e6);

        vm.prank(alice);
        uint256 taskId = feeModule.fundTask(agentId, address(usdc), 10_000e6, 1 days);

        vm.prank(alice);
        feeModule.settleTask(taskId);

        uint256 totalFee = 10_000e6 * 250 / 10_000; // 250 USDC
        uint256 protFee = totalFee * 90 / 100; // 225 USDC
        uint256 devFee = totalFee - protFee; // 25 USDC
        uint256 agentPayout = 10_000e6 - totalFee; // 9750 USDC

        assertEq(usdc.balanceOf(agentOwner), agentPayout);
        assertEq(usdc.balanceOf(protocolWallet), protFee);
        assertEq(usdc.balanceOf(devWallet), devFee);
    }

    function test_revert_settle_notClient() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(agentOwner);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrFeeModule.NotTaskClient.selector, taskId
        ));
        feeModule.settleTask(taskId);
    }

    function test_revert_settle_alreadySettled() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        feeModule.settleTask(taskId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrFeeModule.TaskNotFunded.selector, taskId
        ));
        feeModule.settleTask(taskId);
    }

    // ── Reclaim ──────────────────────────────────────────

    function test_reclaimTask() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        // Warp past deadline
        vm.warp(block.timestamp + 1 days + 1);

        uint256 before = alice.balance;
        vm.prank(alice);
        feeModule.reclaimTask(taskId);

        assertEq(alice.balance - before, 1 ether);
        IFaivrFeeModule.Task memory task = feeModule.getTask(taskId);
        assertTrue(task.status == IFaivrFeeModule.TaskStatus.RECLAIMED);
    }

    function test_revert_reclaim_notExpired() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrFeeModule.TaskNotExpired.selector, taskId
        ));
        feeModule.reclaimTask(taskId);
    }

    function test_revert_reclaim_notClient() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agentOwner);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrFeeModule.NotTaskClient.selector, taskId
        ));
        feeModule.reclaimTask(taskId);
    }

    // ── Admin ────────────────────────────────────────────

    function test_setFeePercentage() public {
        vm.prank(admin);
        feeModule.setFeePercentage(500); // 5%
        assertEq(feeModule.feePercentage(), 500);
    }

    function test_revert_feeTooHigh() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrFeeModule.FeeTooHigh.selector, 1001
        ));
        feeModule.setFeePercentage(1001);
    }

    function test_setWallets() public {
        address newProt = makeAddr("newProt");
        address newDev = makeAddr("newDev");

        vm.prank(admin);
        feeModule.setProtocolWallet(newProt);
        assertEq(feeModule.protocolWallet(), newProt);

        vm.prank(admin);
        feeModule.setDevWallet(newDev);
        assertEq(feeModule.devWallet(), newDev);
    }

    function test_revert_setWallet_zero() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        feeModule.setProtocolWallet(address(0));
    }

    function test_pause_unpause() public {
        vm.prank(admin);
        feeModule.pause();

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert();
        feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(admin);
        feeModule.unpause();

        vm.prank(alice);
        feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);
    }

    function test_totalFeesCollected() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        feeModule.settleTask(taskId);

        uint256 totalFee = 1 ether * 250 / 10_000;
        assertEq(feeModule.totalFeesCollected(address(0)), totalFee);
    }

    // ── Escrow Cap Tests ─────────────────────────────────
    function test_escrowCap_enforced() public {
        vm.prank(admin);
        feeModule.setMaxEscrowAmount(0.1 ether);

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IFaivrFeeModule.EscrowCapExceeded.selector, 0.5 ether, 0.1 ether));
        feeModule.fundTask{value: 0.5 ether}(agentId, address(0), 0.5 ether, 1 days);
    }

    function test_escrowCap_allowsUnderLimit() public {
        vm.prank(admin);
        feeModule.setMaxEscrowAmount(0.1 ether);

        vm.deal(alice, 0.1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 0.05 ether}(agentId, address(0), 0.05 ether, 1 days);
        assertEq(taskId, 1);
    }

    function test_escrowCap_zeroMeansUnlimited() public {
        vm.prank(admin);
        feeModule.setMaxEscrowAmount(0);

        vm.deal(alice, 100 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 100 ether}(agentId, address(0), 100 ether, 1 days);
        assertEq(taskId, 1);
    }

    function test_escrowCap_onlyFeeManager() public {
        vm.prank(alice);
        vm.expectRevert();
        feeModule.setMaxEscrowAmount(1 ether);
    }
}
