/**
 * Strict ratchet (roadmap step 12): decides which strict-mode errors fail CI.
 * Pure: the runner (`strictRatchet.ts`) collects the compiler's diagnostics and
 * program files and passes them in. Deleted when `strict: true` lands (step 12c).
 */

export type StrictDiagnostic = {
  /** Repo-relative, forward slashes; null when the diagnostic has no file. */
  file: string | null;
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
  code: number;
  message: string;
};

export type RatchetResult = {
  /** Diagnostics in a listed path, plus every diagnostic with no file. */
  violations: StrictDiagnostic[];
  /** Listed paths that match no program file (typo, rename): a failure, so the check can't pass vacuously. */
  unmatchedPaths: string[];
  /** Advisory: clean top-level folders, root files and `src/` sub-folders not covered by the list. */
  newlyClean: string[];
};

/** A folder entry ends in "/" and covers files under it; any other entry covers only that file. */
function covers(entry: string, file: string): boolean {
  return entry.endsWith("/") ? file.startsWith(entry) : file === entry;
}

/** The advisory candidate a file belongs to: "src/<name>/", "<top>/" or a root file. */
function candidateOf(file: string): string {
  const parts = file.split("/");
  if (parts.length === 1) return file;
  if (parts[0] === "src" && parts.length > 2) return `src/${parts[1]}/`;
  return `${parts[0]}/`;
}

export function evaluateRatchet(input: {
  diagnostics: readonly StrictDiagnostic[];
  programFiles: readonly string[];
  strictPaths: readonly string[];
}): RatchetResult {
  const { diagnostics, programFiles, strictPaths } = input;

  const violations = diagnostics.filter(({ file }) =>
    file === null ? true : strictPaths.some((p) => covers(p, file))
  );

  const unmatchedPaths = strictPaths.filter(
    (p) => !programFiles.some((f) => covers(p, f))
  );

  const dirtyFiles = new Set(
    diagnostics.flatMap((d) => (d.file === null ? [] : [d.file]))
  );
  const candidates = new Set(programFiles.map(candidateOf));
  const newlyClean = Array.from(candidates)
    .filter((c) => {
      const files = programFiles.filter((f) => covers(c, f));
      const clean = files.length > 0 && !files.some((f) => dirtyFiles.has(f));
      const listed = strictPaths.some((p) => p === c || (p.endsWith("/") && c.startsWith(p)));
      return clean && !listed;
    })
    .sort();

  return { violations, unmatchedPaths, newlyClean };
}

/** `file(line,col): error TScode: message`, like tsc's own output. */
export function formatDiagnostic(d: StrictDiagnostic): string {
  const where = d.file === null ? "<no file>" : `${d.file}(${d.line},${d.column})`;
  return `${where}: error TS${d.code}: ${d.message}`;
}
