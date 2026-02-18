// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title IFaivrFeeModule
/// @notice Non-custodial escrow with programmable fee splits
interface IFaivrFeeModule {
    enum TaskStatus { FUNDED, SETTLED, RECLAIMED, DISPUTED }

    struct Task {
        uint256 agentId;
        address client;
        address token;
        uint256 amount;
        TaskStatus status;
        uint256 fundedAt;
        uint256 settledAt;
        uint256 deadline;
    }

    event TaskFunded(
        uint256 indexed taskId, uint256 indexed agentId, address indexed client,
        address token, uint256 amount, uint256 deadline
    );
    event TaskSettled(
        uint256 indexed taskId, uint256 indexed agentId, address agent,
        uint256 agentPayout, uint256 protocolFee, uint256 devFee
    );
    event TaskReclaimed(uint256 indexed taskId, address indexed client, uint256 amount);
    event FeeUpdated(uint256 oldFee, uint256 newFee, uint256 effectiveAt);
    event MaxEscrowUpdated(uint256 oldMax, uint256 newMax);

    error ZeroAmount();
    error InvalidDeadline();
    error TaskNotFunded(uint256 taskId);
    error TaskNotExpired(uint256 taskId);
    error NotTaskClient(uint256 taskId);
    error FeeTooHigh(uint256 feeBps);
    error ETHTransferFailed();
    error MsgValueMismatch();
    error ZeroAddress();
    error EscrowCapExceeded(uint256 amount, uint256 max);

    function fundTask(uint256 agentId, address token, uint256 amount, uint256 deadline) external payable returns (uint256 taskId);
    function fundTaskFor(uint256 agentId, address token, uint256 amount, uint256 deadline, address client) external payable returns (uint256 taskId);
    function settleTask(uint256 taskId) external;
    function settleTaskFor(uint256 taskId, address caller) external;
    function reclaimTask(uint256 taskId) external;

    function setFeePercentage(uint256 feeBps) external;
    function setProtocolWallet(address wallet) external;
    function setDevWallet(address wallet) external;

    function getTask(uint256 taskId) external view returns (Task memory);
    function feePercentage() external view returns (uint256);
    function protocolWallet() external view returns (address);
    function devWallet() external view returns (address);
    function totalFeesCollected(address token) external view returns (uint256);
    function pendingWithdrawal(address account) external view returns (uint256);
    function withdrawPending() external;
}
