import type Database from "better-sqlite3";
import { id, hash, read, save, type State } from "./store";
import { prepareGrant } from "./workflow";
export type Schedule = { grantId: string; enabled: boolean; live: boolean };
export type ScheduledJob = {
  id: string;
  grantId: string;
  due: string;
  live: boolean;
  status: "running" | "complete" | "failed" | "interrupted" | "pending";
  startedAt: string;
  finishedAt?: string;
  message: string;
};
export function ensureScheduler(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS report_schedules (id TEXT PRIMARY KEY, body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS report_jobs (id TEXT PRIMARY KEY, body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS report_worker (id TEXT PRIMARY KEY, owner TEXT NOT NULL, lease INTEGER NOT NULL, heartbeat TEXT NOT NULL);`);
}
export function schedulerStatus(db: Database.Database, now = Date.now()) {
  ensureScheduler(db);
  const worker = db
    .prepare("SELECT heartbeat,lease FROM report_worker WHERE id='worker'")
    .get() as { heartbeat: string; lease: number } | undefined;
  return {
    active:
      !!worker &&
      (worker.lease > now || now - Date.parse(worker.heartbeat) < 90000),
    heartbeat: worker?.heartbeat,
    timezone: "America/New_York",
    schedules: (
      db.prepare("SELECT body FROM report_schedules").all() as {
        body: string;
      }[]
    ).map((r) => JSON.parse(r.body) as Schedule),
    jobs: (
      db
        .prepare("SELECT body FROM report_jobs ORDER BY rowid DESC LIMIT 100")
        .all() as { body: string }[]
    ).map((r) => JSON.parse(r.body) as ScheduledJob),
  };
}
export function setSchedule(db: Database.Database, setting: Schedule) {
  ensureScheduler(db);
  if (!read(db).grants.some((g) => g.id === setting.grantId))
    throw Error("Unknown grant.");
  db.prepare(
    "INSERT OR REPLACE INTO report_schedules(id,body) VALUES (?,?)",
  ).run(setting.grantId, JSON.stringify(setting));
}
export function retryScheduledJob(db: Database.Database, jobId: string) {
  ensureScheduler(db);
  const row = db
    .prepare("SELECT body FROM report_jobs WHERE id=?")
    .get(jobId) as { body: string } | undefined;
  if (!row) throw Error("Unknown scheduled report.");
  const job = JSON.parse(row.body) as ScheduledJob;
  if (!["failed", "interrupted"].includes(job.status))
    throw Error("Only failed or interrupted reports can be retried.");
  job.status = "pending";
  job.message = "Staff requested a retry.";
  db.prepare("UPDATE report_jobs SET body=? WHERE id=?").run(
    JSON.stringify(job),
    jobId,
  );
}
export function dueDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export async function schedulerTick(
  db: Database.Database,
  options: { now?: Date; prepare?: typeof prepareGrant } = {},
) {
  ensureScheduler(db);
  const now = options.now || new Date(),
    owner = id(),
    stamp = now.getTime();
  const acquired = db.transaction(() => {
    const lock = db
      .prepare("SELECT lease FROM report_worker WHERE id='worker'")
      .get() as { lease: number } | undefined;
    if (lock && lock.lease > stamp) return false;
    db.prepare(
      "INSERT OR REPLACE INTO report_worker(id,owner,lease,heartbeat) VALUES ('worker',?,?,?)",
    ).run(owner, stamp + 180000, now.toISOString());
    // An expired running job may already have consumed API calls. Require staff
    // retry instead of silently repeating work after a crash.
    for (const job of schedulerStatus(db, stamp).jobs.filter(
      (j) => j.status === "running",
    )) {
      job.status = "interrupted";
      job.finishedAt = now.toISOString();
      job.message =
        "Worker interrupted. Review the workspace before requesting a retry.";
      db.prepare("UPDATE report_jobs SET body=? WHERE id=?").run(
        JSON.stringify(job),
        job.id,
      );
    }
    return true;
  })();
  if (!acquired) return { processed: 0, locked: true };
  const renew = setInterval(
    () =>
      db
        .prepare(
          "UPDATE report_worker SET lease=?,heartbeat=? WHERE id='worker' AND owner=?",
        )
        .run(Date.now() + 180000, new Date().toISOString(), owner),
    15000,
  );
  let processed = 0;
  try {
    const selected = read(db).grants.filter(
      (g) => g.reportDue && g.reportDue <= dueDate(now),
    );
    for (const grant of selected.slice(0, 12)) {
      const config = schedulerStatus(db).schedules.find(
        (s) => s.grantId === grant.id,
      );
      if (!config?.enabled) continue;
      const jobId = hash([grant.id, grant.reportDue]);
      const prior = db
        .prepare("SELECT body FROM report_jobs WHERE id=?")
        .get(jobId) as { body: string } | undefined;
      if (prior && JSON.parse(prior.body).status !== "pending") continue;
      const job: ScheduledJob = {
        id: jobId,
        grantId: grant.id,
        due: grant.reportDue!,
        live: config.live,
        status: "running",
        startedAt: new Date().toISOString(),
        message: "Preparing for staff review.",
      };
      db.prepare(
        "INSERT OR REPLACE INTO report_jobs(id,body) VALUES (?,?)",
      ).run(jobId, JSON.stringify(job));
      processed++;
      try {
        const state = read(db),
          before = hash(state);
        // A date may have changed while an earlier grant was preparing.
        if (state.grants.find((g) => g.id === grant.id)?.reportDue !== job.due)
          throw Error("Schedule changed.");
        const result = await (options.prepare || prepareGrant)(
          state,
          grant.id,
          config.live,
        );
        db.transaction(() => {
          const lock = db
            .prepare("SELECT owner,lease FROM report_worker WHERE id='worker'")
            .get() as { owner: string; lease: number };
          const latestConfig = schedulerStatus(db).schedules.find(
            (s) => s.grantId === grant.id,
          );
          if (
            lock.owner !== owner ||
            lock.lease < Date.now() ||
            !latestConfig?.enabled ||
            latestConfig.live !== config.live ||
            hash(read(db)) !== before
          )
            throw Error("Workspace or schedule changed during preparation.");
          const updated: State = {
            ...state,
            drafts: result.drafts,
            workflowRuns: [
              ...state.workflowRuns.filter((r) => r.grantId !== grant.id),
              result.receipt,
            ],
          };
          save(db, updated);
          job.status = "complete";
          job.finishedAt = new Date().toISOString();
          job.message = `${result.receipt.prepared} answers prepared; ${result.receipt.blockers.length} blockers. Staff approval required.`;
          db.prepare("UPDATE report_jobs SET body=? WHERE id=?").run(
            JSON.stringify(job),
            jobId,
          );
        })();
      } catch {
        job.status = "failed";
        job.finishedAt = new Date().toISOString();
        job.message =
          "Preparation failed or the workspace changed. No preparation was saved. Review and retry manually.";
        db.prepare("UPDATE report_jobs SET body=? WHERE id=?").run(
          JSON.stringify(job),
          jobId,
        );
      }
    }
    return { processed, locked: false };
  } finally {
    clearInterval(renew);
    db.prepare(
      "UPDATE report_worker SET lease=0,heartbeat=? WHERE id='worker' AND owner=?",
    ).run(new Date().toISOString(), owner);
  }
}
