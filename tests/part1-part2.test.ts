import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
const base = process.env.GRANTPROOF_INTEGRATION_URL;
test(
  "Part 1 dashboard works with Part 2 approval lifecycle, CSV imports and cent-level allocations",
  { skip: !base, timeout: 20000 },
  async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: base + "/#dashboard",
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
    const fetchServer = globalThis.fetch;
    globalThis.fetch = (input, init) =>
      fetchServer(new URL(String(input), base), init);
    const { render, screen, within, fireEvent, waitFor, cleanup, configure } =
      await import("@testing-library/react");
    const { default: userEvent } = await import("@testing-library/user-event");
    const { default: Home } = await import("../app/page");
    configure({ asyncUtilTimeout: 5000 });
    const user = userEvent.setup({ document: dom.window.document });
    async function state() {
      return (await fetchServer(base + "/api/workspace")).json();
    }
    async function exported() {
      const response = await fetchServer(base + "/api/export?grant=g1");
      assert.equal(response.status, 200);
      return (await response.json()).approval;
    }
    const go = async (name: RegExp) => {
      await user.click(screen.getByRole("button", { name }));
    };
    const factRow = () =>
      screen
        .getByText(
          "Tidepath Family Alliance supported 120 families through 360 coaching sessions.",
        )
        .closest(".factrow") as HTMLElement;
    try {
      render(React.createElement(Home));
      await screen.findByRole("region", { name: "Moveable grant dashboard" });
      await user.click(
        screen.getByRole("button", { name: "Move Budget snapshot earlier" }),
      );
      assert.equal(
        JSON.parse(
          window.localStorage.getItem("grantproof.dashboard-layout.v1")!,
        )[1],
        "spending",
      );
      await user.click(
        screen.getByRole("button", { name: "Prepare application →" }),
      );
      await user.click(
        screen.getAllByRole("button", { name: "✧ Generate sourced answer" })[0],
      );
      await screen.findByText(
        "Tidepath Family Alliance supported 120 families through 360 coaching sessions.",
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
      await go(/Review & export/);
      await user.click(
        screen.getByRole("button", { name: "Approve this snapshot" }),
      );
      await screen.findByRole("link", { name: "↓ Download approved report" });
      const original = await exported();
      await go(/Evidence library/);
      await user.click(
        within(factRow()).getByRole("button", { name: "Revoke approval" }),
      );
      await waitFor(() =>
        assert.ok(
          within(factRow()).getByRole("button", { name: "Approve fact" }),
        ),
      );
      await go(/Review & export/);
      assert.ok(
        !screen.queryByRole("link", { name: "↓ Download approved report" }),
      );
      await go(/Evidence library/);
      await user.click(
        within(factRow()).getByRole("button", { name: "Approve fact" }),
      );
      await waitFor(() =>
        assert.ok(
          within(factRow()).getByRole("button", { name: "Revoke approval" }),
        ),
      );
      await go(/Review & export/);
      assert.ok(
        !screen.queryByRole("link", { name: "↓ Download approved report" }),
        "Restoring a fact must not restore old export links.",
      );
      await user.click(
        screen.getByRole("button", { name: "Check export availability" }),
      );
      await screen.findByRole("alert");
      assert.equal(
        (await fetchServer(base + "/api/export?grant=g1")).status,
        409,
      );
      await user.click(
        screen.getByRole("button", { name: "Approve this snapshot" }),
      );
      await screen.findByRole("link", { name: "↓ Download approved report" });
      const fresh = await exported();
      assert.notEqual(fresh.id, original.id);
      assert.deepEqual(fresh.snapshot, original.snapshot);
      await go(/Grant spending/);
      await user.click(screen.getByRole("button", { name: "↑ Import CSV" }));
      const csv =
        "id,date,payee,amount\nIT001,2026-09-01,Fictional supplies,1.01";
      fireEvent.change(screen.getByRole("textbox", { name: "CSV contents" }), {
        target: { value: csv },
      });
      await user.click(
        screen.getByRole("button", { name: "Validate & import" }),
      );
      await screen.findByText("1 imported · 0 duplicates skipped");
      await user.click(
        screen.getByRole("button", { name: "Validate & import" }),
      );
      await screen.findByText("0 imported · 1 duplicates skipped");
      assert.equal(
        (await state()).transactions.filter(
          (t: { id: string }) => t.id === "IT001",
        ).length,
        1,
      );
      const amount = () =>
        screen.getByRole("spinbutton", {
          name: "Allocation amount for IT001",
        }) as HTMLInputElement;
      fireEvent.change(
        screen.getByRole("combobox", { name: "Category for IT001" }),
        { target: { value: "Program supplies" } },
      );
      fireEvent.change(amount(), { target: { value: "0.50" } });
      await user.click(
        within(amount().closest("form")!).getByRole("button", {
          name: "Allocate",
        }),
      );
      await waitFor(() => assert.equal(amount().max, "0.51"));
      assert.equal(
        amount().value,
        "0.51",
        "The allocation form must reset to the remaining balance after a partial allocation.",
      );
      assert.equal(
        (
          screen.getByRole("combobox", {
            name: "Category for IT001",
          }) as HTMLSelectElement
        ).value,
        "Program supplies",
        "Refreshing the amount must preserve the staff-selected category.",
      );
      fireEvent.change(
        screen.getByRole("combobox", { name: "Category for IT001" }),
        { target: { value: "Program supplies" } },
      );
      await user.click(
        within(amount().closest("form")!).getByRole("button", {
          name: "Allocate",
        }),
      );
      await waitFor(() =>
        assert.ok(
          !screen.queryByRole("spinbutton", {
            name: "Allocation amount for IT001",
          }),
        ),
      );
      const ledger = await state();
      assert.equal(
        ledger.reports.find((r: { grantId: string }) => r.grantId === "g1")
          .spent,
        1620101,
      );
      assert.equal(
        ledger.reports.find((r: { grantId: string }) => r.grantId === "g1")
          .balance,
        3379899,
      );
      const count = ledger.transactions.length;
      fireEvent.change(screen.getByRole("textbox", { name: "CSV contents" }), {
        target: {
          value:
            'id,date,payee,amount\nGOOD,2026-09-02,Good vendor,10.00\nBAD,2026-09-03,"Bad"junk,20.00',
        },
      });
      await user.click(
        screen.getByRole("button", { name: "Validate & import" }),
      );
      await screen.findByText(/Malformed quote in CSV/);
      assert.equal((await state()).transactions.length, count);
      await go(/Review & export/);
      assert.ok(
        !screen.queryByRole("link", { name: "↓ Download approved report" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Approve this snapshot" }),
      );
      await screen.findByRole("link", { name: "↓ Download approved report" });
      const financialApproval = await exported();
      assert.equal(financialApproval.snapshot.report.spent, 1620101);
      assert.equal(financialApproval.snapshot.report.balance, 3379899);
      await go(/Dashboard/);
      assert.ok(
        within(
          screen.getByRole("article", { name: "Budget snapshot" }),
        ).getByText("$33,798.99"),
      );
      fireEvent.change(
        screen.getByRole("combobox", { name: "Current grant" }),
        { target: { value: "g2" } },
      );
      assert.ok(
        within(
          screen.getByRole("article", { name: "Budget snapshot" }),
        ).getByText("$25,000.00"),
      );
      assert.ok(
        within(
          screen.getByRole("article", { name: "Evidence overview" }),
        ).getByText("0"),
      );
      await user.click(
        screen.getByRole("button", { name: "Reconcile expenses →" }),
      );
      fireEvent.change(
        screen.getByRole("combobox", { name: "Category for T004" }),
        { target: { value: "Administration" } },
      );
      await user.click(
        within(
          screen
            .getByRole("spinbutton", { name: "Allocation amount for T004" })
            .closest("form")!,
        ).getByRole("button", { name: "Allocate" }),
      );
      await waitFor(() =>
        assert.ok(
          !screen.queryByRole("spinbutton", {
            name: "Allocation amount for T004",
          }),
        ),
      );
      const final = await state();
      assert.equal(
        final.reports.find((r: { grantId: string }) => r.grantId === "g2")
          .spent,
        90000,
      );
      assert.equal(
        final.reports.find((r: { grantId: string }) => r.grantId === "g1")
          .spent,
        1620101,
      );
      assert.ok(
        final.currentApprovals.some(
          (a: { id: string }) => a.id === financialApproval.id,
        ),
        "An allocation outside g1 dates must not invalidate its approved report.",
      );
      console.log(
        "PASS: integrated dashboard, permanent approval invalidation, exact snapshots, duplicate/malformed CSV, partial-cent allocations and fiscal switching.",
      );
    } finally {
      cleanup();
      globalThis.fetch = fetchServer;
      dom.window.close();
    }
  },
);
