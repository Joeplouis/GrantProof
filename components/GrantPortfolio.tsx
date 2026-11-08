"use client";
import { useEffect, useState } from "react";
import type { Grant } from "@/lib/store";
type Report = {
  grantId: string;
  spent: number;
  balance: number;
  rows: { category: string; risk: string; balance: number }[];
};
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export default function GrantPortfolio({
  grants,
  reports,
  blockers,
  busy,
  live,
  prepare,
  saveDate,
  openGrant,
}: {
  grants: Grant[];
  reports: Report[];
  blockers: Record<string, string[]>;
  busy: boolean;
  live: boolean;
  prepare: (asOf: string, scope: "due" | "all") => void;
  saveDate: (grantId: string, date: string) => void;
  openGrant: (id: string) => void;
}) {
  const [asOf, setAsOf] = useState("");
  useEffect(() => {
    const now = new Date();
    setAsOf(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
  }, []);
  const due = grants.filter(
    (grant) => grant.reportDue && grant.reportDue <= asOf,
  );
  return (
    <section className="card grant-portfolio" aria-label="Grant portfolio">
      <span className="small-label">CLAUDETTE'S PORTFOLIO</span>
      <h2>Every funder. One readiness queue.</h2>
      <p>
        Each grant keeps its own questions, limits, categories, and reporting
        year. Staff set the actual report due dates.
      </p>
      <div className="portfolio-actions">
        <label>
          Planning date
          <input
            aria-label="Portfolio planning date"
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          className="primary"
          disabled={busy || !asOf || !due.length}
          onClick={() => prepare(asOf, "due")}
        >
          Prepare {due.length} due reports
        </button>
        <button
          className="secondary"
          disabled={busy || !asOf}
          onClick={() => prepare(asOf, "all")}
        >
          Prepare all grants
        </button>
      </div>
      <p className="activity-meta">
        {live
          ? "Live agent mode uses API calls for each grant and its missing answers."
          : "Fixture mode · no AI calls."}{" "}
        This queue runs when you click Prepare; it does not run in the
        background or submit reports.
      </p>
      <div className="portfolio-grants">
        {grants.map((grant) => {
          const report = reports.find((item) => item.grantId === grant.id)!;
          const risks = report.rows.filter((row) => row.risk !== "On track");
          return (
            <article
              className="portfolio-grant"
              key={grant.id}
              aria-label={grant.name + " portfolio status"}
            >
              <h3>{grant.name}</h3>
              <p>
                {grant.funder} · {grant.start} → {grant.end}
              </p>
              <span
                className={
                  "tag " +
                  (grant.reportDue && grant.reportDue <= asOf
                    ? "warning"
                    : "neutral")
                }
              >
                {grant.reportDue
                  ? `Report due ${grant.reportDue}`
                  : "Due date not set"}
              </span>
              <p>
                {money(report.spent)} spent · {money(report.balance)} remaining
                · {blockers[grant.id]?.length || 0} current blockers
              </p>
              {risks.map((row) => (
                <p className="portfolio-risk" key={row.category}>
                  <strong>
                    {row.risk}: {row.category}
                  </strong>{" "}
                  · {money(row.balance)} remaining
                </p>
              ))}
              {!risks.length && (
                <p>No categories at the 80% warning threshold.</p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveDate(
                    grant.id,
                    String(new FormData(e.currentTarget).get("due")),
                  );
                }}
              >
                <label>
                  Report due date
                  <input
                    key={grant.id + grant.reportDue}
                    aria-label={"Report due date for " + grant.name}
                    name="due"
                    type="date"
                    defaultValue={grant.reportDue || ""}
                    disabled={busy}
                  />
                </label>
                <button className="secondary" disabled={busy}>
                  Save due date for {grant.name}
                </button>
              </form>
              <button
                className="textbutton"
                onClick={() => openGrant(grant.id)}
              >
                Open {grant.name} →
              </button>
            </article>
          );
        })}
      </div>
      <p className="activity-boundary">
        Near limit means at least 80% of a category's budget is already
        allocated; it is not a spending forecast. Blank due dates are never
        inferred. Saving grant configuration changes requires a new review of
        any approved package.
      </p>
    </section>
  );
}
