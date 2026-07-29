import { describe, expect, it } from "vitest";
import {
  Bar,
  NotationValidationError,
  Phrase,
  defineDrumKit,
  standardDrumKit,
} from "../../src/index.js";

describe("Bar", () => {
  const createUnchecked = (definition: unknown): Bar => new Bar(definition as any);
  it("accepts canonical positions and resolves default techniques", () => {
    const bar = new Bar({
      meter: "4/4",
      divisions: 8,
      hits: { snare: ["2.0"], hiHat: ["1.1"] },
    });

    expect(bar.events).toEqual([
      expect.objectContaining({ voice: "hiHat", at: "1.1", slot: 1, articulations: ["closed"] }),
      expect.objectContaining({ voice: "snare", at: "2.0", slot: 2, articulations: ["normal"] }),
    ]);
    expect(Object.isFrozen(bar)).toBe(true);
    expect(Object.isFrozen(bar.events)).toBe(true);
  });

  it("adds hits immutably", () => {
    const original = new Bar({ meter: "4/4", divisions: 8 });
    const next = original.add("snare", "2.0", { at: "4.1", articulations: ["rim"] });

    expect(original.events).toHaveLength(0);
    expect(next.events).toHaveLength(2);
    expect(next.events.map((event) => event.articulations)).toEqual([
      ["normal"],
      ["rim"],
    ]);
  });

  it.each([
    [{ meter: "4/3", divisions: 8 }, "INVALID_METER"],
    [{ meter: "4/4", divisions: 7 }, "INVALID_DIVISIONS"],
    [{ meter: "4/4", divisions: 132 }, "INVALID_DIVISIONS"],
    [{ meter: "4/4", divisions: 8, grouping: [3] }, "INVALID_GROUPING"],
    [{ meter: "4/4", divisions: 8, hits: { snare: ["0.0"] } }, "INVALID_POSITION_FORMAT"],
    [{ meter: "4/4", divisions: 8, hits: { snare: ["4.2"] } }, "POSITION_OUT_OF_RANGE"],
    [{ meter: "4/4", divisions: 8, hits: { cowbell: ["1.0"] } }, "UNKNOWN_VOICE"],
    [{ meter: "4/4", divisions: 8, hits: { snare: [{ at: "1.0", articulations: ["buzz"] }] } }, "UNKNOWN_ARTICULATION"],
  ] as const)("rejects %o", (definition, code) => {
    expect(() => createUnchecked(definition)).toThrow(NotationValidationError);
    try {
      createUnchecked(definition);
    } catch (error) {
      expect(error).toBeInstanceOf(NotationValidationError);
      expect((error as NotationValidationError).issues.map((issue) => issue.code)).toContain(code);
    }
  });

  it("rejects duplicate hits and incompatible primary articulations", () => {
    for (const definition of [
      { meter: "4/4" as const, divisions: 8, hits: { snare: ["1.0", "1.0"] } },
      {
        meter: "4/4" as const,
        divisions: 8,
        hits: { snare: [{ at: "1.0" as const, articulations: ["normal", "rim"] }] },
      },
      {
        meter: "4/4" as const,
        divisions: 8,
        hits: { snare: [{ at: "1.0" as const, articulations: ["rim", "flam"] }] },
      },
    ]) {
      expect(() => createUnchecked(definition)).toThrow(NotationValidationError);
    }
  });

  it("treats a flam as a standalone snare technique", () => {
    const bar = new Bar({
      meter: "4/4",
      divisions: 8,
      hits: { snare: [{ at: "2.0", articulations: ["flam"] }] },
    });

    expect(bar.events[0]?.articulations).toEqual(["flam"]);
  });

  it("supports a declarative custom kit", () => {
    const kit = defineDrumKit({
      id: "small-kit",
      name: "Small kit",
      voices: {
        splash: {
          name: "Splash",
          order: 0,
          display: { step: "B", octave: 5, notehead: "x", stem: "up" },
          midiUnpitched: 55,
          defaultArticulations: ["normal"],
          articulations: {
            normal: { role: "primary", render: "base" },
            mute: { role: "modifier", render: "unsupported" },
          },
        },
      },
    } as const);
    const bar = new Bar({
      meter: "3/4",
      divisions: 6,
      kit,
      hits: { splash: [{ at: "1.0", articulations: ["mute"] }] },
    });

    expect(bar.kit).toBe(kit);
    expect(bar.events[0]?.articulations).toEqual(["normal", "mute"]);
  });

  it("keeps the documented standard kit independent from callers", () => {
    expect(standardDrumKit.voices.snare.display.step).toBe("C");
    expect(Object.isFrozen(standardDrumKit.voices.snare.articulations)).toBe(true);
  });
});

describe("Phrase", () => {
  it("keeps an ordered, immutable sequence of bars", () => {
    const first = new Bar({ meter: "4/4", divisions: 8, hits: { bassDrum: ["1.0"] } });
    const second = new Bar({ meter: "6/8", divisions: 6, hits: { snare: ["4.0"] } });
    const phrase = new Phrase({ bars: [first, second] });

    expect(phrase.bars).toEqual([first, second]);
    expect(phrase.kit).toBe(standardDrumKit);
    expect(Object.isFrozen(phrase)).toBe(true);
    expect(Object.isFrozen(phrase.bars)).toBe(true);
  });

  it.each([
    [{ bars: [] }, "EMPTY_PHRASE"],
    [{ bars: [new Bar({ meter: "4/4", divisions: 8 }), {}] }, "INVALID_PHRASE"],
  ] as const)("rejects an invalid bar sequence", (definition, code) => {
    expect(() => new Phrase(definition as any)).toThrow(NotationValidationError);
    try {
      new Phrase(definition as any);
    } catch (error) {
      expect(error).toBeInstanceOf(NotationValidationError);
      expect((error as NotationValidationError).issues.map((issue) => issue.code)).toContain(code);
    }
  });

  it("requires all bars to use the same kit instance", () => {
    const alternateKit = defineDrumKit({
      id: "alternate-kit",
      name: "Alternate kit",
      voices: {
        snare: {
          name: "Snare",
          order: 0,
          display: { step: "C", octave: 5, notehead: "normal", stem: "up" },
          midiUnpitched: 38,
          defaultArticulations: ["normal"],
          articulations: { normal: { role: "primary", render: "base" } },
        },
      },
    } as const);
    const standardBar = new Bar({ meter: "4/4", divisions: 8 });
    const alternateBar = new Bar({ meter: "4/4", divisions: 8, kit: alternateKit });

    expect(() => new Phrase({ bars: [standardBar, alternateBar] } as any)).toThrow(
      NotationValidationError,
    );
  });
});
