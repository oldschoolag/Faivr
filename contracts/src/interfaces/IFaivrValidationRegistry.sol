// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title IFaivrValidationRegistry
/// @notice ERC-8004 compliant validation registry for agent attestations
interface IFaivrValidationRegistry {
    enum ValidationType { MANUAL, RE_EXECUTION, ZKML, TEE }
    enum ValidationStatus { PENDING, PASSED, FAILED, EXPIRED }

    struct ValidationRequest {
        uint256 agentId;
        address requester;
        ValidationType vType;
        string evidenceURI;
        ValidationStatus status;
        uint256 requestedAt;
        uint256 resolvedAt;
    }

    struct Attestation {
        uint256 requestId;
        uint256 agentId;
        address validator;
        bool passed;
        string proofURI;
        ValidationType vType;
        uint256 timestamp;
    }

    event ValidationRequested(
        uint256 indexed requestId, uint256 indexed agentId, address indexed requester,
        ValidationType vType, string evidenceURI
    );
    event AttestationSubmitted(
        uint256 indexed attestationId, uint256 indexed requestId, uint256 indexed agentId,
        address validator, bool passed, string proofURI
    );
    event ValidatorUpdated(address indexed validator, bool active);

    error NotValidator(address caller);
    error NotValidatorManager(address caller);
    error RequestNotPending(uint256 requestId);
    error EmptyEvidenceURI();

    function requestValidation(uint256 agentId, ValidationType vType, string calldata evidenceURI) external returns (uint256 requestId);
    function submitAttestation(uint256 requestId, bool passed, string calldata proofURI) external returns (uint256 attestationId);
    function addValidator(address validator) external;
    function removeValidator(address validator) external;

    function isValidator(address validator) external view returns (bool);
    function getAttestations(uint256 agentId, uint256 offset, uint256 limit) external view returns (Attestation[] memory);
    function getRequest(uint256 requestId) external view returns (ValidationRequest memory);
    function getValidationCount(uint256 agentId, ValidationType vType) external view returns (uint256 passed, uint256 failed);
}
