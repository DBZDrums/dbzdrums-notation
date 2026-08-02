# @dbzdrums/notation

`@dbzdrums/notation` turns concise, validated drum bars and phrases into standards-based MusicXML or a browser SVG chart. It is a standalone TypeScript library: it does not import React or any DBZDrums application type.

## Project documentation

This README is the documentation for library users. Other audiences have dedicated guides:

- [Contributors](CONTRIBUTING.md) — local development, tests, changesets, and pull requests.
- [Coding agents](AGENTS.md) — repository boundaries, safe working rules, and required validation.
- [Generative-AI use disclosure](AI_DISCLOSURE.md) — scope, accountability, and limits of AI assistance.
- [Public API](docs/public-api/index.md) — complete installed-version concepts, examples, errors, and generated reference.
- [Architecture](docs/architecture.md) — shared technical boundaries and design decisions.
- [Release process](docs/releasing.md) — version tags, approval, and package publication.

## Install

```sh
npm install @dbzdrums/notation
```

The npm package includes the [complete public API documentation](docs/public-api/index.md)
and an official [Agent Skill](.agents/skills/dbzdrums-notation/SKILL.md). Agents can optionally
discover installed library skills with:

```sh
npx library-skills
```

## Use

```ts
import { Bar, compileMusicXml, renderBarToSvg } from "@dbzdrums/notation";

let bar = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: {
    bassDrum: ["1.0", "3.0"],
    snare: ["2.0", "4.0"],
    hiHat: ["1.0", "1.1", "2.0", "2.1", "3.0", "3.1", "4.0", "4.1"],
  },
});

bar = bar.add("snare", { at: "4.1", articulations: ["rim"] });

const { musicXml } = compileMusicXml(bar);
const { svg, dispose } = await renderBarToSvg(bar, document.querySelector("#chart")!);
```

`renderBarToSvg()` owns and clears its target container. The target must be connected to the document and have a positive width. Call `dispose()` when the chart is no longer needed.

Attach a single-line comment to a grid position with `annotations`. Text is written as a standard MusicXML direction and defaults to placement below the staff.

```ts
const annotated = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: { snare: ["1.0", "3.0"] },
  annotations: [{ at: "1.0", text: "Lyrics starts" }],
});
```

Only one annotation per position and placement is allowed; one above and one below may share a position. Some exact musical instruction words, such as `Fine`, `Coda`, and `D.C.`, can be interpreted specially by OSMD rather than as neutral comments.

Both SVG render functions accept an optional `signal` in `RenderOptions`. Cancellation is cooperative: it cannot interrupt synchronous OSMD work already in progress, but it prevents an obsolete result from being returned and clears the owned container at asynchronous checkpoints. An aborted render rejects with `NotationRenderError` code `"RENDER_ABORTED"`.

### Phrases

Use `Phrase` for an ordered, non-empty sequence of existing `Bar` values. Each bar may use a different meter or grid resolution, but every bar must use the same drum-kit instance.

```ts
import { Bar, Phrase, compileMusicXml, renderPhraseToSvg } from "@dbzdrums/notation";

const phrase = new Phrase({
  bars: [
    new Bar({ meter: "4/4", divisions: 8, hits: { bassDrum: ["1.0", "3.0"] } }),
    new Bar({ meter: "6/8", divisions: 6, hits: { snare: ["3.0", "6.0"] } }),
  ],
  annotations: [{ bar: 1, at: "3.0", text: "Build" }],
});

const { musicXml } = compileMusicXml(phrase);
const { svg, dispose } = await renderPhraseToSvg(phrase, document.querySelector("#chart")!);
```

`Phrase` deliberately has no name, semantic repeat marks, or visible measure numbers. An annotation stored on a `Bar` appears on every occurrence of that bar; `Phrase.annotations` targets one occurrence by its zero-based `bar` index.

### Score presentation

Pass `presentation` to hide standard score markings in both the returned MusicXML and browser SVG. All markings are visible by default. A hidden clef or time signature remains in MusicXML with `print-object="no"`, so the written meter and percussion context are retained. A hidden final barline is emitted with MusicXML `bar-style` `none`; in a phrase, this applies only to the final measure.

```ts
const presentation = {
  showClef: false,
  showTimeSignature: false,
  showFinalBarline: false,
};

const { musicXml } = compileMusicXml(bar, { presentation });
const { svg, dispose } = await renderBarToSvg(bar, chart, { presentation });
```

SVG rendering also accepts `repeatCount`, a safe integer of 2 or greater. It adds a visual `xN` after the final barline, or after the staff end when the final barline is hidden. This is deliberately SVG-only: it does not change returned MusicXML or add semantic repeat marks.

```ts
const { svg, dispose } = await renderPhraseToSvg(phrase, chart, {
  repeatCount: 3,
});
```

## Input model

- `meter` is a string such as `"4/4"` or `"6/8"`. Supported denominators are 1, 2, 4, 8, 16, and 32.
- `divisions` is the total count of grid positions and must be a multiple of the meter numerator. It defines coordinate precision, not a mandatory written note value: the compiler derives note and rest durations from attack spacing. v0.1 supports 1–32 subdivisions per written unit.
- Positions are canonical strings: `writtenUnit.subdivision`. Written units start at 1; subdivisions start at 0. Thus 4/4 at eight divisions accepts `"1.0"` through `"4.1"`, while 6/8 at six divisions accepts `"1.0"` through `"6.0"`.
- `grouping`, for example `[3, 3]` in 6/8, only controls beaming. It never changes coordinates.
- `Bar` is immutable. `add()` returns a new value.
- `Phrase` is immutable and preserves the input bar order. It validates that its bars share one drum-kit instance.

The default kit exposes `bassDrum`, `floorTom`, `snare`, `tom2`, `tom1`, `ride`, `hiHat`, and `crash`.

### Drum techniques

A hit written as a position string, such as `"2.0"`, is valid for every voice in the standard kit and uses that voice's base technique and display. In particular, an unqualified snare is normal and an unqualified hi-hat is closed. `"normal"` and `"closed"` remain accepted explicit techniques, but they are redundant for authoring; omit `articulations` for the base state. There is no public `"default"` technique — `defaultArticulations` is an internal kit-definition setting used to resolve an unqualified hit.

Each standard-kit hit has at most one primary technique. Snare accepts `normal`, `rim`, or `flam`; hi-hat accepts `closed`, `open`, or `pedal`. Supplying two primary techniques for one hit, such as `rim` plus `flam`, is rejected with `ARTICULATION_CONFLICT`. The general custom-kit API also supports ordered modifier articulations alongside one primary technique, but the standard kit currently defines no modifiers.

| Voice / technique | Staff display | Notehead |
|---|---:|---|
| bassDrum | F4 | normal |
| floorTom | A4 | normal |
| snare normal / flam | C5 | normal |
| snare rim | C5 | x |
| tom2 | D5 | normal |
| tom1 | E5 | normal |
| ride | F5 | x |
| hiHat closed | G5 | x |
| hiHat open | G5 | circle-x |
| hiHat pedal | D4 | x |
| crash | A5 | x |

`rim` is written with an `x` notehead at C5. `flam` is emitted as a preceding slashed grace note and a normal main snare note, so it is written as `{ at: "2.0", articulations: ["flam"] }`; it is not combined with `normal` or `rim`. Hi-hat `open` uses a `circle-x` notehead at G5, while `pedal` uses an `x` notehead at D4. A custom kit is created with `defineDrumKit()` and can explicitly mark an articulation as `unsupported`. Compilation then retains the core event, emits its base visual fallback, and reports a diagnostic; `strict: true` turns that diagnostic into a `NotationCompilationError`.

## MusicXML and SVG guarantees

The compiler produces a one-part MusicXML 4.0 `score-partwise` document with MIDI channel 10 instruments, a true five-line staff, rhythm inferred from attack spacing, rests, chords, beams, tuplets, and position-anchored text directions. By default it also shows a percussion clef, time signature, and final barline; `presentation` can hide those markings without removing their MusicXML semantics. A phrase compiles into ordered MusicXML measures and repeats attributes only when a meter or MusicXML division value changes. SVG rendering is delegated to OpenSheetMusicDisplay 2.1.0, loaded only by the browser renderer; visual `repeatCount` labels are added to the completed SVG.

`compileMusicXml()` is usable in Node and browser environments. `renderBarToSvg()` and `renderPhraseToSvg()` are browser-only. Playback, MIDI output, PDF output, React bindings, semantic repeat conventions, and application-specific DBZDrums adapters are deliberately outside the package.

## Local development

This is a quick reference for running the project. Human contribution expectations are in
[CONTRIBUTING.md](CONTRIBUTING.md); automated agents must follow [AGENTS.md](AGENTS.md).

```sh
npm install
npm run dev
npm run check
npm run setup:browsers
npm run test:browser
```

`npm run dev` opens the repository's interactive playground. It lets you toggle
drum hits in a grid, add, duplicate, remove, and select bars in a phrase, edit
annotations in the corresponding JSON definition, preview an optional visual
repeat count, inspect the TypeScript call and MusicXML, download the generated
`.musicxml`, and see the actual OSMD SVG. The playground
is a development showcase, not part of the published package or its core runtime.

Playwright runs the real renderer in Chromium and Firefox. It asserts five visible, full-length staff lines, barlines, rendered notehead glyph counts, no browser errors, and a compact visual-regression screenshot in each browser.
