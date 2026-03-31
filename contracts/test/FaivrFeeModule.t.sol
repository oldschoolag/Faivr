// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {IFaivrFeeModule} from "../src/interfaces/IFaivrFeeModule.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RejectETHReceiver is IERC721Receiver {
    bool public acceptETH;

    constructor(bool acceptETH_) {
        acceptETH = acceptETH_;
    }

    function setAcceptETH(bool acceptETH_) external {
        acceptETH = acceptETH_;
    }

    function claim(FaivrFeeModule feeModule) external {
        feeModule.withdrawPending();
    }

    receive() external payable {
        if (!acceptETH) revert();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract FaivrFeeModuleTest is Test {
    FaivrFeeModule public feeModule;
    FaivrIdentityRegistry public identity;
    MockUSDC public usdc;

    address public admin = makeAddr("admin");
    address public protocolWallet = makeAddr("protocol");
    address public devWallet = makeAddr("dev");
    address public alice = makeAddr("alice");
    address public agentOwner = makeAddr("agentOwner");
    uint256 public agentId;

    function setUp() public {
        FaivrIdentityRegistry identityImpl = new FaivrIdentityRegistry();
        ERC1967Proxy identityProxy = new ERC1967Proxy(
            address(identityImpl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        identity = FaivrIdentityRegistry(address(identityProxy));

        vm.prank(agentOwner);
        agentId = identity.register("ipfs://agent1");

        FaivrFeeModule feeImpl = new FaivrFeeModule();
        ERC1967Proxy feeProxy = new ERC1967Proxy(
            address(feeImpl),
            abi.encodeCall(FaivrFeeModule.initialize, (admin, protocolWallet, devWallet, address(identity)))
        );
        feeModule = FaivrFeeModule(address(feeProxy));

        vm.prank(admin);
        feeModule.setMaxEscrowAmount(0);

        usdc = new MockUSDC();
    }

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

    function test_settleTask_ETH() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        uint256 agentBefore = agentOwner.balance;
        uint256 protBefore = protocolWallet.balance;
        uint256 devBefore = devWallet.balance;

        vm.prank(alice);
        feeModule.settleTask(taskId);

        uint256 totalFee = 1 ether * 250 / 10_000;
        uint256 protFee = totalFee * 90 / 100;
        uint256 devFee = totalFee - protFee;
        uint256 agentPayout = 1 ether - totalFee;

        assertEq(agentOwner.balance - agentBefore, agentPayout);
        assertEq(protocolWallet.balance - protBefore, protFee);
        assertEq(devWallet.balance - devBefore, devFee);
        assertTrue(feeModule.getTask(taskId).status == IFaivrFeeModule.TaskStatus.SETTLED);
    }

    function test_settleTask_ERC20() public {
        usdc.mint(alice, 10_000e6);
        vm.prank(alice);
        usdc.approve(address(feeModule), 10_000e6);

        vm.prank(alice);
        uint256 taskId = feeModule.fundTask(agentId, address(usdc), 10_000e6, 1 days);

        vm.prank(alice);
        feeModule.settleTask(taskId);

        uint256 totalFee = 10_000e6 * 250 / 10_000;
        uint256 protFee = totalFee * 90 / 100;
        uint256 devFee = totalFee - protFee;
        uint256 agentPayout = 10_000e6 - totalFee;

        assertEq(usdc.balanceOf(agentOwner), agentPayout);
        assertEq(usdc.balanceOf(protocolWallet), protFee);
        assertEq(usdc.balanceOf(devWallet), devFee);
    }

    function test_settleTaskFor_matchesSettleTask_logic() public {
        bytes32 routerRole = feeModule.ROUTER_ROLE();
        vm.prank(admin);
        feeModule.grantRole(routerRole, admin);

        vm.deal(admin, 1 ether);
        vm.prank(admin);
        uint256 taskId = feeModule.fundTaskFor{value: 1 ether}(agentId, address(0), 1 ether, 1 days, alice);

        uint256 agentBefore = agentOwner.balance;
        uint256 protBefore = protocolWallet.balance;
        uint256 devBefore = devWallet.balance;

        vm.prank(admin);
        feeModule.settleTaskFor(taskId, alice);

        uint256 totalFee = 1 ether * 250 / 10_000;
        uint256 protFee = totalFee * 90 / 100;
        uint256 devFee = totalFee - protFee;
        uint256 agentPayout = 1 ether - totalFee;

        assertEq(agentOwner.balance - agentBefore, agentPayout);
        assertEq(protocolWallet.balance - protBefore, protFee);
        assertEq(devWallet.balance - devBefore, devFee);
        assertTrue(feeModule.getTask(taskId).status == IFaivrFeeModule.TaskStatus.SETTLED);
    }

    function test_revert_settle_notClient() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(agentOwner);
        vm.expectRevert(abi.encodeWithSelector(IFaivrFeeModule.NotTaskClient.selector, taskId));
        feeModule.settleTask(taskId);
    }

    function test_revert_settle_alreadySettled() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        feeModule.settleTask(taskId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IFaivrFeeModule.TaskNotFunded.selector, taskId));
        feeModule.settleTask(taskId);
    }

    function test_pendingWithdrawals_trackMultipleFailedRecipients() public {
        RejectETHReceiver agentReceiver = new RejectETHReceiver(false);
        RejectETHReceiver protocolReceiver = new RejectETHReceiver(false);
        RejectETHReceiver devReceiver = new RejectETHReceiver(false);

        vm.prank(agentOwner);
        identity.safeTransferFrom(agentOwner, address(agentReceiver), agentId);

        vm.startPrank(admin);
        feeModule.setProtocolWallet(address(protocolReceiver));
        feeModule.setDevWallet(address(devReceiver));
        vm.stopPrank();

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        feeModule.settleTask(taskId);

        uint256 totalFee = 1 ether * 250 / 10_000;
        uint256 protocolFee = totalFee * 90 / 100;
        uint256 devFee = totalFee - protocolFee;
        uint256 agentPayout = 1 ether - totalFee;

        assertEq(feeModule.pendingWithdrawal(address(agentReceiver)), agentPayout);
        assertEq(feeModule.pendingWithdrawal(address(protocolReceiver)), protocolFee);
        assertEq(feeModule.pendingWithdrawal(address(devReceiver)), devFee);
        assertEq(address(agentReceiver).balance, 0);
        assertEq(address(protocolReceiver).balance, 0);
        assertEq(address(devReceiver).balance, 0);
        assertTrue(feeModule.getTask(taskId).status == IFaivrFeeModule.TaskStatus.SETTLED);
    }

    function test_withdrawPending_revertDoesNotEraseBalance() public {
        RejectETHReceiver protocolReceiver = new RejectETHReceiver(false);

        vm.prank(admin);
        feeModule.setProtocolWallet(address(protocolReceiver));

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        feeModule.settleTask(taskId);

        uint256 totalFee = 1 ether * 250 / 10_000;
        uint256 protocolFee = totalFee * 90 / 100;
        assertEq(feeModule.pendingWithdrawal(address(protocolReceiver)), protocolFee);

        vm.expectRevert(IFaivrFeeModule.ETHTransferFailed.selector);
        protocolReceiver.claim(feeModule);

        assertEq(feeModule.pendingWithdrawal(address(protocolReceiver)), protocolFee);

        protocolReceiver.setAcceptETH(true);
        protocolReceiver.claim(feeModule);

        assertEq(feeModule.pendingWithdrawal(address(protocolReceiver)), 0);
        assertEq(address(protocolReceiver).balance, protocolFee);
    }

    function test_reclaimTask() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.warp(block.timestamp + 1 days + 1);

        uint256 before = alice.balance;
        vm.prank(alice);
        feeModule.reclaimTask(taskId);

        assertEq(alice.balance - before, 1 ether);
        assertTrue(feeModule.getTask(taskId).status == IFaivrFeeModule.TaskStatus.RECLAIMED);
    }

    function test_revert_reclaim_notExpired() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IFaivrFeeModule.TaskNotExpired.selector, taskId));
        feeModule.reclaimTask(taskId);
    }

    function test_revert_reclaim_notClient() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agentOwner);
        vm.expectRevert(abi.encodeWithSelector(IFaivrFeeModule.NotTaskClient.selector, taskId));
        feeModule.reclaimTask(taskId);
    }

    function test_setFeePercentage() public {
        vm.prank(admin);
        feeModule.setFeePercentage(500);
        assertEq(feeModule.feePercentage(), 500);
    }

    function test_revert_feeTooHigh() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IFaivrFeeModule.FeeTooHigh.selector, 1001));
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
