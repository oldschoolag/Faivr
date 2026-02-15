import { type Address } from "viem";

export const CHAIN_ID = 84532; // Base Sepolia

export const CONTRACTS = {
  identity: "0x2c954A4E93DdA93b09C679c4DAc6e04758b8f490" as Address,
  reputation: "0x1Eb4a1283EdEA00d42BaA66B785729808CE90A72" as Address,
  validation: "0x442E20eb5e801daD5F5fe603825d8fa780F5cd0e" as Address,
  feeModule: "0x0b9FAb32d2b7B33C767D111F96750D07B030ad60" as Address,
  router: "0x24b9cA9Db5476B2ca397e05924004Eae25D30184" as Address,
};

export const IDENTITY_ABI = [
  {
    name: "registerAgent",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    name: "updateAgentURI",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "deactivateAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "reactivateAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "agentCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "count", type: "uint256" }],
  },
  {
    name: "isActive",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "active", type: "bool" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "registeredAt",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "timestamp", type: "uint256" }],
  },
  {
    name: "AgentRegistered",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
    ],
  },
] as const;

export const FEE_MODULE_ABI = [
  {
    name: "fundTask",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
  },
  {
    name: "settleTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "reclaimTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getTask",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "client", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "fundedAt", type: "uint256" },
          { name: "settledAt", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "feePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalFeesCollected",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const REPUTATION_ABI = [
  {
    name: "getAverageRating",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "average", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
  },
  {
    name: "totalReviews",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "count", type: "uint256" }],
  },
] as const;
