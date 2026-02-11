// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title IFaivrReputationRegistry
/// @notice ERC-8004 compliant reputation registry with EIP-712 signed reviews
interface IFaivrReputationRegistry {
    struct Review {
        address reviewer;
        uint256 agentId;
        uint8 rating;
        string commentURI;
        bytes32 taskReference;
        uint256 timestamp;
    }

    struct AgentScore {
        uint256 totalRating;
        uint256 reviewCount;
        uint256 lastUpdated;
    }

    event ReviewPosted(
        uint256 indexed reviewId,
        uint256 indexed agentId,
        address indexed reviewer,
        uint8 rating,
        string commentURI,
        bytes32 taskReference
    );

    error InvalidRating(uint8 rating);
    error AlreadyReviewed(address reviewer, uint256 agentId);
    error InvalidSignature();

    function postReview(
        uint256 agentId,
        uint8 rating,
        string calldata commentURI,
        bytes32 taskReference,
        bytes calldata signature
    ) external returns (uint256 reviewId);

    function getAverageRating(uint256 agentId) external view returns (uint256 average, uint256 count);
    function getReviews(uint256 agentId, uint256 offset, uint256 limit) external view returns (Review[] memory reviews);
    function getReview(uint256 reviewId) external view returns (Review memory review);
    function totalReviews() external view returns (uint256 count);
}
