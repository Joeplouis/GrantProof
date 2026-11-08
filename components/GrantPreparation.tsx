"use client";
import type { WorkflowRun } from "@/lib/store";

export default function GrantPreparation({
  receipt,
  current,
  blockers,
  busy,
  preparing,
  live,
  liveAvailable,
  missing,
  setLive,
  prepare,
  navigate,
}: {
  receipt?: WorkflowRun;
  current: boolean;
  blockers: string[];
  busy: boolean;
  preparing: boolean;
  live: boolean;
  liveAvailable: boolean;
  missing: number;
  setLive: (value: boolean) => void;
  prepare: () => void;
  navigate: (screen: string) => void;
}) {
  return (
    <section
      className="card grant-preparation"
      aria-label="Grant workflow preparation"
    >
      <div className="sectionhead">
        <div>
          <span className="small-label">GRANT WORKFLOW</span>
          <h2>Prepare grant for review</h2>
          <p>
            Check evidence and spending, prepare missing answers, and hand the
            package to staff.
          </p>
        </div>
        <span className="tag neutral">Staff stay in control</span>
      </div>
      <div className="preparation-controls">
        <label className="toggle">
          <input
            type="checkbox"
            checked={live}
            disabled={busy || !liveAvailable}
            onChange={(e) => setLive(e.target.checked)}
          />
          Use live workflow agent
        </label>
        <p>
          {live
            ? `Uses the OpenAI API: a coordinator run plus up to ${missing} missing-answer runs. Existing answers and staff edits are preserved.`
            : "Free fixture walkthrough: the same preparation checks run with sample drafting. No AI agent is called."}
        </p>
        <button className="primary" disabled={busy} onClick={prepare}>
          {preparing ? "Preparing grant…" : "Prepare grant for review"}
        </button>
        {preparing && (
          <p role="status">
            Auditing and preparing on the server. The completed receipt appears
            when the whole run is saved. Existing work remains in place if the
            run fails.
          </p>
        )}
      </div>
      {receipt && (
        <div className="preparation-receipt">
          <div className="activity-heading">
            <h3>
              {receipt.mode === "live"
                ? "Workflow agent handoff"
                : "Fixture workflow handoff"}
            </h3>
            <span className={"tag " + (current ? "good" : "warning")}>
              {current
                ? "Matches current workspace"
                : "Workspace changed · run again"}
            </span>
          </div>
          <p className="activity-meta">
            {new Date(receipt.at).toLocaleString()} ·{" "}
            {(receipt.durationMs / 1000).toFixed(1)}s · {receipt.prepared}{" "}
            answers prepared · {receipt.preserved} preserved
          </p>
          <p>
            <strong>
              {receipt.mode === "live"
                ? "Coordinator note: "
                : "Fixture note: "}
            </strong>
            {receipt.summary}
          </p>
          <ol className="activity-events">
            {receipt.events.map((event, index) => (
              <li key={index}>
                <span className="activity-marker">✓</span>
                <div>
                  <strong>{event.label}</strong>
                  <p>{event.detail}</p>
                  {event.tool && (
                    <details className="activity-tool">
                      <summary>Tool used</summary>
                      <code>{event.tool}</code>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {!!receipt.spending.unallocated.length && (
            <p>
              Transactions flagged during this run:{" "}
              {receipt.spending.unallocated.join(", ")}. Staff choose the
              grant/category and amount.
            </p>
          )}
          <p className="activity-boundary">
            The handoff records completed work; it does not approve evidence or
            the package, change allocations, download, or submit anything.
          </p>
        </div>
      )}
      <div className="preparation-next">
        <h3>
          {blockers.length
            ? "Staff actions still needed"
            : "Ready for staff review"}
        </h3>
        <p>
          Current checks ·{" "}
          {blockers.length
            ? `${blockers.length} blocking issues`
            : "No deterministic blockers; staff approval is still required."}
        </p>
        {blockers.length > 0 && (
          <ul>
            {[...new Set(blockers)].map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        )}
        <div className="blocker-actions">
          <button className="textbutton" onClick={() => navigate("evidence")}>
            Open evidence review →
          </button>
          <button className="textbutton" onClick={() => navigate("spending")}>
            Resolve spending →
          </button>
          <button
            className="textbutton"
            onClick={() => navigate("application")}
          >
            Inspect answers →
          </button>
          <button className="textbutton" onClick={() => navigate("review")}>
            Open staff review →
          </button>
        </div>
      </div>
    </section>
  );
}
