import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// In-memory challenge store (replace with DB in production)
const challenges = new Map<
  string,
  { agentId: string; domain: string; method: string; token: string; createdAt: number }
>();

export async function POST(req: NextRequest) {
  try {
    const { agentId, domain, method } = await req.json();

    if (!agentId || !domain || !method) {
      return NextResponse.json({ error: "Missing agentId, domain, or method" }, { status: 400 });
    }

    if (!["dns", "file", "twitter"].includes(method)) {
      return NextResponse.json({ error: "Invalid method. Use dns, file, or twitter" }, { status: 400 });
    }

    const challengeToken = randomBytes(16).toString("hex");
    const key = `${agentId}-${method}`;

    challenges.set(key, {
      agentId: String(agentId),
      domain,
      method,
      token: challengeToken,
      createdAt: Date.now(),
    });

    let instructions = "";
    switch (method) {
      case "dns":
        instructions = `Add a DNS TXT record to ${domain} with the value: faivr-verify=${challengeToken}`;
        break;
      case "file":
        instructions = `Host a JSON file at https://${domain}/.well-known/faivr-verification.json with the content: { "token": "${challengeToken}" }`;
        break;
      case "twitter":
        instructions = `Tweet the following from your official account:\n\nI'm verifying agent #${agentId} on @faivr_ai 🔐 Code: ${challengeToken}`;
        break;
    }

    return NextResponse.json({ challengeToken, instructions });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
