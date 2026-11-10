// Generates types/database.ts from the LOCAL Supabase database (never the hosted project).
// Usage: node scripts/db/generate-types.mjs [--check]
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const target = resolve(root, "types", "database.ts");
const check = process.argv.includes("--check");
const hint =
  "Is the local database running? Start it with `npx supabase db start`.";

function fail(message, withHint = true) {
  console.error(message);
  if (withHint) console.error(hint);
  process.exit(1);
}

let output = "";
try {
  // stdout only is captured; stderr (npm notices, CLI errors) is kept separate.
  output = execSync("npx supabase gen types typescript --local --schema public", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (e) {
  fail(`Type generation failed.\n${e.stderr || e.message}`);
}

if (!output || !output.trim()) {
  fail("Type generation produced empty output.", false);
}

const normalize = (s) => s.replace(/\r\n/g, "\n");

if (check) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (normalize(current) !== normalize(output)) {
    console.error(
      "::error file=types/database.ts::types/database.ts is out of date with supabase/migrations. Run `npm run db:types` with the local database running (npx supabase db start) and commit the result.",
    );
    process.exit(1);
  }
  console.log("types/database.ts is up to date");
} else {
  writeFileSync(target, output, "utf8");
  console.log("Wrote types/database.ts");
}
