// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title IFaivrRouter
/// @notice Orchestrator for common multi-contract flows
interface IFaivrRouter {
    error ZeroAddress();

    function registerAndFund(
        string calldata agentURI, address token, uint256 amount, uint256 deadline
    ) external payable returns (uint256 agentId, uint256 taskId);

    function settleAndReview(
        uint256 taskId, uint256 agentId, uint8 rating,
        string calldata commentURI, bytes calldata signature
    ) external returns (uint256 reviewId);

    function getContracts() external view returns (
        address identityRegistry, address reputationRegistry,
        address validationRegistry, address feeModule
    );
}
