export type BulkLine = { key: string; value: string };

export function parseEnvPayload(text: string): BulkLine[] {
  const out: BulkLine[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim();
    if (!key) continue;
    out.push({ key, value });
  }
  return out;
}

export type DiffRow = {
  key: string;
  before: string | null;
  after: string | null;
  type: "add" | "remove" | "change" | "same";
};

export function diffAgainstCurrent(
  lines: BulkLine[],
  current: Record<string, string>
): DiffRow[] {
  const next: Record<string, string> = {};
  for (const { key, value } of lines) {
    next[key] = value;
  }
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  const rows: DiffRow[] = [];
  for (const key of Array.from(keys).sort()) {
    const b = current[key] ?? null;
    const a = next[key] ?? null;
    if (b === null && a !== null) {
      rows.push({ key, before: null, after: a, type: "add" });
    } else if (b !== null && a === null) {
      rows.push({ key, before: b, after: null, type: "remove" });
    } else if (b !== null && a !== null && b !== a) {
      rows.push({ key, before: b, after: a, type: "change" });
    } else if (b !== null && a !== null) {
      rows.push({ key, before: b, after: a, type: "same" });
    }
  }
  return rows;
}

export function buildSecretsFromLines(lines: BulkLine[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const { key, value } of lines) {
    o[key] = value;
  }
  return o;
}
