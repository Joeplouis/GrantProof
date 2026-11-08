"use client";
import { useState } from "react";
import Modal from "./Modal";

const steps = [
  [
    "evidence",
    "Review the evidence",
    "Open a source. Approve a fact you can verify; leave unsupported estimates pending.",
  ],
  [
    "application",
    "Prepare the whole grant",
    "From Dashboard, run Prepare this grant for review. The workflow audits evidence and spending, drafts missing answers, preserves staff edits, and hands blockers to staff. Inspect each answer's activity in Application.",
  ],
  [
    "spending",
    "Make the money add up",
    "Review category balances. Import a CSV and allocate expenses before approving the report.",
  ],
  [
    "review",
    "Approve, download, then try an edit",
    "Approve the exact package and download it. An unsupported edit locks export until the report is reviewed again.",
  ],
] as const;

export default function DemoWalkthrough({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const [open, setOpen] = useState(false);
  function go(screen: string) {
    setOpen(false);
    navigate(screen);
  }
  return (
    <>
      <button className="secondary" onClick={() => setOpen(true)}>
        Try the demo
      </button>
      {open && (
        <Modal
          label="Your three-minute walkthrough"
          onClose={() => setOpen(false)}
        >
          <div className="sectionhead">
            <div>
              <span className="small-label">GET STARTED</span>
              <h2>Your three-minute walkthrough</h2>
            </div>
            <button
              className="textbutton"
              aria-label="Close walkthrough"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <p className="walkthrough-intro">
            One grant. The facts behind every claim. A report you can review and
            stand behind.
          </p>
          <div className="walkthrough-grid">
            {steps.map(([screen, title, description], index) => (
              <button
                key={screen}
                className="walkthrough-step"
                onClick={() => go(screen)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
          <p className="walkthrough-note">
            Start with the fictional records and free fixture generation. Live
            AI is optional in the Application workspace.
          </p>
          <button className="primary" onClick={() => go("evidence")}>
            Start with evidence →
          </button>
        </Modal>
      )}
    </>
  );
}
