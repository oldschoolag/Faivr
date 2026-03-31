import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const { agentId } = params;

  if (!agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }

  return NextResponse.json({
    agentId,
    verified: false,
    domain: null,
    method: null,
    verifiedAt: null,
    expiresAt: null,
    mode: "status-unavailable",
    message:
      "Live on-chain verification status is not wired into the public web app yet. Treat this endpoint as unavailable rather than authoritative.",
  });
}
