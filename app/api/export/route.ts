import { NextRequest, NextResponse } from "next/server";
import { initialized, read, currentApproval } from "@/lib/store";
import { reportHTML } from "@/lib/export";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const db = initialized();
  try {
    const grantId = req.nextUrl.searchParams.get("grant") || "g1";
    const a = currentApproval(read(db), grantId);
    if (!a)
      return NextResponse.json(
        {
          error:
            "Current application and report must be approved before export.",
        },
        { status: 409 },
      );
    if (req.nextUrl.searchParams.get("format") === "html")
      return new NextResponse(reportHTML(a), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="GrantProof-${grantId}-approved.html"`,
          "Cache-Control": "no-store",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'",
        },
      });
    return new NextResponse(
      JSON.stringify(
        { format: "GrantProof approved snapshot v1", approval: a },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="GrantProof-${grantId}-${a.id.slice(0, 8)}.json"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } finally {
    db.close();
  }
}
