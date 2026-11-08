import { NextRequest, NextResponse } from "next/server";
import {
  initialized,
  read,
  save,
  spending,
  id,
  allocate,
  importCSV,
  validDate,
  approve,
  currentApproval,
  reviewErrors,
  Fact,
  hash,
  validateDraft,
  workflowHash,
} from "@/lib/store";
import { generate } from "@/lib/agent";
import { prepareGrant, preparePortfolio } from "@/lib/workflow";
import {
  schedulerStatus,
  setSchedule,
  retryScheduledJob,
} from "@/lib/scheduler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function output() {
  const db = initialized();
  try {
    const s = read(db);
    return {
      ...s,
      scheduler: schedulerStatus(db),
      reports: s.grants.map((g) => ({ grantId: g.id, ...spending(s, g.id) })),
      currentApprovals: s.grants
        .map((g) => currentApproval(s, g.id))
        .filter(Boolean),
      reviewErrors: Object.fromEntries(
        s.grants.map((g) => [g.id, reviewErrors(s, g.id)]),
      ),
      draftErrors: Object.fromEntries(
        s.drafts.map((d) => [d.id, validateDraft(s, d)]),
      ),
      liveAvailable: !!process.env.OPENAI_API_KEY,
      workflowCurrent: Object.fromEntries(
        s.workflowRuns.map((r) => [r.id, r.workspaceHash === workflowHash(s)]),
      ),
    };
  } finally {
    db.close();
  }
}
export async function GET() {
  return NextResponse.json(output());
}
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host"))
    return NextResponse.json(
      { error: "Cross-origin mutation rejected." },
      { status: 403 },
    );
  const db = initialized();
  try {
    const b = await req.json();
    const s = read(db);
    const initialHash = hash(s);
    let message = "Changes saved.";
    switch (b.action) {
      case "schedule": {
        if (typeof b.enabled !== "boolean" || typeof b.live !== "boolean")
          throw Error("Choose a valid schedule mode.");
        if (b.live && !process.env.OPENAI_API_KEY)
          throw Error("Live AI is unavailable on this server.");
        setSchedule(db, {
          grantId: String(b.grantId),
          enabled: b.enabled,
          live: b.live,
        });
        return NextResponse.json({
          message: b.enabled
            ? "Background preparation enabled. Staff approval remains required."
            : "Background preparation paused.",
          ...output(),
        });
      }
      case "retry-scheduled": {
        retryScheduledJob(db, String(b.jobId));
        return NextResponse.json({
          message: "Retry queued for the background worker.",
          ...output(),
        });
      }
      case "report-date": {
        const grant = s.grants.find((g) => g.id === b.grantId);
        if (
          !grant ||
          (b.date !== "" && (typeof b.date !== "string" || !validDate(b.date)))
        )
          throw Error("Choose a grant and valid report due date.");
        if (b.date) grant.reportDue = b.date;
        else delete grant.reportDue;
        message =
          "Report due date saved. Review grant configuration changes before approval.";
        break;
      }
      case "prepare-portfolio": {
        if (b.scope !== "all" && b.scope !== "due")
          throw Error("Choose due reports or all grants.");
        const result = await preparePortfolio(
          s,
          String(b.asOf),
          b.scope,
          b.live === true,
        );
        s.drafts = result.drafts;
        s.workflowRuns = result.workflowRuns;
        message = `${result.count} grants prepared for staff review. No approvals or financial allocations were made.`;
        break;
      }
      case "source": {
        if (
          typeof b.name !== "string" ||
          !b.name.trim() ||
          typeof b.text !== "string" ||
          !b.text.trim() ||
          b.text.length > 100000 ||
          !validDate(b.start) ||
          !validDate(b.end) ||
          b.start > b.end
        )
          throw Error(
            "Provide a name, text (up to 100,000 characters), and valid period.",
          );
        const sourceId = id();
        s.sources.push({
          id: sourceId,
          name: b.name.trim(),
          text: b.text,
          periodStart: b.start,
          periodEnd: b.end,
        });
        b.text.split(/\n/).forEach((line: string, i: number) => {
          if (line.trim())
            s.facts.push({
              id: id(),
              sourceId,
              excerpt: line.trim(),
              location: `Line ${i + 1}`,
              kind: /\baim|\bgoal|\bplan to|\bwill\b/i.test(line)
                ? "goal"
                : "achieved",
              approved: false,
            });
        });
        message = "Source imported. Candidate lines require staff review.";
        break;
      }
      case "fact": {
        const f = s.facts.find((f) => f.id === b.id);
        if (!f) throw Error("Unknown fact.");
        if (b.kind !== undefined) {
          if (!["goal", "achieved"].includes(b.kind))
            throw Error("Invalid fact type.");
          f.kind = b.kind as Fact["kind"];
        }
        f.approved = b.approved === true;
        break;
      }
      case "prepare": {
        const result = await prepareGrant(
          s,
          String(b.grantId),
          b.live === true,
        );
        s.drafts = result.drafts;
        s.workflowRuns = [
          ...s.workflowRuns.filter((r) => r.grantId !== b.grantId),
          result.receipt,
        ];
        message = `Grant preparation complete: ${result.receipt.prepared} answers prepared, ${result.receipt.preserved} preserved. Staff approval required.`;
        break;
      }
      case "generate": {
        const q = s.questions.find((q) => q.id === b.id);
        if (!q) throw Error("Unknown question.");
        const d = await generate(s, q, b.live === true);
        s.drafts = s.drafts.filter((x) => x.questionId !== q.id);
        s.drafts.push(d);
        message = `Version ${d.version} generated · ${d.mode}.`;
        break;
      }
      case "edit": {
        const d = s.drafts.find((d) => d.id === b.id);
        if (!d) throw Error("Unknown draft.");
        if (
          !Array.isArray(b.claims) ||
          b.claims.some(
            (c: { text: unknown; factIds: unknown }) =>
              typeof c.text !== "string" ||
              !Array.isArray(c.factIds) ||
              c.factIds.some((x: unknown) => typeof x !== "string"),
          )
        )
          throw Error("Invalid claim structure.");
        d.claims = b.claims;
        d.gaps = [];
        d.version++;
        break;
      }
      case "csv": {
        if (typeof b.text !== "string" || b.text.length > 1000000)
          throw Error("CSV exceeds 1 MB.");
        const result = importCSV(s, b.text);
        message = `${result.imported} imported · ${result.duplicates} duplicates skipped${result.errors.length ? " · " + result.errors.join(" ") : ""}`;
        break;
      }
      case "allocate":
        allocate(s, b.transactionId, b.grantId, b.category, Number(b.cents));
        break;
      case "unallocate":
        s.allocations = s.allocations.filter((a) => a.id !== b.id);
        break;
      case "approve":
        approve(s, b.grantId, String(b.reviewer || ""));
        message =
          "Approved snapshot sealed. Any content or evidence change requires a new approval.";
        break;
      default:
        throw Error("Unknown action.");
    }
    if (hash(read(db)) !== initialHash)
      throw Error("Workspace changed during generation. Please retry.");
    save(db, s);
    return NextResponse.json({ message, ...output() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  } finally {
    db.close();
  }
}
