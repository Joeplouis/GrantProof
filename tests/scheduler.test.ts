import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, save, seed, read, hash } from "../lib/store";
import {
  schedulerTick,
  setSchedule,
  schedulerStatus,
  retryScheduledJob,
  dueDate,
  ensureScheduler,
} from "../lib/scheduler";
import { prepareGrant } from "../lib/workflow";
function setup() {
  const db = connect(":memory:");
  const s = seed();
  s.grants[0].reportDue = dueDate(new Date());
  save(db, s);
  setSchedule(db, { grantId: "g1", enabled: true, live: false });
  return db;
}
test("due date follows Eastern midnight across DST, not the UTC date", () => {
  assert.equal(dueDate(new Date("2026-11-08T02:00:00Z")), "2026-11-07");
  assert.equal(dueDate(new Date("2026-07-08T03:59:00Z")), "2026-07-07");
  assert.equal(dueDate(new Date("2026-07-08T04:00:00Z")), "2026-07-08");
});
test("scheduled preparation persists exactly once per due date with no staff approval", async () => {
  const db = setup();
  try {
    assert.equal((await schedulerTick(db)).processed, 1);
    assert.equal(read(db).drafts.length, 2);
    assert.equal(read(db).approvals.length, 0);
    assert.equal(schedulerStatus(db).jobs[0].status, "complete");
    assert.equal((await schedulerTick(db)).processed, 0);
    const s = read(db);
    s.grants[0].reportDue = "2020-01-01";
    save(db, s);
    assert.equal((await schedulerTick(db)).processed, 1);
    assert.equal(schedulerStatus(db).jobs.length, 2);
  } finally {
    db.close();
  }
});
test("disabled and future grants never call the preparer", async () => {
  const db = setup();
  try {
    setSchedule(db, { grantId: "g1", enabled: false, live: true });
    assert.equal(
      (
        await schedulerTick(db, {
          prepare: async () => {
            throw Error("Unexpected call");
          },
        })
      ).processed,
      0,
    );
    setSchedule(db, { grantId: "g1", enabled: true, live: true });
    const s = read(db);
    s.grants[0].reportDue = "2099-01-01";
    save(db, s);
    assert.equal((await schedulerTick(db)).processed, 0);
  } finally {
    db.close();
  }
});
test("provider failure is recorded without partial saves or automatic retries", async () => {
  const db = setup();
  try {
    const before = hash(read(db));
    let attempts = 0;
    const prepare = async () => {
      attempts++;
      throw Error("Sensitive provider payload must not be stored");
    };
    await schedulerTick(db, { prepare });
    await schedulerTick(db, { prepare });
    assert.equal(attempts, 1);
    assert.equal(hash(read(db)), before);
    const job = schedulerStatus(db).jobs[0];
    assert.equal(job.status, "failed");
    assert.doesNotMatch(job.message, /Sensitive/);
    retryScheduledJob(db, job.id);
    await schedulerTick(db);
    assert.equal(schedulerStatus(db).jobs[0].status, "complete");
    assert.throws(() => retryScheduledJob(db, job.id), /Only failed/);
  } finally {
    db.close();
  }
});
test("worker lease blocks duplicate ticks; staff changes or pause discard in-flight drafts", async () => {
  const db = setup();
  try {
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => (entered = resolve));
    let resume!: () => void;
    const blocked = new Promise<void>((resolve) => (resume = resolve));
    const task = schedulerTick(db, {
      prepare: async (s, g, live) => {
        entered();
        await blocked;
        return prepareGrant(s, g, live);
      },
    });
    await gate;
    assert.equal((await schedulerTick(db)).locked, true);
    const s = read(db);
    s.facts[0].approved = false;
    save(db, s);
    resume();
    await task;
    assert.equal(read(db).drafts.length, 0);
    assert.equal(schedulerStatus(db).jobs[0].status, "failed");
    retryScheduledJob(db, schedulerStatus(db).jobs[0].id);
    await schedulerTick(db, {
      prepare: async (s, g, live) => {
        setSchedule(db, { grantId: g, enabled: false, live });
        return prepareGrant(s, g, live);
      },
    });
    assert.equal(read(db).drafts.length, 0);
  } finally {
    db.close();
  }
});
test("expired running jobs require manual recovery instead of repeated API calls", async () => {
  const db = setup();
  try {
    ensureScheduler(db);
    db.prepare("INSERT INTO report_jobs(id,body) VALUES (?,?)").run(
      "crash",
      JSON.stringify({
        id: "crash",
        grantId: "g1",
        due: read(db).grants[0].reportDue,
        status: "running",
        live: true,
        startedAt: new Date(0).toISOString(),
        message: "Preparing",
      }),
    );
    setSchedule(db, { grantId: "g1", enabled: false, live: true });
    await schedulerTick(db);
    assert.equal(schedulerStatus(db).jobs[0].status, "interrupted");
    assert.equal(read(db).drafts.length, 0);
  } finally {
    db.close();
  }
});
