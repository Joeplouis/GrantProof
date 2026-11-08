import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { resolve } from "node:path";

if (process.env.GRANTPROOF_ALLOW_LIVE_BROWSER !== "1")
  throw Error("Live browser checks require explicit paid-run opt-in.");
loadEnvConfig(process.cwd());
if (!process.env.OPENAI_API_KEY)
  throw Error(
    "Configure the server API key privately before live browser checks.",
  );

export default defineConfig({
  testDir: "./live-e2e",
  workers: 1,
  retries: 0,
  timeout: 150_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results/live-browser",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
    baseURL: "http://127.0.0.1:4322",
    // Capture only explicit successful states; never record credentials/errors.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "./node_modules/.bin/next start --hostname 127.0.0.1 --port 4322",
    url: "http://127.0.0.1:4322/api/workspace",
    reuseExistingServer: false,
    timeout: 30_000,
    env: { GRANTPROOF_DB: resolve("data/playwright-live.sqlite") },
  },
});
