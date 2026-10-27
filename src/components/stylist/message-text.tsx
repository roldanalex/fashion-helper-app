import { Fragment } from "react";

/**
 * Renders the stylist's reply. The prompt asks for plain prose, but small
 * models still slip in headings, bold labels and bullets, so this reads
 * line by line and handles each kind rather than echoing raw markdown.
 */
type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; lines: string[] };

const LIST_RE = /^\s*(?:[-*•]|\d+[.)])\s+/;
const HEADING_RE = /^\s*#{1,6}\s+/;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", lines: paragraph });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: "list", items: list });
    list = [];
  };

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (HEADING_RE.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", text: line.replace(HEADING_RE, "").trim() });
    } else if (LIST_RE.test(line)) {
      flushParagraph();
      list.push(line.replace(LIST_RE, "").trim());
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function MessageText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parse(text).map((block, i) => {
        switch (block.kind) {
          case "heading":
            return (
              <p key={i} className="mt-4 mb-1 font-semibold first:mt-0">
                {inline(block.text)}
              </p>
            );
          case "list":
            return (
              <ul key={i} className="my-3 list-disc space-y-1.5 pl-5 first:mt-0 last:mb-0">
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </ul>
            );
          case "paragraph":
            return (
              <p key={i} className="my-3 first:mt-0 last:mb-0">
                {block.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(l)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}

/** **bold**, *italic* and `code` spans; everything else is literal text. */
function inline(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g);
  if (parts.length === 1) return line;
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) {
      return (
        <code key={i} className="font-sans text-[0.9em]">
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
      return <em key={i}>{p.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}
