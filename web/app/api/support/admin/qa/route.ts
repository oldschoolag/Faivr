import { NextRequest, NextResponse } from "next/server";
import { addCustomQA, getCustomQAs } from "@/lib/support/learnings";
import {
  isAuthorizedSupportAdminRequest,
  isSupportAdminEnabled,
  supportAdminDisabledResponse,
  supportAdminUnauthorizedResponse,
} from "@/lib/support/admin";

function guard(req: NextRequest) {
  if (!isSupportAdminEnabled()) {
    return supportAdminDisabledResponse();
  }

  if (!isAuthorizedSupportAdminRequest(req)) {
    return supportAdminUnauthorizedResponse();
  }

  return null;
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    const { question, answer } = await req.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer required" }, { status: 400 });
    }
    const qa = await addCustomQA({ question, answer });
    return NextResponse.json({ ok: true, qa });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const qas = await getCustomQAs();
  return NextResponse.json({ qas });
}
