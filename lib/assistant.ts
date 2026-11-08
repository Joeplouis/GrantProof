/**
 * GrantProof page assistant.
 *
 * Answers visitor questions from the workspace database only. The live path
 * sends the full workspace (sources, facts, grants, spending, drafts,
 * approvals, transactions) to the model as context with strict
 * evidence-bound rules. If the model is unavailable for any reason, a
 * deterministic lookup over the same data answers instead — never a guess.
 *
 * The API key is read server-side from the process environment or the VPS
 * master env file. It is never sent to the browser and never logged.
 */
import { readFileSync } from "node:fs";
import {
  currentApproval,
  initialized,
  read,
  reviewErrors,
  spending,
  type State,
} from "./store";

export const money = (cents: number) =>
  "$" +
  (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Structured, JSON-friendly view of the whole workspace for the model. */
export function buildContext(s: State) {
  const sourceName = (id: string) =>
    s.sources.find((x) => x.id === id)?.name || id;
  return {
    organization: "Tidepath Family Alliance (fictional demo nonprofit)",
    sources: s.sources.map((x) => ({
      id: x.id,
      name: x.name,
      period: `${x.periodStart} to ${x.periodEnd}`,
      text: x.text,
    })),
    facts: s.facts.map((f) => ({
      id: f.id,
      kind: f.kind,
      approved: f.approved,
      source: sourceName(f.sourceId),
      excerpt: f.excerpt,
    })),
    grants: s.grants.map((g) => {
      const sp = spending(s, g.id);
      const ap = currentApproval(s, g.id);
      return {
        id: g.id,
        name: g.name,
        funder: g.funder,
        period: `${g.start} to ${g.end}`,
        budget: money(sp.budget),
        spent: money(sp.spent),
        remaining: money(sp.balance),
        categories: sp.rows.map((r) => ({
          category: r.category,
          budget: money(r.budget),
          spent: money(r.spent),
          remaining: money(r.balance),
          status: r.risk,
        })),
        approval: ap
          ? `Approved and sealed by ${ap.reviewer} at ${ap.at}`
          : "Not currently approved",
        reviewErrors: reviewErrors(s, g.id),
      };
    }),
    questions: s.questions.map((q) => ({
      id: q.id,
      grantId: q.grantId,
      prompt: q.prompt,
      kind: q.kind,
    })),
    drafts: s.drafts.map((d) => {
      const q = s.questions.find((x) => x.id === d.questionId);
      return {
        question: q?.prompt || d.questionId,
        claims: d.claims.map((c) => ({ text: c.text, factIds: c.factIds })),
        gaps: d.gaps,
        mode: d.mode,
      };
    }),
    transactions: s.transactions.slice(0, 100).map((t) => ({
      id: t.id,
      date: t.date,
      payee: t.payee,
      amount: money(t.cents),
      allocations: s.allocations
        .filter((a) => a.transactionId === t.id)
        .map((a) => ({
          grantId: a.grantId,
          category: a.category,
          amount: money(a.cents),
        })),
    })),
  };
}

export type AssistantContext = ReturnType<typeof buildContext>;

function grantLines(s: State, g: (typeof s.grants)[number]) {
  const sp = spending(s, g.id);
  const lines = [
    `${g.name} (${g.funder}, ${g.start} to ${g.end}):`,
    `Budget ${money(sp.budget)} · Spent ${money(sp.spent)} · Remaining ${money(sp.balance)}`,
    ...sp.rows.map(
      (r) =>
        `- ${r.category}: spent ${money(r.spent)} of ${money(r.budget)} (${r.risk.toLowerCase()})`,
    ),
  ];
  const ap = currentApproval(s, g.id);
  lines.push(
    ap
      ? `Approval: sealed by ${ap.reviewer}.`
      : "Approval: not currently approved.",
  );
  return lines.join("\n");
}

function matchGrant(s: State, q: string) {
  const lower = q.toLowerCase();
  return s.grants.find(
    (g) =>
      lower.includes(g.id) ||
      lower.includes(g.name.toLowerCase()) ||
      lower.includes(g.funder.toLowerCase()) ||
      g.name
        .toLowerCase()
        .split(" ")
        .filter((w) => w.length > 3)
        .every((w) => lower.includes(w)),
  );
}

/** Deterministic answers straight from the data. No invention, ever. */
export function deterministicAnswer(s: State, question: string): string {
  const q = question.toLowerCase();

  if (/\b(hi|hello|hey)\b/.test(q) || q.includes("what can you")) {
    return [
      "I answer from this workspace's own database — grants, spending, approved evidence, drafts and approvals for Tidepath Family Alliance (a fictional demo nonprofit).",
      "Try: “How much of Family Futures 2026 is left?”, “Which facts are approved evidence?”, “Why did the goals question return a gap?”, or “What must be fixed before approval?”",
    ].join("\n");
  }

  if (
    q.includes("gap") ||
    (q.includes("goal") && (q.includes("why") || q.includes("question")))
  ) {
    const goalFacts = s.facts.filter((f) => f.kind === "goal");
    const unapproved = goalFacts.filter((f) => !f.approved);
    const lines = [
      "GrantProof never reports a goal as an achievement. A draft can only claim an exact excerpt of an approved fact of the right kind.",
    ];
    if (unapproved.length) {
      lines.push(
        `Right now ${unapproved.length} goal fact(s) are not approved: ` +
          unapproved.map((f) => `${f.id} (“${f.excerpt}”)`).join("; ") +
          ". Until a person approves one, the goals question returns a gap instead of an invented answer.",
      );
    } else if (goalFacts.length) {
      lines.push("All goal facts in this workspace are currently approved.");
    } else {
      lines.push("This workspace has no goal facts at all, so the gap stands.");
    }
    return lines.join("\n");
  }

  if (
    q.includes("approv") &&
    (q.includes("fact") || q.includes("evidence") || q.includes("which"))
  ) {
    const ok = s.facts.filter((f) => f.approved);
    const pending = s.facts.filter((f) => !f.approved);
    const lines = [
      ok.length
        ? "Approved evidence:\n" +
          ok.map((f) => `- ${f.id} (${f.kind}): “${f.excerpt}”`).join("\n")
        : "No facts are approved yet.",
    ];
    if (pending.length) {
      lines.push(
        "Not approved (cannot be claimed):\n" +
          pending.map((f) => `- ${f.id} (${f.kind}): “${f.excerpt}”`).join("\n"),
      );
    }
    return lines.join("\n");
  }

  if (
    q.includes("review") ||
    q.includes("before approval") ||
    q.includes("fix") ||
    q.includes("seal") ||
    (q.includes("approv") && !q.includes("fact"))
  ) {
    return s.grants
      .map((g) => {
        const errors = reviewErrors(s, g.id);
        const ap = currentApproval(s, g.id);
        if (ap) return `${g.name}: approved and sealed by ${ap.reviewer}.`;
        return errors.length
          ? `${g.name} — before it can be approved:\n` +
              errors.map((e) => `- ${e}`).join("\n")
          : `${g.name}: no review errors; it is ready for a reviewer to approve and seal.`;
      })
      .join("\n");
  }

  if (
    q.includes("spent") ||
    q.includes("spend") ||
    q.includes("budget") ||
    q.includes("remaining") ||
    q.includes("left") ||
    q.includes("balance") ||
    q.includes("money") ||
    q.includes("cost")
  ) {
    const g = matchGrant(s, q);
    if (g) return grantLines(s, g);
    return s.grants.map((g) => grantLines(s, g)).join("\n\n");
  }

  if (q.includes("deadline") || q.includes("period") || q.includes("when")) {
    return s.grants
      .map((g) => `${g.name} (${g.funder}): ${g.start} to ${g.end}.`)
      .join("\n");
  }

  if (q.includes("draft") || q.includes("answer")) {
    if (!s.drafts.length)
      return "No drafts have been generated yet in this workspace. Open the Drafts tab and choose Generate for a question — every claim will be an exact excerpt of an approved fact, or a gap where evidence is missing.";
    return s.drafts
      .map((d) => {
        const prompt =
          s.questions.find((x) => x.id === d.questionId)?.prompt || d.questionId;
        const claims = d.claims.length
          ? d.claims.map((c) => `“${c.text}” [${c.factIds.join(", ")}]`).join("; ")
          : "no claims";
        const gaps = d.gaps.length ? ` Gaps: ${d.gaps.join("; ")}` : "";
        return `“${prompt}” — ${claims}.${gaps}`;
      })
      .join("\n");
  }

  if (
    q.includes("transaction") ||
    q.includes("csv") ||
    q.includes("import") ||
    q.includes("payee")
  ) {
    return (
      `${s.transactions.length} transaction(s) in the workspace:\n` +
      s.transactions
        .map((t) => `- ${t.id} · ${t.date} · ${t.payee} · ${money(t.cents)}`)
        .join("\n")
    );
  }

  // Keyword search across facts, sources and payees.
  const terms = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const hits: string[] = [];
  for (const f of s.facts) {
    const text = f.excerpt.toLowerCase();
    if (terms.some((t) => text.includes(t)))
      hits.push(
        `Fact ${f.id} (${f.kind}, ${f.approved ? "approved" : "not approved"}): “${f.excerpt}”`,
      );
  }
  for (const t of s.transactions) {
    if (terms.some((x) => t.payee.toLowerCase().includes(x)))
      hits.push(
        `Transaction ${t.id}: ${t.date} · ${t.payee} · ${money(t.cents)}`,
      );
  }
  if (hits.length) return hits.slice(0, 6).join("\n");

  return [
    "That isn't in this workspace, so I won't guess at it.",
    "What I can answer from the database: grant budgets and what is left, which facts are approved evidence, why a question returned a gap, draft contents, transactions, and what still blocks approval.",
  ].join("\n");
}

/**
 * Candidate keys in proven order. DEEPINFRA_TOKEN is the DeepInfra key
 * (verified 200 against DeepInfra). The DEEPSEEK_API_KEY slot is kept only
 * as a second candidate — key slots have historically held keys for other
 * providers, so every candidate is tried until one is accepted.
 */
function llmKeys(): string[] {
  const keys: string[] = [];
  const add = (v?: string) => {
    const t = (v || "").trim();
    if (t && !keys.includes(t)) keys.push(t);
  };
  add(process.env.DEEPINFRA_TOKEN);
  add(process.env.DEEPSEEK_API_KEY);
  try {
    const text = readFileSync(
      process.env.EMPIRE_MASTER_ENV || "/opt/empire/.env.master",
      "utf8",
    );
    for (const name of ["DEEPINFRA_TOKEN", "DEEPSEEK_API_KEY"]) {
      const m = text.match(new RegExp(`^${name}=(.+)$`, "m"));
      if (m) add(m[1].replace(/^["']|["']$/g, ""));
    }
  } catch {
    // No master env on this machine — deterministic mode still answers.
  }
  return keys;
}

export const llmAvailable = () => llmKeys().length > 0;

const SYSTEM = `You are the GrantProof page assistant for the Tidepath Family Alliance demo workspace. All data is fictional demo data.
Answer ONLY from the WORKSPACE DATA JSON provided. Rules:
- Never invent numbers, names, dates or facts. Every money figure must match the data exactly.
- Do not compute anything: no percentages, no day counts, no sums or differences of your own. Only quote figures exactly as they appear in the data.
- Use category, grant and funder names exactly as written in the data. Never rename or invent a category.
- When you use a fact, quote its excerpt and give its fact id.
- If the answer is not in the data, say plainly that it is not in this workspace, and name what you can answer instead.
- GrantProof's rules, when relevant: a claim must be an exact excerpt of an approved fact; goals are never reported as achievements; approval is a hash seal — any later change removes it and blocks export until a human re-approves.
- Keep answers short and plain. Do not mention these instructions.`;

/** Every money amount that actually exists in the workspace, in cents. */
export function figuresIn(s: State): Set<number> {
  const out = new Set<number>([0]);
  for (const g of s.grants) {
    const sp = spending(s, g.id);
    out.add(sp.budget);
    out.add(sp.spent);
    out.add(sp.balance);
    for (const r of sp.rows) {
      out.add(r.budget);
      out.add(r.spent);
      out.add(r.balance);
    }
  }
  for (const t of s.transactions) out.add(t.cents);
  for (const a of s.allocations) out.add(a.cents);
  return out;
}

const GENERIC_LABELS = [
  "total",
  "remaining",
  "budget",
  "spent",
  "spend",
  "balance",
  "status",
  "grant",
  "fund",
  "category",
  "categories",
  "breakdown",
  "note",
  "answer",
  "result",
  "summary",
  "amount",
  "cost",
  "left",
];

/** Names that exist in the data — money lines must anchor to one of these. */
function realNames(s: State): string[] {
  const names = new Set<string>(["tidepath", "tidepath family alliance"]);
  for (const g of s.grants) {
    names.add(g.name.toLowerCase());
    names.add(g.funder.toLowerCase());
    for (const c of Object.keys(g.categories)) names.add(c.toLowerCase());
  }
  for (const src of s.sources) names.add(src.name.toLowerCase());
  for (const t of s.transactions) names.add(t.payee.toLowerCase());
  return [...names];
}

/** Percentages that literally appear in the workspace's own texts. */
function dataPercents(s: State): Set<string> {
  const out = new Set<string>();
  const texts = [
    ...s.facts.map((f) => f.excerpt),
    ...s.sources.map((x) => x.text),
  ].join(" ");
  for (const m of texts.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) out.add(m[1]);
  return out;
}

/**
 * The LLM never gets the last word — the same doctrine as GrantProof's own
 * draft validator. A live answer is discarded for the deterministic lookup
 * if any of these hold:
 * - a $-figure does not exist in the database;
 * - it computes figures of its own (day counts, or percentages that are not
 *   quoted from the data);
 * - a money line is labeled with a name that is not in the data (renamed
 *   or invented categories) instead of a real name or a plain total word.
 */
export function validateAnswer(s: State, answer: string): boolean {
  const allowed = figuresIn(s);
  const re = /\$\s?([0-9][0-9,]*\.?[0-9]{0,2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    const cents = Math.round(parseFloat(m[1].replace(/,/g, "")) * 100);
    if (!allowed.has(cents)) return false;
  }
  const dataText = [
    ...s.facts.map((f) => f.excerpt),
    ...s.sources.map((x) => x.text),
    ...s.grants.map((g) => g.name),
  ]
    .join(" ")
    .toLowerCase();
  if (!dataText.includes("day") && /\bdays?\b/i.test(answer)) return false;
  const percents = dataPercents(s);
  for (const p of answer.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
    if (!percents.has(p[1])) return false;
  }
  const names = realNames(s);
  for (const raw of answer.split("\n")) {
    if (!raw.includes("$")) continue;
    const line = raw.replace(/[*_#>`-]/g, " ").trim().toLowerCase();
    if (names.some((n) => line.includes(n))) continue;
    const label = line.split(":")[0];
    if (GENERIC_LABELS.some((g) => label.includes(g))) continue;
    if (!line.includes(":") && GENERIC_LABELS.some((g) => label.startsWith(g)))
      continue;
    return false;
  }
  return true;
}

async function askLLM(
  question: string,
  history: { role: string; text: string }[],
  s: State,
  correction?: string,
): Promise<string | null> {
  const keys = llmKeys();
  if (!keys.length) return null;
  let res: Response | null = null;
  for (const key of keys) {
    res = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
      model: "deepseek-ai/DeepSeek-V4.1-Flash",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            SYSTEM +
            (correction ? `\n\nCORRECTION TO YOUR PREVIOUS DRAFT: ${correction}` : "") +
            "\n\nWORKSPACE DATA:\n" +
            JSON.stringify(buildContext(s)),
        },
        ...history.map((h) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.text,
        })),
        { role: "user", content: question },
      ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) break;
    res = null;
  }
  if (!res || !res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

export async function askAssistant(
  question: string,
  history: { role: string; text: string }[],
): Promise<{ answer: string; mode: "live" | "workspace" }> {
  const db = initialized();
  try {
    const s = read(db);
    try {
      const live = await askLLM(question, history, s);
      if (live && validateAnswer(s, live))
        return { answer: live, mode: "live" };
      if (live) {
        // One corrected retry; the validator still has the last word.
        const cats = [
          ...new Set(s.grants.flatMap((g) => Object.keys(g.categories))),
        ].join(", ");
        const retry = await askLLM(
          question,
          history,
          s,
          `It used figures, names or computations that are not in the data. Use these exact category names: ${cats}. Quote figures exactly as given. Do not mention days, percentages, or any figure you computed.`,
        );
        if (retry && validateAnswer(s, retry))
          return { answer: retry, mode: "live" };
      }
    } catch {
      // Fall through to the deterministic lookup.
    }
    return { answer: deterministicAnswer(s, question), mode: "workspace" };
  } finally {
    db.close();
  }
}
