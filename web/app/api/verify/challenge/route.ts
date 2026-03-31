import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { verificationChallenges } from "@/lib/verification/challenges";

const SUPPORTED_METHODS = ["dns", "file"] as const;
type VerificationMethod = (typeof SUPPORTED_METHODS)[number];

export async function POST(req: NextRequest) {
  try {
    const { agentId, domain, method } = await req.json();

    if (!agentId || !domain || !method) {
      return NextResponse.json({ error: "Missing agentId, domain, or method" }, { status: 400 });
    }

    if (!SUPPORTED_METHODS.includes(method as VerificationMethod)) {
      return NextResponse.json(
        {
          error: "Invalid method. Use dns or file.",
          supportedMethods: SUPPORTED_METHODS,
        },
        { status: 400 },
      );
    }

    const challengeToken = randomBytes(16).toString("hex");
    const key = `${agentId}-${method}`;

    verificationChallenges.set(key, {
      agentId: String(agentId),
      domain,
      method,
      token: challengeToken,
      createdAt: Date.now(),
    });

    const instructions =
      method === "dns"
        ? `Add a DNS TXT record to ${domain} with the value: faivr-verify=${challengeToken}`
        : `Host a JSON file at https://${domain}/.well-known/faivr-verification.json with the content: { "token": "${challengeToken}" }`;

    return NextResponse.json({
      challengeToken,
      instructions,
      supportedMethods: SUPPORTED_METHODS,
      mode: "offchain-preview",
      disclaimer:
        "This endpoint only prepares an off-chain domain control challenge for the current server instance. It does not write an on-chain verification record.",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
