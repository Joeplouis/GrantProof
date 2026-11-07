import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const baseURL = "http://127.0.0.1:4318";
const database = resolve("data/playwright.sqlite");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "./node_modules/.bin/next start --hostname 127.0.0.1 --port 4318",
    url: `${baseURL}/api/workspace`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { GRANTPROOF_DB: database, OPENAI_API_KEY: "" },
  },
});
