// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
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
    address public newOwner = makeAddr("newOwner");
    address public rando = makeAddr("rando");
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

        FaivrVerificationRegistry verifierImpl = new FaivrVerificationRegistry();
        ERC1967Proxy verifierProxy = new ERC1967Proxy(
            address(verifierImpl),
            abi.encodeCall(FaivrVerificationRegistry.initialize, (admin, address(identity)))
        );
        verifier = FaivrVerificationRegistry(address(verifierProxy));

        bytes32 verifierRole = verifier.VERIFIER_ROLE();
        vm.prank(admin);
        verifier.grantRole(verifierRole, verifierBot);
    }

    function test_verify_dns() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);

        assertTrue(verifier.isVerified(agentId));

        IFaivrVerificationRegistry.Verification memory v = verifier.getVerification(agentId);
        assertEq(v.domain, "example.com");
        assertEq(uint256(v.method), uint256(IFaivrVerificationRegistry.VerificationMethod.DNS));
        assertTrue(v.verified);
        assertGt(v.tokenId, 0);
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

        assertEq(tokenId1, tokenId2);
        assertEq(verifier.getVerification(agentId).domain, "new.com");
        assertEq(verifier.ownerOf(tokenId2), agentOwner);
    }

    function test_verify_resyncsOwnershipAfterAgentTransfer() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId = verifier.getVerification(agentId).tokenId;

        vm.prank(agentOwner);
        identity.transferFrom(agentOwner, newOwner, agentId);

        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);

        assertEq(verifier.getVerification(agentId).tokenId, tokenId);
        assertEq(verifier.ownerOf(tokenId), newOwner);
    }

    function test_revoke_burnsVerificationToken() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId = verifier.getVerification(agentId).tokenId;

        vm.prank(verifierBot);
        verifier.revoke(agentId);

        assertFalse(verifier.isVerified(agentId));
        assertEq(verifier.getVerification(agentId).tokenId, 0);
        vm.expectRevert();
        verifier.ownerOf(tokenId);
    }

    function test_revoke_notVerified_reverts() public {
        vm.prank(verifierBot);
        vm.expectRevert(abi.encodeWithSelector(IFaivrVerificationRegistry.VerificationNotFound.selector, agentId));
        verifier.revoke(agentId);
    }

    function test_syncVerificationOwnership_afterAgentTransfer() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId = verifier.getVerification(agentId).tokenId;

        vm.prank(agentOwner);
        identity.transferFrom(agentOwner, newOwner, agentId);

        verifier.syncVerificationOwnership(agentId);

        assertEq(verifier.ownerOf(tokenId), newOwner);
    }

    function test_expiry() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);

        assertTrue(verifier.isVerified(agentId));

        vm.warp(block.timestamp + 91 days);
        assertFalse(verifier.isVerified(agentId));
    }

    function test_setExpiryPeriod() public {
        vm.prank(admin);
        verifier.setExpiryPeriod(30 days);
        assertEq(verifier.expiryPeriod(), 30 days);
    }

    function test_soulbound_transferBlocked() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId = verifier.getVerification(agentId).tokenId;

        vm.prank(agentOwner);
        vm.expectRevert(IFaivrVerificationRegistry.SoulboundTransferBlocked.selector);
        verifier.transferFrom(agentOwner, rando, tokenId);
    }

    function test_verify_notVerifier_reverts() public {
        vm.prank(rando);
        vm.expectRevert();
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
    }

    function test_tokenURI() public {
        vm.prank(verifierBot);
        verifier.verify(agentId, "example.com", IFaivrVerificationRegistry.VerificationMethod.DNS);
        uint256 tokenId = verifier.getVerification(agentId).tokenId;

        string memory uri = verifier.tokenURI(tokenId);
        bytes memory uriBytes = bytes(uri);
        assertTrue(uriBytes.length > 0);
        assertEq(uriBytes[0], "d");
        assertEq(uriBytes[1], "a");
        assertEq(uriBytes[2], "t");
        assertEq(uriBytes[3], "a");
    }

    function test_tokenURI_highAgentIdStillWorks() public {
        uint256 highAgentId;
        for (uint256 i; i < 150; i++) {
            vm.prank(agentOwner);
            highAgentId = identity.register("ipfs://agent-high");
        }

        vm.prank(verifierBot);
        verifier.verify(highAgentId, "high.example", IFaivrVerificationRegistry.VerificationMethod.DNS);

        uint256 tokenId = verifier.getVerification(highAgentId).tokenId;
        string memory uri = verifier.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
    }
}
