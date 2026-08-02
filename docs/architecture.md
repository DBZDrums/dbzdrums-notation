# Architecture

The public package is intentionally one installation. Its source has three hard boundaries:

1. `Bar`, `Phrase`, validation, and drum-kit definitions are pure TypeScript and have no runtime dependency.
2. The MusicXML compiler consumes only validated `Bar` or `Phrase` input and returns deterministic XML plus degradation diagnostics.
3. The OSMD adapter dynamically imports OpenSheetMusicDisplay only when `renderBarToSvg()` or `renderPhraseToSvg()` is called. It owns a supplied browser container, supports cooperative `AbortSignal` cancellation at asynchronous checkpoints, restores a small bottom page margin that compact OSMD layouts otherwise remove, and verifies the emitted SVG contains exactly five full-length staff lines in every system. When `repeatCount` is requested, this browser-only boundary reserves space and adds a fixed `xN` label after the final rendered barline or staff end; that visual label is not part of MusicXML. Cancellation cannot interrupt synchronous OSMD work already running, but prevents an obsolete result from being published and clears the owned container.

MusicXML is the internal interchange format, not the authoring API. The public browser API compiles and renders in one call; callers can separately retain the MusicXML result for export or inspection.

The package does not contain React, persistence, DBZDrums domain types, DBZScript, or audio behavior. A consumer such as dbzdrums-composer adapts its own immutable data into `Bar` values and an ordered `Phrase` at its boundary. Bars and phrases may carry neutral, position-anchored text annotations. Semantic repeats, naming, and section metadata remain consumer concerns; `repeatCount` is a visual SVG presentation hint only.
