// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IFaivrFeeModule} from "./interfaces/IFaivrFeeModule.sol";

/// @title FaivrFeeModule
/// @notice Non-custodial escrow with programmable fee splits (90% protocol / 10% dev)
contract FaivrFeeModule is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    IFaivrFeeModule
{
    using SafeERC20 for IERC20;

    // ── Roles ────────────────────────────────────────────
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ── Constants ────────────────────────────────────────
    uint256 public constant MAX_FEE_BPS = 1000; // 10%
    address private constant ETH = address(0);

    // ── Storage ──────────────────────────────────────────
    uint256 private _nextTaskId;
    uint256 private _feeBps;
    address private _protocolWallet;
    address private _devWallet;

    /// @dev Reference to the identity registry for agent owner lookups
    address public identityRegistry;

    mapping(uint256 taskId => Task) private _tasks;
    mapping(address token => uint256) private _totalFees;

    /// @custom:storage-gap
    uint256[50] private __gap;

    // ── Initializer ──────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address protocolWallet_,
        address devWallet_,
        address identityRegistry_
    ) external initializer {
        if (protocolWallet_ == address(0)) revert ZeroAddress();
        if (devWallet_ == address(0)) revert ZeroAddress();

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        _protocolWallet = protocolWallet_;
        _devWallet = devWallet_;
        identityRegistry = identityRegistry_;
        _feeBps = 250; // 2.5%
        _nextTaskId = 1;
    }

    // ── Core ─────────────────────────────────────────────
    function fundTask(
        uint256 agentId,
        address token,
        uint256 amount,
        uint256 deadline
    ) external payable override nonReentrant whenNotPaused returns (uint256 taskId) {
        if (amount == 0) revert ZeroAmount();
        if (deadline == 0) revert InvalidDeadline();

        if (token == ETH) {
            if (msg.value != amount) revert MsgValueMismatch();
        } else {
            if (msg.value != 0) revert MsgValueMismatch();
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        taskId = _nextTaskId;
        unchecked { _nextTaskId++; }

        _tasks[taskId] = Task({
            agentId: agentId,
            client: msg.sender,
            token: token,
            amount: amount,
            status: TaskStatus.FUNDED,
            fundedAt: block.timestamp,
            settledAt: 0,
            deadline: block.timestamp + deadline
        });

        emit TaskFunded(taskId, agentId, msg.sender, token, amount, block.timestamp + deadline);
    }

    function settleTask(uint256 taskId) external override nonReentrant whenNotPaused {
        Task storage task = _tasks[taskId];
        if (task.status != TaskStatus.FUNDED) revert TaskNotFunded(taskId);
        if (task.client != msg.sender) revert NotTaskClient(taskId);

        task.status = TaskStatus.SETTLED;
        task.settledAt = block.timestamp;

        uint256 totalFee = (task.amount * _feeBps) / 10_000;
        uint256 protocolFee = (totalFee * 90) / 100;
        uint256 devFee = totalFee - protocolFee;
        uint256 agentPayout = task.amount - totalFee;

        _totalFees[task.token] += totalFee;

        // Look up agent owner from identity registry
        // Using low-level call to get ownerOf without importing full ERC721
        (bool success, bytes memory data) = identityRegistry.staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", task.agentId)
        );
        require(success && data.length >= 32, "Agent lookup failed");
        address agentOwner = abi.decode(data, (address));

        if (task.token == ETH) {
            _sendETH(agentOwner, agentPayout);
            _sendETH(_protocolWallet, protocolFee);
            _sendETH(_devWallet, devFee);
        } else {
            IERC20(task.token).safeTransfer(agentOwner, agentPayout);
            IERC20(task.token).safeTransfer(_protocolWallet, protocolFee);
            IERC20(task.token).safeTransfer(_devWallet, devFee);
        }

        emit TaskSettled(taskId, task.agentId, agentOwner, agentPayout, protocolFee, devFee);
    }

    function reclaimTask(uint256 taskId) external override nonReentrant {
        Task storage task = _tasks[taskId];
        if (task.status != TaskStatus.FUNDED) revert TaskNotFunded(taskId);
        if (task.client != msg.sender) revert NotTaskClient(taskId);
        if (block.timestamp < task.deadline) revert TaskNotExpired(taskId);

        task.status = TaskStatus.RECLAIMED;

        if (task.token == ETH) {
            _sendETH(msg.sender, task.amount);
        } else {
            IERC20(task.token).safeTransfer(msg.sender, task.amount);
        }

        emit TaskReclaimed(taskId, msg.sender, task.amount);
    }

    // ── Admin ────────────────────────────────────────────
    function setFeePercentage(uint256 feeBps) external override onlyRole(FEE_MANAGER_ROLE) {
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh(feeBps);
        uint256 oldFee = _feeBps;
        _feeBps = feeBps;
        emit FeeUpdated(oldFee, feeBps, block.timestamp);
    }

    function setProtocolWallet(address wallet) external override onlyRole(FEE_MANAGER_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();
        _protocolWallet = wallet;
    }

    function setDevWallet(address wallet) external override onlyRole(FEE_MANAGER_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();
        _devWallet = wallet;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ── Views ────────────────────────────────────────────
    function getTask(uint256 taskId) external view override returns (Task memory) {
        return _tasks[taskId];
    }

    function feePercentage() external view override returns (uint256) {
        return _feeBps;
    }

    function protocolWallet() external view override returns (address) {
        return _protocolWallet;
    }

    function devWallet() external view override returns (address) {
        return _devWallet;
    }

    function totalFeesCollected(address token) external view override returns (uint256) {
        return _totalFees[token];
    }

    // ── Internal ─────────────────────────────────────────
    function _sendETH(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert ETHTransferFailed();
    }

    // ── Upgrade ──────────────────────────────────────────
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
