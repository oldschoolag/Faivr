import { NextRequest, NextResponse } from "next/server";
import {
  findBestMatch,
  getSystemPrompt,
  OFF_TOPIC_RESPONSE,
  GREETING,
} from "@/lib/support/knowledge";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limited. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const { message, history } = (await req.json()) as {
      message: string;
      history?: { role: string; content: string }[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    if (message.trim().length === 0) {
      return NextResponse.json({ reply: GREETING });
    }

    // Try OpenAI if available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const messages = [
          { role: "system" as const, content: getSystemPrompt() },
          ...(history || []).slice(-10).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: message },
        ];

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content || OFF_TOPIC_RESPONSE;
          return NextResponse.json({ reply, mode: "llm" });
        }
      } catch {
        // Fall through to rule-based
      }
    }

    // Rule-based fallback
    const match = findBestMatch(message);
    const reply = match ? match.answer : OFF_TOPIC_RESPONSE;
    return NextResponse.json({ reply, mode: "rules", matchId: match?.id });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
