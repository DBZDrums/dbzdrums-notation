import { Bar, Phrase, renderBarToSvg, renderPhraseToSvg } from "../../src/index.js";

type FixtureName = "straight" | "chord" | "compound" | "triplet" | "quarterGrid" | "articulations" | "longPhrase";

declare global {
  interface Window {
    renderNotationFixture: (name: FixtureName) => Promise<string>;
  }
}

function barFor(name: Exclude<FixtureName, "longPhrase">): Bar {
  switch (name) {
    case "straight":
      return new Bar({
        meter: "4/4",
        divisions: 8,
        hits: { bassDrum: ["1.0", "3.0"], snare: ["2.0", "4.0"], hiHat: ["1.0", "1.1", "2.0", "2.1", "3.0", "3.1", "4.0", "4.1"] },
      });
    case "chord":
      return new Bar({
        meter: "4/4",
        divisions: 8,
        hits: { bassDrum: ["1.0", "3.0"], snare: ["2.0", "4.0"], crash: ["1.0"], hiHat: ["2.0", "3.0", "4.0"] },
      });
    case "compound":
      return new Bar({
        meter: "6/8",
        divisions: 6,
        hits: { bassDrum: ["1.0", "4.0"], snare: ["3.0", "6.0"], hiHat: ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"] },
      });
    case "triplet":
      return new Bar({
        meter: "4/4",
        divisions: 12,
        hits: { bassDrum: ["1.0", "3.0"], snare: ["2.0", "4.0"], hiHat: ["1.0", "1.1", "1.2", "2.0", "2.1", "2.2", "3.0", "3.1", "3.2", "4.0", "4.1", "4.2"] },
      });
    case "quarterGrid":
      return new Bar({
        meter: "4/4",
        divisions: 16,
        hits: { bassDrum: ["1.0", "3.0"], snare: ["2.0", "4.0"], hiHat: ["1.0", "2.0", "3.0", "4.0"] },
      });
    case "articulations":
      return new Bar({
        meter: "4/4",
        divisions: 8,
        hits: {
          snare: [{ at: "2.0", articulations: ["flam"] }, { at: "4.0", articulations: ["rim"] }],
          hiHat: [{ at: "1.0", articulations: ["open"] }, { at: "3.0", articulations: ["pedal"] }],
        },
      });
  }
}

window.renderNotationFixture = async (name) => {
  const target = document.querySelector("#target");
  if (!(target instanceof HTMLElement)) throw new Error("Missing fixture target.");
  const result = name === "longPhrase"
    ? await renderPhraseToSvg(
        new Phrase({
          bars: Array.from({ length: 8 }, (_, index) =>
            barFor(index % 2 === 0 ? "straight" : "chord"),
          ),
        }),
        target,
      )
    : await renderBarToSvg(barFor(name), target);
  return result.musicXml;
};
