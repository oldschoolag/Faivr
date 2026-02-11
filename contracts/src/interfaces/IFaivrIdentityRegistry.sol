// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title IFaivrIdentityRegistry
/// @notice ERC-8004 compliant agent identity registry
interface IFaivrIdentityRegistry {
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);
    event AgentURIUpdated(uint256 indexed agentId, string oldURI, string newURI);
    event AgentDeactivated(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);

    error NotAgentOwner(uint256 agentId);
    error AgentNotActive(uint256 agentId);
    error AgentAlreadyActive(uint256 agentId);
    error EmptyURI();

    function registerAgent(string calldata agentURI) external payable returns (uint256 agentId);
    function updateAgentURI(uint256 agentId, string calldata newURI) external;
    function deactivateAgent(uint256 agentId) external;
    function reactivateAgent(uint256 agentId) external;

    function isActive(uint256 agentId) external view returns (bool active);
    function agentCount() external view returns (uint256 count);
    function registeredAt(uint256 agentId) external view returns (uint256 timestamp);
}
