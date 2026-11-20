import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { LOCALES, NAMESPACES } from "@/i18n/config";

const ROOT = join(__dirname, "..", "..", "messages");
type Tree = { [k: string]: string | Tree };

function leaves(t: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(t)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(path, v);
    else for (const [p, s] of leaves(v, path)) out.set(p, s);
  }
  return out;
}

/**
 * Top-level ICU arguments ({name}, {count, plural, …}). Branch bodies such as
 * "one {piece}" are text, not arguments, so only depth-0 braces are read.
 */
function args(message: string): string[] {
  const out: string[] = [];
  let depth = 0;
  for (let i = 0; i < message.length; i++) {
    const c = message[i];
    if (c === "{") {
      if (depth === 0) {
        const m = /^\s*([a-zA-Z_]\w*)/.exec(message.slice(i + 1));
        if (m) out.push(m[1]);
      }
      depth++;
    } else if (c === "}") depth = Math.max(0, depth - 1);
  }
  return out.sort();
}

const load = (locale: string, ns: string): Tree | null => {
  const f = join(ROOT, locale, `${ns}.json`);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Tree) : null;
};

describe("messages", () => {
  it("English has every namespace", () => {
    for (const ns of NAMESPACES) expect(load("en", ns), `messages/en/${ns}.json`).not.toBeNull();
  });

  for (const locale of LOCALES.filter((l) => l !== "en")) {
    it(`${locale} has exactly the English keys and keeps every placeholder`, () => {
      for (const ns of NAMESPACES) {
        const en = leaves(load("en", ns)!);
        const tr = load(locale, ns);
        expect(tr, `messages/${locale}/${ns}.json is missing`).not.toBeNull();
        const other = leaves(tr!);
        expect([...other.keys()].sort(), `${locale}/${ns} keys`).toEqual([...en.keys()].sort());
        for (const [key, text] of en) {
          expect(args(other.get(key)!), `${locale}/${ns}:${key} placeholders`).toEqual(args(text));
        }
      }
    });
  }

  for (const locale of LOCALES) {
    it(`${locale}: every message formats without an ICU error`, () => {
      const errors: string[] = [];
      for (const ns of NAMESPACES) {
        const tree = load(locale, ns);
        if (!tree) continue;
        const t = createTranslator({
          locale,
          messages: { [ns]: tree },
          namespace: ns,
          onError: (e) => errors.push(`${locale}/${ns}: ${e.message}`),
        });
        for (const [key, text] of leaves(tree)) {
          // Sample values: 1 works for plain arguments and plurals alike; tags just return their text.
          const values: Record<string, unknown> = {};
          for (const a of args(text)) values[a] = 1;
          for (const m of text.matchAll(/<(\w+)>/g)) values[m[1]] = (chunks: string) => chunks;
          (t.markup as (k: string, v: Record<string, unknown>) => string)(key, values);
        }
      }
      expect(errors).toEqual([]);
    });
  }
});
