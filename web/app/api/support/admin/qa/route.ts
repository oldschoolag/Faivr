import { NextRequest, NextResponse } from "next/server";
import { addCustomQA, getCustomQAs } from "@/lib/support/learnings";

export async function POST(req: NextRequest) {
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

export async function GET() {
  const qas = await getCustomQAs();
  return NextResponse.json({ qas });
}
