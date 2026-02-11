// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IFaivrIdentityRegistry} from "../src/interfaces/IFaivrIdentityRegistry.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";

contract FaivrIdentityRegistryTest is Test {
    FaivrIdentityRegistry public registry;
    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        FaivrIdentityRegistry impl = new FaivrIdentityRegistry();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        registry = FaivrIdentityRegistry(address(proxy));
    }

    // ── Registration ─────────────────────────────────────

    function test_registerAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent1");

        assertEq(agentId, 1);
        assertEq(registry.ownerOf(agentId), alice);
        assertEq(registry.tokenURI(agentId), "ipfs://agent1");
        assertTrue(registry.isActive(agentId));
        assertEq(registry.agentCount(), 1);
        assertGt(registry.registeredAt(agentId), 0);
    }

    function test_registerMultipleAgents() public {
        vm.prank(alice);
        uint256 id1 = registry.registerAgent("ipfs://agent1");
        vm.prank(bob);
        uint256 id2 = registry.registerAgent("ipfs://agent2");

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.agentCount(), 2);
    }

    function test_revert_registerEmptyURI() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EmptyURI()"));
        registry.registerAgent("");
    }

    // ── URI Update ───────────────────────────────────────

    function test_updateAgentURI() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://old");

        vm.prank(alice);
        registry.updateAgentURI(agentId, "ipfs://new");

        assertEq(registry.tokenURI(agentId), "ipfs://new");
    }

    function test_revert_updateURI_notOwner() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent");

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrIdentityRegistry.NotAgentOwner.selector, agentId
        ));
        registry.updateAgentURI(agentId, "ipfs://hack");
    }

    function test_revert_updateURI_empty() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent");

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EmptyURI()"));
        registry.updateAgentURI(agentId, "");
    }

    // ── Deactivate / Reactivate ──────────────────────────

    function test_deactivateAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent");

        vm.prank(alice);
        registry.deactivateAgent(agentId);

        assertFalse(registry.isActive(agentId));
    }

    function test_reactivateAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent");

        vm.prank(alice);
        registry.deactivateAgent(agentId);
        vm.prank(alice);
        registry.reactivateAgent(agentId);

        assertTrue(registry.isActive(agentId));
    }

    function test_revert_deactivate_notOwner() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent");

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrIdentityRegistry.NotAgentOwner.selector, agentId
        ));
        registry.deactivateAgent(agentId);
    }

    function test_revert_deactivate_alreadyInactive() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent");

        vm.prank(alice);
        registry.deactivateAgent(agentId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrIdentityRegistry.AgentNotActive.selector, agentId
        ));
        registry.deactivateAgent(agentId);
    }

    function test_revert_reactivate_alreadyActive() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent");

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrIdentityRegistry.AgentAlreadyActive.selector, agentId
        ));
        registry.reactivateAgent(agentId);
    }

    // ── Access Control ───────────────────────────────────

    function test_revert_upgrade_notAdmin() public {
        FaivrIdentityRegistry newImpl = new FaivrIdentityRegistry();
        vm.prank(alice);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImpl), "");
    }

    function test_upgrade_asAdmin() public {
        FaivrIdentityRegistry newImpl = new FaivrIdentityRegistry();
        vm.prank(admin);
        registry.upgradeToAndCall(address(newImpl), "");
        // Should still work after upgrade
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://post-upgrade");
        assertEq(registry.tokenURI(agentId), "ipfs://post-upgrade");
    }
}
