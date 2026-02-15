// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IFaivrReputationRegistry} from "./interfaces/IFaivrReputationRegistry.sol";

/// @title FaivrReputationRegistry
/// @notice ERC-8004 compliant reputation registry
contract FaivrReputationRegistry is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IFaivrReputationRegistry
{
    // ── Structs (internal storage) ───────────────────────
    struct FeedbackEntry {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    // ── Storage ──────────────────────────────────────────
    address private _identityRegistry;

    /// @dev agentId => clientAddress => feedbackIndex => FeedbackEntry
    /// feedbackIndex is 1-based
    mapping(uint256 => mapping(address => mapping(uint64 => FeedbackEntry))) private _feedback;

    /// @dev agentId => clientAddress => lastFeedbackIndex
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;

    /// @dev agentId => list of unique client addresses
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _isClient;

    /// @dev agentId => clientAddress => feedbackIndex => responder => responseCount
    mapping(uint256 => mapping(address => mapping(uint64 => mapping(address => uint64)))) private _responseCounts;

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

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external override {
        if (valueDecimals > 18) revert InvalidValueDecimals(valueDecimals);

        // Verify agent exists
        _requireAgentExists(agentId);

        // Submitter must not be agent owner or approved operator
        address agentOwner = IERC721(_identityRegistry).ownerOf(agentId);
        if (msg.sender == agentOwner) revert SelfFeedbackNotAllowed();
        if (IERC721(_identityRegistry).isApprovedForAll(agentOwner, msg.sender)) revert SelfFeedbackNotAllowed();
        if (IERC721(_identityRegistry).getApproved(agentId) == msg.sender) revert SelfFeedbackNotAllowed();

        // Track client
        if (!_isClient[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _isClient[agentId][msg.sender] = true;
        }

        // Increment feedback index (1-based)
        uint64 feedbackIndex = _lastIndex[agentId][msg.sender] + 1;
        _lastIndex[agentId][msg.sender] = feedbackIndex;

        _feedback[agentId][msg.sender][feedbackIndex] = FeedbackEntry({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        emit NewFeedback(agentId, msg.sender, feedbackIndex, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash);
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external override {
        FeedbackEntry storage entry = _feedback[agentId][msg.sender][feedbackIndex];
        if (feedbackIndex == 0 || feedbackIndex > _lastIndex[agentId][msg.sender]) {
            revert FeedbackNotFound(agentId, msg.sender, feedbackIndex);
        }
        if (entry.isRevoked) revert FeedbackAlreadyRevoked(agentId, msg.sender, feedbackIndex);

        entry.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external override {
        if (feedbackIndex == 0 || feedbackIndex > _lastIndex[agentId][clientAddress]) {
            revert FeedbackNotFound(agentId, clientAddress, feedbackIndex);
        }

        _responseCounts[agentId][clientAddress][feedbackIndex][msg.sender]++;

        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash);
    }

    // ── Read ─────────────────────────────────────────────

    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view override returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        if (clientAddresses.length == 0) revert EmptyClientAddresses();

        bytes32 tag1Hash = bytes(tag1).length > 0 ? keccak256(bytes(tag1)) : bytes32(0);
        bytes32 tag2Hash = bytes(tag2).length > 0 ? keccak256(bytes(tag2)) : bytes32(0);

        int256 total;
        for (uint256 i; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            uint64 lastIdx = _lastIndex[agentId][client];
            for (uint64 j = 1; j <= lastIdx; j++) {
                FeedbackEntry storage entry = _feedback[agentId][client][j];
                if (entry.isRevoked) continue;
                if (tag1Hash != bytes32(0) && keccak256(bytes(entry.tag1)) != tag1Hash) continue;
                if (tag2Hash != bytes32(0) && keccak256(bytes(entry.tag2)) != tag2Hash) continue;
                total += int256(entry.value);
                count++;
            }
        }
        summaryValue = count > 0 ? int128(total / int256(int64(count))) : int128(0);
        summaryValueDecimals = 0; // average inherits decimals from input values
    }

    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view override returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked) {
        if (feedbackIndex == 0 || feedbackIndex > _lastIndex[agentId][clientAddress]) {
            revert FeedbackNotFound(agentId, clientAddress, feedbackIndex);
        }
        FeedbackEntry storage entry = _feedback[agentId][clientAddress][feedbackIndex];
        return (entry.value, entry.valueDecimals, entry.tag1, entry.tag2, entry.isRevoked);
    }

    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    ) external view override returns (
        address[] memory clients,
        uint64[] memory feedbackIndexes,
        int128[] memory values,
        uint8[] memory valueDecimals_,
        string[] memory tag1s,
        string[] memory tag2s,
        bool[] memory revokedStatuses
    ) {
        bytes32 tag1Hash = bytes(tag1).length > 0 ? keccak256(bytes(tag1)) : bytes32(0);
        bytes32 tag2Hash = bytes(tag2).length > 0 ? keccak256(bytes(tag2)) : bytes32(0);

        // Use provided clients or all clients
        address[] memory searchClients;
        if (clientAddresses.length > 0) {
            searchClients = clientAddresses;
        } else {
            searchClients = _clients[agentId];
        }

        // First pass: count
        uint256 totalCount;
        for (uint256 i; i < searchClients.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][searchClients[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                FeedbackEntry storage entry = _feedback[agentId][searchClients[i]][j];
                if (!includeRevoked && entry.isRevoked) continue;
                if (tag1Hash != bytes32(0) && keccak256(bytes(entry.tag1)) != tag1Hash) continue;
                if (tag2Hash != bytes32(0) && keccak256(bytes(entry.tag2)) != tag2Hash) continue;
                totalCount++;
            }
        }

        // Allocate
        clients = new address[](totalCount);
        feedbackIndexes = new uint64[](totalCount);
        values = new int128[](totalCount);
        valueDecimals_ = new uint8[](totalCount);
        tag1s = new string[](totalCount);
        tag2s = new string[](totalCount);
        revokedStatuses = new bool[](totalCount);

        // Second pass: fill
        uint256 idx;
        for (uint256 i; i < searchClients.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][searchClients[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                FeedbackEntry storage entry = _feedback[agentId][searchClients[i]][j];
                if (!includeRevoked && entry.isRevoked) continue;
                if (tag1Hash != bytes32(0) && keccak256(bytes(entry.tag1)) != tag1Hash) continue;
                if (tag2Hash != bytes32(0) && keccak256(bytes(entry.tag2)) != tag2Hash) continue;
                clients[idx] = searchClients[i];
                feedbackIndexes[idx] = j;
                values[idx] = entry.value;
                valueDecimals_[idx] = entry.valueDecimals;
                tag1s[idx] = entry.tag1;
                tag2s[idx] = entry.tag2;
                revokedStatuses[idx] = entry.isRevoked;
                idx++;
            }
        }
    }

    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view override returns (uint64 count) {
        if (responders.length == 0) {
            // No filter — not feasible to enumerate all responders, return 0
            return 0;
        }
        for (uint256 i; i < responders.length; i++) {
            count += _responseCounts[agentId][clientAddress][feedbackIndex][responders[i]];
        }
    }

    function getClients(uint256 agentId) external view override returns (address[] memory) {
        return _clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view override returns (uint64) {
        return _lastIndex[agentId][clientAddress];
    }

    // ── Internal ─────────────────────────────────────────

    function _requireAgentExists(uint256 agentId) internal view {
        // Check if agent exists by calling ownerOf — will revert if not minted
        IERC721(_identityRegistry).ownerOf(agentId);
    }

    // ── Upgrade ──────────────────────────────────────────
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
