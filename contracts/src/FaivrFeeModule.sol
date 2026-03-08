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
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

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

    /// @dev Pending ETH withdrawals for addresses whose transfers failed
    mapping(address => uint256) private _pendingWithdrawals;

    /// @dev Pending ERC20 withdrawals for addresses whose transfers failed
    mapping(address => mapping(address => uint256)) private _pendingTokenWithdrawals;

    /// @dev Maximum escrow amount per task (0 = unlimited)
    uint256 private _maxEscrowAmount;

    // ── Genesis Program Storage ──────────────────────────
    mapping(address => bool) private _genesisAgents;
    mapping(address => uint8) private _genesisTasksUsed;
    uint256 private _genesisAgentCount;

    uint256 public constant GENESIS_MAX_AGENTS = 50;
    uint8 public constant GENESIS_FREE_TASKS = 10;

    /// @custom:storage-gap
    uint256[45] private __gap;

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
        if (identityRegistry_ == address(0)) revert ZeroAddress();

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
        _maxEscrowAmount = 0.1 ether; // Safety cap until audit clears
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
        if (_maxEscrowAmount > 0 && amount > _maxEscrowAmount) revert EscrowCapExceeded(amount, _maxEscrowAmount);

        if (token == ETH) {
            if (msg.value != amount) revert MsgValueMismatch();
        } else {
            if (msg.value != 0) revert MsgValueMismatch();
            uint256 balBefore = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            amount = IERC20(token).balanceOf(address(this)) - balBefore;
            if (amount == 0) revert ZeroAmount();
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

    /// @notice Fund a task on behalf of a client. Only callable by ROUTER_ROLE.
    function fundTaskFor(
        uint256 agentId,
        address token,
        uint256 amount,
        uint256 deadline,
        address client
    ) external payable nonReentrant whenNotPaused onlyRole(ROUTER_ROLE) returns (uint256 taskId) {
        if (amount == 0) revert ZeroAmount();
        if (deadline == 0) revert InvalidDeadline();
        if (client == address(0)) revert ZeroAddress();
        if (_maxEscrowAmount > 0 && amount > _maxEscrowAmount) revert EscrowCapExceeded(amount, _maxEscrowAmount);

        if (token == ETH) {
            if (msg.value != amount) revert MsgValueMismatch();
        } else {
            if (msg.value != 0) revert MsgValueMismatch();
            uint256 balBefore = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransferFrom(client, address(this), amount);
            amount = IERC20(token).balanceOf(address(this)) - balBefore;
            if (amount == 0) revert ZeroAmount();
        }

        taskId = _nextTaskId;
        unchecked { _nextTaskId++; }

        _tasks[taskId] = Task({
            agentId: agentId,
            client: client,
            token: token,
            amount: amount,
            status: TaskStatus.FUNDED,
            fundedAt: block.timestamp,
            settledAt: 0,
            deadline: block.timestamp + deadline
        });

        emit TaskFunded(taskId, agentId, client, token, amount, block.timestamp + deadline);
    }

    function settleTask(uint256 taskId) external override nonReentrant whenNotPaused {
        Task storage task = _tasks[taskId];
        if (task.status != TaskStatus.FUNDED) revert TaskNotFunded(taskId);
        if (task.client != msg.sender) revert NotTaskClient(taskId);

        task.status = TaskStatus.SETTLED;
        task.settledAt = block.timestamp;

        bool genesisExempt = _genesisAgents[task.client] && _genesisTasksUsed[task.client] < GENESIS_FREE_TASKS;
        if (genesisExempt) {
            _genesisTasksUsed[task.client]++;
        }

        uint256 totalFee = genesisExempt ? 0 : (task.amount * _feeBps) / 10_000;
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
            _sendERC20(task.token, agentOwner, agentPayout);
            if (protocolFee > 0) _sendERC20(task.token, _protocolWallet, protocolFee);
            if (devFee > 0) _sendERC20(task.token, _devWallet, devFee);
        }

        emit TaskSettled(taskId, task.agentId, agentOwner, agentPayout, protocolFee, devFee);
    }

    /// @notice Settle a task on behalf of the client. Only callable by ROUTER_ROLE.
    function settleTaskFor(uint256 taskId, address caller) external nonReentrant whenNotPaused onlyRole(ROUTER_ROLE) {
        Task storage task = _tasks[taskId];
        if (task.status != TaskStatus.FUNDED) revert TaskNotFunded(taskId);
        if (task.client != caller) revert NotTaskClient(taskId);

        task.status = TaskStatus.SETTLED;
        task.settledAt = block.timestamp;

        bool genesisExempt = _genesisAgents[task.client] && _genesisTasksUsed[task.client] < GENESIS_FREE_TASKS;
        if (genesisExempt) {
            _genesisTasksUsed[task.client]++;
        }

        uint256 totalFee = genesisExempt ? 0 : (task.amount * _feeBps) / 10_000;
        uint256 protocolFee = (totalFee * 90) / 100;
        uint256 devFee = totalFee - protocolFee;
        uint256 agentPayout = task.amount - totalFee;

        _totalFees[task.token] += totalFee;

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
            _sendERC20(task.token, agentOwner, agentPayout);
            if (protocolFee > 0) _sendERC20(task.token, _protocolWallet, protocolFee);
            if (devFee > 0) _sendERC20(task.token, _devWallet, devFee);
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

    function setMaxEscrowAmount(uint256 maxAmount) external onlyRole(FEE_MANAGER_ROLE) {
        uint256 oldMax = _maxEscrowAmount;
        _maxEscrowAmount = maxAmount;
        emit MaxEscrowUpdated(oldMax, maxAmount);
    }

    function maxEscrowAmount() external view returns (uint256) {
        return _maxEscrowAmount;
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

    // ── Pull Withdrawals ─────────────────────────────────
    function pendingWithdrawal(address account) external view returns (uint256) {
        return _pendingWithdrawals[account];
    }

    function pendingTokenWithdrawal(address token, address account) external view returns (uint256) {
        return _pendingTokenWithdrawals[token][account];
    }

    function withdrawPending() external nonReentrant {
        _withdrawPendingTo(payable(msg.sender));
    }

    function withdrawPendingTo(address payable recipient) external nonReentrant {
        _withdrawPendingTo(recipient);
    }

    function withdrawPendingToken(address token) external nonReentrant {
        _withdrawPendingTokenTo(token, msg.sender);
    }

    function withdrawPendingTokenTo(address token, address recipient) external nonReentrant {
        _withdrawPendingTokenTo(token, recipient);
    }

    // ── Internal ─────────────────────────────────────────
    function _sendETH(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount, gas: 10000}("");
        if (!ok) {
            // Escrow for pull withdrawal instead of reverting
            _pendingWithdrawals[to] += amount;
        }
    }

    function _sendERC20(address token, address to, uint256 amount) private {
        if (amount == 0) return;

        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        bool success = ok && (data.length == 0 || abi.decode(data, (bool)));
        if (!success) {
            _pendingTokenWithdrawals[token][to] += amount;
        }
    }

    function _withdrawPendingTo(address payable recipient) private {
        if (recipient == address(0)) revert ZeroAddress();

        uint256 amount = _pendingWithdrawals[msg.sender];
        if (amount == 0) revert ZeroAmount();

        _pendingWithdrawals[msg.sender] = 0;
        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) {
            _pendingWithdrawals[msg.sender] = amount;
            revert ETHTransferFailed();
        }
    }

    function _withdrawPendingTokenTo(address token, address recipient) private {
        if (recipient == address(0)) revert ZeroAddress();

        uint256 amount = _pendingTokenWithdrawals[token][msg.sender];
        if (amount == 0) revert ZeroAmount();

        _pendingTokenWithdrawals[token][msg.sender] = 0;
        IERC20(token).safeTransfer(recipient, amount);
    }

    // ── Genesis Program ─────────────────────────────────
    function addGenesisAgent(address agent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (agent == address(0)) revert ZeroAddress();
        if (_genesisAgents[agent]) revert AlreadyGenesisAgent();
        if (_genesisAgentCount >= GENESIS_MAX_AGENTS) revert GenesisCapReached();

        _genesisAgents[agent] = true;
        _genesisAgentCount++;

        emit GenesisAgentAdded(agent);
    }

    function removeGenesisAgent(address agent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_genesisAgents[agent]) revert NotGenesisAgent();

        _genesisAgents[agent] = false;
        _genesisAgentCount--;

        emit GenesisAgentRemoved(agent);
    }

    function isGenesisAgent(address agent) external view returns (bool) {
        return _genesisAgents[agent];
    }

    function genesisTasksUsed(address agent) external view returns (uint8) {
        return _genesisTasksUsed[agent];
    }

    function genesisAgentCount() external view returns (uint256) {
        return _genesisAgentCount;
    }

    // ── Upgrade ──────────────────────────────────────────
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
