// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IFaivrReputationRegistry} from "../src/interfaces/IFaivrReputationRegistry.sol";
import {FaivrReputationRegistry} from "../src/FaivrReputationRegistry.sol";

contract FaivrReputationRegistryTest is Test {
    FaivrReputationRegistry public registry;
    address public admin = makeAddr("admin");
    uint256 public aliceKey;
    address public alice;
    uint256 public bobKey;
    address public bob;

    bytes32 constant REVIEW_TYPEHASH = keccak256(
        "Review(uint256 agentId,uint8 rating,string commentURI,bytes32 taskReference,uint256 nonce)"
    );

    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");

        FaivrReputationRegistry impl = new FaivrReputationRegistry();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(FaivrReputationRegistry.initialize, (admin))
        );
        registry = FaivrReputationRegistry(address(proxy));
    }

    function _getDomainSeparator() internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address verifyingContract,,) = registry.eip712Domain();
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes(version)),
            chainId,
            verifyingContract
        ));
    }

    function _signReview(
        uint256 privKey,
        uint256 agentId,
        uint8 rating,
        string memory commentURI,
        bytes32 taskRef,
        uint256 nonce
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            REVIEW_TYPEHASH, agentId, rating,
            keccak256(bytes(commentURI)), taskRef, nonce
        ));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            _getDomainSeparator(),
            structHash
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // ── Post Review ──────────────────────────────────────

    function test_postReview() public {
        uint256 agentId = 1;
        uint8 rating = 5;
        string memory commentURI = "ipfs://review1";
        bytes32 taskRef = bytes32(uint256(100));
        uint256 nonce = registry.nonces(alice);

        bytes memory sig = _signReview(aliceKey, agentId, rating, commentURI, taskRef, nonce);

        vm.prank(alice);
        uint256 reviewId = registry.postReview(agentId, rating, commentURI, taskRef, sig);

        assertEq(reviewId, 1);
        assertEq(registry.totalReviews(), 1);

        (uint256 avg, uint256 count) = registry.getAverageRating(agentId);
        assertEq(avg, 500); // 5.00
        assertEq(count, 1);
    }

    function test_multipleReviewsDifferentReviewers() public {
        uint256 agentId = 1;
        bytes32 taskRef = bytes32(0);

        // Alice gives 5
        bytes memory sig1 = _signReview(aliceKey, agentId, 5, "", taskRef, 0);
        vm.prank(alice);
        registry.postReview(agentId, 5, "", taskRef, sig1);

        // Bob gives 3
        bytes memory sig2 = _signReview(bobKey, agentId, 3, "", taskRef, 0);
        vm.prank(bob);
        registry.postReview(agentId, 3, "", taskRef, sig2);

        (uint256 avg, uint256 count) = registry.getAverageRating(agentId);
        assertEq(avg, 400); // (5+3)/2 = 4.00
        assertEq(count, 2);
    }

    function test_revert_duplicateReview() public {
        uint256 agentId = 1;
        bytes memory sig = _signReview(aliceKey, agentId, 4, "", bytes32(0), 0);

        vm.prank(alice);
        registry.postReview(agentId, 4, "", bytes32(0), sig);

        bytes memory sig2 = _signReview(aliceKey, agentId, 3, "", bytes32(0), 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrReputationRegistry.AlreadyReviewed.selector, alice, agentId
        ));
        registry.postReview(agentId, 3, "", bytes32(0), sig2);
    }

    function test_revert_invalidRating_zero() public {
        bytes memory sig = _signReview(aliceKey, 1, 0, "", bytes32(0), 0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrReputationRegistry.InvalidRating.selector, 0
        ));
        registry.postReview(1, 0, "", bytes32(0), sig);
    }

    function test_revert_invalidRating_six() public {
        bytes memory sig = _signReview(aliceKey, 1, 6, "", bytes32(0), 0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            IFaivrReputationRegistry.InvalidRating.selector, 6
        ));
        registry.postReview(1, 6, "", bytes32(0), sig);
    }

    function test_revert_invalidSignature() public {
        // Sign as alice but send as bob
        bytes memory sig = _signReview(aliceKey, 1, 5, "", bytes32(0), 0);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("InvalidSignature()"));
        registry.postReview(1, 5, "", bytes32(0), sig);
    }

    // ── Pagination ───────────────────────────────────────

    function test_getReviews_pagination() public {
        uint256 agentId = 1;
        // Post 3 reviews from different addresses
        for (uint256 i = 0; i < 3; i++) {
            (address reviewer, uint256 key) = makeAddrAndKey(string(abi.encodePacked("reviewer", i)));
            bytes memory sig = _signReview(key, agentId, 4, "", bytes32(0), 0);
            vm.prank(reviewer);
            registry.postReview(agentId, 4, "", bytes32(0), sig);
        }

        // Get page 1 (offset 0, limit 2)
        FaivrReputationRegistry.Review[] memory page1 = registry.getReviews(agentId, 0, 2);
        assertEq(page1.length, 2);

        // Get page 2 (offset 2, limit 2)
        FaivrReputationRegistry.Review[] memory page2 = registry.getReviews(agentId, 2, 2);
        assertEq(page2.length, 1);

        // Offset beyond total
        FaivrReputationRegistry.Review[] memory empty = registry.getReviews(agentId, 10, 5);
        assertEq(empty.length, 0);
    }
}
