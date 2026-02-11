// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {FaivrValidationRegistry} from "../src/FaivrValidationRegistry.sol";
import {IFaivrValidationRegistry} from "../src/interfaces/IFaivrValidationRegistry.sol";

contract FaivrValidationRegistryTest is Test {
    FaivrValidationRegistry public registry;
    address public admin = makeAddr("admin");
    address public validator = makeAddr("validator");
    address public alice = makeAddr("alice");

    function setUp() public {
        FaivrValidationRegistry impl = new FaivrValidationRegistry();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(FaivrValidationRegistry.initialize, (admin))
        );
        registry = FaivrValidationRegistry(address(proxy));

        // Add a validator
        vm.prank(admin);
        registry.addValidator(validator);
    }

    // ── Request Validation ───────────────────────────────

    function test_requestValidation() public {
        vm.prank(alice);
        uint256 reqId = registry.requestValidation(
            1,
            IFaivrValidationRegistry.ValidationType.MANUAL,
            "ipfs://evidence"
        );

        assertEq(reqId, 1);

        IFaivrValidationRegistry.ValidationRequest memory req = registry.getRequest(reqId);
        assertEq(req.agentId, 1);
        assertEq(req.requester, alice);
        assertTrue(req.status == IFaivrValidationRegistry.ValidationStatus.PENDING);
    }

    function test_revert_requestValidation_emptyURI() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EmptyEvidenceURI()"));
        registry.requestValidation(1, IFaivrValidationRegistry.ValidationType.MANUAL, "");
    }

    // ── Submit Attestation ───────────────────────────────

    function test_submitAttestation_passed() public {
        vm.prank(alice);
        uint256 reqId = registry.requestValidation(
            1, IFaivrValidationRegistry.ValidationType.MANUAL, "ipfs://evidence"
        );

        vm.prank(validator);
        uint256 attId = registry.submitAttestation(reqId, true, "ipfs://proof");

        assertEq(attId, 1);

        IFaivrValidationRegistry.ValidationRequest memory req = registry.getRequest(reqId);
        assertTrue(req.status == IFaivrValidationRegistry.ValidationStatus.PASSED);
        assertGt(req.resolvedAt, 0);

        (uint256 passed, uint256 failed) = registry.getValidationCount(
            1, IFaivrValidationRegistry.ValidationType.MANUAL
        );
        assertEq(passed, 1);
        assertEq(failed, 0);
    }

    function test_submitAttestation_failed() public {
        vm.prank(alice);
        uint256 reqId = registry.requestValidation(
            1, IFaivrValidationRegistry.ValidationType.RE_EXECUTION, "ipfs://evidence"
        );

        vm.prank(validator);
        registry.submitAttestation(reqId, false, "ipfs://proof-fail");

        (uint256 passed, uint256 failed) = registry.getValidationCount(
            1, IFaivrValidationRegistry.ValidationType.RE_EXECUTION
        );
        assertEq(passed, 0);
        assertEq(failed, 1);
    }

    function test_revert_submitAttestation_notValidator() public {
        vm.prank(alice);
        uint256 reqId = registry.requestValidation(
            1, IFaivrValidationRegistry.ValidationType.MANUAL, "ipfs://evidence"
        );

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrValidationRegistry.NotValidator.selector, alice
        ));
        registry.submitAttestation(reqId, true, "ipfs://proof");
    }

    function test_revert_submitAttestation_alreadyResolved() public {
        vm.prank(alice);
        uint256 reqId = registry.requestValidation(
            1, IFaivrValidationRegistry.ValidationType.MANUAL, "ipfs://evidence"
        );

        vm.prank(validator);
        registry.submitAttestation(reqId, true, "ipfs://proof");

        vm.prank(validator);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrValidationRegistry.RequestNotPending.selector, reqId
        ));
        registry.submitAttestation(reqId, false, "ipfs://proof2");
    }

    // ── Validator Management ─────────────────────────────

    function test_addRemoveValidator() public {
        address newVal = makeAddr("newValidator");

        vm.prank(admin);
        registry.addValidator(newVal);
        assertTrue(registry.isValidator(newVal));

        vm.prank(admin);
        registry.removeValidator(newVal);
        assertFalse(registry.isValidator(newVal));
    }

    function test_revert_addValidator_notManager() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.addValidator(makeAddr("x"));
    }

    // ── Pagination ───────────────────────────────────────

    function test_getAttestations_pagination() public {
        // Create 3 requests + attestations
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(alice);
            uint256 reqId = registry.requestValidation(
                1, IFaivrValidationRegistry.ValidationType.MANUAL, "ipfs://ev"
            );
            vm.prank(validator);
            registry.submitAttestation(reqId, true, "ipfs://proof");
        }

        IFaivrValidationRegistry.Attestation[] memory page = registry.getAttestations(1, 0, 2);
        assertEq(page.length, 2);

        IFaivrValidationRegistry.Attestation[] memory page2 = registry.getAttestations(1, 2, 5);
        assertEq(page2.length, 1);
    }
}
