// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";
import {FaivrReputationRegistry} from "../src/FaivrReputationRegistry.sol";
import {IFaivrReputationRegistry} from "../src/interfaces/IFaivrReputationRegistry.sol";

contract FaivrReputationRegistryTest is Test {
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    FaivrIdentityRegistry public identity;
    FaivrReputationRegistry public reputation;

    address public admin = makeAddr("admin");
    address public agentOwner = makeAddr("agentOwner");
    address public client1 = makeAddr("client1");
    address public client2 = makeAddr("client2");
    address public responder = makeAddr("responder");

    uint256 public agentId;

    function setUp() public {
        FaivrIdentityRegistry idImpl = new FaivrIdentityRegistry();
        ERC1967Proxy idProxy = new ERC1967Proxy(
            address(idImpl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        identity = FaivrIdentityRegistry(address(idProxy));

        vm.prank(agentOwner);
        agentId = identity.register("ipfs://agent1");

        FaivrReputationRegistry repImpl = new FaivrReputationRegistry();
        vm.prank(admin);
        ERC1967Proxy repProxy = new ERC1967Proxy(
            address(repImpl),
            abi.encodeCall(FaivrReputationRegistry.initialize, (address(identity)))
        );
        reputation = FaivrReputationRegistry(address(repProxy));
    }

    function test_getIdentityRegistry() public view {
        assertEq(reputation.getIdentityRegistry(), address(identity));
    }

    function test_giveFeedback() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 87, 0, "starred", "", "", "", bytes32(0));

        (int128 value, uint8 decimals, string memory tag1, string memory tag2, bool isRevoked) =
            reputation.readFeedback(agentId, client1, 1);
        assertEq(value, 87);
        assertEq(decimals, 0);
        assertEq(tag1, "starred");
        assertEq(tag2, "");
        assertFalse(isRevoked);
    }

    function test_giveFeedback_eventShapeIsIntentional() public {
        vm.expectEmit(true, true, false, true, address(reputation));
        emit NewFeedback(agentId, client1, 1, 87, 0, "starred", "starred", "quality", "", "", bytes32(0));

        vm.prank(client1);
        reputation.giveFeedback(agentId, 87, 0, "starred", "quality", "", "", bytes32(0));
    }

    function test_giveFeedbackFor_preservesOriginalClient() public {
        bytes32 routerRole = reputation.ROUTER_ROLE();
        vm.prank(admin);
        reputation.grantRole(routerRole, admin);

        vm.prank(admin);
        reputation.giveFeedbackFor(client1, agentId, 91, 0, "router", "", "", "", bytes32(0));

        (int128 value,, string memory tag1,,) = reputation.readFeedback(agentId, client1, 1);
        assertEq(value, 91);
        assertEq(tag1, "router");
        assertEq(reputation.getLastIndex(agentId, client1), 1);
    }

    function test_giveFeedback_multipleFeedbackSameClient() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "starred", "", "", "", bytes32(0));
        vm.prank(client1);
        reputation.giveFeedback(agentId, 90, 0, "starred", "", "", "", bytes32(0));

        assertEq(reputation.getLastIndex(agentId, client1), 2);

        (int128 v1,,,,) = reputation.readFeedback(agentId, client1, 1);
        (int128 v2,,,,) = reputation.readFeedback(agentId, client1, 2);
        assertEq(v1, 80);
        assertEq(v2, 90);
    }

    function test_revert_giveFeedback_selfFeedback() public {
        vm.prank(agentOwner);
        vm.expectRevert(IFaivrReputationRegistry.SelfFeedbackNotAllowed.selector);
        reputation.giveFeedback(agentId, 100, 0, "", "", "", "", bytes32(0));
    }

    function test_revert_giveFeedback_invalidDecimals() public {
        vm.prank(client1);
        vm.expectRevert(abi.encodeWithSelector(IFaivrReputationRegistry.InvalidValueDecimals.selector, 19));
        reputation.giveFeedback(agentId, 100, 19, "", "", "", "", bytes32(0));
    }

    function test_giveFeedback_negativeValue() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, -32, 1, "tradingYield", "month", "", "", bytes32(0));

        (int128 value, uint8 decimals, string memory tag1, string memory tag2,) =
            reputation.readFeedback(agentId, client1, 1);
        assertEq(value, -32);
        assertEq(decimals, 1);
        assertEq(tag1, "tradingYield");
        assertEq(tag2, "month");
    }

    function test_revokeFeedback() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 87, 0, "", "", "", "", bytes32(0));

        vm.prank(client1);
        reputation.revokeFeedback(agentId, 1);

        (,,,, bool isRevoked) = reputation.readFeedback(agentId, client1, 1);
        assertTrue(isRevoked);
    }

    function test_revert_revokeFeedback_notFound() public {
        vm.prank(client1);
        vm.expectRevert(abi.encodeWithSelector(IFaivrReputationRegistry.FeedbackNotFound.selector, agentId, client1, 99));
        reputation.revokeFeedback(agentId, 99);
    }

    function test_revert_revokeFeedback_alreadyRevoked() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 87, 0, "", "", "", "", bytes32(0));
        vm.prank(client1);
        reputation.revokeFeedback(agentId, 1);
        vm.prank(client1);
        vm.expectRevert(abi.encodeWithSelector(IFaivrReputationRegistry.FeedbackAlreadyRevoked.selector, agentId, client1, 1));
        reputation.revokeFeedback(agentId, 1);
    }

    function test_appendResponse() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 87, 0, "", "", "", "", bytes32(0));

        vm.prank(agentOwner);
        reputation.appendResponse(agentId, client1, 1, "ipfs://response", bytes32(0));

        address[] memory responders = new address[](1);
        responders[0] = agentOwner;
        uint64 count = reputation.getResponseCount(agentId, client1, 1, responders);
        assertEq(count, 1);
    }

    function test_revert_appendResponse_notFound() public {
        vm.prank(responder);
        vm.expectRevert(abi.encodeWithSelector(IFaivrReputationRegistry.FeedbackNotFound.selector, agentId, client1, 1));
        reputation.appendResponse(agentId, client1, 1, "ipfs://response", bytes32(0));
    }

    function test_getSummary() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "starred", "", "", "", bytes32(0));
        vm.prank(client2);
        reputation.giveFeedback(agentId, 90, 0, "starred", "", "", "", bytes32(0));

        address[] memory clients = new address[](2);
        clients[0] = client1;
        clients[1] = client2;

        (uint64 count, int128 summaryValue, uint8 summaryDecimals) = reputation.getSummary(agentId, clients, "", "");
        assertEq(count, 2);
        assertEq(summaryValue, 85e18);
        assertEq(summaryDecimals, 18);
    }

    function test_getSummary_normalizesDecimalsTo18() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 15, 1, "score", "", "", "", bytes32(0)); // 1.5
        vm.prank(client2);
        reputation.giveFeedback(agentId, 200, 2, "score", "", "", "", bytes32(0)); // 2.0

        address[] memory clients = new address[](2);
        clients[0] = client1;
        clients[1] = client2;

        (uint64 count, int128 summaryValue, uint8 summaryDecimals) = reputation.getSummary(agentId, clients, "", "");
        assertEq(count, 2);
        assertEq(summaryValue, 175e16); // 1.75 with 18 decimals
        assertEq(summaryDecimals, 18);
    }

    function test_getSummary_withTagFilter() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "starred", "", "", "", bytes32(0));
        vm.prank(client1);
        reputation.giveFeedback(agentId, 50, 0, "uptime", "", "", "", bytes32(0));

        address[] memory clients = new address[](1);
        clients[0] = client1;

        (uint64 count, int128 summaryValue, uint8 summaryDecimals) = reputation.getSummary(agentId, clients, "starred", "");
        assertEq(count, 1);
        assertEq(summaryValue, 80e18);
        assertEq(summaryDecimals, 18);
    }

    function test_revert_getSummary_emptyClients() public {
        address[] memory clients = new address[](0);
        vm.expectRevert(IFaivrReputationRegistry.EmptyClientAddresses.selector);
        reputation.getSummary(agentId, clients, "", "");
    }

    function test_getSummary_excludesRevoked() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 100, 0, "", "", "", "", bytes32(0));
        vm.prank(client1);
        reputation.revokeFeedback(agentId, 1);

        address[] memory clients = new address[](1);
        clients[0] = client1;

        (uint64 count,,) = reputation.getSummary(agentId, clients, "", "");
        assertEq(count, 0);
    }

    function test_readAllFeedback() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "starred", "", "", "", bytes32(0));
        vm.prank(client2);
        reputation.giveFeedback(agentId, 90, 0, "starred", "", "", "", bytes32(0));

        address[] memory clients = new address[](2);
        clients[0] = client1;
        clients[1] = client2;

        (address[] memory returnedClients, uint64[] memory indexes, int128[] memory values,,,,) =
            reputation.readAllFeedback(agentId, clients, "", "", false);

        assertEq(returnedClients.length, 2);
        assertEq(values[0], 80);
        assertEq(values[1], 90);
        assertEq(indexes[0], 1);
        assertEq(indexes[1], 1);
    }

    function test_readAllFeedback_excludesRevokedByDefault() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "", "", "", "", bytes32(0));
        vm.prank(client1);
        reputation.revokeFeedback(agentId, 1);

        address[] memory clients = new address[](1);
        clients[0] = client1;

        (address[] memory returnedClients,,,,,,) = reputation.readAllFeedback(agentId, clients, "", "", false);
        assertEq(returnedClients.length, 0);
    }

    function test_readAllFeedback_includesRevokedWhenRequested() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "", "", "", "", bytes32(0));
        vm.prank(client1);
        reputation.revokeFeedback(agentId, 1);

        address[] memory clients = new address[](1);
        clients[0] = client1;

        (address[] memory returnedClients,,,,,,) = reputation.readAllFeedback(agentId, clients, "", "", true);
        assertEq(returnedClients.length, 1);
    }

    function test_getClients() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "", "", "", "", bytes32(0));
        vm.prank(client2);
        reputation.giveFeedback(agentId, 90, 0, "", "", "", "", bytes32(0));

        address[] memory clients = reputation.getClients(agentId);
        assertEq(clients.length, 2);
        assertEq(clients[0], client1);
        assertEq(clients[1], client2);
    }

    function test_getLastIndex() public {
        vm.prank(client1);
        reputation.giveFeedback(agentId, 80, 0, "", "", "", "", bytes32(0));
        vm.prank(client1);
        reputation.giveFeedback(agentId, 90, 0, "", "", "", "", bytes32(0));

        assertEq(reputation.getLastIndex(agentId, client1), 2);
    }

    function test_getLastIndex_noFeedback() public view {
        assertEq(reputation.getLastIndex(agentId, client1), 0);
    }
}
