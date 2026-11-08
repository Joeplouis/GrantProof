import { NextRequest, NextResponse } from "next/server";
import { askAssistant, llmAvailable } from "@/lib/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, liveAvailable: llmAvailable() });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) {
    let allowed = false;
    try {
      allowed = new URL(origin).host === req.headers.get("host");
    } catch {
      allowed = false;
    }
    if (!allowed)
      return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = (body || {}) as { question?: unknown; history?: unknown };
  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question || question.length > 1000)
    return NextResponse.json(
      { error: "Ask a question of up to 1000 characters." },
      { status: 400 },
    );
  const history = Array.isArray(b.history)
    ? b.history
        .filter(
          (h): h is { role: string; text: string } =>
            !!h &&
            typeof h === "object" &&
            typeof (h as { text?: unknown }).text === "string",
        )
        .slice(-6)
        .map((h) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          text: h.text.slice(0, 1000),
        }))
    : [];
  try {
    const result = await askAssistant(question, history);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "The assistant could not read the workspace just now." },
      { status: 500 },
    );
  }
}
