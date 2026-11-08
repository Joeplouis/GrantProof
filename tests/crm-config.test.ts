import test from "node:test";
import assert from "node:assert/strict";
import { crmWorkspaceUrl } from "../lib/crm-config";
import config from "../config/crm.json";

test("CRM starts unconfigured and cannot imply an active connection", () => {
  assert.equal(crmWorkspaceUrl(config.nonprofitWorkspaceUrl), null);
  assert.equal(crmWorkspaceUrl(config.businessWorkspaceUrl), null);
});
test("CRM permits an explicit HTTPS workspace login URL", () => {
  assert.equal(
    crmWorkspaceUrl("https://crm.example.org/login"),
    "https://crm.example.org/login",
  );
});
test("CRM rejects executable, unencrypted and malformed navigation", () => {
  for (const value of [
    null,
    {},
    "",
    "javascript:alert(1)",
    "data:text/html,hello",
    "//crm.example.org",
    "http://crm.example.org",
    "https://localhost",
    "https://local.localhost",
    "nonsense",
  ]) {
    assert.equal(crmWorkspaceUrl(value), null);
  }
});
test("CRM cannot ship credentials or URL tokens in its workspace links", () => {
  for (const value of [
    "https://admin:secret@crm.example.org",
    "https://crm.example.org?token=secret",
    "https://crm.example.org/#token=secret",
  ]) {
    assert.equal(crmWorkspaceUrl(value), null);
  }
});
