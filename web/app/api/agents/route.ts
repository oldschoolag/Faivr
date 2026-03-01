import { NextResponse } from "next/server";
import { getAllAgents } from "@/lib/agents/definitions";

export const runtime = "edge";

export async function GET() {
  const agents = getAllAgents().map((a) => ({
    id: a.id,
    name: a.name,
    tier: a.tier,
    pricing: {
      amount: a.priceCentsUSDC,
      currency: "USDC",
      per: "task",
    },
    greeting: a.greeting,
    inputHint: a.inputHint,
  }));

  return NextResponse.json({ agents });
}
