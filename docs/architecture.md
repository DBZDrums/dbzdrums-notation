# Architecture

The public package is intentionally one installation. Its source has three hard boundaries:

1. `Bar`, `Phrase`, validation, and drum-kit definitions are pure TypeScript and have no runtime dependency.
2. The MusicXML compiler consumes only validated `Bar` or `Phrase` input and returns deterministic XML plus degradation diagnostics.
3. The OSMD adapter dynamically imports OpenSheetMusicDisplay only when `renderBarToSvg()` or `renderPhraseToSvg()` is called. It owns a supplied browser container and verifies the emitted SVG contains exactly five full-length staff lines in every system.

MusicXML is the internal interchange format, not the authoring API. The public browser API compiles and renders in one call; callers can separately retain the MusicXML result for export or inspection.

The package does not contain React, persistence, DBZDrums domain types, DBZScript, or audio behavior. A consumer such as dbzdrums-composer adapts its own immutable data into `Bar` values and an ordered `Phrase` at its boundary. Repeats, labels, and section metadata remain consumer concerns.
