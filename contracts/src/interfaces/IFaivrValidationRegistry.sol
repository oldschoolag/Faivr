// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title IFaivrValidationRegistry
/// @notice ERC-8004 compliant validation registry
interface IFaivrValidationRegistry {
    // ── Events (ERC-8004) ────────────────────────────────
    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestURI,
        bytes32 indexed requestHash
    );
    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    // ── Errors ───────────────────────────────────────────
    error AgentDoesNotExist(uint256 agentId);
    error NotAgentOwnerOrOperator(uint256 agentId);
    error NotDesignatedValidator(bytes32 requestHash);
    error RequestNotFound(bytes32 requestHash);
    error InvalidResponse(uint8 response);
    error ZeroAddress();

    // ── Core ─────────────────────────────────────────────
    function initialize(address identityRegistry_) external;
    function getIdentityRegistry() external view returns (address);

    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external;

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;

    // ── Read ─────────────────────────────────────────────
    function getValidationStatus(bytes32 requestHash) external view returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        bytes32 responseHash,
        string memory tag,
        uint256 lastUpdate
    );

    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view returns (uint64 count, uint8 averageResponse);

    function getSummaryPaginated(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag,
        uint256 offset,
        uint256 limit
    ) external view returns (uint64 count, uint8 averageResponse);

    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes);
    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes);
}
