import { NextRequest, NextResponse } from "next/server";
import { logFeedback, getFeedback, type FeedbackEntry } from "@/lib/support/learnings";
import {
  isAuthorizedSupportAdminRequest,
  isSupportAdminEnabled,
  supportAdminDisabledResponse,
  supportAdminUnauthorizedResponse,
} from "@/lib/support/admin";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<FeedbackEntry, "timestamp">;
    if (!body.id || !body.question || typeof body.helpful !== "boolean") {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }
    await logFeedback({ ...body, timestamp: Date.now() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to log feedback" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isSupportAdminEnabled()) {
    return supportAdminDisabledResponse();
  }

  if (!isAuthorizedSupportAdminRequest(req)) {
    return supportAdminUnauthorizedResponse();
  }

  try {
    const entries = await getFeedback();
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
