export type VerificationChallenge = {
  agentId: string;
  domain: string;
  method: string;
  token: string;
  createdAt: number;
};

// Shared in-memory store for the current Next.js server instance.
// Replace with durable storage before relying on this in production.
export const verificationChallenges = new Map<string, VerificationChallenge>();
