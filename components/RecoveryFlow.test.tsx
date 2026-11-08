import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { seed, spending, reviewErrors } from "../lib/store";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://127.0.0.1:4318",
});
Object.defineProperty(globalThis, "window", {
  value: dom.window,
  configurable: true,
});
Object.defineProperty(globalThis, "document", {
  value: dom.window.document,
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.MutationObserver = dom.window.MutationObserver;
test(
  "staff can recover loading, find pending evidence, see period eligibility and resolve file errors",
  { timeout: 10000 },
  async () => {
    const { render, screen, fireEvent, within, cleanup } =
      await import("@testing-library/react");
    const { default: Home } = await import("../app/page");
    const state = seed();
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return calls === 1
        ? new Response("{}", { status: 503 })
        : Response.json({
            ...state,
            reports: state.grants.map((g) => ({
              grantId: g.id,
              ...spending(state, g.id),
            })),
            reviewErrors: Object.fromEntries(
              state.grants.map((g) => [g.id, reviewErrors(state, g.id)]),
            ),
            currentApprovals: [],
            draftErrors: {},
            liveAvailable: false,
          });
    };
    render(<Home />);
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: "Retry loading workspace" }),
    );
    await screen.findByRole("heading", {
      name: "Your impact, backed by evidence.",
    });
    fireEvent.click(screen.getByRole("button", { name: /Evidence library/ }));
    assert.ok(screen.getByText(/2 approved facts fall within Family Futures/));
    fireEvent.click(screen.getByRole("button", { name: "Needs review" }));
    assert.equal(
      screen.getAllByRole("button", { name: "Approve fact" }).length,
      2,
    );
    assert.ok(
      !screen.queryByText(
        "Tidepath Family Alliance supported 120 families through 360 coaching sessions.",
      ),
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search evidence" }),
      { target: { value: "nothing matches this" } },
    );
    assert.ok(screen.getByText("No matching evidence."));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    assert.ok(
      screen.getByText(
        "Tidepath Family Alliance supported 120 families through 360 coaching sessions.",
      ),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Current grant" }), {
      target: { value: "g2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Dashboard/ }));
    const facts = screen.getByRole("article", { name: "Evidence overview" });
    assert.ok(within(facts).getByText("0"));
    assert.ok(within(facts).getByText("2"));
    assert.ok(within(facts).getByText(/approved for this period/));
    fireEvent.click(screen.getByRole("button", { name: "Review evidence →" }));
    fireEvent.click(screen.getByRole("button", { name: "＋ Import source" }));
    const file = screen.getByLabelText("Upload plain text");
    fireEvent.change(file, {
      target: {
        files: [
          { name: "not-supported.pdf", size: 20, text: async () => "%PDF" },
        ],
      },
    });
    await screen.findByText("Choose a .txt or .md source file.");
    fireEvent.change(file, {
      target: { files: [{ name: "empty.txt", size: 0, text: async () => "" }] },
    });
    await screen.findByText(
      "This file is empty. Choose a file with records to review.",
    );
    fireEvent.change(file, {
      target: {
        files: [
          {
            name: "program.txt",
            size: 50,
            text: async () => "A fictional source ready for staff review.",
          },
        ],
      },
    });
    await screen.findByText(
      "program.txt loaded for preview. Review it below, then import.",
    );
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Source text",
        }) as HTMLTextAreaElement
      ).value,
      "A fictional source ready for staff review.",
    );
    assert.equal(
      calls,
      2,
      "Import preview must not send the source to any API.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to answers →" }),
    );
    await screen.findByRole("heading", {
      name: "Your impact, backed by evidence.",
    });
    cleanup();
    dom.window.close();
  },
);
