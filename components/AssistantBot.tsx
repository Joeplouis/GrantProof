"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string; mode?: string };

const CHIPS = [
  "How much of Family Futures 2026 is left?",
  "Which facts are approved evidence?",
  "Why did the goals question return a gap?",
  "What must be fixed before approval?",
];

const GREETING =
  "Hi — I'm the GrantProof assistant. I answer from this workspace's own database: grants, spending, approved evidence, drafts and approvals for Tidepath Family Alliance. Ask me anything about it.";

export default function AssistantBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, open, busy]);

  async function send(raw: string) {
    const question = raw.trim();
    if (!question || busy) return;
    setInput("");
    setOpen(true);
    const history = msgs.slice(-6).map((m) => ({
      role: m.role,
      text: m.text,
    }));
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const data = (await res.json()) as {
        answer?: string;
        mode?: string;
        error?: string;
      };
      if (!res.ok || !data.answer)
        throw new Error(data.error || "Request failed.");
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: data.answer as string, mode: data.mode },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn't reach the workspace just now — please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gp-bot">
      {open && (
        <section className="gp-bot-panel" aria-label="GrantProof assistant">
          <header className="gp-bot-head">
            <div>
              <strong>GrantProof Assistant</strong>
              <span>Ask about this workspace</span>
            </div>
            <button
              type="button"
              className="gp-bot-close"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="gp-bot-log" ref={logRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`gp-bot-msg ${m.role}`}>
                <p>{m.text}</p>
                {m.mode && (
                  <small>
                    {m.mode === "live"
                      ? "Live AI · answered from workspace data"
                      : "Direct lookup · workspace data"}
                  </small>
                )}
              </div>
            ))}
            {busy && <div className="gp-bot-msg assistant dim">Thinking…</div>}
          </div>
          <div className="gp-bot-chips">
            {CHIPS.map((c) => (
              <button key={c} type="button" onClick={() => send(c)}>
                {c}
              </button>
            ))}
          </div>
          <form
            className="gp-bot-form"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about grants, spending, evidence…"
              aria-label="Your question"
              maxLength={1000}
            />
            <button type="submit" disabled={busy || !input.trim()}>
              Ask
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="gp-bot-fab"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        💬 Ask GrantProof
      </button>
    </div>
  );
}
