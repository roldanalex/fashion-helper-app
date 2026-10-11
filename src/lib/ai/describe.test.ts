import { describe, expect, it } from "vitest";
import { describeAttributes, describeItem } from "@/lib/ai/describe";
import { makeItem } from "@/test/fixtures";

describe("describeItem", () => {
  it("includes watch details so text-only prompts can see them", () => {
    const tudor = makeItem({
      name: "Black Bay GMT",
      category: "accessory",
      subcategory: "watch",
      material: "steel",
      attributes: { watch_style: "gmt", band: "bracelet", hardware_tone: "silver" },
    });
    const text = describeItem(tudor);
    expect(text).toContain("Black Bay GMT");
    expect(text).toContain("steel");
    expect(text).toContain("gmt watch, bracelet band, silver hardware");
  });

  it("omits the details phrase for pieces without attributes", () => {
    const polo = makeItem({ name: "Navy polo" });
    expect(describeAttributes(polo)).toBeNull();
    expect(describeItem(polo)).not.toContain("hardware");
  });

  it("tolerates rows from before the attributes column existed", () => {
    const legacy = makeItem({ name: "Old belt", category: "accessory", subcategory: "belt" });
    // Simulate a row the database returned without the column.
    delete (legacy as Partial<typeof legacy>).attributes;
    expect(describeAttributes(legacy)).toBeNull();
  });
});
