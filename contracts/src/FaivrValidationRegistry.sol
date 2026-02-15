// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IFaivrValidationRegistry} from "./interfaces/IFaivrValidationRegistry.sol";

/// @title FaivrValidationRegistry
/// @notice ERC-8004 compliant validation registry
contract FaivrValidationRegistry is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IFaivrValidationRegistry
{
    // ── Structs (internal storage) ───────────────────────
    struct ValidationRecord {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool exists;
    }

    // ── Storage ──────────────────────────────────────────
    address private _identityRegistry;

    /// @dev requestHash => ValidationRecord
    mapping(bytes32 => ValidationRecord) private _records;

    /// @dev agentId => requestHashes
    mapping(uint256 => bytes32[]) private _agentValidations;

    /// @dev validatorAddress => requestHashes
    mapping(address => bytes32[]) private _validatorRequests;

    /// @custom:storage-gap
    uint256[50] private __gap;

    // ── Initializer ──────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address identityRegistry_) external override initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _identityRegistry = identityRegistry_;
    }

    // ── Views ────────────────────────────────────────────

    function getIdentityRegistry() external view override returns (address) {
        return _identityRegistry;
    }

    // ── Core ─────────────────────────────────────────────

    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external override {
        // Must be owner or operator of agentId
        _requireAgentOwnerOrOperator(agentId);

        // Store the record (initial state: response=0, no responseHash/tag)
        ValidationRecord storage record = _records[requestHash];
        if (!record.exists) {
            record.validatorAddress = validatorAddress;
            record.agentId = agentId;
            record.exists = true;
            _agentValidations[agentId].push(requestHash);
            _validatorRequests[validatorAddress].push(requestHash);
        }
        // If already exists, this is updating the request — keep same validator/agent

        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external override {
        ValidationRecord storage record = _records[requestHash];
        if (!record.exists) revert RequestNotFound(requestHash);
        if (msg.sender != record.validatorAddress) revert NotDesignatedValidator(requestHash);
        if (response > 100) revert InvalidResponse(response);

        record.response = response;
        record.responseHash = responseHash;
        record.tag = tag;
        record.lastUpdate = block.timestamp;

        emit ValidationResponse(msg.sender, record.agentId, requestHash, response, responseURI, responseHash, tag);
    }

    // ── Read ─────────────────────────────────────────────

    function getValidationStatus(bytes32 requestHash) external view override returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        bytes32 responseHash_,
        string memory tag,
        uint256 lastUpdate
    ) {
        ValidationRecord storage record = _records[requestHash];
        return (record.validatorAddress, record.agentId, record.response, record.responseHash, record.tag, record.lastUpdate);
    }

    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view override returns (uint64 count, uint8 averageResponse) {
        bytes32[] storage hashes = _agentValidations[agentId];
        bytes32 tagHash = bytes(tag).length > 0 ? keccak256(bytes(tag)) : bytes32(0);

        uint256 total;
        for (uint256 i; i < hashes.length; i++) {
            ValidationRecord storage record = _records[hashes[i]];
            if (record.lastUpdate == 0) continue; // no response yet

            // Filter by validator
            if (validatorAddresses.length > 0) {
                bool found;
                for (uint256 j; j < validatorAddresses.length; j++) {
                    if (record.validatorAddress == validatorAddresses[j]) { found = true; break; }
                }
                if (!found) continue;
            }

            // Filter by tag
            if (tagHash != bytes32(0) && keccak256(bytes(record.tag)) != tagHash) continue;

            total += record.response;
            count++;
        }
        averageResponse = count > 0 ? uint8(total / count) : 0;
    }

    function getAgentValidations(uint256 agentId) external view override returns (bytes32[] memory) {
        return _agentValidations[agentId];
    }

    function getValidatorRequests(address validatorAddress) external view override returns (bytes32[] memory) {
        return _validatorRequests[validatorAddress];
    }

    // ── Internal ─────────────────────────────────────────

    function _requireAgentOwnerOrOperator(uint256 agentId) internal view {
        IERC721 registry = IERC721(_identityRegistry);
        address owner = registry.ownerOf(agentId); // reverts if not minted
        if (msg.sender != owner && !registry.isApprovedForAll(owner, msg.sender) && registry.getApproved(agentId) != msg.sender) {
            revert NotAgentOwnerOrOperator(agentId);
        }
    }

    // ── Upgrade ──────────────────────────────────────────
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
