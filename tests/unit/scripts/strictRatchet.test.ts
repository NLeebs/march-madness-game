import { describe, expect, it } from "vitest";
import {
  evaluateRatchet,
  formatDiagnostic,
  type StrictDiagnostic,
} from "@/scripts/typecheck/ratchet";

const diag = (file: string | null, code = 2322): StrictDiagnostic => ({
  file,
  line: 1,
  column: 1,
  code,
  message: "boom",
});

describe("evaluateRatchet", () => {
  it("reports an error in a listed folder", () => {
    const d = diag("application/a.ts");
    const result = evaluateRatchet({
      diagnostics: [d],
      programFiles: ["application/a.ts"],
      strictPaths: ["application/"],
    });
    expect(result.violations).toEqual([d]);
  });

  it("ignores an error in an unlisted folder", () => {
    const result = evaluateRatchet({
      diagnostics: [diag("src/components/X.tsx")],
      programFiles: ["application/a.ts", "src/components/X.tsx"],
      strictPaths: ["application/"],
    });
    expect(result.violations).toEqual([]);
  });

  it("does not let a folder prefix match a sibling with the same leading letters", () => {
    const result = evaluateRatchet({
      diagnostics: [diag("application/a.ts")],
      programFiles: ["app/page.tsx", "application/a.ts"],
      strictPaths: ["app/"],
    });
    expect(result.violations).toEqual([]);
  });

  it("matches a file entry exactly", () => {
    const ts = diag("middleware.ts");
    const result = evaluateRatchet({
      diagnostics: [ts, diag("middleware.tsx")],
      programFiles: ["middleware.ts", "middleware.tsx"],
      strictPaths: ["middleware.ts"],
    });
    expect(result.violations).toEqual([ts]);
  });

  it("treats a diagnostic with no file as a violation", () => {
    const d = diag(null);
    const result = evaluateRatchet({
      diagnostics: [d],
      programFiles: ["application/a.ts"],
      strictPaths: [],
    });
    expect(result.violations).toEqual([d]);
  });

  it("reports a listed path with no program files as unmatched", () => {
    const result = evaluateRatchet({
      diagnostics: [],
      programFiles: ["application/a.ts"],
      strictPaths: ["application/", "aplication/", "gone.ts"],
    });
    expect(result.unmatchedPaths).toEqual(["aplication/", "gone.ts"]);
  });

  it("suggests unlisted clean top-level folders, root files and src sub-folders", () => {
    const result = evaluateRatchet({
      diagnostics: [diag("src/components/c.tsx")],
      programFiles: [
        "app/p.tsx",
        "store/s.ts",
        "src/hooks/h.ts",
        "src/components/c.tsx",
        "middleware.ts",
      ],
      strictPaths: ["app/"],
    });
    expect(result.newlyClean).toEqual(["middleware.ts", "src/hooks/", "store/"]);
  });

  it("does not suggest a candidate already covered by a broader entry", () => {
    const result = evaluateRatchet({
      diagnostics: [],
      programFiles: ["src/hooks/h.ts"],
      strictPaths: ["src/"],
    });
    expect(result.newlyClean).toEqual([]);
  });
});

describe("formatDiagnostic", () => {
  it("formats a diagnostic like tsc", () => {
    expect(
      formatDiagnostic({ file: "a.ts", line: 3, column: 7, code: 2322, message: "m" })
    ).toBe("a.ts(3,7): error TS2322: m");
    expect(formatDiagnostic(diag(null))).toMatch(/^<no file>: error TS/);
  });
});
