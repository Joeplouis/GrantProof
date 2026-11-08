import type { Approval } from "./store";
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export function reportHTML(a: Approval) {
  const s = a.snapshot;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GrantProof · ${esc(s.grant.name)}</title><style>body{font:14px/1.7 Arial,sans-serif;color:#213a2e;max-width:900px;margin:50px auto;padding:0 25px}h1{font-size:30px;margin-bottom:5px}h2{font-size:20px;border-bottom:1px solid #dde5d6;padding-bottom:8px;margin-top:35px}h3{font-size:15px;margin-bottom:5px}small,footer{color:#74846a;font-size:11px}.label{color:#64824e;font-size:11px;letter-spacing:1px}table{border-collapse:collapse;width:100%;margin:20px 0}td,th{text-align:left;border-bottom:1px solid #dce5d4;padding:10px;font-size:12px}th{background:#f0f5e9}blockquote{border-left:3px solid #b2c99e;padding-left:18px;margin-left:0}code{font-size:10px;overflow-wrap:anywhere}a{color:#447b35}footer{margin-top:40px;border-top:1px solid #dce5d4;padding-top:20px}.note{background:#f1f5eb;padding:15px}@media print{body{margin:0;max-width:none}h2,h3{break-after:avoid}tr,blockquote{break-inside:avoid}}</style></head><body><div class="label">GRANTPROOF · APPROVED SNAPSHOT · FICTIONAL DEMO</div><h1>${esc(s.grant.name)}</h1><p>${esc(s.grant.funder)}<br>Reporting period: ${esc(s.grant.start)} through ${esc(s.grant.end)} (inclusive)</p><p class="note">Approved by ${esc(a.reviewer)} on ${esc(a.at)}. This download reproduces the approved snapshot. It does not submit anything to a funder.</p><h2>Application answers</h2>${s.questions
    .map((q) => {
      const d = s.drafts.find((d) => d.questionId === q.id)!;
      return `<h3>${esc(q.prompt)}</h3><small>Version ${d.version} · ${esc(d.mode)} · ${q.limit}-word limit</small>${d.claims.map((c) => `<p>${esc(c.text)} ${c.factIds.map((fid) => `<a href="#fact-${esc(fid)}">[${s.facts.findIndex((f) => f.id === fid) + 1}]</a>`).join(" ")}</p>`).join("")}`;
    })
    .join(
      "",
    )}<h2>Financial report</h2><table><thead><tr><th>Category</th><th>Budget</th><th>Spending</th><th>Remaining</th></tr></thead><tbody>${s.report.rows.map((r) => `<tr><td>${esc(r.category)}</td><td>${money(r.budget)}</td><td>${money(r.spent)}</td><td>${money(r.balance)}</td></tr>`).join("")}<tr><th>Total</th><th>${money(s.report.budget)}</th><th>${money(s.report.spent)}</th><th>${money(s.report.balance)}</th></tr></tbody></table><small>Spend-by date: ${esc(s.grant.end)}. All arithmetic uses integer cents. CSV import is not a direct QuickBooks integration.</small><h2>Evidence references</h2>${s.facts
    .map((f, i) => {
      const src = s.sources.find((x) => x.id === f.sourceId)!;
      return `<section id="fact-${esc(f.id)}"><h3>[${i + 1}] ${esc(src.name)} · ${esc(f.location)}</h3><blockquote>${esc(f.excerpt)}</blockquote><small>Staff-approved ${esc(f.kind)} · ${esc(src.periodStart)} — ${esc(src.periodEnd)} · fact <code>${esc(f.id)}</code></small></section>`;
    })
    .join(
      "",
    )}<h2>Financial source ledger</h2><table><thead><tr><th>Transaction</th><th>Date</th><th>Payee</th><th>Amount</th><th>Allocated to this grant</th></tr></thead><tbody>${s.transactions.map((t) => `<tr><td>${esc(t.id)}</td><td>${esc(t.date)}</td><td>${esc(t.payee)}</td><td>${money(t.cents)}</td><td>${money(s.allocations.filter((x) => x.transactionId === t.id).reduce((n, x) => n + x.cents, 0))}</td></tr>`).join("")}</tbody></table><footer>Approval ID: <code>${esc(a.id)}</code><br>Snapshot SHA-256: <code>${esc(a.hash)}</code><br>Fictional nonprofit data. Hackathon prototype. Staff must review and submit through the funder’s portal.</footer></body></html>`;
}
