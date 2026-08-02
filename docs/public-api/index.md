# `@dbzdrums/notation` public API

This is the consumer documentation shipped with `@dbzdrums/notation`. It describes the installed package version and is the source of truth for using its public entrypoint.

The library creates immutable, validated drum bars and phrases, compiles them to deterministic MusicXML 4.0, and can render that MusicXML as a five-line SVG percussion score in a browser.

## Install and import

```sh
npm install @dbzdrums/notation
```

```ts
import {
  Bar,
  Phrase,
  compileMusicXml,
  renderPhraseToSvg,
} from "@dbzdrums/notation";
```

The package provides ESM, CommonJS, and TypeScript declarations. Node.js 20 or newer is supported. Authoring, validation, kit definition, and MusicXML compilation work in Node.js and browsers. SVG rendering is browser-only and requires a live DOM; OpenSheetMusicDisplay is loaded only when a render function is called.

## Minimal workflow

```ts
import { Bar, compileMusicXml } from "@dbzdrums/notation";

const bar = new Bar({
  meter: "4/4",
  divisions: 8,
  hits: {
    bassDrum: ["1.0", "3.0"],
    snare: ["2.0", "4.0"],
    hiHat: ["1.0", "1.1", "2.0", "2.1", "3.0", "3.1", "4.0", "4.1"],
  },
});

const { musicXml, diagnostics } = compileMusicXml(bar);
```

Construction is the validation boundary. A successfully constructed `Bar`, `Phrase`, or custom kit is immutable and safe to compile repeatedly.

## Read by task

- [Concepts](concepts.md) — grids, bars, phrases, annotations, kits, articulations, output, presentation, rendering lifecycle, and environments.
- [Errors and diagnostics](errors-and-diagnostics.md) — exception classes, strict mode, cancellation, and every public error code.
- [Examples](examples.md) — complete TypeScript patterns for authoring, custom kits, compilation, browser rendering, cleanup, and cancellation.
- [Generated reference](reference/index.md) — TypeDoc signatures, members, parameters, defaults, return types, and throws clauses for every public export.

## Public export map

### Values

- `Bar`, `Phrase`
- `defineDrumKit`, `standardDrumKit`
- `compileMusicXml`
- `renderBarToSvg`, `renderPhraseToSvg`
- `NotationValidationError`, `NotationCompilationError`, `NotationRenderError`

### Types

- Authoring: `BarDefinition`, `PhraseDefinition`, `Meter`, `Position`, `HitInput`, `HitMap`, `BarEvent`, `BarTextAnnotation`, `PhraseTextAnnotation`, `TextPlacement`
- Kits and articulations: `DrumKit`, `VoiceMap`, `VoiceId`, `DrumVoiceDefinition`, `VoiceDisplay`, `Notehead`, `StemDirection`, `ArticulationDefinition`, `ArticulationId`, `ArticulationRole`, `ArticulationRender`
- Compilation and presentation: `MusicXmlCompileOptions`, `MusicXmlCompileResult`, `ScorePresentationOptions`, `CompilationDiagnostic`, `CompilationCode`
- Rendering: `RenderOptions`, `RenderResult`, `RenderCode`
- Issues: `NotationIssue`, `ValidationCode`

Only symbols exported from the package root are public. Application adapters, playback, MIDI output, PDF output, React bindings, persistence, and semantic repeat models are outside this package.
