# Concepts and data model

## Runtime boundaries

The package has three consumer-facing boundaries:

1. `Bar`, `Phrase`, and `defineDrumKit()` are pure TypeScript validation and immutable-value APIs.
2. `compileMusicXml()` synchronously creates deterministic MusicXML and works in Node.js 20+ and browsers.
3. `renderBarToSvg()` and `renderPhraseToSvg()` are browser-only. They dynamically load OpenSheetMusicDisplay (OSMD), require DOM and SVG globals, and own a supplied `HTMLElement` while rendering.

Importing the package does not itself load OSMD, so authoring and compilation do not require a browser. Rendering must not be called during server-side execution.

## Meter, grids, and positions

A `Bar` uses three related values:

- `meter` is a `numerator/denominator` string. The numerator is a positive safe integer. Supported denominators are 1, 2, 4, 8, 16, and 32.
- `divisions` is the total number of addressable grid positions in the bar. It must be a positive safe integer, a multiple of the numerator, and result in 1–32 subdivisions per written unit.
- A `Position` is the canonical string `writtenUnit.subdivision`. Written units start at 1; subdivisions start at 0. Leading zeroes and omitted components are invalid.

For a 4/4 bar with `divisions: 8`, there are two subdivisions per quarter-note unit, so positions run from `"1.0"` through `"4.1"`. For 6/8 with `divisions: 6`, each eighth-note unit has one position, from `"1.0"` through `"6.0"`.

`divisions` controls coordinate precision, not a mandatory note value. Compilation derives note and rest durations from attack spacing. A 16-position 4/4 grid containing attacks only at `"1.0"`, `"2.0"`, `"3.0"`, and `"4.0"` therefore produces quarter-note rhythm rather than forced sixteenth notes.

### Grouping

Optional `grouping` controls beaming only. It is a non-empty array of positive safe integers whose sum equals the meter numerator; it never changes valid coordinates.

When omitted, an `n/8` meter whose numerator is divisible by three uses groups of three (for example, `[3, 3]` in 6/8). Other meters use one written unit per group.

## `Bar`

`new Bar(definition)` validates all supplied data before returning. `kit` defaults to `standardDrumKit`; `hits` and `annotations` default to empty collections.

A successful bar exposes:

- `meter`, `divisions`, and optional explicit `grouping`;
- the exact selected `kit` instance;
- normalized, frozen `events`, sorted by absolute grid slot and then kit voice order;
- normalized, frozen `annotations`;
- derived `timing` with numerator, denominator, and subdivisions per written unit.

Each `BarEvent` contains its voice id, canonical position, parsed unit and subdivision, zero-based absolute slot, and ordered effective articulations after voice defaults are applied.

A bar is frozen and does not expose mutating methods. `bar.add(voice, ...hits)` returns a newly validated `Bar` with the same kit and annotations; the source bar is unchanged. Additions can fail with the same validation errors as construction, including duplicate positions and articulation conflicts.

### Hits and chords

A hit can be an unqualified position string or an object with `at` and optional ordered `articulations`:

```ts
import { Bar } from "@dbzdrums/notation";

const bar = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: {
    snare: ["2.0", { at: "4.0", articulations: ["rim"] }],
  },
});
```

Each voice may attack only once at a position. Different voices at the same position are valid and compile as a chord.

### Text annotations

A `BarTextAnnotation` has a valid `at`, non-empty single-line `text`, and optional `placement` of `"above"` or `"below"`. Placement defaults to `"below"` and is normalized on the constructed value.

Only one annotation is allowed for a given position and placement. One above and one below may share a position. An annotation becomes a standard MusicXML text direction at the exact grid offset and does not alter rhythm. Some exact instruction words, including `Fine`, `Coda`, and `D.C.`, may be interpreted specially by OSMD rather than displayed as neutral prose.

## `Phrase`

A `Phrase` is an ordered, non-empty sequence of existing `Bar` instances. Bars can use different meters, grids, and groupings, but every bar must reference the exact same kit object. Matching kit ids or equivalent definitions are not enough; instance identity is required.

The phrase freezes a copied bars array but retains the bar instances themselves. `phrase.kit` is the first bar's kit. A phrase deliberately has no name, visible measure-number model, or semantic repeat model.

Annotations stored on a bar occur every time that bar instance appears. `PhraseTextAnnotation` adds a zero-based `bar` index for an annotation that belongs to one occurrence. Phrase annotations must fit the target bar's grid and cannot collide with a bar annotation or another phrase annotation at the same occurrence, position, and placement.

## Drum kits

`defineDrumKit()` preserves literal voice and articulation ids in TypeScript, validates the definition, copies nested data, and returns a deeply frozen `DrumKit`.

Kit and voice ids start with a letter and continue with letters, digits, or hyphens. Every voice has:

- a human-readable `name`;
- a unique integer `order`, used for deterministic event and instrument ordering;
- a base `VoiceDisplay` (`step`, `octave`, `notehead`, and `stem`);
- a `midiUnpitched` value from 1 through 127;
- `defaultArticulations`, each of which must name a defined articulation;
- an articulation record.

The kit name becomes the MusicXML part name, and voice names become instrument names. Voice MIDI values are emitted on percussion channel 10. `stem` accepts `"up"` or `"down"` as kit data, but the current MusicXML compiler writes percussion notes with upward stems; use `"up"` when defining output for this version.

### Articulation rules

An articulation has a `role` and `render` strategy:

- A `primary` articulation selects the hit's main technique. A hit may contain at most one primary.
- Ordered `modifier` articulations may accompany one primary. Later display overrides are applied after earlier ones.
- `render: "base"` keeps one main note and may alter its display.
- `render: "grace"` adds a preceding slashed grace note; `graceDisplay` can alter that note and `display` can alter the main note.
- `render: "unsupported"` retains the rhythmic hit, uses its supported base-display fallback, and reports `UNSUPPORTED_ARTICULATION_RENDERING`.

If a hit requests no primary articulation, the voice's `defaultArticulations` are prepended to its requested modifiers. If it requests a primary, defaults are not added. Duplicate articulation ids, unknown ids, and multiple primaries are rejected.

There is no public technique named `default`. `defaultArticulations` is kit-definition configuration for resolving unqualified hits.

### Standard kit

An unqualified hit is the preferred way to author the base technique. Explicit `normal` and `closed` are accepted but redundant.

| Voice | Base display | Accepted primary techniques |
| --- | --- | --- |
| `bassDrum` | F4, normal | `normal` |
| `floorTom` | A4, normal | `normal` |
| `snare` | C5, normal | `normal`, `rim`, `flam` |
| `tom2` | D5, normal | `normal` |
| `tom1` | E5, normal | `normal` |
| `ride` | F5, x | `normal` |
| `hiHat` | G5, x (closed) | `closed`, `open`, `pedal` |
| `crash` | A5, x | `normal` |

Snare `rim` uses an x notehead at C5. `flam` is a standalone primary technique rendered as a preceding slashed grace note plus the normal main note. Hi-hat `open` uses a circle-x notehead at G5; `pedal` uses an x notehead at D4. The standard kit currently defines no modifiers.

## MusicXML compilation

`compileMusicXml(barOrPhrase, options?)` is synchronous and returns a frozen `MusicXmlCompileResult`:

- `musicXml` is a complete MusicXML 4.0 `score-partwise` document;
- `diagnostics` is an ordered, frozen list of non-fatal degradations.

The document contains one percussion part, MIDI channel 10 instruments, a true five-line staff, rests, inferred note durations, chords, beams, tuplets, slashed flam grace notes, and text directions. Phrase bars become ordered measures. Meter and MusicXML division attributes are repeated only when needed.

By default, unsupported custom articulation rendering is a diagnostic and the core hit remains. With `strict: true`, any diagnostic causes `NotationCompilationError` instead of returning a result. A rhythmic value that cannot be represented is always a compilation error because no valid result can be produced.

## Presentation

`ScorePresentationOptions` is accepted under `presentation` by compilation and rendering. Every option defaults to `true`:

- `showClef` controls the percussion clef;
- `showTimeSignature` controls written time signatures;
- `showFinalBarline` controls only the final score barline.

A hidden clef or time signature remains in MusicXML with `print-object="no"`, preserving musical context. A hidden final barline is represented by a final MusicXML `bar-style` of `none`; non-final phrase barlines remain regular.

## Browser rendering and ownership

`renderBarToSvg()` and `renderPhraseToSvg()` first compile their input, then use OSMD to render SVG. The target must be connected to the current document and have a positive layout width. On success, its previous children are replaced and the returned `svg` is the element inside that target.

A `RenderResult` also contains the exact `musicXml` and `diagnostics` used for rendering plus `dispose()`. Call `dispose()` when the chart is removed or before reusing its owned target; disposal synchronously clears the target. Do not call an old result's `dispose()` after assigning that same container to a newer render, because ownership is container-wide.

`zoom` defaults to `1` and is passed as the OSMD scale. `repeatCount`, when present, must be a safe integer of at least 2. It adds a visual `xN` after the final barline (or staff end when that barline is hidden). It is SVG-only: the returned MusicXML is unchanged and contains no semantic repeat instruction.

The renderer guarantees five full-length staff lines in every rendered staff span. If OSMD cannot produce or verify that result, rendering rejects rather than returning a partial score.

### Cancellation

Pass an `AbortSignal` as `RenderOptions.signal`. Cancellation is cooperative: it is checked before rendering and at asynchronous boundaries, but cannot interrupt synchronous OSMD work already running. When cancellation is observed, the target is cleared and the promise rejects with `NotationRenderError` code `RENDER_ABORTED`. An already-aborted signal is handled the same way.
