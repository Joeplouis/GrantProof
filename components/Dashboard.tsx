"use client";
import { useEffect, useState } from "react";
const defaults = ["evidence", "application", "spending", "review"] as const;
type Panel = (typeof defaults)[number];
const labels: Record<Panel, string> = {
  evidence: "Evidence overview",
  application: "Application progress",
  spending: "Budget snapshot",
  review: "Review readiness",
};
const storageKey = "grantproof.dashboard-layout.v1";
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value / 100,
  );
export default function Dashboard({
  approvedFacts,
  pendingFacts,
  answersReady,
  questionCount,
  spending,
  approved,
  blockers,
  navigate,
}: {
  approvedFacts: number;
  pendingFacts: number;
  answersReady: number;
  questionCount: number;
  spending: { budget: number; spent: number; balance: number; end: string };
  approved: boolean;
  blockers: string[];
  navigate: (screen: string) => void;
}) {
  const [order, setOrder] = useState<Panel[]>([...defaults]);
  const [dragged, setDragged] = useState<Panel>();
  const [over, setOver] = useState<Panel>();
  const [announcement, setAnnouncement] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.length === defaults.length &&
          new Set(parsed).size === defaults.length &&
          parsed.every((p) => defaults.includes(p))
        )
          setOrder(parsed);
      }
    } catch {
      setStorageNotice(
        "Layout changes are available for this session; browser storage is unavailable.",
      );
    }
  }, []);
  function commit(next: Panel[]) {
    setOrder(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageNotice("");
    } catch {
      setStorageNotice(
        "Layout changes are available for this session; browser storage is unavailable.",
      );
    }
  }
  function move(panel: Panel, index: number) {
    const next = order.filter((p) => p !== panel);
    next.splice(index, 0, panel);
    commit(next);
    setAnnouncement(
      `${labels[panel]} moved to position ${index + 1} of ${defaults.length}.`,
    );
  }
  return (
    <section className="dashboard" aria-label="Moveable grant dashboard">
      <div className="sectionhead">
        <div>
          <h2>Your workspace, your way.</h2>
          <p>
            Drag a panel by its handle to rearrange it. Use the arrow buttons on
            a phone or keyboard.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            commit([...defaults]);
            setAnnouncement("Default dashboard layout restored.");
          }}
        >
          Reset layout
        </button>
      </div>
      <div className="dashboard-grid">
        {order.map((panel, index) => (
          <article
            key={panel}
            aria-label={labels[panel]}
            className={
              "card dashboard-panel" +
              (dragged === panel ? " is-dragging" : "") +
              (over === panel && dragged !== panel ? " drop-target" : "")
            }
            onDragOver={(e) => {
              if (dragged) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(panel);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragged) move(dragged, index);
              setDragged(undefined);
              setOver(undefined);
            }}
          >
            <div className="dashboard-panel-head">
              <span className="small-label">
                {String(index + 1).padStart(2, "0")} / {labels[panel]}
              </span>
              <div className="panel-controls">
                <button
                  className="panel-move"
                  aria-label={`Move ${labels[panel]} earlier`}
                  disabled={index === 0}
                  onClick={() => move(panel, index - 1)}
                >
                  ↑
                </button>
                <button
                  className="panel-move"
                  aria-label={`Move ${labels[panel]} later`}
                  disabled={index === order.length - 1}
                  onClick={() => move(panel, index + 1)}
                >
                  ↓
                </button>
                <button
                  draggable
                  className="drag-handle"
                  aria-label={`Drag ${labels[panel]}`}
                  title="Drag to rearrange this panel"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", panel);
                    setDragged(panel);
                  }}
                  onDragEnd={() => {
                    setDragged(undefined);
                    setOver(undefined);
                  }}
                >
                  ⠿
                </button>
              </div>
            </div>
            {panel === "evidence" ? (
              <>
                <div className="panel-icon">▤</div>
                <h3>The facts behind your story.</h3>
                <div className="dashboard-metrics">
                  <span>
                    <strong>{approvedFacts}</strong>approved for this period
                  </span>
                  <span>
                    <strong>{pendingFacts}</strong>pending for this period
                  </span>
                </div>
                <p>
                  Review the source, applicable dates, and outcome type before
                  approving a fact.
                </p>
                <button
                  className="textbutton"
                  onClick={() => navigate("evidence")}
                >
                  Review evidence →
                </button>
              </>
            ) : panel === "application" ? (
              <>
                <div className="panel-icon">✎</div>
                <h3>Answers with a source trail.</h3>
                <div className="dashboard-value">
                  {answersReady}
                  <small> / {questionCount} ready for review</small>
                </div>
                <p>
                  Generate from approved excerpts. Missing evidence stays
                  visible, and goals stay separate from achievements.
                </p>
                <button
                  className="textbutton"
                  onClick={() => navigate("application")}
                >
                  Prepare application →
                </button>
              </>
            ) : panel === "spending" ? (
              <>
                <div className="panel-icon">▥</div>
                <h3>Know what remains.</h3>
                <div className="dashboard-value">{money(spending.balance)}</div>
                <div
                  className="budget-track"
                  role="progressbar"
                  aria-label="Grant budget spent"
                  aria-valuemin={0}
                  aria-valuemax={spending.budget / 100}
                  aria-valuenow={
                    Math.min(spending.budget, spending.spent) / 100
                  }
                  aria-valuetext={`${money(spending.spent)} spent of ${money(spending.budget)}`}
                >
                  <span
                    style={{
                      width:
                        Math.min(
                          100,
                          (spending.spent / spending.budget) * 100,
                        ) + "%",
                    }}
                  />
                </div>
                <p>
                  {money(spending.spent)} spent of {money(spending.budget)}
                  <br />
                  Spend by {spending.end}
                </p>
                <button
                  className="textbutton"
                  onClick={() => navigate("spending")}
                >
                  Reconcile expenses →
                </button>
              </>
            ) : (
              <>
                <div className="panel-icon">✓</div>
                <h3>A human has the final say.</h3>
                <span
                  className={
                    "tag " +
                    (approved
                      ? "good"
                      : blockers.length
                        ? "warning"
                        : "neutral")
                  }
                >
                  {approved
                    ? "✓ Approved snapshot"
                    : blockers.length
                      ? `${blockers.length} item${blockers.length === 1 ? "" : "s"} to resolve`
                      : "Ready for staff review"}
                </span>
                <p>
                  {approved
                    ? "Your approved report and its evidence are ready to download."
                    : blockers[0] ||
                      "Review the answers and reconciled totals, then approve the exact package."}
                </p>
                <button
                  className="textbutton"
                  onClick={() => navigate("review")}
                >
                  Check approval & downloads →
                </button>
              </>
            )}
          </article>
        ))}
      </div>
      <div className="dashboard-layout-note">
        <span>
          Layout stays in this browser. Moving a panel does not change grant
          records.
        </span>
        <span role="status" aria-live="polite">
          {announcement}
        </span>
      </div>
      {storageNotice && <p className="muted">{storageNotice}</p>}
    </section>
  );
}
