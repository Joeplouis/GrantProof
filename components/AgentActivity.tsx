"use client";
import type { Draft, Fact } from "@/lib/store";

export default function AgentActivity({
  draft,
  openEvidence,
  facts,
}: {
  draft: Draft;
  openEvidence: (fact: Fact) => void;
  facts: Fact[];
}) {
  const activity = draft.activity;
  if (!activity)
    return (
      <p className="activity-legacy">
        No activity receipt was recorded for this older draft. Regenerate to see
        the work.
      </p>
    );
  return (
    <section className="agent-activity" aria-label="Generation activity">
      <div className="activity-heading">
        <div>
          <span className="small-label">
            {activity.engine === "live" ? "AGENT ACTIVITY" : "FIXTURE ACTIVITY"}
          </span>
          <h4>
            {activity.engine === "live"
              ? "See what the agent did"
              : "See what the demo ran"}
          </h4>
        </div>
        <span className="tag neutral">
          {activity.engine === "live" ? "Live AI + tools" : "No AI call"}
        </span>
      </div>
      <p className="activity-meta">
        Recorded at generation · v{activity.generatedVersion} ·{" "}
        {(activity.durationMs / 1000).toFixed(1)}s ·{" "}
        {new Date(activity.completedAt).toLocaleString()}
      </p>
      <ol className="activity-events">
        {activity.events.map((event, index) => (
          <li key={index}>
            <span
              className={`activity-marker ${event.status}`}
              aria-label={
                event.status === "attention" ? "Needs attention" : "Completed"
              }
            >
              {event.status === "attention" ? "!" : "✓"}
            </span>
            <div>
              <strong>{event.label}</strong>
              <p>{event.detail}</p>
              {!!event.factIds?.length && (
                <div className="activity-sources">
                  {event.factIds.map((id) => {
                    const fact = facts.find((item) => item.id === id);
                    return fact ? (
                      <button
                        className="textbutton"
                        key={id}
                        onClick={() => openEvidence(fact)}
                      >
                        View evidence [{facts.indexOf(fact) + 1}]
                      </button>
                    ) : null;
                  })}
                </div>
              )}
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
      <p className="activity-boundary">
        {draft.version !== activity.generatedVersion
          ? "This answer was edited after this run. "
          : ""}
        This receipt describes the saved generation, not a current approval.
        Review current evidence and checks before export. Staff make the final
        decision.
      </p>
    </section>
  );
}
