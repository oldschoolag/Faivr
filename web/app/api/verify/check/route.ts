import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import { verificationChallenges } from "@/lib/verification/challenges";

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

export async function POST(req: NextRequest) {
  try {
    const { agentId, challengeToken, method } = await req.json();

    if (!agentId || !challengeToken || !method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["dns", "file"].includes(method)) {
      return NextResponse.json({ error: "Invalid method. Use dns or file." }, { status: 400 });
    }

    const key = `${agentId}-${method}`;
    const challenge = verificationChallenges.get(key);

    if (!challenge || challenge.token !== challengeToken) {
      return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 404 });
    }

    if (Date.now() - challenge.createdAt > 3600000) {
      verificationChallenges.delete(key);
      return NextResponse.json({ error: "Challenge expired. Please generate a new one." }, { status: 410 });
    }

    const verified =
      method === "dns"
        ? await checkDNS(challenge.domain, challengeToken)
        : await checkFile(challenge.domain, challengeToken);

    if (verified) {
      verificationChallenges.delete(key);

      return NextResponse.json({
        verified: true,
        challengeVerified: true,
        agentId,
        domain: challenge.domain,
        method,
        mode: "offchain-preview",
        message:
          "Challenge confirmed. This preview flow does not mint a badge or submit an on-chain verification transaction yet.",
      });
    }

    return NextResponse.json({
      verified: false,
      challengeVerified: false,
      mode: "offchain-preview",
      message: `Verification challenge not found yet. Make sure you've completed the ${method} instructions and try again.`,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
