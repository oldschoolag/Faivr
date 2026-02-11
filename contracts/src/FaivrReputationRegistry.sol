// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IFaivrReputationRegistry} from "./interfaces/IFaivrReputationRegistry.sol";

/// @title FaivrReputationRegistry
/// @notice EIP-712 signed reviews for agent reputation
contract FaivrReputationRegistry is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable,
    IFaivrReputationRegistry
{
    using ECDSA for bytes32;

    // ── Constants ────────────────────────────────────────
    bytes32 public constant REVIEW_TYPEHASH = keccak256(
        "Review(uint256 agentId,uint8 rating,string commentURI,bytes32 taskReference,uint256 nonce)"
    );

    // ── Storage ──────────────────────────────────────────
    uint256 private _nextReviewId;
    mapping(uint256 reviewId => Review) private _reviews;
    mapping(uint256 agentId => AgentScore) private _scores;
    mapping(uint256 agentId => uint256[]) private _agentReviewIds;
    mapping(address reviewer => mapping(uint256 agentId => bool)) private _hasReviewed;
    mapping(address => uint256) private _nonces;

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
        __EIP712_init("FaivrReputation", "1");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _nextReviewId = 1;
    }

    // ── Core ─────────────────────────────────────────────
    function postReview(
        uint256 agentId,
        uint8 rating,
        string calldata commentURI,
        bytes32 taskReference,
        bytes calldata signature
    ) external override returns (uint256 reviewId) {
        if (rating < 1 || rating > 5) revert InvalidRating(rating);

        // Recover signer from EIP-712 signature
        uint256 nonce = _nonces[msg.sender];
        bytes32 structHash = keccak256(abi.encode(
            REVIEW_TYPEHASH, agentId, rating,
            keccak256(bytes(commentURI)), taskReference, nonce
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (signer != msg.sender) revert InvalidSignature();
        if (_hasReviewed[msg.sender][agentId]) revert AlreadyReviewed(msg.sender, agentId);

        unchecked { _nonces[msg.sender]++; }

        reviewId = _nextReviewId;
        unchecked { _nextReviewId++; }

        _reviews[reviewId] = Review({
            reviewer: msg.sender,
            agentId: agentId,
            rating: rating,
            commentURI: commentURI,
            taskReference: taskReference,
            timestamp: block.timestamp
        });

        _agentReviewIds[agentId].push(reviewId);
        _hasReviewed[msg.sender][agentId] = true;

        AgentScore storage score = _scores[agentId];
        unchecked {
            score.totalRating += rating;
            score.reviewCount++;
        }
        score.lastUpdated = block.timestamp;

        emit ReviewPosted(reviewId, agentId, msg.sender, rating, commentURI, taskReference);
    }

    // ── Views ────────────────────────────────────────────
    function getAverageRating(uint256 agentId) external view override returns (uint256 average, uint256 count) {
        AgentScore storage score = _scores[agentId];
        count = score.reviewCount;
        if (count == 0) return (0, 0);
        average = (score.totalRating * 100) / count;
    }

    function getReviews(uint256 agentId, uint256 offset, uint256 limit)
        external view override returns (Review[] memory reviews)
    {
        uint256[] storage ids = _agentReviewIds[agentId];
        uint256 total = ids.length;
        if (offset >= total) return new Review[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 size = end - offset;

        reviews = new Review[](size);
        for (uint256 i; i < size;) {
            reviews[i] = _reviews[ids[offset + i]];
            unchecked { i++; }
        }
    }

    function getReview(uint256 reviewId) external view override returns (Review memory) {
        return _reviews[reviewId];
    }

    function totalReviews() external view override returns (uint256) {
        unchecked { return _nextReviewId - 1; }
    }

    function nonces(address account) external view returns (uint256) {
        return _nonces[account];
    }

    // ── Upgrade ──────────────────────────────────────────
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
