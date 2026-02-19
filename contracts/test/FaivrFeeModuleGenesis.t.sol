// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {FaivrFeeModule} from "../src/FaivrFeeModule.sol";
import {IFaivrFeeModule} from "../src/interfaces/IFaivrFeeModule.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";

contract FaivrFeeModuleGenesisTest is Test {
    FaivrFeeModule public feeModule;
    FaivrIdentityRegistry public identity;

    address public admin = makeAddr("admin");
    address public protocolWallet = makeAddr("protocol");
    address public devWallet = makeAddr("dev");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
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
    }

    // ── Admin controls ───────────────────────────────────

    function test_addGenesisAgent() public {
        vm.prank(admin);
        feeModule.addGenesisAgent(alice);
        assertTrue(feeModule.isGenesisAgent(alice));
        assertEq(feeModule.genesisAgentCount(), 1);
    }

    function test_removeGenesisAgent() public {
        vm.prank(admin);
        feeModule.addGenesisAgent(alice);
        vm.prank(admin);
        feeModule.removeGenesisAgent(alice);
        assertFalse(feeModule.isGenesisAgent(alice));
        assertEq(feeModule.genesisAgentCount(), 0);
    }

    function test_revert_addGenesis_notAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        feeModule.addGenesisAgent(alice);
    }

    function test_revert_removeGenesis_notAdmin() public {
        vm.prank(admin);
        feeModule.addGenesisAgent(alice);
        vm.prank(alice);
        vm.expectRevert();
        feeModule.removeGenesisAgent(alice);
    }

    function test_revert_addGenesis_duplicate() public {
        vm.prank(admin);
        feeModule.addGenesisAgent(alice);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSignature("AlreadyGenesisAgent()"));
        feeModule.addGenesisAgent(alice);
    }

    function test_revert_removeGenesis_notGenesis() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSignature("NotGenesisAgent()"));
        feeModule.removeGenesisAgent(alice);
    }

    function test_revert_addGenesis_capReached() public {
        for (uint256 i = 0; i < 50; i++) {
            vm.prank(admin);
            feeModule.addGenesisAgent(address(uint160(1000 + i)));
        }
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSignature("GenesisCapReached()"));
        feeModule.addGenesisAgent(alice);
    }

    // ── Fee exemption ────────────────────────────────────

    function test_genesisAgent_zeroFee_first10Tasks() public {
        vm.prank(admin);
        feeModule.addGenesisAgent(alice);

        for (uint8 i = 0; i < 10; i++) {
            vm.deal(alice, 1 ether);
            vm.prank(alice);
            uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

            uint256 agentBefore = agentOwner.balance;
            uint256 protBefore = protocolWallet.balance;
            uint256 devBefore = devWallet.balance;

            vm.prank(alice);
            feeModule.settleTask(taskId);

            // Agent gets full amount, no fees
            assertEq(agentOwner.balance - agentBefore, 1 ether, "Agent should get full amount");
            assertEq(protocolWallet.balance - protBefore, 0, "Protocol should get 0 fee");
            assertEq(devWallet.balance - devBefore, 0, "Dev should get 0 fee");
        }

        assertEq(feeModule.genesisTasksUsed(alice), 10);
    }

    function test_genesisAgent_fullFee_on11thTask() public {
        vm.prank(admin);
        feeModule.addGenesisAgent(alice);

        // Burn through 10 free tasks
        for (uint8 i = 0; i < 10; i++) {
            vm.deal(alice, 1 ether);
            vm.prank(alice);
            uint256 tid = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);
            vm.prank(alice);
            feeModule.settleTask(tid);
        }

        // 11th task should charge fee
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        uint256 agentBefore = agentOwner.balance;
        vm.prank(alice);
        feeModule.settleTask(taskId);

        uint256 expectedFee = 1 ether * 250 / 10_000;
        uint256 expectedPayout = 1 ether - expectedFee;
        assertEq(agentOwner.balance - agentBefore, expectedPayout, "Agent should get amount minus fee");
    }

    function test_nonGenesisAgent_paysFee() public {
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 taskId = feeModule.fundTask{value: 1 ether}(agentId, address(0), 1 ether, 1 days);

        uint256 agentBefore = agentOwner.balance;
        vm.prank(bob);
        feeModule.settleTask(taskId);

        uint256 expectedFee = 1 ether * 250 / 10_000;
        uint256 expectedPayout = 1 ether - expectedFee;
        assertEq(agentOwner.balance - agentBefore, expectedPayout);
    }
}
