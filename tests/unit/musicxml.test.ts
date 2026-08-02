import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import {
  Bar,
  NotationCompilationError,
  Phrase,
  compileMusicXml,
  defineDrumKit,
} from "../../src/index.js";
import type { MusicXmlCompileOptions } from "../../src/index.js";

function documentFor(notation: Bar | Phrase, options: MusicXmlCompileOptions = {}) {
  const result = compileMusicXml(notation, options);
  const document = new DOMParser().parseFromString(result.musicXml, "application/xml");
  expect(document.getElementsByTagName("parsererror").length).toBe(0);
  return { result, document };
}

function text(element: Element | undefined): string | undefined {
  return element?.textContent ?? undefined;
}

function children(document: Document, tag: string): Element[] {
  return Array.from(document.getElementsByTagName(tag));
}

function nonChordDurationTotal(document: Document): number {
  return children(document, "note")
    .filter((note) => note.getElementsByTagName("chord").length === 0)
    .filter((note) => note.getElementsByTagName("grace").length === 0)
    .reduce((total, note) => total + Number(text(note.getElementsByTagName("duration")[0])), 0);
}

describe("compileMusicXml", () => {
  it("emits a complete 4/4 five-line percussion score with deterministic chords", () => {
    const bar = new Bar({
      meter: "4/4",
      divisions: 8,
      hits: {
        hiHat: ["1.0"],
        snare: ["1.0"],
        bassDrum: ["1.0"],
        tom1: ["1.0"],
        crash: ["1.0"],
      },
    });
    const { result, document } = documentFor(bar);
    const unpitched = children(document, "unpitched");
    const notes = children(document, "note");

    expect(result.musicXml).toContain('<score-partwise version="4.0">');
    expect(text(children(document, "sign")[0])).toBe("percussion");
    expect(text(children(document, "staff-lines")[0])).toBe("5");
    expect(text(children(document, "beats")[0])).toBe("4");
    expect(text(children(document, "beat-type")[0])).toBe("4");
    expect(unpitched.map((node) => text(node))).toEqual(["F4", "C5", "E5", "G5", "A5"]);
    expect(notes.filter((note) => note.getElementsByTagName("chord").length > 0)).toHaveLength(4);
    expect(children(document, "bar-style").map((node) => text(node))).toContain("light-heavy");
    expect(nonChordDurationTotal(document)).toBe(8);
  });

  it("writes straight eighths and sixteenths with rests and beams", () => {
    const eighth = documentFor(
      new Bar({ meter: "4/4", divisions: 8, hits: { hiHat: ["1.0", "1.1"] } }),
    ).document;
    expect(children(eighth, "type").map((node) => text(node))).toContain("eighth");
    expect(children(eighth, "rest")).toHaveLength(3);
    expect(children(eighth, "beam").map((node) => text(node))).toContain("begin");

    const sixteenth = documentFor(
      new Bar({ meter: "4/4", divisions: 16, hits: { snare: ["1.0", "1.1", "1.2", "1.3"] } }),
    ).document;
    expect(children(sixteenth, "type").map((node) => text(node))).toContain("16th");
    expect(children(sixteenth, "beam").some((node) => node.getAttribute("number") === "2")).toBe(true);
    expect(nonChordDurationTotal(sixteenth)).toBe(16);
  });

  it("uses the attack rhythm instead of the grid resolution for sparse hits", () => {
    const { document } = documentFor(
      new Bar({
        meter: "4/4",
        divisions: 16,
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          hiHat: ["1.0", "2.0", "3.0", "4.0"],
        },
      }),
    );

    expect(children(document, "type").map((node) => text(node))).toEqual(
      Array(8).fill("quarter"),
    );
    expect(children(document, "rest")).toHaveLength(0);
    expect(children(document, "beam")).toHaveLength(0);
    expect(children(document, "time-modification")).toHaveLength(0);
    expect(nonChordDurationTotal(document)).toBe(16);
  });

  it("uses dots when a sparse grid interval has a dotted duration", () => {
    const { document } = documentFor(
      new Bar({ meter: "4/4", divisions: 16, hits: { hiHat: ["1.0", "1.3"] } }),
    );

    expect(children(document, "type").map((node) => text(node))).toContain("eighth");
    expect(children(document, "dot")).toHaveLength(1);
    expect(nonChordDurationTotal(document)).toBe(16);
  });

  it("handles 6/8 grouping and triplets", () => {
    const compound = documentFor(
      new Bar({
        meter: "6/8",
        divisions: 6,
        hits: { hiHat: ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"] },
      }),
    ).document;
    expect(text(children(compound, "beats")[0])).toBe("6");
    expect(text(children(compound, "beat-type")[0])).toBe("8");
    expect(nonChordDurationTotal(compound)).toBe(6);
    expect(children(compound, "beam").map((node) => text(node))).toContain("continue");

    const triplet = documentFor(
      new Bar({ meter: "4/4", divisions: 12, hits: { snare: ["1.0", "1.1", "1.2"] } }),
    ).document;
    expect(children(triplet, "actual-notes").map((node) => text(node))).toContain("3");
    expect(children(triplet, "normal-notes").map((node) => text(node))).toContain("2");
    expect(children(triplet, "tuplet").map((node) => node.getAttribute("type"))).toContain("start");
    expect(nonChordDurationTotal(triplet)).toBe(12);

    const quarterGrid = documentFor(
      new Bar({
        meter: "4/4",
        divisions: 12,
        hits: { hiHat: ["1.0", "2.0", "3.0", "4.0"] },
      }),
    ).document;
    expect(children(quarterGrid, "type").map((node) => text(node))).toEqual(
      Array(4).fill("quarter"),
    );
    expect(children(quarterGrid, "time-modification")).toHaveLength(0);
    expect(children(quarterGrid, "tuplet")).toHaveLength(0);
  });

  it("maps articulations deliberately, including a slashed flam grace note", () => {
    const { document } = documentFor(
      new Bar({
        meter: "4/4",
        divisions: 8,
        hits: {
          snare: [{ at: "2.0", articulations: ["flam"] }, { at: "4.0", articulations: ["rim"] }],
          hiHat: [
            { at: "1.0", articulations: ["open"] },
            { at: "3.0", articulations: ["pedal"] },
          ],
        },
      }),
    );
    expect(children(document, "grace")[0]?.getAttribute("slash")).toBe("yes");
    const graceParent = children(document, "grace")[0]?.parentNode as Element | null;
    expect(graceParent?.getElementsByTagName("duration").length).toBe(0);
    expect(children(document, "notehead").map((node) => text(node))).toContain("circle-x");
    expect(children(document, "notehead").map((node) => text(node))).toContain("x");
    expect(children(document, "display-octave").map((node) => text(node))).toContain("4");
  });

  it("reports unsupported custom display mappings and makes strict compilation fail", () => {
    const kit = defineDrumKit({
      id: "diagnostic-kit",
      name: "Diagnostic kit",
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
      meter: "4/4",
      divisions: 8,
      kit,
      hits: { splash: [{ at: "1.0", articulations: ["mute"] }] },
    });
    expect(compileMusicXml(bar).diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "UNSUPPORTED_ARTICULATION_RENDERING",
    ]);
    expect(() => compileMusicXml(bar, { strict: true })).toThrow(NotationCompilationError);
  });

  it("writes escaped text directions at exact grid offsets without changing rhythm", () => {
    const { document } = documentFor(
      new Bar({
        meter: "4/4",
        divisions: 8,
        hits: { hiHat: ["1.0", "1.1", "2.0", "2.1", "3.0", "3.1", "4.0", "4.1"] },
        annotations: [
          { at: "2.1", text: "Count & listen", placement: "above" },
          { at: "1.0", text: "Lyrics starts" },
        ],
      }),
    );
    const directions = children(document, "direction");

    expect(directions).toHaveLength(2);
    expect(directions.map((direction) => direction.getAttribute("placement"))).toEqual([
      "below",
      "above",
    ]);
    expect(directions.map((direction) => text(direction.getElementsByTagName("words")[0]))).toEqual([
      "Lyrics starts",
      "Count & listen",
    ]);
    expect(directions.map((direction) => text(direction.getElementsByTagName("offset")[0]))).toEqual([
      "0",
      "3",
    ]);
    expect(nonChordDurationTotal(document)).toBe(8);
  });

  it("combines reusable bar annotations with phrase occurrence annotations", () => {
    const first = new Bar({
      meter: "4/4",
      divisions: 8,
      annotations: [{ at: "1.0", text: "Every occurrence" }],
    });
    const phrase = new Phrase({
      bars: [first, first],
      annotations: [{ bar: 1, at: "2.0", text: "Only the second" }],
    });
    const { document } = documentFor(phrase);
    const measures = children(document, "measure");

    expect(
      Array.from(measures[0]!.getElementsByTagName("words")).map((node) => text(node)),
    ).toEqual(["Every occurrence"]);
    expect(
      Array.from(measures[1]!.getElementsByTagName("words")).map((node) => text(node)),
    ).toEqual(["Every occurrence", "Only the second"]);
  });

  it("compiles a phrase into ordered measures, including meter and division changes", () => {
    const phrase = new Phrase({
      bars: [
        new Bar({ meter: "4/4", divisions: 8, hits: { bassDrum: ["1.0"] } }),
        new Bar({ meter: "6/8", divisions: 12, hits: { snare: ["4.0"] } }),
      ],
    });
    const { document } = documentFor(phrase);
    const measures = children(document, "measure");
    const attributes = children(document, "attributes");

    expect(measures.map((measure) => measure.getAttribute("number"))).toEqual(["1", "2"]);
    expect(children(document, "part")).toHaveLength(1);
    expect(attributes).toHaveLength(2);
    expect(text(attributes[0]?.getElementsByTagName("beats")[0])).toBe("4");
    expect(text(attributes[1]?.getElementsByTagName("beats")[0])).toBe("6");
    expect(text(attributes[1]?.getElementsByTagName("beat-type")[0])).toBe("8");
    expect(text(attributes[1]?.getElementsByTagName("divisions")[0])).toBe("4");
    expect(children(document, "clef")).toHaveLength(1);
    expect(children(document, "staff-details")).toHaveLength(1);
    expect(children(document, "bar-style").map((node) => text(node))).toEqual([
      "regular",
      "light-heavy",
    ]);
  });

  it("can hide score markings while retaining MusicXML timing and bar structure", () => {
    const phrase = new Phrase({
      bars: [
        new Bar({ meter: "4/4", divisions: 8, hits: { bassDrum: ["1.0"] } }),
        new Bar({ meter: "6/8", divisions: 12, hits: { snare: ["4.0"] } }),
      ],
    });
    const { document } = documentFor(phrase, {
      presentation: {
        showClef: false,
        showTimeSignature: false,
        showFinalBarline: false,
      },
    });

    const clefs = children(document, "clef");
    const times = children(document, "time");
    expect(clefs).toHaveLength(1);
    expect(clefs[0]?.getAttribute("print-object")).toBe("no");
    expect(times).toHaveLength(2);
    expect(times.every((time) => time.getAttribute("print-object") === "no")).toBe(true);
    expect(times.map((time) => text(time.getElementsByTagName("beats")[0]))).toEqual(["4", "6"]);
    expect(children(document, "bar-style").map((node) => text(node))).toEqual([
      "regular",
      "none",
    ]);
  });

  it("includes the bar index in phrase diagnostics", () => {
    const kit = defineDrumKit({
      id: "phrase-diagnostic-kit",
      name: "Phrase diagnostic kit",
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
    const phrase = new Phrase({
      bars: [
        new Bar({ meter: "4/4", divisions: 8, kit }),
        new Bar({
          meter: "4/4",
          divisions: 8,
          kit,
          hits: { splash: [{ at: "1.0", articulations: ["mute"] }] },
        }),
      ],
    });

    expect(compileMusicXml(phrase).diagnostics[0]?.path).toBe("bars[1].events.splash.1.0");
  });
});
