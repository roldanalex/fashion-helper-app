import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { MessageText } from "@/components/stylist/message-text";

const html = (text: string) => renderToStaticMarkup(createElement(MessageText, { text }));

describe("MessageText", () => {
  it("turns headings into labelled paragraphs, not literal hashes", () => {
    const out = html("### Packing List\n- Tan chino ×4");
    expect(out).not.toContain("###");
    expect(out).toContain("Packing List");
    expect(out).toContain("<li>Tan chino ×4</li>");
  });
  it("keeps a bold line and the bullets under it apart", () => {
    const out = html("**October 27**\n- **Indoors:** polo\n- **Going Out:** sneakers");
    expect(out).toContain("<strong class=\"font-semibold\">October 27</strong>");
    expect((out.match(/<li>/g) ?? []).length).toBe(2);
    expect(out).not.toContain("- ");
  });
  it("handles numbered lists and italics", () => {
    const out = html("1. first\n2. *second*");
    expect(out).toContain("<li>first</li>");
    expect(out).toContain("<em>second</em>");
  });
  it("leaves plain prose as paragraphs", () => {
    const out = html("One.\n\nTwo.");
    expect((out.match(/<p/g) ?? []).length).toBe(2);
  });
});
