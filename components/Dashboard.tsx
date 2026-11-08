"use client";
import { useEffect, useState, useRef } from "react";
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
  const [keyboardPanel, setKeyboardPanel] = useState<Panel>();
  const touch = useRef<
    | {
        panel: Panel;
        x: number;
        y: number;
        target: Panel;
        moving: boolean;
      }
    | undefined
  >(undefined);
  function cancelMove() {
    setDragged(undefined);
    setOver(undefined);
    setKeyboardPanel(undefined);
    touch.current = undefined;
  }
  function keyboardMove(
    event: React.KeyboardEvent<HTMLButtonElement>,
    panel: Panel,
  ) {
    if (event.key === "Escape" && keyboardPanel) {
      event.preventDefault();
      cancelMove();
      setAnnouncement("Move cancelled. Your layout is unchanged.");
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (keyboardPanel === panel) {
        move(panel, order.indexOf(over || panel));
        cancelMove();
      } else {
        setKeyboardPanel(panel);
        setDragged(panel);
        setOver(panel);
        setAnnouncement(
          `${labels[panel]} picked up. Use arrow keys to choose a position, Enter to place, or Escape to cancel.`,
        );
      }
      return;
    }
    if (
      keyboardPanel === panel &&
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      event.preventDefault();
      const current = order.indexOf(over || panel);
      const step =
        event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
      const position =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? order.length - 1
            : Math.max(0, Math.min(order.length - 1, current + step));
      setOver(order[position]);
      setAnnouncement(
        `Choose position ${position + 1} of ${order.length}. Press Enter to place ${labels[panel]}.`,
      );
    }
  }

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
    if (index < 0 || index >= order.length) return;
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
            Drag a panel by its handle to rearrange it. Drag on a phone too, or
            use the arrow buttons. Keyboard: pick up a handle with Space, move
            with arrow keys, then press Enter.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            cancelMove();
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
            data-dashboard-panel={panel}
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
              cancelMove();
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
                  title="Drag to rearrange. Keyboard: Space, arrow keys, Enter."
                  aria-pressed={keyboardPanel === panel}
                  aria-describedby="dashboard-move-help"
                  onKeyDown={(event) => keyboardMove(event, panel)}
                  onBlur={() => {
                    if (keyboardPanel === panel) {
                      cancelMove();
                      setAnnouncement(
                        "Move cancelled. Your layout is unchanged.",
                      );
                    }
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === "mouse") return;
                    event.preventDefault();
                    cancelMove();
                    touch.current = {
                      panel,
                      x: event.clientX,
                      y: event.clientY,
                      target: panel,
                      moving: false,
                    };
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const gesture = touch.current;
                    if (!gesture || gesture.panel !== panel) return;
                    if (
                      !gesture.moving &&
                      Math.hypot(
                        event.clientX - gesture.x,
                        event.clientY - gesture.y,
                      ) < 8
                    )
                      return;
                    gesture.moving = true;
                    setDragged(panel);
                    const target = document
                      .elementFromPoint?.(event.clientX, event.clientY)
                      ?.closest<HTMLElement>("[data-dashboard-panel]")?.dataset
                      .dashboardPanel as Panel | undefined;
                    if (target && defaults.includes(target)) {
                      gesture.target = target;
                      setOver(target);
                      setAnnouncement(
                        `Move ${labels[panel]} to position ${order.indexOf(target) + 1}.`,
                      );
                    }
                    if (event.clientY < 65) window.scrollBy(0, -14);
                    else if (event.clientY > window.innerHeight - 65)
                      window.scrollBy(0, 14);
                  }}
                  onPointerUp={(event) => {
                    const gesture = touch.current;
                    if (!gesture || gesture.panel !== panel) return;
                    if (gesture.moving)
                      move(panel, order.indexOf(gesture.target));
                    if (
                      event.currentTarget.hasPointerCapture?.(event.pointerId)
                    )
                      event.currentTarget.releasePointerCapture(
                        event.pointerId,
                      );
                    cancelMove();
                  }}
                  onPointerCancel={() => {
                    cancelMove();
                    setAnnouncement(
                      "Move cancelled. Your layout is unchanged.",
                    );
                  }}
                  onDragStart={(e) => {
                    touch.current = undefined;
                    setKeyboardPanel(undefined);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", panel);
                    setDragged(panel);
                  }}
                  onDragEnd={cancelMove}
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
      <p id="dashboard-move-help" className="sr-only">
        Drag a panel handle, or press Space to pick it up, use arrow keys to
        choose a position, and press Enter to place it. Escape cancels. The
        arrow buttons also move panels one position.
      </p>
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
