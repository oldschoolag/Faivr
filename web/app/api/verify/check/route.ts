import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

// Import the shared challenge store
// In production, this would be a database
const challenges = new Map<
  string,
  { agentId: string; domain: string; method: string; token: string; createdAt: number }
>();

async function checkDNS(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.flat();
    return flat.some((r) => r === `faivr-verify=${token}`);
  } catch {
    return false;
  }
}

async function checkFile(domain: string, token: string): Promise<boolean> {
  try {
    const url = `https://${domain}/.well-known/faivr-verification.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.token === token;
  } catch {
    return false;
  }
}

async function checkTwitter(_agentId: string, _token: string): Promise<boolean> {
  // Stub — requires Twitter API integration
  // In production: search recent tweets mentioning @faivr_ai with the token
  console.log("[verify/check] Twitter verification is stubbed — returning false");
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, challengeToken, method } = await req.json();

    if (!agentId || !challengeToken || !method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const key = `${agentId}-${method}`;
    const challenge = challenges.get(key);

    if (!challenge || challenge.token !== challengeToken) {
      return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 404 });
    }

    // Check if challenge is older than 1 hour
    if (Date.now() - challenge.createdAt > 3600000) {
      challenges.delete(key);
      return NextResponse.json({ error: "Challenge expired. Please generate a new one." }, { status: 410 });
    }

    let verified = false;

    switch (method) {
      case "dns":
        verified = await checkDNS(challenge.domain, challengeToken);
        break;
      case "file":
        verified = await checkFile(challenge.domain, challengeToken);
        break;
      case "twitter":
        verified = await checkTwitter(String(agentId), challengeToken);
        break;
      default:
        return NextResponse.json({ error: "Invalid method" }, { status: 400 });
    }

    if (verified) {
      challenges.delete(key);

      // In production: call the smart contract here via ethers/viem
      // using a server-side wallet with VERIFIER_ROLE
      // const tx = await verifierContract.verify(agentId, domain, methodEnum);

      return NextResponse.json({
        verified: true,
        agentId,
        domain: challenge.domain,
        method,
        message: "Verification successful! On-chain record will be created.",
      });
    }

    return NextResponse.json({
      verified: false,
      message: `Verification not found. Make sure you've completed the ${method} challenge and try again.`,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
