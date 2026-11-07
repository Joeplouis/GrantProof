"use client";
import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import Modal from "@/components/Modal";
import type { State, Fact, Claim } from "@/lib/store";
type Report = {
  grantId: string;
  start: string;
  end: string;
  budget: number;
  spent: number;
  balance: number;
  rows: {
    category: string;
    budget: number;
    spent: number;
    balance: number;
    risk: string;
  }[];
};
type Workspace = State & {
  reports: Report[];
  currentApprovals: State["approvals"];
  reviewErrors: Record<string, string[]>;
  draftErrors: Record<string, string[]>;
  liveAvailable: boolean;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n / 100);
const count = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const tabs = [
  ["dashboard", "00", "Dashboard", "▦"],
  ["evidence", "01", "Evidence library", "▤"],
  ["application", "02", "Application workspace", "✎"],
  ["spending", "03", "Grant spending", "▥"],
  ["review", "04", "Review & export", "✓"],
];
export default function Home() {
  const [data, setData] = useState<Workspace>();
  const [tab, setTab] = useState("application");
  const [grant, setGrant] = useState("g1");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState<Fact>();
  const [live, setLive] = useState(false);
  const [edit, setEdit] = useState<{ id: string; claims: Claim[] }>();
  const [showImport, setShowImport] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [factFilter, setFactFilter] = useState("all");
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  async function readImportFile(
    input: HTMLInputElement,
    kind: "source" | "csv",
  ) {
    const file = input.files?.[0];
    if (!file) return;
    const form = input.form;
    if (!form) return;
    setReadingFile(true);
    try {
      const valid =
        kind === "source"
          ? /\.(txt|md)$/i.test(file.name)
          : /\.csv$/i.test(file.name);
      if (!valid)
        throw Error(
          kind === "source"
            ? "Choose a .txt or .md source file."
            : "Choose a .csv spending file.",
        );
      const limit = kind === "source" ? 100000 : 1000000;
      if (file.size > limit * 4)
        throw Error("This file is too large. Import a smaller text file.");
      const text = await file.text();
      if (text.length > limit)
        throw Error(
          `File exceeds the ${limit.toLocaleString()}-character import limit.`,
        );
      if (!text.trim())
        throw Error(
          "This file is empty. Choose a file with records to review.",
        );
      (
        form.elements.namedItem(
          kind === "source" ? "text" : "csv",
        ) as HTMLTextAreaElement
      ).value = text;
      if (kind === "source")
        (form.elements.namedItem("name") as HTMLInputElement).value = file.name;
      setNoticeError(false);
      setNotice(
        `${file.name} loaded for preview. Review it below, then import.`,
      );
    } catch (error) {
      input.value = "";
      setNoticeError(true);
      setNotice(
        error instanceof Error
          ? error.message
          : "This file could not be read. You can paste its text instead.",
      );
    } finally {
      setReadingFile(false);
    }
  }
  async function loadWorkspace() {
    setLoadError("");
    try {
      const r = await fetch("/api/workspace");
      if (!r.ok) throw Error(`Workspace could not be loaded (${r.status}).`);
      setData(await r.json());
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Workspace could not be loaded.",
      );
    }
  }
  useEffect(() => {
    void loadWorkspace();
  }, []);
  useEffect(() => {
    const restoreScreen = () => {
      const screen = window.location.hash.slice(1);
      if (tabs.some(([key]) => key === screen)) {
        setTab(screen);
        setShowImport(false);
        setEvidence(undefined);
        setEdit(undefined);
      }
    };
    restoreScreen();
    window.addEventListener("popstate", restoreScreen);
    window.addEventListener("hashchange", restoreScreen);
    return () => {
      window.removeEventListener("popstate", restoreScreen);
      window.removeEventListener("hashchange", restoreScreen);
    };
  }, []);
  function navigate(screen: string) {
    setTab(screen);
    if (window.location.hash !== "#" + screen)
      window.history.pushState(null, "", "#" + screen);
    setShowImport(false);
    setEvidence(undefined);
    setEdit(undefined);
  }
  async function checkExport() {
    setBusy(true);
    try {
      const response = await fetch(
        "/api/export?grant=" + encodeURIComponent(grant),
      );
      if (!response.ok) {
        const body = await response.json();
        throw Error(body.error || "Staff approval is required before export.");
      }
      setNoticeError(false);
      setNotice(
        "An approved export is available. Refresh the workspace to see the current download links.",
      );
      await loadWorkspace();
    } catch (error) {
      setNoticeError(true);
      setNotice(
        "Export blocked: " +
          (error instanceof Error
            ? error.message
            : "Staff approval is required."),
      );
    } finally {
      setBusy(false);
    }
  }
  async function act(body: unknown) {
    setBusy(true);
    try {
      const r = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setNoticeError(false);
      setNotice(d.message);
      return true;
    } catch (e) {
      setNoticeError(true);
      setNotice(e instanceof Error ? e.message : "Request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="loading">
        <div className="brandmark">G</div>
        <h1>
          {loadError
            ? "Your workspace could not be opened."
            : "Opening your workspace…"}
        </h1>
        {loadError && (
          <>
            <p role="alert">{loadError}</p>
            <button className="primary" onClick={() => void loadWorkspace()}>
              Retry loading workspace
            </button>
          </>
        )}
        <p>GrantProof · local fictional demo</p>
      </main>
    );
  const g = data.grants.find((g) => g.id === grant)!;
  const report = data.reports.find((r) => r.grantId === grant)!;
  const questions = data.questions.filter((q) => q.grantId === grant);
  const approved = data.facts.filter((f) => f.approved).length;
  const sourceFitsGrant = (source: State["sources"][number]) =>
    source.periodStart >= g.start && source.periodEnd <= g.end;
  const grantFacts = data.facts.filter((f) => {
    const source = data.sources.find((source) => source.id === f.sourceId);
    return source && sourceFitsGrant(source);
  });
  const approvedForGrant = grantFacts.filter((f) => f.approved).length;
  const filteredSources = data.sources
    .map((source) => ({
      ...source,
      visibleFacts: data.facts.filter(
        (f) =>
          f.sourceId === source.id &&
          (factFilter === "all" ||
            (factFilter === "approved" ? f.approved : !f.approved)) &&
          (!evidenceSearch ||
            `${source.name} ${f.excerpt}`
              .toLowerCase()
              .includes(evidenceSearch.toLowerCase())),
      ),
    }))
    .filter((source) => source.visibleFacts.length > 0);

  const current = data.currentApprovals.find((a) => a.grantId === grant);
  const errors = data.reviewErrors[grant];
  return (
    <div className="shell">
      <aside>
        <a
          href="#dashboard"
          className="brand"
          onClick={() => navigate("dashboard")}
        >
          <span className="brandmark">
            G<span>✓</span>
          </span>
          GrantProof<span className="beta">BETA</span>
        </a>
        <div className="org">
          <span className="org-icon">T</span>
          <div>
            <strong>Tidepath Family Alliance</strong>
            <small>Nonprofit workspace</small>
          </div>
        </div>
        <p className="navlabel">YOUR WORKSPACE</p>
        <nav>
          {tabs.map(([key, num, label, icon]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              aria-current={tab === key ? "page" : undefined}
              title={label}
              className={tab === key ? "active" : ""}
            >
              <span className="navicon">{icon}</span>
              {label}
              <small>{num}</small>
            </button>
          ))}
        </nav>
        <div className="sidecard">
          <span className="spark">✧</span>
          <strong>Confidence, built in.</strong>
          <p>From your own records to a report you can stand behind.</p>
          <div>
            <i />
            Local data · staff in control
          </div>
        </div>
        <div className="profile">
          <span>JD</span>
          <div>
            <strong>Jamie Davis</strong>
            <small>Demo director</small>
          </div>
          <span>⌄</span>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="slash">/</span>
            {tabs.find((t) => t[0] === tab)?.[2]}
          </div>
          <span className="demo-pill">
            <i />
            Fictional demo data
          </span>
        </header>
        <main>
          <div className="page-top">
            <div>
              <div className="eyebrow">LESS PAPERWORK. MORE POSSIBILITY.</div>
              <h1>
                {tab === "dashboard"
                  ? "A clear view of your grant."
                  : tab === "application"
                    ? "Your impact, backed by evidence."
                    : tab === "evidence"
                      ? "Good answers start here."
                      : tab === "spending"
                        ? "Every dollar, accounted for."
                        : "Ready for a human sign-off."}
              </h1>
              <p className="subtitle">
                {tab === "dashboard"
                  ? "Arrange your workspace around what needs attention today."
                  : tab === "application"
                    ? "Turn approved facts into funder-ready answers. Keep the source close."
                    : tab === "evidence"
                      ? "One trusted home for the facts behind your applications."
                      : tab === "spending"
                        ? "Keep QuickBooks. Reconcile your CSV against the funder’s rules."
                        : "Review the application and financial report as one versioned package."}
              </p>
            </div>
            <span className="privacy">♧ &nbsp; Local-first workspace</span>
          </div>
          <div className="grantbar">
            <div className="granticon">▧</div>
            <div>
              <span className="small-label">CURRENT GRANT</span>
              <select
                aria-label="Current grant"
                value={grant}
                onChange={(e) => {
                  setGrant(e.target.value);
                  setShowImport(false);
                  setEvidence(undefined);
                  setEdit(undefined);
                  setNotice("");
                }}
                disabled={busy}
              >
                {data.grants.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grant-funder">
              {g.funder}
              <small>
                {g.start} → {g.end}
              </small>
            </div>
            <span className="tag neutral">
              {current ? "Approved snapshot" : "In preparation"}
            </span>
          </div>
          {notice && (
            <div
              className={"notice" + (noticeError ? " notice-error" : "")}
              role={noticeError ? "alert" : "status"}
            >
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {tab === "dashboard" && (
            <Dashboard
              approvedFacts={approvedForGrant}
              pendingFacts={grantFacts.length - approvedForGrant}
              answersReady={
                questions.filter((q) => {
                  const d = data.drafts.find((d) => d.questionId === q.id);
                  return d && !(data.draftErrors[d.id] || d.gaps).length;
                }).length
              }
              questionCount={questions.length}
              spending={{ ...report, end: g.end }}
              approved={!!current}
              blockers={errors}
              navigate={navigate}
            />
          )}
          {tab === "evidence" && (
            <>
              <div className="stats">
                <Stat
                  label="Source documents"
                  value={String(data.sources.length)}
                  detail="Your organization’s records"
                />
                <Stat
                  label="Approved facts"
                  value={String(approved)}
                  detail="Available for grounded drafting"
                />
                <Stat
                  label="Awaiting review"
                  value={String(data.facts.length - approved)}
                  detail="Excluded from all draft answers"
                />
              </div>
              <div className="sectionhead">
                <div>
                  <h2>Evidence library</h2>
                  <p>
                    Review each excerpt and its applicable period before
                    approval.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => setShowImport(!showImport)}
                >
                  ＋ Import source
                </button>
              </div>
              {showImport && (
                <form
                  className="card importform"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    if (
                      await act({
                        action: "source",
                        name: f.get("name"),
                        text: f.get("text"),
                        start: f.get("start"),
                        end: f.get("end"),
                      })
                    ) {
                      setShowImport(false);
                      setFactFilter("pending");
                      setEvidenceSearch("");
                    }
                  }}
                >
                  <h3>Add a text source</h3>
                  <p>
                    Each nonempty line becomes a candidate fact. Document text
                    is treated as data, never instructions.
                  </p>
                  <label>
                    Document name
                    <input
                      name="name"
                      required
                      placeholder="2026 program report.txt"
                    />
                  </label>
                  <div className="two">
                    <label>
                      Period start
                      <input
                        type="date"
                        name="start"
                        required
                        defaultValue={g.start}
                      />
                    </label>
                    <label>
                      Period end
                      <input
                        type="date"
                        name="end"
                        required
                        defaultValue={g.end}
                      />
                    </label>
                  </div>
                  <label>
                    Upload plain text
                    <input
                      type="file"
                      accept=".txt,.md,text/plain"
                      disabled={readingFile || busy}
                      onChange={(e) =>
                        void readImportFile(e.currentTarget, "source")
                      }
                    />
                  </label>
                  <label>
                    Source text
                    <textarea
                      name="text"
                      required
                      rows={5}
                      placeholder="Paste fictional program records, one fact per line…"
                    />
                  </label>
                  <button className="primary" disabled={busy || readingFile}>
                    {readingFile
                      ? "Reading source…"
                      : "Extract candidate facts"}
                  </button>
                </form>
              )}
              <div className="evidence-toolbar">
                <label className="evidence-search">
                  Search evidence
                  <input
                    type="search"
                    value={evidenceSearch}
                    onChange={(e) => setEvidenceSearch(e.target.value)}
                    placeholder="Search excerpts or source names…"
                  />
                </label>
                <div
                  className="fact-filters"
                  role="group"
                  aria-label="Evidence status"
                >
                  {[
                    ["all", "All facts"],
                    ["approved", "Approved only"],
                    ["pending", "Needs review"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={factFilter === value ? "selected" : ""}
                      aria-pressed={factFilter === value}
                      onClick={() => setFactFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="period-hint">
                {approvedForGrant} approved fact
                {approvedForGrant === 1 ? "" : "s"} fall within {g.name}’s
                reporting period. Sources outside it stay in your library for
                other grants.
              </p>
              {!filteredSources.length && (
                <div className="card empty-evidence">
                  <h3>No matching evidence.</h3>
                  <p>
                    Try another search or status, or import a source for this
                    grant.
                  </p>
                  <button
                    className="textbutton"
                    onClick={() => {
                      setEvidenceSearch("");
                      setFactFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              {filteredSources.map((src) => (
                <section className="card sourcecard" key={src.id}>
                  <div className="sourcehead">
                    <div className="docicon">▤</div>
                    <div>
                      <h3>{src.name}</h3>
                      <p>
                        {src.periodStart} — {src.periodEnd} ·{" "}
                        {data.facts.filter((f) => f.sourceId === src.id).length}{" "}
                        candidate facts
                      </p>
                    </div>
                    <span
                      className={
                        "tag " + (sourceFitsGrant(src) ? "good" : "warning")
                      }
                    >
                      {sourceFitsGrant(src)
                        ? "Within grant period"
                        : "Outside this grant period"}
                    </span>
                  </div>
                  {src.visibleFacts.map((f) => (
                    <div className="factrow" key={f.id}>
                      <div>
                        <div className="factmeta">
                          <span
                            className={
                              "tag " + (f.approved ? "good" : "warning")
                            }
                          >
                            {f.approved ? "✓ Approved" : "◷ Pending review"}
                          </span>
                          <small>{f.location}</small>
                        </div>
                        <p>{f.excerpt}</p>
                        <code>{f.id.slice(0, 12)}</code>
                      </div>
                      <div className="factactions">
                        <select
                          aria-label={"Fact type " + f.id}
                          value={f.kind}
                          onChange={(e) =>
                            act({
                              action: "fact",
                              id: f.id,
                              kind: e.target.value,
                              approved: false,
                            })
                          }
                        >
                          <option value="achieved">Achieved outcome</option>
                          <option value="goal">Future goal</option>
                        </select>
                        <button
                          className={f.approved ? "textbutton" : "secondary"}
                          disabled={busy}
                          onClick={() =>
                            act({
                              action: "fact",
                              id: f.id,
                              approved: !f.approved,
                            })
                          }
                        >
                          {f.approved ? "Revoke approval" : "Approve fact"}
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </>
          )}
          {tab === "evidence" && (
            <div className="workflow-next">
              <div>
                <strong>Evidence reviewed?</strong>
                <p>
                  Prepare the answers for {g.name}, using only approved facts
                  within its period.
                </p>
              </div>
              <button
                className="primary"
                onClick={() => navigate("application")}
              >
                Continue to answers →
              </button>
            </div>
          )}
          {tab === "spending" && (
            <div className="workflow-next">
              <div>
                <strong>Numbers reconciled?</strong>
                <p>
                  Review the application and financial report together before
                  approving.
                </p>
              </div>
              <button className="primary" onClick={() => navigate("review")}>
                Continue to staff review →
              </button>
            </div>
          )}
          {tab === "application" && (
            <>
              <div className="stats">
                <Stat
                  label="Approved evidence"
                  value={String(approvedForGrant)}
                  detail="Staff-reviewed facts within this grant period"
                />
                <Stat
                  label="Application answers"
                  value={`${data.drafts.filter((d) => questions.some((q) => q.id === d.questionId)).length} / ${questions.length}`}
                  detail="Every answer keeps its references"
                />
                <Stat
                  label="Human review"
                  value={current ? "Approved" : "Required"}
                  detail="Nothing leaves without your sign-off"
                />
              </div>
              <div className="application-layout">
                <div>
                  <div className="sectionhead">
                    <div>
                      <h2>
                        Application answers{" "}
                        <span className="countbadge">{questions.length}</span>
                      </h2>
                      <p>
                        Your words. Your records. A clear trail between them.
                      </p>
                    </div>
                  </div>
                  {questions.map((q, i) => {
                    const d = data.drafts.find((d) => d.questionId === q.id);
                    const issues = d ? data.draftErrors[d.id] || d.gaps : [];
                    return (
                      <section className="card answercard" key={q.id}>
                        <div className="answerhead">
                          <span className="question-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3>{q.prompt}</h3>
                            <p>
                              {q.limit} words maximum ·{" "}
                              {q.kind === "achieved"
                                ? "Achieved outcomes only"
                                : "Future goals only"}
                            </p>
                          </div>
                          {d && (
                            <span className="tag neutral">v{d.version}</span>
                          )}
                        </div>
                        {d ? (
                          <>
                            <div className="draftcontent">
                              {d.claims.map((c, j) => (
                                <p key={j}>
                                  {c.text}{" "}
                                  {c.factIds.map((fid) => (
                                    <button
                                      key={fid}
                                      className="citation"
                                      title="View claim evidence"
                                      onClick={() =>
                                        setEvidence(
                                          data.facts.find((f) => f.id === fid),
                                        )
                                      }
                                    >
                                      [
                                      {data.facts.findIndex(
                                        (f) => f.id === fid,
                                      ) + 1}
                                      ]
                                    </button>
                                  ))}
                                </p>
                              ))}
                              {issues.map((gap, j) => (
                                <div className="gap" key={j}>
                                  <strong>Evidence gap</strong>
                                  <p>{gap}</p>
                                  <button
                                    className="textbutton"
                                    onClick={() => navigate("evidence")}
                                  >
                                    Review supporting records →
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="answerfoot">
                              <span className="evidencecheck">
                                {issues.length
                                  ? "◷ Needs evidence"
                                  : "✓ Sources linked"}{" "}
                                <small>
                                  ·{" "}
                                  {count(d.claims.map((c) => c.text).join(" "))}
                                  /{q.limit} words
                                </small>
                              </span>
                              <button
                                className="textbutton"
                                onClick={() =>
                                  setEdit({
                                    id: d.id,
                                    claims: structuredClone(d.claims),
                                  })
                                }
                              >
                                Edit answer
                              </button>
                              <button
                                className="textbutton"
                                disabled={busy}
                                onClick={() =>
                                  act({ action: "generate", id: q.id, live })
                                }
                              >
                                ↻ Regenerate
                              </button>
                            </div>
                            <div className="mode-caption">
                              {d.mode} · Staff approval required
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="emptyanswer">
                              <span>✧</span>
                              <p>
                                A strong answer starts with approved evidence.
                              </p>
                              <small>
                                Only facts matching the grant period and outcome
                                type can be used.
                              </small>
                            </div>
                            <div className="answerfoot">
                              <span className="tag neutral">Not started</span>
                              <button
                                className="primary"
                                disabled={busy}
                                onClick={() =>
                                  act({ action: "generate", id: q.id, live })
                                }
                              >
                                ✧ Generate sourced answer
                              </button>
                            </div>
                          </>
                        )}
                      </section>
                    );
                  })}
                </div>
                <div className="contextcolumn">
                  <div className="card guidecard">
                    <div className="circleicon">✧</div>
                    <h3>A source behind every claim.</h3>
                    <p>
                      GrantProof builds from staff-approved records. Click a
                      numbered citation to inspect the original excerpt.
                    </p>
                    <div className="guideitem">
                      <span>✓</span>
                      <div>
                        <strong>Approved facts only</strong>
                        <small>Pending facts stay out of drafts.</small>
                      </div>
                    </div>
                    <div className="guideitem">
                      <span>▣</span>
                      <div>
                        <strong>The right period</strong>
                        <small>Funder dates guide every answer.</small>
                      </div>
                    </div>
                    <div className="guideitem">
                      <span>◷</span>
                      <div>
                        <strong>Gaps stay visible</strong>
                        <small>No evidence? We say so.</small>
                      </div>
                    </div>
                  </div>
                  <div className="card modecard">
                    <span className="small-label">GENERATION MODE</span>
                    <strong>
                      {live ? "Live OpenAI" : "Deterministic fixture"}
                    </strong>
                    <p>
                      {data.liveAvailable
                        ? "Authorized API credential detected on server."
                        : "No API credential configured. Sample generation uses exact approved excerpts."}
                    </p>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={live}
                        disabled={!data.liveAvailable}
                        onChange={(e) => setLive(e.target.checked)}
                      />
                      Use OpenAI Agents SDK
                    </label>
                    <small>No autonomous approval or submission.</small>
                  </div>
                  <div className="nextstep">
                    <span>UP NEXT</span>
                    <h3>Check the numbers.</h3>
                    <p>Your grant report uses the same funder period.</p>
                    <button
                      className="textbutton"
                      onClick={() => navigate("spending")}
                    >
                      Open grant spending →
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {tab === "spending" && (
            <>
              <div className="stats">
                <Stat
                  label="Grant budget"
                  value={money(report.budget)}
                  detail={`Spend by ${g.end}`}
                />
                <Stat
                  label="Allocated spending"
                  value={money(report.spent)}
                  detail="Within the funder’s reporting dates"
                />
                <Stat
                  label="Remaining balance"
                  value={money(report.balance)}
                  detail={`${Math.round((report.spent / report.budget) * 100)}% of award used`}
                />
              </div>
              <div className="sectionhead">
                <div>
                  <h2>Category reconciliation</h2>
                  <p>
                    Inclusive reporting period: {g.start} through {g.end}
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setShowImport(!showImport)}
                >
                  ↑ Import CSV
                </button>
              </div>
              {showImport && (
                <form
                  className="card importform"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await act({ action: "csv", text: f.get("csv") });
                  }}
                >
                  <h3>Import a QuickBooks-style CSV</h3>
                  <p>
                    File import only. No direct QuickBooks connection. Existing
                    IDs and matching date/payee/amount rows are skipped.
                  </p>
                  <input
                    aria-label="CSV file"
                    type="file"
                    accept=".csv,text/csv"
                    disabled={readingFile || busy}
                    onChange={(e) =>
                      void readImportFile(e.currentTarget, "csv")
                    }
                  />
                  <textarea
                    aria-label="CSV contents"
                    name="csv"
                    rows={5}
                    required
                    placeholder={
                      "id,date,payee,amount\nNEW1,2026-09-01,Family supplies,100.00"
                    }
                  />
                  <button className="primary" disabled={busy || readingFile}>
                    {readingFile ? "Reading CSV…" : "Validate & import"}
                  </button>
                </form>
              )}
              <div className="card tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Grant category</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.category}>
                        <td>
                          <strong>{r.category}</strong>
                          <div className="progress">
                            <span
                              style={{
                                width:
                                  Math.min(100, (r.spent / r.budget) * 100) +
                                  "%",
                              }}
                            />
                          </div>
                        </td>
                        <td>{money(r.budget)}</td>
                        <td>{money(r.spent)}</td>
                        <td>{money(r.balance)}</td>
                        <td>
                          <span
                            className={
                              "tag " +
                              (r.risk === "On track" ? "good" : "warning")
                            }
                          >
                            {r.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td>{money(report.budget)}</td>
                      <td>{money(report.spent)}</td>
                      <td>{money(report.balance)}</td>
                      <td>✓ Reconciled</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="sectionhead">
                <div>
                  <h2>Transaction ledger</h2>
                  <p>
                    Allocate each expense once. Cross-grant allocations cannot
                    exceed its amount.
                  </p>
                </div>
                <span className="tag neutral">
                  Sample CSV · {data.transactions.length} records
                </span>
              </div>
              <div className="card ledger">
                {data.transactions.map((t) => {
                  const allocations = data.allocations.filter(
                    (a) => a.transactionId === t.id,
                  );
                  const remaining =
                    t.cents - allocations.reduce((n, a) => n + a.cents, 0);
                  const outside = t.date < g.start || t.date > g.end;
                  return (
                    <div className="transaction" key={t.id}>
                      <div className="txicon">↗</div>
                      <div className="txmain">
                        <strong>{t.payee}</strong>
                        <small>
                          {t.date} · {t.id}
                        </small>
                        <div className="allocationlist">
                          {allocations.map((a) => (
                            <span key={a.id} className="tag neutral">
                              {
                                data.grants.find((g) => g.id === a.grantId)
                                  ?.name
                              }{" "}
                              · {a.category} · {money(a.cents)}{" "}
                              <button
                                aria-label={"Remove allocation " + a.id}
                                onClick={() =>
                                  act({ action: "unallocate", id: a.id })
                                }
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="txamount">
                        <strong>{money(t.cents)}</strong>
                        <span
                          className={
                            "tag " +
                            (outside
                              ? "neutral"
                              : remaining
                                ? "warning"
                                : "good")
                          }
                        >
                          {outside
                            ? "Outside this period"
                            : remaining
                              ? `${money(remaining)} unallocated`
                              : "✓ Fully allocated"}
                        </span>
                      </div>
                      {!outside && remaining > 0 && (
                        <form
                          className="allocationform"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            const str = String(f.get("amount"));
                            const [d, c = ""] = str.split(".");
                            await act({
                              action: "allocate",
                              transactionId: t.id,
                              grantId: grant,
                              category: f.get("category"),
                              cents: Number(d) * 100 + Number(c.padEnd(2, "0")),
                            });
                          }}
                        >
                          <select
                            aria-label={"Category for " + t.id}
                            name="category"
                          >
                            {Object.keys(g.categories).map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <input
                            key={remaining}
                            aria-label={"Allocation amount for " + t.id}
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={remaining / 100}
                            defaultValue={remaining / 100}
                          />
                          <button className="secondary" disabled={busy}>
                            Allocate
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {tab === "review" && (
            <>
              <div className="reviewlayout">
                <div>
                  <section className="card reviewcard">
                    <div className="sectionhead">
                      <div>
                        <span className="small-label">
                          APPLICATION & FINANCIAL REPORT
                        </span>
                        <h2>{g.name}</h2>
                      </div>
                      <span className={"tag " + (current ? "good" : "warning")}>
                        {current ? "✓ Approved" : "Review required"}
                      </span>
                    </div>
                    {questions.map((q) => {
                      const d = data.drafts.find((d) => d.questionId === q.id);
                      return (
                        <div className="reviewanswer" key={q.id}>
                          <h3>{q.prompt}</h3>
                          {d ? (
                            <>
                              <small>
                                Version {d.version} · {d.mode}
                              </small>
                              {d.claims.map((c, i) => (
                                <p key={i}>
                                  {c.text}{" "}
                                  {c.factIds.map((fid) => (
                                    <button
                                      key={fid}
                                      className="citation"
                                      onClick={() =>
                                        setEvidence(
                                          data.facts.find((f) => f.id === fid),
                                        )
                                      }
                                    >
                                      [
                                      {data.facts.findIndex(
                                        (f) => f.id === fid,
                                      ) + 1}
                                      ]
                                    </button>
                                  ))}
                                </p>
                              ))}
                            </>
                          ) : (
                            <p className="muted">No answer yet.</p>
                          )}
                        </div>
                      );
                    })}
                    <h3>
                      Financial report · {g.start} — {g.end}
                    </h3>
                    <div className="reviewtotals">
                      <span>
                        Budget <strong>{money(report.budget)}</strong>
                      </span>
                      <span>
                        Spending <strong>{money(report.spent)}</strong>
                      </span>
                      <span>
                        Remaining <strong>{money(report.balance)}</strong>
                      </span>
                    </div>
                    <p className="muted">
                      Totals use only allocations inside this funder’s inclusive
                      reporting period. Export includes source excerpts,
                      locations, and snapshot hash.
                    </p>
                  </section>
                  <section className="card history">
                    <h3>Approval history</h3>
                    {data.approvals.filter((a) => a.grantId === grant)
                      .length ? (
                      data.approvals
                        .filter((a) => a.grantId === grant)
                        .map((a) => (
                          <div key={a.id}>
                            <span
                              className={
                                "tag " +
                                (a.id === current?.id ? "good" : "warning")
                              }
                            >
                              {a.id === current?.id
                                ? "Current"
                                : "Invalidated by changes"}
                            </span>
                            <strong>{a.reviewer}</strong>
                            <small>{new Date(a.at).toLocaleString()}</small>
                            <code>{a.hash.slice(0, 16)}…</code>
                          </div>
                        ))
                    ) : (
                      <p className="muted">No snapshots approved yet.</p>
                    )}
                  </section>
                </div>
                <div className="contextcolumn">
                  <section className="card approvalcard">
                    <div className="circleicon">✓</div>
                    <h3>
                      {current
                        ? "Your approved package."
                        : "One last human check."}
                    </h3>
                    <p>
                      Approval covers the exact application, evidence, and
                      financial report. Any change invalidates export
                      eligibility.
                    </p>
                    {errors.length ? (
                      <div className="reviewblockers">
                        <strong>
                          {errors.length} item{errors.length > 1 ? "s" : ""} to
                          resolve
                        </strong>
                        {errors.map((e, i) => (
                          <p key={i}>◷ {e}</p>
                        ))}
                        <div className="blocker-actions">
                          <button
                            className="textbutton"
                            onClick={() => navigate("application")}
                          >
                            Fix answers →
                          </button>
                          <button
                            className="textbutton"
                            onClick={() => navigate("evidence")}
                          >
                            Check evidence →
                          </button>
                          <button
                            className="textbutton"
                            onClick={() => navigate("spending")}
                          >
                            Check spending →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="ready">
                        ✓ All deterministic checks passed
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        act({
                          action: "approve",
                          grantId: grant,
                          reviewer: f.get("reviewer"),
                        });
                      }}
                    >
                      <label>
                        Staff reviewer
                        <input
                          name="reviewer"
                          placeholder="Your name"
                          required
                          defaultValue="Jamie Davis"
                        />
                      </label>
                      <button
                        className="primary full"
                        disabled={busy || !!errors.length}
                      >
                        Approve this snapshot
                      </button>
                    </form>
                    {current ? (
                      <div>
                        <a
                          className="primary exportlink"
                          href={"/api/export?format=html&grant=" + grant}
                        >
                          ↓ Download approved report
                        </a>
                        <a
                          className="secondary exportlink"
                          href={"/api/export?grant=" + grant}
                        >
                          ↓ Export audit package · JSON
                        </a>
                      </div>
                    ) : (
                      <div className="export-blocked">
                        <p>
                          Downloads are locked until staff approve this exact
                          application and report.
                        </p>
                        <button
                          className="secondary full"
                          disabled={busy}
                          onClick={() => void checkExport()}
                        >
                          Check export availability
                        </button>
                      </div>
                    )}
                    <small>
                      Download only. Staff submit through the funder’s portal.
                    </small>
                  </section>
                </div>
              </div>
            </>
          )}
          <footer>
            <span>
              GrantProof <b>·</b> Every claim has evidence. Every grant dollar
              reconciles.
            </span>
            <span>Fictional nonprofit · Hackathon prototype</span>
          </footer>
        </main>
      </div>
      {busy && (
        <div className="working" role="status">
          Saving workspace…
        </div>
      )}
      {evidence && (
        <Modal label="Claim evidence" onClose={() => setEvidence(undefined)}>
          <div className="sectionhead">
            <span className="small-label">CLAIM-LEVEL EVIDENCE</span>
            <button
              className="close"
              aria-label="Close evidence"
              onClick={() => setEvidence(undefined)}
            >
              ×
            </button>
          </div>
          <span className={"tag " + (evidence.approved ? "good" : "warning")}>
            {evidence.approved ? "✓ Staff approved" : "Pending approval"}
          </span>
          <blockquote>{evidence.excerpt}</blockquote>
          <h3>{data.sources.find((s) => s.id === evidence.sourceId)?.name}</h3>
          <p>
            {evidence.location} ·{" "}
            {evidence.kind === "goal" ? "Future goal" : "Achieved outcome"}
          </p>
          <p className="muted">
            Applicable period:{" "}
            {data.sources.find((s) => s.id === evidence.sourceId)?.periodStart}{" "}
            — {data.sources.find((s) => s.id === evidence.sourceId)?.periodEnd}
          </p>
          <code>{evidence.id}</code>
          <details>
            <summary>View original source</summary>
            <pre>
              {data.sources.find((s) => s.id === evidence.sourceId)?.text}
            </pre>
          </details>
        </Modal>
      )}
      {edit && (
        <Modal label="Edit answer" onClose={() => setEdit(undefined)}>
          <form
            className="editform"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act({ action: "edit", id: edit.id, claims: edit.claims })
              )
                setEdit(undefined);
            }}
          >
            <div className="sectionhead">
              <h2>Edit answer</h2>
              <button
                type="button"
                className="close"
                aria-label="Close editor"
                onClick={() => setEdit(undefined)}
              >
                ×
              </button>
            </div>
            <p>
              Edits invalidate approval. This prototype requires exact approved
              excerpts; paraphrased claims are flagged for evidence review.
            </p>
            {edit.claims.map((c, i) => (
              <label key={i}>
                Claim {i + 1}
                <textarea
                  rows={3}
                  value={c.text}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      claims: edit.claims.map((x, j) =>
                        j === i ? { ...x, text: e.target.value } : x,
                      ),
                    })
                  }
                />
                <small>Linked fact IDs: {c.factIds.join(", ")}</small>
              </label>
            ))}
            <button className="primary" disabled={busy}>
              Save new version
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
