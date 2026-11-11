// Builds the app with the e2e environment (see e2e/support/env.ts). Run by `npm run e2e:build`.
import { spawnSync } from "node:child_process";

// tsx loads env.ts as CommonJS, so its named export may sit under `default`.
const loaded = await import("../../e2e/support/env");
const E2E_ENV: Record<string, string> = loaded.E2E_ENV ?? loaded.default.E2E_ENV;

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...E2E_ENV },
});
process.exit(result.status ?? 1);
