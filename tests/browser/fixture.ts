import {
  Bar,
  Phrase,
  renderBarToSvg,
  renderPhraseToSvg,
} from "../../src/index.js";
import type { ScorePresentationOptions } from "../../src/index.js";

type FixtureName =
  | "empty"
  | "straight"
  | "chord"
  | "compound"
  | "triplet"
  | "quarterGrid"
  | "articulations"
  | "longPhrase";

declare global {
  interface Window {
    renderBrowserNotationFixture: (name: FixtureName) => Promise<string>;
    renderPresentationFixture: (
      notation: "bar" | "phrase",
      presentation: ScorePresentationOptions,
    ) => Promise<string>;
    abortNotationFixture: (
      notation: "bar" | "phrase",
      timing: "alreadyAborted" | "afterStart"
    ) => Promise<{
      readonly code: unknown;
      readonly childCount: number;
      readonly hasSvg: boolean;
    }>;
  }
}

function barFor(name: Exclude<FixtureName, "longPhrase">): Bar {
  switch (name) {
    case "empty":
      return new Bar({ meter: "4/4", divisions: 8 });
    case "straight":
      return new Bar({
        meter: "4/4",
        divisions: 8,
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          hiHat: ["1.0", "1.1", "2.0", "2.1", "3.0", "3.1", "4.0", "4.1"],
        },
      });
    case "chord":
      return new Bar({
        meter: "4/4",
        divisions: 8,
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          crash: ["1.0"],
          hiHat: ["2.0", "3.0", "4.0"],
        },
      });
    case "compound":
      return new Bar({
        meter: "6/8",
        divisions: 6,
        hits: {
          bassDrum: ["1.0", "4.0"],
          snare: ["3.0", "6.0"],
          hiHat: ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"],
        },
      });
    case "triplet":
      return new Bar({
        meter: "4/4",
        divisions: 12,
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          hiHat: [
            "1.0",
            "1.1",
            "1.2",
            "2.0",
            "2.1",
            "2.2",
            "3.0",
            "3.1",
            "3.2",
            "4.0",
            "4.1",
            "4.2",
          ],
        },
      });
    case "quarterGrid":
      return new Bar({
        meter: "4/4",
        divisions: 16,
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          hiHat: ["1.0", "2.0", "3.0", "4.0"],
        },
      });
    case "articulations":
      return new Bar({
        meter: "4/4",
        divisions: 8,
        hits: {
          snare: [
            { at: "2.0", articulations: ["flam"] },
            { at: "4.0", articulations: ["rim"] },
          ],
          hiHat: [
            { at: "1.0", articulations: ["open"] },
            { at: "3.0", articulations: ["pedal"] },
          ],
        },
      });
  }
}

window.renderBrowserNotationFixture = async (name) => {
  const target = document.querySelector("#target");
  if (!(target instanceof HTMLElement))
    throw new Error("Missing fixture target.");
  const result =
    name === "longPhrase"
      ? await renderPhraseToSvg(
          new Phrase({
            bars: Array.from({ length: 8 }, (_, index) =>
              barFor(index % 2 === 0 ? "straight" : "chord")
            ),
          }),
          target
        )
      : await renderBarToSvg(barFor(name), target);
  return result.musicXml;
};

window.renderPresentationFixture = async (notation, presentation) => {
  const target = document.querySelector("#target");
  if (!(target instanceof HTMLElement)) {
    throw new Error("Missing fixture target.");
  }
  const input = notation === "phrase"
    ? new Phrase({ bars: [barFor("straight"), barFor("chord")] })
    : barFor("straight");
  const result = input instanceof Phrase
    ? await renderPhraseToSvg(input, target, { presentation })
    : await renderBarToSvg(input, target, { presentation });
  return result.musicXml;
};

window.abortNotationFixture = async (notation, timing) => {
  const target = document.querySelector("#target");
  if (!(target instanceof HTMLElement))
    throw new Error("Missing fixture target.");
  const controller = new AbortController();
  if (timing === "alreadyAborted") controller.abort();
  const input =
    notation === "bar"
      ? barFor("straight")
      : new Phrase({ bars: [barFor("straight"), barFor("chord")] });
  const rendering =
    input instanceof Phrase
      ? renderPhraseToSvg(input, target, { signal: controller.signal })
      : renderBarToSvg(input, target, { signal: controller.signal });
  if (timing === "afterStart") controller.abort();
  try {
    await rendering;
    return {
      code: undefined,
      childCount: target.childElementCount,
      hasSvg: target.querySelector("svg") !== null,
    };
  } catch (error) {
    return {
      code: error instanceof Error && "code" in error ? error.code : undefined,
      childCount: target.childElementCount,
      hasSvg: target.querySelector("svg") !== null,
    };
  }
};
