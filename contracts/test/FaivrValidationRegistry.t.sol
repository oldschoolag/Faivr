// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";
import {FaivrValidationRegistry} from "../src/FaivrValidationRegistry.sol";
import {IFaivrValidationRegistry} from "../src/interfaces/IFaivrValidationRegistry.sol";

contract FaivrValidationRegistryTest is Test {
    FaivrIdentityRegistry public identity;
    FaivrValidationRegistry public validation;

    address public admin = makeAddr("admin");
    address public agentOwner = makeAddr("agentOwner");
    address public validator1 = makeAddr("validator1");
    address public validator2 = makeAddr("validator2");
    address public stranger = makeAddr("stranger");

    uint256 public agentId;
    bytes32 public requestHash = keccak256("test-request-payload");

    function setUp() public {
        // Deploy identity
        FaivrIdentityRegistry idImpl = new FaivrIdentityRegistry();
        ERC1967Proxy idProxy = new ERC1967Proxy(
            address(idImpl),
            abi.encodeCall(FaivrIdentityRegistry.initialize, (admin))
        );
        identity = FaivrIdentityRegistry(address(idProxy));

        // Register an agent
        vm.prank(agentOwner);
        agentId = identity.register("ipfs://agent1");

        // Deploy validation
        FaivrValidationRegistry valImpl = new FaivrValidationRegistry();
        vm.prank(admin);
        ERC1967Proxy valProxy = new ERC1967Proxy(
            address(valImpl),
            abi.encodeCall(FaivrValidationRegistry.initialize, (address(identity)))
        );
        validation = FaivrValidationRegistry(address(valProxy));
    }

    // ── initialize ───────────────────────────────────────

    function test_getIdentityRegistry() public view {
        assertEq(validation.getIdentityRegistry(), address(identity));
    }

    // ── validationRequest ────────────────────────────────

    function test_validationRequest() public {
        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        bytes32[] memory hashes = validation.getAgentValidations(agentId);
        assertEq(hashes.length, 1);
        assertEq(hashes[0], requestHash);

        bytes32[] memory valReqs = validation.getValidatorRequests(validator1);
        assertEq(valReqs.length, 1);
        assertEq(valReqs[0], requestHash);
    }

    function test_revert_validationRequest_notOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(IFaivrValidationRegistry.NotAgentOwnerOrOperator.selector, agentId));
        validation.validationRequest(validator1, agentId, "ipfs://request", requestHash);
    }

    // ── validationResponse ───────────────────────────────

    function test_validationResponse() public {
        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator1);
        validation.validationResponse(requestHash, 100, "ipfs://response", bytes32(0), "passed");

        (address vAddr, uint256 aId, uint8 resp, bytes32 rHash, string memory tag, uint256 lastUpdate) =
            validation.getValidationStatus(requestHash);
        assertEq(vAddr, validator1);
        assertEq(aId, agentId);
        assertEq(resp, 100);
        assertEq(rHash, bytes32(0));
        assertEq(tag, "passed");
        assertGt(lastUpdate, 0);
    }

    function test_validationResponse_multipleResponses() public {
        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator1);
        validation.validationResponse(requestHash, 50, "", bytes32(0), "soft-finality");

        vm.prank(validator1);
        validation.validationResponse(requestHash, 100, "ipfs://final", bytes32(0), "hard-finality");

        (, , uint8 resp, , string memory tag,) = validation.getValidationStatus(requestHash);
        assertEq(resp, 100);
        assertEq(tag, "hard-finality");
    }

    function test_revert_validationResponse_notDesignatedValidator() public {
        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator2); // wrong validator
        vm.expectRevert(abi.encodeWithSelector(IFaivrValidationRegistry.NotDesignatedValidator.selector, requestHash));
        validation.validationResponse(requestHash, 100, "", bytes32(0), "");
    }

    function test_revert_validationResponse_requestNotFound() public {
        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSelector(IFaivrValidationRegistry.RequestNotFound.selector, requestHash));
        validation.validationResponse(requestHash, 100, "", bytes32(0), "");
    }

    function test_revert_validationResponse_invalidResponse() public {
        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator1);
        vm.expectRevert(abi.encodeWithSelector(IFaivrValidationRegistry.InvalidResponse.selector, 101));
        validation.validationResponse(requestHash, 101, "", bytes32(0), "");
    }

    // ── getSummary ───────────────────────────────────────

    function test_getSummary() public {
        bytes32 hash1 = keccak256("req1");
        bytes32 hash2 = keccak256("req2");

        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://req1", hash1);
        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://req2", hash2);

        vm.prank(validator1);
        validation.validationResponse(hash1, 80, "", bytes32(0), "");
        vm.prank(validator1);
        validation.validationResponse(hash2, 100, "", bytes32(0), "");

        address[] memory validators = new address[](0);
        (uint64 count, uint8 avg) = validation.getSummary(agentId, validators, "");
        assertEq(count, 2);
        assertEq(avg, 90);
    }

    function test_getSummary_withValidatorFilter() public {
        bytes32 hash1 = keccak256("req1");
        bytes32 hash2 = keccak256("req2");

        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://req1", hash1);
        vm.prank(agentOwner);
        validation.validationRequest(validator2, agentId, "ipfs://req2", hash2);

        vm.prank(validator1);
        validation.validationResponse(hash1, 80, "", bytes32(0), "");
        vm.prank(validator2);
        validation.validationResponse(hash2, 100, "", bytes32(0), "");

        address[] memory validators = new address[](1);
        validators[0] = validator1;
        (uint64 count, uint8 avg) = validation.getSummary(agentId, validators, "");
        assertEq(count, 1);
        assertEq(avg, 80);
    }

    function test_getSummary_withTagFilter() public {
        bytes32 hash1 = keccak256("req1");
        bytes32 hash2 = keccak256("req2");

        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://req1", hash1);
        vm.prank(agentOwner);
        validation.validationRequest(validator1, agentId, "ipfs://req2", hash2);

        vm.prank(validator1);
        validation.validationResponse(hash1, 80, "", bytes32(0), "zkml");
        vm.prank(validator1);
        validation.validationResponse(hash2, 100, "", bytes32(0), "tee");

        address[] memory validators = new address[](0);
        (uint64 count, uint8 avg) = validation.getSummary(agentId, validators, "zkml");
        assertEq(count, 1);
        assertEq(avg, 80);
    }

    // ── getAgentValidations / getValidatorRequests ───────

    function test_getAgentValidations_empty() public view {
        bytes32[] memory hashes = validation.getAgentValidations(999);
        assertEq(hashes.length, 0);
    }

    function test_getValidatorRequests_empty() public view {
        bytes32[] memory hashes = validation.getValidatorRequests(stranger);
        assertEq(hashes.length, 0);
    }
}
