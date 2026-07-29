# @dbzdrums/notation

`@dbzdrums/notation` turns a concise, validated one-bar drum pattern into standards-based MusicXML or a browser SVG chart. It is a standalone TypeScript library: it does not import React or any DBZDrums application type.

## Project documentation

This README is the documentation for library users. Other audiences have dedicated guides:

- [Contributors](CONTRIBUTING.md) — local development, tests, changesets, and pull requests.
- [Coding agents](AGENTS.md) — repository boundaries, safe working rules, and required validation.
- [Architecture](docs/architecture.md) — shared technical boundaries and design decisions.

## Install

```sh
npm install @dbzdrums/notation
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

## Input model

- `meter` is a string such as `"4/4"` or `"6/8"`. Supported denominators are 1, 2, 4, 8, 16, and 32.
- `divisions` is the total count of grid positions and must be a multiple of the meter numerator. It defines coordinate precision, not a mandatory written note value: the compiler derives note and rest durations from attack spacing. v0.1 supports 1–32 subdivisions per written unit.
- Positions are canonical strings: `writtenUnit.subdivision`. Written units start at 1; subdivisions start at 0. Thus 4/4 at eight divisions accepts `"1.0"` through `"4.1"`, while 6/8 at six divisions accepts `"1.0"` through `"6.0"`.
- `grouping`, for example `[3, 3]` in 6/8, only controls beaming. It never changes coordinates.
- `Bar` is immutable. `add()` returns a new value.

The default kit exposes `bassDrum`, `floorTom`, `snare`, `tom2`, `tom1`, `ride`, `hiHat`, and `crash`. Snare supports the mutually exclusive techniques `normal`, `flam`, and `rim`; hi-hat supports `closed`, `open`, and `pedal`.

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

`flam` is emitted as a preceding slashed grace note and a normal main snare note, so it is written as `{ at: "2.0", articulations: ["flam"] }`; it is not combined with `normal` or `rim`. A custom kit is created with `defineDrumKit()` and can explicitly mark an articulation as `unsupported`. Compilation then retains the core event, emits its base visual fallback, and reports a diagnostic; `strict: true` turns that diagnostic into a `NotationCompilationError`.

## MusicXML and SVG guarantees

The compiler produces a one-part MusicXML 4.0 `score-partwise` document with percussion clef, MIDI channel 10 instruments, a true five-line staff, time signature, rhythm inferred from attack spacing, rests, chords, beams, tuplets, and final barline. SVG rendering is delegated to OpenSheetMusicDisplay 2.1.0, loaded only by the browser renderer.

`compileMusicXml()` is usable in Node and browser environments. `renderBarToSvg()` is browser-only. Multiple bars, playback, MIDI output, PDF output, React bindings, and application-specific DBZDrums adapters are deliberately outside v0.1.

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
drum hits in a grid, edit the corresponding `Bar` JSON definition, inspect the
TypeScript call and MusicXML, download the generated `.musicxml`, and see the
actual OSMD SVG. The playground is a development showcase, not part of the
published package or its core runtime.

Playwright runs the real renderer in Chromium and Firefox. It asserts five full-length staff lines, barlines, rendered notehead glyph counts, no browser errors, and a compact visual-regression screenshot in each browser.
