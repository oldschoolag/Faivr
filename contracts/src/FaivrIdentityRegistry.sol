// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IFaivrIdentityRegistry} from "./interfaces/IFaivrIdentityRegistry.sol";

/// @title FaivrIdentityRegistry
/// @notice ERC-8004 compliant agent identity registry — each agent is an ERC-721 NFT
contract FaivrIdentityRegistry is
    Initializable,
    ERC721URIStorageUpgradeable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IFaivrIdentityRegistry
{
    // ── Storage ──────────────────────────────────────────
    uint256 private _nextAgentId;
    mapping(uint256 agentId => bool) private _agentActive;
    mapping(uint256 agentId => uint256) private _registeredAt;

    /// @custom:storage-gap
    uint256[50] private __gap;

    // ── Initializer ──────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __ERC721_init("FAIVR Agent", "FAGENT");
        __ERC721URIStorage_init();
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _nextAgentId = 1; // start at 1, 0 is sentinel
    }

    // ── Core ─────────────────────────────────────────────
    function registerAgent(string calldata agentURI) external payable override returns (uint256 agentId) {
        if (bytes(agentURI).length == 0) revert EmptyURI();

        agentId = _nextAgentId;
        unchecked { _nextAgentId++; }

        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _agentActive[agentId] = true;
        _registeredAt[agentId] = block.timestamp;

        emit AgentRegistered(agentId, msg.sender, agentURI);
    }

    function updateAgentURI(uint256 agentId, string calldata newURI) external override {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId);
        if (bytes(newURI).length == 0) revert EmptyURI();

        string memory oldURI = tokenURI(agentId);
        _setTokenURI(agentId, newURI);

        emit AgentURIUpdated(agentId, oldURI, newURI);
    }

    function deactivateAgent(uint256 agentId) external override {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId);
        if (!_agentActive[agentId]) revert AgentNotActive(agentId);

        _agentActive[agentId] = false;
        emit AgentDeactivated(agentId);
    }

    function reactivateAgent(uint256 agentId) external override {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId);
        if (_agentActive[agentId]) revert AgentAlreadyActive(agentId);

        _agentActive[agentId] = true;
        emit AgentReactivated(agentId);
    }

    // ── Views ────────────────────────────────────────────
    function isActive(uint256 agentId) external view override returns (bool) {
        return _agentActive[agentId];
    }

    function agentCount() external view override returns (uint256) {
        unchecked { return _nextAgentId - 1; }
    }

    function registeredAt(uint256 agentId) external view override returns (uint256) {
        return _registeredAt[agentId];
    }

    // ── Overrides ────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorageUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
