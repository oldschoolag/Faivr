// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IFaivrVerificationRegistry} from "./interfaces/IFaivrVerificationRegistry.sol";

/// @title FaivrVerificationRegistry
/// @notice Soulbound verification NFTs for FAIVR agents — proves domain/Twitter ownership
contract FaivrVerificationRegistry is
    Initializable,
    ERC721Upgradeable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IFaivrVerificationRegistry
{
    using Strings for uint256;

    // ── Roles ────────────────────────────────────────────
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ── Storage ──────────────────────────────────────────
    IERC721 public identityRegistry;
    uint256 public expiryPeriod; // seconds, default 90 days
    uint256 private _nextTokenId;

    mapping(uint256 agentId => Verification) private _verifications;
    mapping(uint256 tokenId => uint256 agentId) private _tokenToAgentId;

    /// @custom:storage-gap
    uint256[49] private __gap;

    // ── Initializer ──────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, address identityAddr) external initializer {
        __ERC721_init("FAIVR Verified Agent", "FVERIFY");
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);

        identityRegistry = IERC721(identityAddr);
        expiryPeriod = 90 days;
        _nextTokenId = 1;
    }

    // ── Verification ─────────────────────────────────────
    /// @notice Mark an agent as verified. Only callable by VERIFIER_ROLE.
    function verify(
        uint256 agentId,
        string calldata domain,
        VerificationMethod method
    ) external onlyRole(VERIFIER_ROLE) {
        address agentOwner = identityRegistry.ownerOf(agentId);
        if (agentOwner == address(0)) revert AgentDoesNotExist(agentId);

        Verification storage v = _verifications[agentId];
        uint256 tokenId = v.tokenId;

        if (tokenId == 0) {
            tokenId = _nextTokenId++;
            _mint(agentOwner, tokenId);
            _tokenToAgentId[tokenId] = agentId;
        } else {
            _syncVerificationTokenOwner(agentId, tokenId, agentOwner);
        }

        v.domain = domain;
        v.method = method;
        v.verifiedAt = block.timestamp;
        v.expiresAt = block.timestamp + expiryPeriod;
        v.verified = true;
        v.tokenId = tokenId;

        emit AgentVerified(agentId, domain, method, tokenId);
    }

    /// @notice Revoke verification for an agent.
    function revoke(uint256 agentId) external onlyRole(VERIFIER_ROLE) {
        Verification storage v = _verifications[agentId];
        if (!v.verified) revert VerificationNotFound(agentId);

        uint256 tokenId = v.tokenId;
        if (tokenId != 0) {
            _burn(tokenId);
            delete _tokenToAgentId[tokenId];
        }

        v.verified = false;
        v.expiresAt = 0;
        v.tokenId = 0;

        emit VerificationRevoked(agentId);
    }

    /// @notice Re-sync the verification NFT holder to the current agent owner.
    function syncVerificationOwnership(uint256 agentId) external {
        Verification storage v = _verifications[agentId];
        uint256 tokenId = v.tokenId;
        if (tokenId == 0) revert VerificationNotFound(agentId);

        _syncVerificationTokenOwner(agentId, tokenId, identityRegistry.ownerOf(agentId));
    }

    /// @notice Check if an agent is currently verified (not expired).
    function isVerified(uint256 agentId) external view returns (bool) {
        Verification storage v = _verifications[agentId];
        return v.verified && block.timestamp <= v.expiresAt;
    }

    /// @notice Get full verification record.
    function getVerification(uint256 agentId) external view returns (Verification memory) {
        return _verifications[agentId];
    }

    /// @notice Update the expiry period (admin only).
    function setExpiryPeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        expiryPeriod = newPeriod;
        emit ExpiryPeriodUpdated(newPeriod);
    }

    // ── Soulbound ────────────────────────────────────────
    /// @dev Block all transfers — soulbound tokens.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundTransferBlocked();
        }
        return super._update(to, tokenId, auth);
    }

    // ── Token Metadata (on-chain SVG) ────────────────────
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        uint256 agentId = _tokenToAgentId[tokenId];
        require(agentId != 0, "Token not linked");

        Verification storage v = _verifications[agentId];
        bool active = v.verified && block.timestamp <= v.expiresAt;
        string memory method = _methodToString(v.method);
        string memory status = active ? "active" : "inactive";

        string memory svg = _generateSVG(agentId, v.domain, method, status);
        string memory json = string(
            abi.encodePacked(
                '{"name":"FAIVR Verification #',
                agentId.toString(),
                '","description":"Verification record for agent #',
                agentId.toString(),
                '. Current status: ',
                status,
                '. Domain: ',
                v.domain,
                ' | Method: ',
                method,
                '",',
                '"image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '",',
                '"attributes":[',
                '{"trait_type":"Agent ID","value":"',
                agentId.toString(),
                '"},',
                '{"trait_type":"Domain","value":"',
                v.domain,
                '"},',
                '{"trait_type":"Method","value":"',
                method,
                '"},',
                '{"trait_type":"Status","value":"',
                status,
                '"},',
                '{"trait_type":"Verified At","display_type":"date","value":',
                v.verifiedAt.toString(),
                '},',
                '{"trait_type":"Expires At","display_type":"date","value":',
                v.expiresAt.toString(),
                '},',
                '{"trait_type":"Soulbound","value":"true"}',
                ']}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _methodToString(VerificationMethod m) internal pure returns (string memory) {
        if (m == VerificationMethod.DNS) return "dns";
        if (m == VerificationMethod.FILE) return "file";
        return "twitter";
    }

    function _generateSVG(
        uint256 agentId,
        string memory domain,
        string memory method,
        string memory status
    ) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
                '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
                '<stop offset="0%" stop-color="#0f0f23"/><stop offset="100%" stop-color="#1a1a3e"/></linearGradient>',
                '<linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">',
                '<stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs>',
                '<rect width="400" height="400" rx="20" fill="url(#bg)"/>',
                '<rect x="20" y="20" width="360" height="360" rx="12" fill="none" stroke="url(#accent)" stroke-width="2" opacity="0.5"/>',
                '<text x="200" y="100" text-anchor="middle" fill="#10b981" font-family="monospace" font-size="48">&#x2713;</text>',
                '<text x="200" y="150" text-anchor="middle" fill="white" font-family="sans-serif" font-size="20" font-weight="bold">FAIVR VERIFICATION</text>',
                '<text x="200" y="182" text-anchor="middle" fill="#a1a1aa" font-family="sans-serif" font-size="14">',
                status,
                '</text>',
                '<text x="200" y="220" text-anchor="middle" fill="#a1a1aa" font-family="monospace" font-size="14">Agent #',
                agentId.toString(),
                '</text>',
                '<text x="200" y="252" text-anchor="middle" fill="#d4d4d8" font-family="monospace" font-size="12">',
                domain,
                '</text>',
                '<text x="200" y="282" text-anchor="middle" fill="#71717a" font-family="monospace" font-size="11">method: ',
                method,
                '</text>',
                '<text x="200" y="360" text-anchor="middle" fill="#3f3f46" font-family="sans-serif" font-size="10">SOULBOUND \xE2\x80\xA2 NON-TRANSFERABLE</text>',
                '</svg>'
            )
        );
    }

    function _syncVerificationTokenOwner(
        uint256 agentId,
        uint256 tokenId,
        address currentAgentOwner
    ) internal {
        address verificationOwner = _ownerOf(tokenId);
        if (verificationOwner == address(0) || verificationOwner == currentAgentOwner) {
            return;
        }

        _burn(tokenId);
        _mint(currentAgentOwner, tokenId);

        emit VerificationOwnershipSynced(agentId, tokenId, currentAgentOwner);
    }

    // ── Required Overrides ───────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
