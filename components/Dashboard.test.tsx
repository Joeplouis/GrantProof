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
test("dashboard drag/drop, keyboard controls, saved order and reset preserve grant data", async () => {
  const { render, screen, fireEvent, cleanup, within } =
    await import("@testing-library/react");
  const { default: Dashboard } = await import("./Dashboard");
  let destination = "";
  const props = {
    approvedFacts: 2,
    pendingFacts: 2,
    answersReady: 0,
    questionCount: 2,
    spending: {
      budget: 5000000,
      spent: 1620000,
      balance: 3380000,
      end: "2026-12-31",
    },
    approved: false,
    blockers: ["Generate answers before approval."],
    navigate: (s: string) => {
      destination = s;
    },
  };
  const before = JSON.stringify(props);
  const panels = () =>
    screen.getAllByRole("article").map((x) => x.getAttribute("aria-label"));
  render(<Dashboard {...props} />);
  assert.equal(panels()[0], "Evidence overview");
  let transfer = "";
  const dataTransfer = {
    setData: (_type: string, value: string) => {
      transfer = value;
    },
    getData: () => transfer,
    effectAllowed: "",
    dropEffect: "",
  };
  fireEvent.dragStart(
    screen.getByRole("button", { name: "Drag Budget snapshot" }),
    { dataTransfer },
  );
  fireEvent.dragOver(
    screen.getByRole("article", { name: "Evidence overview" }),
    { dataTransfer },
  );
  fireEvent.drop(screen.getByRole("article", { name: "Evidence overview" }), {
    dataTransfer,
  });
  assert.equal(panels()[0], "Budget snapshot");
  assert.equal(
    JSON.parse(
      window.localStorage.getItem("grantproof.dashboard-layout.v1")!,
    )[0],
    "spending",
  );
  cleanup();
  render(<Dashboard {...props} />);
  assert.equal(panels()[0], "Budget snapshot");
  fireEvent.click(
    screen.getByRole("button", { name: "Move Budget snapshot later" }),
  );
  assert.equal(panels()[1], "Budget snapshot");
  fireEvent.click(
    screen.getByRole("button", { name: "Prepare application →" }),
  );
  assert.equal(destination, "application");
  fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
  assert.equal(panels()[0], "Evidence overview");
  assert.equal(
    within(screen.getByRole("article", { name: "Budget snapshot" })).getByText(
      "$33,800.00",
    ).textContent,
    "$33,800.00",
  );

  const budgetHandle = screen.getByRole("button", {
    name: "Drag Budget snapshot",
  });
  budgetHandle.focus();
  fireEvent.keyDown(budgetHandle, { key: " " });
  fireEvent.keyDown(budgetHandle, { key: "ArrowUp" });
  fireEvent.keyDown(budgetHandle, { key: "Enter" });
  assert.equal(panels()[1], "Budget snapshot");
  const savedBeforeCancel = window.localStorage.getItem(
    "grantproof.dashboard-layout.v1",
  );
  fireEvent.keyDown(budgetHandle, { key: " " });
  fireEvent.keyDown(budgetHandle, { key: "Home" });
  fireEvent.keyDown(budgetHandle, { key: "Escape" });
  assert.equal(panels()[1], "Budget snapshot");
  assert.equal(
    window.localStorage.getItem("grantproof.dashboard-layout.v1"),
    savedBeforeCancel,
  );
  fireEvent.keyDown(budgetHandle, { key: " " });
  fireEvent.keyDown(budgetHandle, { key: "Home" });
  fireEvent.blur(budgetHandle);
  assert.equal(budgetHandle.getAttribute("aria-pressed"), "false");
  assert.equal(panels()[1], "Budget snapshot");
  assert.equal(
    window.localStorage.getItem("grantproof.dashboard-layout.v1"),
    savedBeforeCancel,
  );
  Object.defineProperty(dom.window, "PointerEvent", {
    configurable: true,
    value: class extends dom.window.MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId || 1;
        this.pointerType = init.pointerType || "touch";
      }
    },
  });
  document.elementFromPoint = () =>
    screen.getByRole("article", { name: "Evidence overview" });
  const reviewHandle = screen.getByRole("button", {
    name: "Drag Review readiness",
  });
  fireEvent.pointerDown(reviewHandle, {
    pointerId: 1,
    pointerType: "touch",
    clientX: 100,
    clientY: 200,
  });
  fireEvent.pointerMove(reviewHandle, {
    pointerId: 1,
    pointerType: "touch",
    clientX: 130,
    clientY: 240,
  });
  fireEvent.pointerUp(reviewHandle, {
    pointerId: 1,
    pointerType: "touch",
    clientX: 130,
    clientY: 240,
  });
  assert.equal(panels()[0], "Review readiness");
  const beforePointerCancel = panels().join(",");
  fireEvent.pointerDown(budgetHandle, {
    pointerId: 2,
    pointerType: "touch",
    clientX: 100,
    clientY: 200,
  });
  fireEvent.pointerMove(budgetHandle, {
    pointerId: 2,
    pointerType: "touch",
    clientX: 130,
    clientY: 240,
  });
  fireEvent.pointerCancel(budgetHandle, { pointerId: 2, pointerType: "touch" });
  assert.equal(panels().join(","), beforePointerCancel);
  const originalSet = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.setItem = () => {
    throw Error("Storage denied");
  };
  fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
  assert.equal(panels()[0], "Evidence overview");
  assert.ok(screen.getByText(/browser storage is unavailable/));
  dom.window.Storage.prototype.setItem = originalSet;
  cleanup();
  window.localStorage.setItem(
    "grantproof.dashboard-layout.v1",
    '["unknown","unknown"]',
  );
  render(<Dashboard {...props} />);
  assert.equal(panels()[0], "Evidence overview");
  assert.equal(JSON.stringify(props), before);
  cleanup();
  dom.window.close();
});
