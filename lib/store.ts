import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
export type Source = {
  id: string;
  name: string;
  text: string;
  periodStart: string;
  periodEnd: string;
};
export type Fact = {
  id: string;
  sourceId: string;
  excerpt: string;
  location: string;
  kind: "achieved" | "goal";
  approved: boolean;
};
export type Grant = {
  id: string;
  name: string;
  funder: string;
  start: string;
  end: string;
  categories: Record<string, number>;
};
export type Question = {
  id: string;
  grantId: string;
  prompt: string;
  limit: number;
  kind: "achieved" | "goal";
  required: string;
};
export type Tx = {
  id: string;
  date: string;
  payee: string;
  cents: number;
  fingerprint: string;
};
export type Allocation = {
  id: string;
  transactionId: string;
  grantId: string;
  category: string;
  cents: number;
};
export type Claim = { text: string; factIds: string[] };
export type Draft = {
  id: string;
  questionId: string;
  claims: Claim[];
  gaps: string[];
  mode: string;
  version: number;
};
export type Approval = {
  id: string;
  grantId: string;
  hash: string;
  snapshot: Snapshot;
  reviewer: string;
  at: string;
};
export type State = {
  sources: Source[];
  facts: Fact[];
  grants: Grant[];
  questions: Question[];
  transactions: Tx[];
  allocations: Allocation[];
  drafts: Draft[];
  approvals: Approval[];
};
export type Snapshot = {
  grant: Grant;
  drafts: Draft[];
  questions: Question[];
  facts: Fact[];
  sources: Source[];
  report: ReturnType<typeof spending>;
  transactions: Tx[];
  allocations: Allocation[];
};
export function connect(
  path = process.env.GRANTPROOF_DB || "data/grantproof.sqlite",
) {
  if (!path.includes(":memory:"))
    mkdirSync(path.substring(0, path.lastIndexOf("/")) || ".", {
      recursive: true,
    });
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  const schema: Record<string, string> = {
    sources:
      "name TEXT GENERATED ALWAYS AS (json_extract(body,'$.name')) STORED NOT NULL",
    grants:
      "start_date TEXT GENERATED ALWAYS AS (json_extract(body,'$.start')) STORED NOT NULL, end_date TEXT GENERATED ALWAYS AS (json_extract(body,'$.end')) STORED NOT NULL",
    facts:
      "source_id TEXT GENERATED ALWAYS AS (json_extract(body,'$.sourceId')) STORED NOT NULL REFERENCES sources(id), approved INTEGER GENERATED ALWAYS AS (json_extract(body,'$.approved')) STORED NOT NULL CHECK(approved IN (0,1))",
    questions:
      "grant_id TEXT GENERATED ALWAYS AS (json_extract(body,'$.grantId')) STORED NOT NULL REFERENCES grants(id)",
    transactions:
      "cents INTEGER GENERATED ALWAYS AS (json_extract(body,'$.cents')) STORED NOT NULL CHECK(cents>0 AND typeof(cents)='integer'), fingerprint TEXT GENERATED ALWAYS AS (json_extract(body,'$.fingerprint')) STORED NOT NULL UNIQUE",
    allocations:
      "transaction_id TEXT GENERATED ALWAYS AS (json_extract(body,'$.transactionId')) STORED NOT NULL REFERENCES transactions(id), grant_id TEXT GENERATED ALWAYS AS (json_extract(body,'$.grantId')) STORED NOT NULL REFERENCES grants(id), cents INTEGER GENERATED ALWAYS AS (json_extract(body,'$.cents')) STORED NOT NULL CHECK(cents>0 AND typeof(cents)='integer')",
    drafts:
      "question_id TEXT GENERATED ALWAYS AS (json_extract(body,'$.questionId')) STORED NOT NULL UNIQUE REFERENCES questions(id)",
    approvals:
      "grant_id TEXT GENERATED ALWAYS AS (json_extract(body,'$.grantId')) STORED NOT NULL REFERENCES grants(id)",
  };
  for (const [name, columns] of Object.entries(schema))
    db.exec(
      `CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK(json_valid(body)), ${columns})`,
    );
  return db;
}
export function read(db: Database.Database): State {
  return Object.fromEntries(
    [
      "sources",
      "facts",
      "grants",
      "questions",
      "transactions",
      "allocations",
      "drafts",
      "approvals",
    ].map((n) => [
      n,
      (
        db.prepare(`SELECT body FROM ${n} ORDER BY rowid`).all() as {
          body: string;
        }[]
      ).map((r) => JSON.parse(r.body)),
    ]),
  ) as State;
}
export function save(db: Database.Database, s: State) {
  db.transaction(() => {
    const order = [
      "sources",
      "grants",
      "facts",
      "questions",
      "transactions",
      "allocations",
      "drafts",
      "approvals",
    ] as const;
    for (const name of [...order].reverse())
      db.prepare(`DELETE FROM ${name}`).run();
    for (const name of order) {
      const insert = db.prepare(`INSERT INTO ${name}(id,body) VALUES (?,?)`);
      for (const row of s[name]) insert.run(row.id, JSON.stringify(row));
    }
  })();
}
export const id = () => randomUUID();
export const hash = (o: unknown) =>
  createHash("sha256").update(JSON.stringify(o)).digest("hex");
export const words = (s: string) =>
  s.trim() ? s.trim().split(/\s+/).length : 0;
export const inPeriod = (date: string, g: Grant) =>
  date >= g.start && date <= g.end;
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function spending(s: State, grantId: string) {
  const g = s.grants.find((g) => g.id === grantId)!;
  const rows = Object.entries(g.categories).map(([category, budget]) => {
    const spent = s.allocations
      .filter(
        (a) =>
          a.grantId === g.id &&
          a.category === category &&
          inPeriod(
            s.transactions.find((t) => t.id === a.transactionId)!.date,
            g,
          ),
      )
      .reduce((n, a) => n + a.cents, 0);
    return {
      category,
      budget,
      spent,
      balance: budget - spent,
      risk:
        spent > budget
          ? "Over budget"
          : spent >= budget * 0.8
            ? "Near limit"
            : "On track",
    };
  });
  return {
    start: g.start,
    end: g.end,
    rows,
    budget: rows.reduce((n, r) => n + r.budget, 0),
    spent: rows.reduce((n, r) => n + r.spent, 0),
    balance: rows.reduce((n, r) => n + r.balance, 0),
  };
}
export function allocate(
  s: State,
  transactionId: string,
  grantId: string,
  category: string,
  cents: number,
) {
  const t = s.transactions.find((t) => t.id === transactionId);
  const g = s.grants.find((g) => g.id === grantId);
  if (
    !t ||
    !g ||
    !(category in g.categories) ||
    !Number.isSafeInteger(cents) ||
    cents <= 0
  )
    throw Error("Choose a valid transaction, category and positive amount.");
  if (!inPeriod(t.date, g))
    throw Error("Transaction is outside the funder period.");
  if (
    s.allocations
      .filter((a) => a.transactionId === transactionId)
      .reduce((n, a) => n + a.cents, 0) +
      cents >
    t.cents
  )
    throw Error("Allocation exceeds the transaction amount across grants.");
  s.allocations.push({ id: id(), transactionId, grantId, category, cents });
}
// RFC4180-style parsing, including quoted commas, escaped quotes and CRLF.
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!cell || quoted) quoted = !quoted;
      else throw Error("Malformed quote in CSV.");
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed quoted CSV field.");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}
export function importCSV(s: State, text: string) {
  const rows = parseCSV(text);
  const header = rows.shift()?.map((x) => x.trim().toLowerCase());
  if (header?.join(",") !== "id,date,payee,amount")
    throw Error("CSV columns must be id,date,payee,amount.");
  const result = { imported: 0, duplicates: 0, errors: [] as string[] };
  rows.forEach((r, i) => {
    const [externalId, date, payee, amount] = r.map((x) => x.trim());
    if (
      r.length !== 4 ||
      !externalId ||
      !validDate(date) ||
      !payee ||
      !/^\d+(\.\d{1,2})?$/.test(amount)
    ) {
      result.errors.push(
        `Row ${i + 2}: invalid id, date, payee or positive amount.`,
      );
      return;
    }
    const [d, c = ""] = amount.split(".");
    const cents = Number(d) * 100 + Number(c.padEnd(2, "0"));
    if (!Number.isSafeInteger(cents) || cents <= 0) {
      result.errors.push(`Row ${i + 2}: invalid amount.`);
      return;
    }
    const fingerprint = hash([date, payee.toLowerCase(), cents]);
    const existing = s.transactions.find(
      (t) => t.id === externalId || t.fingerprint === fingerprint,
    );
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        result.errors.push(`Row ${i + 2}: existing ID has different data.`);
      else result.duplicates++;
      return;
    }
    s.transactions.push({ id: externalId, date, payee, cents, fingerprint });
    result.imported++;
  });
  return result;
}
export function validateDraft(s: State, d: Draft) {
  const q = s.questions.find((q) => q.id === d.questionId);
  if (!q) throw Error("Unknown question.");
  const errors = [...d.gaps];
  const grant = s.grants.find((g) => g.id === q.grantId)!;
  if (words(d.claims.map((c) => c.text).join(" ")) > q.limit)
    errors.push("Word limit exceeded.");
  for (const c of d.claims) {
    if (!c.factIds.length) errors.push("Claim needs evidence.");
    for (const fid of c.factIds) {
      const f = s.facts.find((f) => f.id === fid);
      const source = s.sources.find((x) => x.id === f?.sourceId);
      if (
        !f?.approved ||
        !source ||
        !source.text.includes(f.excerpt) ||
        f.kind !== q.kind ||
        f.excerpt !== c.text ||
        source.periodStart < grant.start ||
        source.periodEnd > grant.end
      )
        errors.push(`Invalid or unapproved citation: ${fid}`);
    }
    // Exact excerpt claims form the safe deterministic boundary; free edits require evidence review.
    if (
      !c.factIds.some(
        (fid) => s.facts.find((f) => f.id === fid)?.excerpt === c.text,
      )
    )
      errors.push(
        "Edited wording requires evidence review: use an exact approved excerpt.",
      );
  }
  if (!d.claims.length) errors.push("Missing approved evidence.");
  if (
    q.required &&
    !d.claims.some((c) =>
      c.text.toLowerCase().includes(q.required.toLowerCase()),
    )
  )
    errors.push("Missing evidence for the question requirement.");
  return [...new Set(errors)];
}
export function fixtureDraft(s: State, q: Question): Draft {
  const g = s.grants.find((g) => g.id === q.grantId)!;
  const facts = s.facts.filter((f) => {
    const src = s.sources.find((x) => x.id === f.sourceId)!;
    return (
      f.approved &&
      f.kind === q.kind &&
      src.periodStart >= g.start &&
      src.periodEnd <= g.end &&
      (!q.required ||
        f.excerpt.toLowerCase().includes(q.required.toLowerCase()))
    );
  });
  let count = 0;
  const claims = facts
    .filter((f) => {
      count += words(f.excerpt);
      return count <= q.limit;
    })
    .map((f) => ({ text: f.excerpt, factIds: [f.id] }));
  return {
    id: id(),
    questionId: q.id,
    claims,
    gaps: claims.length
      ? []
      : [`Missing approved evidence for ${q.required || q.kind}.`],
    mode: "Deterministic fixture",
    version: (s.drafts.find((d) => d.questionId === q.id)?.version || 0) + 1,
  };
}
export function snapshot(s: State, grantId: string): Snapshot {
  const grant = s.grants.find((g) => g.id === grantId)!;
  const questions = s.questions.filter((q) => q.grantId === grantId);
  const drafts = s.drafts.filter((d) =>
    questions.some((q) => q.id === d.questionId),
  );
  const cited = new Set(
    drafts.flatMap((d) => d.claims.flatMap((c) => c.factIds)),
  );
  const facts = s.facts.filter((f) => cited.has(f.id));
  const sources = s.sources.filter((src) =>
    facts.some((f) => f.sourceId === src.id),
  );
  const allocations = s.allocations.filter((a) => a.grantId === grantId);
  const transactions = s.transactions.filter((t) => inPeriod(t.date, grant));
  return structuredClone({
    grant,
    questions,
    drafts,
    facts,
    sources,
    report: spending(s, grantId),
    allocations,
    transactions,
  });
}
export function reviewErrors(s: State, grantId: string) {
  const snap = snapshot(s, grantId);
  const errors = snap.questions.flatMap((q) => {
    const d = snap.drafts.find((d) => d.questionId === q.id);
    return d
      ? validateDraft(s, d).map((e) => `${q.prompt}: ${e}`)
      : ["Generate all answers before approval."];
  });
  if (snap.report.rows.some((r) => r.balance < 0))
    errors.push("Resolve over-budget categories.");
  if (
    s.transactions.some(
      (t) =>
        inPeriod(t.date, snap.grant) &&
        s.allocations
          .filter((a) => a.transactionId === t.id)
          .reduce((n, a) => n + a.cents, 0) < t.cents,
    )
  )
    errors.push("Resolve unallocated transactions in the reporting period.");
  return [...new Set(errors)];
}
export function approve(s: State, grantId: string, reviewer: string) {
  const errors = reviewErrors(s, grantId);
  if (errors.length) throw Error(errors.join("\n"));
  if (!reviewer.trim()) throw Error("Reviewer name is required.");
  const snap = snapshot(s, grantId);
  const a = {
    id: id(),
    grantId,
    hash: hash(snap),
    snapshot: snap,
    reviewer: reviewer.trim(),
    at: new Date().toISOString(),
  };
  s.approvals.push(a);
  return a;
}
export function currentApproval(s: State, g: string) {
  const a = s.approvals.filter((a) => a.grantId === g).at(-1);
  return a && reviewErrors(s, g).length === 0 && a.hash === hash(snapshot(s, g))
    ? a
    : undefined;
}
export function seed(): State {
  const s: State = {
    sources: [
      {
        id: "s1",
        name: "2026 program register.txt",
        text: "Tidepath Family Alliance supported 120 families through 360 coaching sessions.\nStaff recorded 96 families completing their action plans.",
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
      },
      {
        id: "s2",
        name: "2027 board-approved plan.txt",
        text: "Tidepath aims to support 150 families by June 2027.\nA preliminary estimate suggests a 92% success rate.",
        periodStart: "2027-01-01",
        periodEnd: "2027-06-30",
      },
    ],
    facts: [
      {
        id: "f1",
        sourceId: "s1",
        excerpt:
          "Tidepath Family Alliance supported 120 families through 360 coaching sessions.",
        location: "Line 1",
        kind: "achieved",
        approved: true,
      },
      {
        id: "f2",
        sourceId: "s1",
        excerpt: "Staff recorded 96 families completing their action plans.",
        location: "Line 2",
        kind: "achieved",
        approved: true,
      },
      {
        id: "f3",
        sourceId: "s2",
        excerpt: "Tidepath aims to support 150 families by June 2027.",
        location: "Line 1",
        kind: "goal",
        approved: false,
      },
      {
        id: "f4",
        sourceId: "s2",
        excerpt: "A preliminary estimate suggests a 92% success rate.",
        location: "Line 2",
        kind: "achieved",
        approved: false,
      },
    ],
    grants: [
      {
        id: "g1",
        name: "Family Futures 2026",
        funder: "Harbor Community Foundation",
        start: "2026-01-01",
        end: "2026-12-31",
        categories: {
          "Family coaching": 3000000,
          "Program supplies": 1000000,
          Administration: 1000000,
        },
      },
      {
        id: "g2",
        name: "Bridge Fund · fiscal year",
        funder: "Seabright Trust",
        start: "2026-07-01",
        end: "2027-06-30",
        categories: {
          "Family coaching": 1500000,
          "Program supplies": 500000,
          Administration: 500000,
        },
      },
    ],
    questions: [
      {
        id: "q1",
        grantId: "g1",
        prompt: "What did your program achieve this year?",
        limit: 100,
        kind: "achieved",
        required: "",
      },
      {
        id: "q2",
        grantId: "g1",
        prompt: "How many families completed their action plans?",
        limit: 50,
        kind: "achieved",
        required: "action plans",
      },
      {
        id: "q3",
        grantId: "g2",
        prompt: "What are your goals for this funded period?",
        limit: 80,
        kind: "goal",
        required: "",
      },
    ],
    transactions: [],
    allocations: [],
    drafts: [],
    approvals: [],
  };
  importCSV(
    s,
    "id,date,payee,amount\nT001,2026-01-01,Coaching team,12000.00\nT002,2026-06-30,Community supplies,2400.00\nT003,2026-12-31,Office services,1800.00\nT004,2027-01-01,Next-year workshop,900.00",
  );
  allocate(s, "T001", "g1", "Family coaching", 1200000);
  allocate(s, "T002", "g1", "Program supplies", 240000);
  allocate(s, "T003", "g1", "Administration", 180000);
  return s;
}
export function initialized() {
  const db = connect();
  if (!read(db).grants.length) save(db, seed());
  return db;
}
