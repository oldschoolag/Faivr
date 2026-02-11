// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IFaivrValidationRegistry} from "./interfaces/IFaivrValidationRegistry.sol";

/// @title FaivrValidationRegistry
/// @notice Validation requests and attestations by whitelisted validators
contract FaivrValidationRegistry is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IFaivrValidationRegistry
{
    // ── Roles ────────────────────────────────────────────
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant VALIDATOR_MANAGER_ROLE = keccak256("VALIDATOR_MANAGER_ROLE");

    // ── Storage ──────────────────────────────────────────
    uint256 private _nextRequestId;
    uint256 private _nextAttestationId;

    mapping(uint256 requestId => ValidationRequest) private _requests;
    mapping(uint256 attestationId => Attestation) private _attestations;
    mapping(uint256 agentId => uint256[]) private _agentAttestationIds;
    mapping(address => bool) private _validators;

    // Counters per agent + type
    mapping(uint256 agentId => mapping(ValidationType => uint256)) private _passedCount;
    mapping(uint256 agentId => mapping(ValidationType => uint256)) private _failedCount;

    /// @custom:storage-gap
    uint256[50] private __gap;

    // ── Initializer ──────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VALIDATOR_MANAGER_ROLE, admin);
        _nextRequestId = 1;
        _nextAttestationId = 1;
    }

    // ── Core ─────────────────────────────────────────────
    function requestValidation(
        uint256 agentId,
        ValidationType vType,
        string calldata evidenceURI
    ) external override returns (uint256 requestId) {
        if (bytes(evidenceURI).length == 0) revert EmptyEvidenceURI();

        requestId = _nextRequestId;
        unchecked { _nextRequestId++; }

        _requests[requestId] = ValidationRequest({
            agentId: agentId,
            requester: msg.sender,
            vType: vType,
            evidenceURI: evidenceURI,
            status: ValidationStatus.PENDING,
            requestedAt: block.timestamp,
            resolvedAt: 0
        });

        emit ValidationRequested(requestId, agentId, msg.sender, vType, evidenceURI);
    }

    function submitAttestation(
        uint256 requestId,
        bool passed,
        string calldata proofURI
    ) external override returns (uint256 attestationId) {
        if (!hasRole(VALIDATOR_ROLE, msg.sender)) revert NotValidator(msg.sender);

        ValidationRequest storage req = _requests[requestId];
        if (req.status != ValidationStatus.PENDING) revert RequestNotPending(requestId);

        req.status = passed ? ValidationStatus.PASSED : ValidationStatus.FAILED;
        req.resolvedAt = block.timestamp;

        attestationId = _nextAttestationId;
        unchecked { _nextAttestationId++; }

        _attestations[attestationId] = Attestation({
            requestId: requestId,
            agentId: req.agentId,
            validator: msg.sender,
            passed: passed,
            proofURI: proofURI,
            vType: req.vType,
            timestamp: block.timestamp
        });

        _agentAttestationIds[req.agentId].push(attestationId);

        if (passed) {
            unchecked { _passedCount[req.agentId][req.vType]++; }
        } else {
            unchecked { _failedCount[req.agentId][req.vType]++; }
        }

        emit AttestationSubmitted(attestationId, requestId, req.agentId, msg.sender, passed, proofURI);
    }

    function addValidator(address validator) external override onlyRole(VALIDATOR_MANAGER_ROLE) {
        _grantRole(VALIDATOR_ROLE, validator);
        _validators[validator] = true;
        emit ValidatorUpdated(validator, true);
    }

    function removeValidator(address validator) external override onlyRole(VALIDATOR_MANAGER_ROLE) {
        _revokeRole(VALIDATOR_ROLE, validator);
        _validators[validator] = false;
        emit ValidatorUpdated(validator, false);
    }

    // ── Views ────────────────────────────────────────────
    function isValidator(address validator) external view override returns (bool) {
        return _validators[validator];
    }

    function getAttestations(uint256 agentId, uint256 offset, uint256 limit)
        external view override returns (Attestation[] memory)
    {
        uint256[] storage ids = _agentAttestationIds[agentId];
        uint256 total = ids.length;
        if (offset >= total) return new Attestation[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 size = end - offset;

        Attestation[] memory result = new Attestation[](size);
        for (uint256 i; i < size;) {
            result[i] = _attestations[ids[offset + i]];
            unchecked { i++; }
        }
        return result;
    }

    function getRequest(uint256 requestId) external view override returns (ValidationRequest memory) {
        return _requests[requestId];
    }

    function getValidationCount(uint256 agentId, ValidationType vType)
        external view override returns (uint256 passed, uint256 failed)
    {
        passed = _passedCount[agentId][vType];
        failed = _failedCount[agentId][vType];
    }

    // ── Upgrade ──────────────────────────────────────────
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
