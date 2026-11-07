import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import React from "react";

const base = process.env.GRANTPROOF_SYNTHETIC_URL;
const fixture = (name: string) =>
  readFile(new URL(`../fixtures/synthetic/${name}`, import.meta.url), "utf8");

test(
  "synthetic sources and spending flow through the UI into a sealed grant export",
  { skip: !base, timeout: 30000 },
  async () => {
    const origin = new URL(base!).origin;
    assert.ok(
      ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname),
      "Use only an isolated loopback server; this test changes its workspace.",
    );
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: `${origin}/#evidence`,
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
    globalThis.FormData = dom.window.FormData as typeof FormData;
    const serverFetch = globalThis.fetch;
    globalThis.fetch = (input, init) =>
      serverFetch(new URL(String(input), origin), init);

    const { render, screen, within, fireEvent, waitFor, cleanup } =
      await import("@testing-library/react");
    const { default: userEvent } = await import("@testing-library/user-event");
    const { default: Home } = await import("../app/page");
    const user = userEvent.setup({ document: dom.window.document });
    const plan = JSON.parse(await fixture("expected-results.json")) as {
      post_allocation_g1: { spent_cents: number; balance_cents: number };
      post_allocation_g2: { spent_cents: number; balance_cents: number };
      allocations: Array<{
        transactionId: string;
        grantId: string;
        category: string;
        cents: number;
      }>;
    };
    const state = async () =>
      (await serverFetch(`${origin}/api/workspace`)).json();
    const post = async (body: unknown) => {
      const response = await serverFetch(`${origin}/api/workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 200, await response.clone().text());
      return response.json();
    };
    const importSource = async (name: string) => {
      await user.click(
        screen.getByRole("button", { name: "＋ Import source" }),
      );
      fireEvent.change(screen.getByRole("textbox", { name: "Document name" }), {
        target: { value: name },
      });
      fireEvent.change(screen.getByRole("textbox", { name: "Source text" }), {
        target: { value: await fixture(name) },
      });
      await user.click(
        screen.getByRole("button", { name: "Extract candidate facts" }),
      );
      return screen.findByRole("heading", { name });
    };

    try {
      const initial = await state();
      assert.equal(
        initial.reports.find((r: { grantId: string }) => r.grantId === "g1")
          .spent,
        1620000,
      );
      assert.ok(
        !initial.transactions.some((t: { id: string }) => t.id === "X101"),
        "Reset the isolated workspace before this test.",
      );
      render(React.createElement(Home));
      await screen.findByRole("heading", { name: "Good answers start here." });
      await importSource("07-unapproved-unsafe-claims.txt");
      const achieved = await importSource(
        "05-achieved-program-register-2026.txt",
      );
      const source = achieved.closest("section")!;
      await user.click(
        within(source).getAllByRole("button", { name: "Approve fact" })[0],
      );
      await waitFor(() =>
        assert.equal(
          within(source).getAllByRole("button", { name: "Approve fact" })
            .length,
          2,
        ),
      );
      await user.click(
        within(source).getAllByRole("button", { name: "Approve fact" })[0],
      );
      await user.click(
        screen.getByRole("button", { name: /Application workspace/ }),
      );
      await user.click(
        screen.getAllByRole("button", { name: "✧ Generate sourced answer" })[0],
      );
      await screen.findByText(
        "Tidepath Family Alliance delivered 74 parent workshops during 2026.",
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
      const drafted = await state();
      const claims = drafted.drafts.flatMap(
        (d: { claims: { text: string }[] }) => d.claims.map((c) => c.text),
      );
      assert.ok(
        claims.some((text: string) => text.includes("74 parent workshops")),
      );
      assert.ok(claims.every((text: string) => !/99%|10,000/.test(text)));

      await user.click(screen.getByRole("button", { name: /Grant spending/ }));
      await user.click(screen.getByRole("button", { name: "↑ Import CSV" }));
      fireEvent.change(screen.getByRole("textbox", { name: "CSV contents" }), {
        target: { value: await fixture("01-valid-transactions.csv") },
      });
      await user.click(
        screen.getByRole("button", { name: "Validate & import" }),
      );
      await screen.findByText("7 imported · 0 duplicates skipped");
      await user.click(screen.getByRole("button", { name: /Review & export/ }));
      assert.equal(
        (
          screen.getByRole("button", {
            name: "Approve this snapshot",
          }) as HTMLButtonElement
        ).disabled,
        true,
        "Unallocated synthetic expenses must block approval.",
      );

      for (const allocation of plan.allocations)
        await post({ action: "allocate", ...allocation });
      cleanup();
      dom.window.history.replaceState(null, "", `${origin}/#dashboard`);
      render(React.createElement(Home));
      await screen.findByRole("region", { name: "Moveable grant dashboard" });
      assert.ok(
        within(
          screen.getByRole("article", { name: "Budget snapshot" }),
        ).getByText("$30,274.45"),
      );
      fireEvent.change(
        screen.getByRole("combobox", { name: "Current grant" }),
        {
          target: { value: "g2" },
        },
      );
      assert.ok(
        within(
          screen.getByRole("article", { name: "Budget snapshot" }),
        ).getByText("$21,974.56"),
      );
      const reconciled = await state();
      assert.equal(
        reconciled.reports.find((r: { grantId: string }) => r.grantId === "g1")
          .spent,
        plan.post_allocation_g1.spent_cents,
      );
      assert.equal(
        reconciled.reports.find((r: { grantId: string }) => r.grantId === "g2")
          .spent,
        plan.post_allocation_g2.spent_cents,
      );
      fireEvent.change(
        screen.getByRole("combobox", { name: "Current grant" }),
        {
          target: { value: "g1" },
        },
      );
      await user.click(screen.getByRole("button", { name: /Review & export/ }));
      await screen.findByText("✓ All deterministic checks passed");
      await user.click(
        screen.getByRole("button", { name: "Approve this snapshot" }),
      );
      await screen.findByRole("link", {
        name: "↓ Export audit package · JSON",
      });
      const response = await serverFetch(`${origin}/api/export?grant=g1`);
      assert.equal(response.status, 200);
      const exported = (await response.json()).approval;
      assert.match(exported.hash, /^[a-f0-9]{64}$/);
      assert.equal(
        exported.snapshot.report.spent,
        plan.post_allocation_g1.spent_cents,
      );
      assert.equal(
        exported.snapshot.report.balance,
        plan.post_allocation_g1.balance_cents,
      );
      assert.ok(
        exported.snapshot.facts.every(
          (fact: { excerpt: string }) => !/99%|10,000/.test(fact.excerpt),
        ),
      );
    } finally {
      cleanup();
      globalThis.fetch = serverFetch;
      dom.window.close();
    }
  },
);
