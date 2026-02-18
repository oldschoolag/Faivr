// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {FaivrVerificationRegistry} from "../src/FaivrVerificationRegistry.sol";
import {IFaivrVerificationRegistry} from "../src/interfaces/IFaivrVerificationRegistry.sol";
import {FaivrIdentityRegistry} from "../src/FaivrIdentityRegistry.sol";

contract FaivrVerificationRegistryTest is Test {
    FaivrVerificationRegistry public verifier;
    FaivrIdentityRegistry public identity;

    address public admin = makeAddr("admin");
    address public verifierBot = makeAddr("verifierBot");
    address public agentOwner = makeAddr("agentOwner");
    address public rando = makeAddr("rando");
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

        // Deploy verification registry
        FaivrVerificationRegistry verifierImpl = new FaivrVerificationRegistry();
        ERC1967Proxy verifierProxy = new ERC1967Proxy(
            address(verifierImpl),
            abi.encodeCall(FaivrVerificationRegistry.initialize, (admin, address(identity)))
        );
        verifier = FaivrVerificationRegistry(address(verifierProxy));

        // Grant verifier role to bot
        bytes32 verifierRole = verifier.VERIFIER_ROLE();
        vm.prank(admin);
        verifier.grantRole(verifierRole, verifierBot);
    }

    // ── Verify ───────────────────────────────────────────

    function test_verify_dns() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);

        assertTrue(verifier.isVerified(agentId));

        IFaivrVerificationRegistry.Verification memory v = verifier.getVerification(agentId);
        assertEq(v.domain, "example.com");
        assertEq(uint(v.method), uint(IFaivrVerificationRegistry.VerificationMethod.DNS));
        assertTrue(v.verified);
        assertGt(v.tokenId, 0);

        // NFT minted to agent owner
        assertEq(verifier.ownerOf(v.tokenId), agentOwner);
    }

    function test_verify_file() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "myagent.io", IFaivrVerificationRegistry.VerificationMethod.FILE);
        assertTrue(verifier.isVerified(agentId));
    }

    function test_verify_twitter() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "@myagent", IFaivrVerificationRegistry.VerificationMethod.TWITTER);
        assertTrue(verifier.isVerified(agentId));
    }

    function test_reverify_noNewNFT() public {
        vm.startPrank(verifierBot);
        verifier.verify(agentId, "old.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId1 = verifier.getVerification(agentId).tokenId;

        verifier.verify(agentId, "new.com", IFaivrVerificationRegistry.VerificationMethod.FILE);
        uint256 tokenId2 = verifier.getVerification(agentId).tokenId;
        vm.stopPrank();

        assertEq(tokenId1, tokenId2, "Re-verification should not mint new NFT");
        assertEq(verifier.getVerification(agentId).domain, "new.com");
    }

    // ── Revoke ───────────────────────────────────────────

    function test_revoke() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);

        vm.prank(verifierBot);
        verifier.revoke(agentId);

        assertFalse(verifier.isVerified(agentId));
    }

    function test_revoke_notVerified_reverts() public {
        vm.prank(verifierBot);
        vm.expectRevert(abi.encodeWithSelector(IFaivrVerificationRegistry.VerificationNotFound.selector, agentId));
        verifier.revoke(agentId);
    }

    // ── Expiry ───────────────────────────────────────────

    function test_expiry() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);

        assertTrue(verifier.isVerified(agentId));

        // Warp past expiry
        vm.warp(block.timestamp + 91 days);
        assertFalse(verifier.isVerified(agentId));
    }

    function test_setExpiryPeriod() public {
        vm.prank(admin);
        verifier.setExpiryPeriod(30 days);
        assertEq(verifier.expiryPeriod(), 30 days);
    }

    // ── Soulbound ────────────────────────────────────────

    function test_soulbound_transferBlocked() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId = verifier.getVerification(agentId).tokenId;

        vm.prank(agentOwner);
        vm.expectRevert(IFaivrVerificationRegistry.SoulboundTransferBlocked.selector);
        verifier.transferFrom(agentOwner, rando, tokenId);
    }

    // ── Access Control ───────────────────────────────────

    function test_verify_notVerifier_reverts() public {
        vm.prank(rando);
        vm.expectRevert();
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
    }

    // ── Token URI ────────────────────────────────────────

    function test_tokenURI() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId = verifier.getVerification(agentId).tokenId;

        string memory uri = verifier.tokenURI(tokenId);
        // Should be a data URI
        assertTrue(bytes(uri).length > 0);
        // Basic check it starts with data:
        bytes memory uriBytes = bytes(uri);
        assertEq(uriBytes[0], "d");
        assertEq(uriBytes[1], "a");
        assertEq(uriBytes[2], "t");
        assertEq(uriBytes[3], "a");
    }
}
