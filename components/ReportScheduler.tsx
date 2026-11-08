"use client";
import type { Grant } from "@/lib/store";
import type { schedulerStatus } from "@/lib/scheduler";
export default function ReportScheduler({
  status,
  grants,
  busy,
  liveAvailable,
  act,
}: {
  status: ReturnType<typeof schedulerStatus>;
  grants: Grant[];
  busy: boolean;
  liveAvailable: boolean;
  act: (body: unknown) => Promise<unknown>;
}) {
  return (
    <section
      className="card grant-portfolio"
      aria-label="Background report scheduler"
    >
      <span className="small-label">BACKGROUND PREPARATION</span>
      <h2>Reports prepared when they’re due.</h2>
      <p>
        {status.active
          ? "Worker heartbeat is current."
          : "Worker is offline or has not checked in recently."}{" "}
        {status.heartbeat
          ? `Last check: ${new Date(status.heartbeat).toLocaleString()}.`
          : "Start the report worker to process scheduled reports."}
      </p>
      <p>
        Checks every minute using America/New_York dates, even with the browser
        closed. Runs once per grant and saved due date. The Studio must be awake
        and the worker running.
      </p>
      {grants.map((grant) => {
        const setting = status.schedules.find((s) => s.grantId === grant.id);
        const job = status.jobs.find(
          (j) => j.grantId === grant.id && j.due === grant.reportDue,
        );
        return (
          <div className="scheduler-grant" key={grant.id}>
            <h3>{grant.name}</h3>
            <label className="toggle">
              <input
                type="checkbox"
                aria-label={`Schedule ${grant.name}`}
                checked={setting?.enabled || false}
                disabled={busy}
                onChange={(e) =>
                  void act({
                    action: "schedule",
                    grantId: grant.id,
                    enabled: e.target.checked,
                    live: setting?.live || false,
                  })
                }
              />
              Prepare automatically on the saved due date
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                aria-label={`Live scheduled AI for ${grant.name}`}
                checked={setting?.live || false}
                disabled={busy || !liveAvailable}
                onChange={(e) =>
                  void act({
                    action: "schedule",
                    grantId: grant.id,
                    enabled: setting?.enabled || false,
                    live: e.target.checked,
                  })
                }
              />
              Use live AI for this schedule (API credits)
            </label>
            <p>
              {grant.reportDue
                ? `Due ${grant.reportDue}`
                : "Waiting for staff to save a report due date in the portfolio below."}{" "}
              · {setting?.live ? "Live AI" : "Free fixture mode"}
            </p>
            {job && (
              <div role="status">
                <strong>Scheduled run: {job.status}</strong>
                <p>{job.message}</p>
                {["failed", "interrupted"].includes(job.status) && (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void act({ action: "retry-scheduled", jobId: job.id })
                    }
                  >
                    Retry scheduled report for {grant.name}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="activity-boundary">
        The worker preserves staff edits and reports blockers. It cannot approve
        evidence, allocate money, approve the final package, export, or submit.
        Failed/interrupted runs wait for a staff-requested retry, preventing
        repeated API charges. Save the next actual due date to schedule the next
        report.
      </p>
    </section>
  );
}
