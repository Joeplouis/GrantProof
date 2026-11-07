import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
const dom = new JSDOM(
  '<!doctype html><html><body><button id="opener">Open</button></body></html>',
  { url: "http://127.0.0.1:4318" },
);
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
test("dialog traps keyboard focus, closes on Escape, and restores opener focus", async () => {
  const { render, screen, fireEvent, cleanup } =
    await import("@testing-library/react");
  const { default: Modal } = await import("./Modal");
  let closed = false;
  document.getElementById("opener")!.focus();
  render(
    <Modal
      label="Evidence"
      onClose={() => {
        closed = true;
      }}
    >
      <button>Close</button>
      <button>Last action</button>
    </Modal>,
  );
  const first = screen.getByRole("button", { name: "Close" }),
    last = screen.getByRole("button", { name: "Last action" });
  assert.ok(document.activeElement === first);
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  assert.ok(document.activeElement === last);
  fireEvent.keyDown(document, { key: "Tab" });
  assert.ok(document.activeElement === first);
  fireEvent.keyDown(document, { key: "Escape" });
  assert.ok(closed);
  cleanup();
  assert.ok(document.activeElement === document.getElementById("opener"));
  assert.equal(document.body.style.overflow, "");
  dom.window.close();
});
