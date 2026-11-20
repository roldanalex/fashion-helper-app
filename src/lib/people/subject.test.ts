import { describe, expect, it } from "vitest";
import { promptSubject, subjectsFor, type SubjectSource } from "@/lib/people/subject";

const traits = {
  gender: "female",
  age_range: "25-34",
  skin_tone: "olive",
  skin_undertone: "warm",
  hair_color: "dark brown",
  eye_color: "brown",
  fit_preference: "slim",
  style_notes: "Loves dinosaurs",
};

const adult: SubjectSource = {
  display_name: "Valentina",
  age_band: "adult",
  styles: ["classic"],
  formality: 6,
  personal: traits,
};

const minor = (band: "teen" | "child" | "toddler", name = "Mia"): SubjectSource => ({
  display_name: name,
  age_band: band,
  styles: ["sporty"],
  formality: 3,
  personal: { ...traits, color_season: "autumn" },
});

describe("promptSubject (ADR 0002)", () => {
  it("never describes a minor's traits, whatever is stored", () => {
    for (const band of ["teen", "child", "toddler"] as const) {
      const s = promptSubject(minor(band));
      expect(s.personalBlock).toBe("");
      expect(s.isMinor).toBe(true);
    }
  });

  it("never puts a name in an alias", () => {
    for (const name of ["Mia", "Leo", "Valentina", "Sam"]) {
      for (const band of ["adult", "teen", "child", "toddler"] as const) {
        const s = promptSubject({ ...minor("child", name), age_band: band }, 0);
        expect(s.alias).not.toContain(name);
      }
    }
    const everything = JSON.stringify(promptSubject(minor("child", "Mia")));
    expect(everything).not.toMatch(/Mia|dinosaur|olive|autumn|brown|sporty|3\/10/i);
  });

  it("maps age bands to a coarse audience", () => {
    expect(promptSubject(adult).audience).toBe("adult");
    expect(promptSubject(minor("teen")).audience).toBe("teen");
    expect(promptSubject(minor("child")).audience).toBe("child");
    expect(promptSubject(minor("toddler")).audience).toBe("child");
  });

  it("keeps the full personal block for adults", () => {
    const s = promptSubject(adult);
    expect(s.isMinor).toBe(false);
    expect(s.personalBlock).toContain("Colour season: Autumn");
    expect(s.personalBlock).toContain("slim, close fit");
    expect(s.alias).toBe("Person 1");
  });

  it("never passes a minor's own preferences", () => {
    for (const band of ["teen", "child", "toddler"] as const) {
      expect(promptSubject(minor(band)).styleLine).toBe("Styles: practical, age-appropriate everyday clothes.");
    }
  });

  it("carries styles and formality in the style line", () => {
    expect(promptSubject(adult).styleLine).toBe("Styles: classic. Preferred formality: 6/10.");
    expect(promptSubject({ ...adult, styles: [], formality: null }).styleLine).toBe(
      "Styles: smart casual. Preferred formality: 5/10.",
    );
  });

  it("guides the scorer for children without saying who they are", () => {
    expect(promptSubject(adult).audienceGuide).toBe("");
    expect(promptSubject(minor("child")).audienceGuide).toMatch(/children's wardrobe/);
    expect(promptSubject(minor("teen")).audienceGuide).toMatch(/teenager's wardrobe/);
  });
});

describe("subjectsFor", () => {
  it("numbers adults and letters minors, in order", () => {
    const subjects = subjectsFor([adult, minor("child", "Mia"), minor("teen", "Leo"), { ...adult, display_name: "Alexis" }]);
    expect(subjects.map((s) => s.alias)).toEqual(["Person 1", "Child A", "Teen B", "Person 2"]);
  });
});
