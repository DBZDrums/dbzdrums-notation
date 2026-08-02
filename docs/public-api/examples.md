# TypeScript examples

All examples import only the package root.

## Build and extend a bar

```ts
import { Bar } from "@dbzdrums/notation";

const base = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: {
    bassDrum: ["1.0", "3.0"],
    snare: ["2.0", "4.0"],
    hiHat: ["1.0", "1.1", "2.0", "2.1", "3.0", "3.1", "4.0", "4.1"],
  },
  annotations: [{ at: "1.0", text: "Verse", placement: "above" }],
});

const variation = base.add(
  "snare",
  { at: "4.1", articulations: ["flam"] },
);

console.log(base.events.length);      // 12
console.log(variation.events.length); // 13
```

`base` remains unchanged. Adding another snare hit at an existing snare position would throw `NotationValidationError` with `DUPLICATE_HIT`.

## Use standard-kit techniques

```ts
import { Bar } from "@dbzdrums/notation";

const techniques = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: {
    snare: [
      "1.0",
      { at: "2.0", articulations: ["rim"] },
      { at: "4.0", articulations: ["flam"] },
    ],
    hiHat: [
      "1.1",
      { at: "2.1", articulations: ["open"] },
      { at: "3.1", articulations: ["pedal"] },
    ],
  },
});
```

Unqualified snare and hi-hat hits already mean normal snare and closed hi-hat. Do not combine `normal`, `rim`, and `flam`, or combine `closed`, `open`, and `pedal`, on one hit.

## Build a mixed-meter phrase

```ts
import { Bar, Phrase } from "@dbzdrums/notation";

const fourFour = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: { bassDrum: ["1.0", "3.0"], snare: ["2.0", "4.0"] },
  annotations: [{ at: "1.0", text: "Keep time" }],
});

const sixEight = new Bar({
  meter: "6/8",
  divisions: 6,
  hits: {
    bassDrum: ["1.0", "4.0"],
    snare: ["3.0", "6.0"],
    hiHat: ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"],
  },
});

const phrase = new Phrase({
  bars: [fourFour, sixEight, fourFour],
  annotations: [
    { bar: 1, at: "4.0", text: "Build", placement: "above" },
    { bar: 2, at: "3.0", text: "Last time" },
  ],
});
```

The `Keep time` bar annotation appears in phrase measures 1 and 3. Phrase annotations appear only at their indexed occurrences.

## Compile and save MusicXML in Node.js

```ts
import { writeFile } from "node:fs/promises";
import { Bar, compileMusicXml } from "@dbzdrums/notation";

const bar = new Bar({
  meter: "4/4",
  divisions: 16,
  hits: {
    bassDrum: ["1.0", "3.0"],
    snare: ["2.0", "4.0"],
    hiHat: ["1.0", "2.0", "3.0", "4.0"],
  },
});

const { musicXml, diagnostics } = compileMusicXml(bar, {
  presentation: {
    showClef: true,
    showTimeSignature: true,
    showFinalBarline: false,
  },
});

if (diagnostics.length > 0) {
  console.warn("MusicXML fallbacks:", diagnostics);
}

await writeFile("groove.musicxml", musicXml, "utf8");
```

Although the bar has a 16-position grid, the attack spacing in this example compiles as quarter notes.

## Define a type-safe custom kit

```ts
import {
  Bar,
  compileMusicXml,
  defineDrumKit,
} from "@dbzdrums/notation";

const compactKit = defineDrumKit({
  id: "compact-kit",
  name: "Compact kit",
  voices: {
    kick: {
      name: "Kick",
      order: 0,
      display: { step: "F", octave: 4, notehead: "normal", stem: "up" },
      midiUnpitched: 36,
      defaultArticulations: ["normal"],
      articulations: {
        normal: { role: "primary", render: "base" },
      },
    },
    splash: {
      name: "Splash",
      order: 1,
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

const customBar = new Bar({
  meter: "3/4",
  divisions: 6,
  kit: compactKit,
  hits: {
    kick: ["1.0", "3.0"],
    splash: [{ at: "2.0", articulations: ["mute"] }],
  },
});

const result = compileMusicXml(customBar);
console.log(result.diagnostics[0]?.code);
// "UNSUPPORTED_ARTICULATION_RENDERING"
```

The literal custom ids drive TypeScript completion: `customBar.add()` accepts only `kick` or `splash`, and splash articulation ids are checked statically. `mute` is retained rhythmically with a base visual fallback. Pass `{ strict: true }` if that fallback must instead block output.

## Render a browser SVG and dispose it

```ts
import {
  Bar,
  renderBarToSvg,
  type RenderResult,
} from "@dbzdrums/notation";

const targetElement = document.querySelector<HTMLElement>("#score");
if (!targetElement) throw new Error("Missing #score render target");
const target: HTMLElement = targetElement;

const bar = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: { snare: ["2.0", "4.0"], hiHat: ["1.0", "2.0", "3.0", "4.0"] },
});

let rendered: RenderResult | undefined;

async function mountScore(): Promise<void> {
  rendered = await renderBarToSvg(bar, target, {
    zoom: 1,
    repeatCount: 3,
    presentation: { showFinalBarline: false },
  });
  rendered.svg.setAttribute("aria-label", "Four-four drum groove, play three times");
}

function unmountScore(): void {
  rendered?.dispose();
  rendered = undefined;
}

await mountScore();
window.addEventListener("pagehide", unmountScore, { once: true });
```

The target must be connected and have positive width before `mountScore()` runs. The `x3` is added only to SVG; `rendered.musicXml` contains no repeat instruction.

## Cancel an obsolete browser render

```ts
import {
  Bar,
  NotationRenderError,
  Phrase,
  renderPhraseToSvg,
  type RenderResult,
} from "@dbzdrums/notation";

const target = document.querySelector<HTMLElement>("#score");
const cancelButton = document.querySelector<HTMLButtonElement>("#cancel-score");
if (!target || !cancelButton) throw new Error("Missing score controls");

const phrase = new Phrase({
  bars: [
    new Bar({ meter: "4/4", divisions: 8, hits: { snare: ["2.0", "4.0"] } }),
    new Bar({ meter: "4/4", divisions: 8, hits: { snare: ["2.0", "4.0"] } }),
  ],
});
const controller = new AbortController();
const cancel = (): void => controller.abort();
cancelButton.addEventListener("click", cancel, { once: true });
let rendered: RenderResult | undefined;

try {
  rendered = await renderPhraseToSvg(phrase, target, {
    signal: controller.signal,
  });
} catch (error) {
  if (error instanceof NotationRenderError && error.code === "RENDER_ABORTED") {
    // Expected when the requesting view is no longer current.
  } else {
    throw error;
  }
} finally {
  cancelButton.removeEventListener("click", cancel);
}

window.addEventListener("pagehide", () => {
  controller.abort();
  rendered?.dispose();
}, { once: true });
```

Cancellation is cooperative. When repeatedly rendering into one container, abort or dispose the previous work and wait for it to settle before starting the replacement, so two renders do not compete for the same container ownership.
