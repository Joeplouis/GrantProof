import { loadEnvConfig } from "@next/env";
import { initialized } from "../lib/store";
import { schedulerTick, setSchedule } from "../lib/scheduler";
import { read } from "../lib/store";
loadEnvConfig(process.cwd());
const db = initialized();
if (process.argv.includes("--enable-live")) {
  if (!process.env.OPENAI_API_KEY)
    throw Error(
      "Configure the server API key before enabling live scheduling.",
    );
  for (const grant of read(db).grants)
    setSchedule(db, { grantId: grant.id, enabled: true, live: true });
}
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
async function main() {
  try {
    do {
      try {
        const result = await schedulerTick(db);
        if (result.processed)
          console.log(
            `${new Date().toISOString()} ${result.processed} due reports processed; staff approval required.`,
          );
      } catch {
        console.error("Scheduler tick failed; inspect the app status.");
      }
      if (process.argv.includes("--once") || stopping) break;
      await new Promise((resolve) => setTimeout(resolve, 60000));
    } while (!stopping);
  } finally {
    db.close();
  }
}
void main();
