# Architecture

The public package is intentionally one installation. Its source has three hard boundaries:

1. `Bar`, validation, and drum-kit definitions are pure TypeScript and have no runtime dependency.
2. The MusicXML compiler consumes only a validated `Bar` and returns deterministic XML plus degradation diagnostics.
3. The OSMD adapter dynamically imports OpenSheetMusicDisplay only when `renderBarToSvg()` is called. It owns a supplied browser container and verifies the emitted SVG contains exactly five full-length staff lines.

MusicXML is the internal interchange format, not the authoring API. The public browser API compiles and renders in one call; callers can separately retain the MusicXML result for export or inspection.

The package does not contain React, persistence, DBZDrums domain types, DBZScript, or audio behavior. A consumer such as dbzdrums-composer adapts its own immutable data into a `Bar` at its boundary.
