import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
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
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) =>
  nativeFetch(new URL(String(input), "http://127.0.0.1:4318"), init);
globalThis.FormData = dom.window.FormData as typeof FormData;
test(
  "four-screen component flow with real loopback API: facts, citations, spending and approved exports",
  { timeout: 15000 },
  async () => {
    const { render, screen, waitFor, within, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { default: userEvent } = await import("@testing-library/user-event");
    const { default: Home } = await import("../app/page");
    const user = userEvent.setup({ document: dom.window.document });
    render(<Home />);
    await screen.findByRole("button", { name: /Dashboard/ });
    await user.click(screen.getByRole("button", { name: /Dashboard/ }));
    await screen.findByRole("region", { name: "Moveable grant dashboard" });
    await user.click(
      screen.getByRole("button", { name: "Move Budget snapshot earlier" }),
    );
    await user.click(screen.getByRole("button", { name: "Review evidence →" }));
    await user.click(screen.getByRole("button", { name: "＋ Import source" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Document name" }), {
      target: { value: "UI workflow register.txt" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Source text" }), {
      target: { value: "Fictional staff recorded 12 community workshops." },
    });
    await user.click(
      screen.getByRole("button", { name: "Extract candidate facts" }),
    );
    const imported = await screen.findByRole("heading", {
      name: "UI workflow register.txt",
    });
    await user.click(
      within(imported.closest("section")!).getByRole("button", {
        name: "Approve fact",
      }),
    );
    await waitFor(() =>
      assert.ok(
        !screen.queryByText("Fictional staff recorded 12 community workshops."),
      ),
    );
    await user.click(screen.getByRole("button", { name: "All facts" }));
    await user.click(
      screen.getByRole("button", { name: "Continue to answers →" }),
    );
    await screen.findByRole("heading", {
      name: "Your impact, backed by evidence.",
    });
    assert.equal(
      screen.getAllByRole("button", { name: "✧ Generate sourced answer" })
        .length,
      2,
    );
    await user.click(
      screen.getAllByRole("button", { name: "✧ Generate sourced answer" })[0],
    );
    await screen.findByText(
      "Tidepath Family Alliance supported 120 families through 360 coaching sessions.",
    );
    await user.click(screen.getAllByTitle("View claim evidence")[0]);
    const dialog = await screen.findByRole("dialog", {
      name: "Claim evidence",
    });
    assert.ok(within(dialog).getByText("2026 program register.txt"));
    assert.ok(within(dialog).getByText(/Line 1/));
    await user.click(
      within(dialog).getByRole("button", { name: "Close evidence" }),
    );
    await user.click(
      screen.getByRole("button", { name: "✧ Generate sourced answer" }),
    );
    await waitFor(() =>
      assert.equal(
        screen.queryAllByRole("button", { name: "✧ Generate sourced answer" })
          .length,
        0,
      ),
    );
    await user.click(screen.getByRole("button", { name: /Evidence library/ }));
    await screen.findByRole("heading", { name: "Good answers start here." });
    assert.equal(
      screen.getAllByRole("button", { name: "Approve fact" }).length,
      2,
    );
    assert.ok(
      screen.getByText("A preliminary estimate suggests a 92% success rate."),
    );
    await user.click(screen.getByRole("button", { name: /Grant spending/ }));
    await screen.findByRole("heading", {
      name: "Every dollar, accounted for.",
    });
    assert.ok(screen.getAllByText("$16,200.00").length);
    assert.ok(screen.getByText("Outside this period"));
    await user.click(screen.getByRole("button", { name: "↑ Import CSV" }));
    fireEvent.change(screen.getByRole("textbox", { name: "CSV contents" }), {
      target: {
        value: "id,date,payee,amount\nT001,2026-01-01,Coaching team,12000.00",
      },
    });
    await user.click(screen.getByRole("button", { name: "Validate & import" }));
    await screen.findByText("0 imported · 1 duplicates skipped");
    await user.click(screen.getByRole("button", { name: /Review & export/ }));
    await screen.findByRole("heading", { name: "Ready for a human sign-off." });
    assert.ok(screen.getByText("✓ All deterministic checks passed"));
    await user.click(
      screen.getByRole("button", { name: "Check export availability" }),
    );
    await screen.findByRole("alert");
    assert.ok(
      screen.getByText(/Export blocked: Current application and report/),
    );
    await user.click(
      screen.getByRole("button", { name: "Approve this snapshot" }),
    );
    const html = await screen.findByRole("link", {
      name: "↓ Download approved report",
    });
    assert.equal(html.getAttribute("href"), "/api/export?format=html&grant=g1");
    assert.ok(
      screen.getByRole("link", { name: "↓ Export audit package · JSON" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Application workspace/ }),
    );
    await user.click(screen.getAllByRole("button", { name: "Edit answer" })[0]);
    const modal = screen
      .getByRole("heading", { name: "Edit answer" })
      .closest("form")!;
    const area = within(modal).getAllByRole("textbox")[0];
    fireEvent.change(area, { target: { value: "An unsupported 99% claim." } });
    fireEvent.submit(modal);
    await waitFor(() =>
      assert.ok(!screen.queryByRole("heading", { name: "Edit answer" })),
    );
    await user.click(screen.getByRole("button", { name: /Review & export/ }));
    await waitFor(() =>
      assert.ok(
        !screen.queryByRole("link", { name: "↓ Download approved report" }),
      ),
    );
    assert.ok(screen.getByText(/Edited wording requires evidence review/));
    assert.equal(
      (
        screen.getByRole("button", {
          name: "Approve this snapshot",
        }) as HTMLButtonElement
      ).disabled,
      true,
    );
    cleanup();
    dom.window.close();
    console.log(
      "PASS: component actions executed against the running API. This is JSDOM component QA, not visual browser QA.",
    );
  },
);
