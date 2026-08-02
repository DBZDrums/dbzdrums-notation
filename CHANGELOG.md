# Changelog

## 0.3.0

### Minor Changes

- 8d73061: Add position-anchored text annotations to bars and phrases, plus an SVG-only `repeatCount` rendering option and playground control.

### Patch Changes

- 60e612a: Publish complete public API documentation and a version-matched `library-skills` Agent Skill for coding agents.
- 092b0b4: Add guarded Makefile targets for preparing, validating, tagging, and atomically pushing package releases.

## 0.2.1

### Patch Changes

- Prevent compact SVG scores from clipping the bottom staff line at particular browser zoom levels.

## 0.2.0

### Minor Changes

- Add shared MusicXML, SVG, and playground controls for the percussion clef, time signature, and final barline.

All notable changes to this project will be documented in this file.

## 0.1.0

- Initial standalone drum-set notation API.
- Immutable `Bar` and `Phrase` models for concise, validated drum-set charts.
- Deterministic MusicXML 4.0 compilation with percussion mapping, rhythmic
  grouping, chords, rests, tuplets, and standard drum techniques.
- Browser SVG rendering through OpenSheetMusicDisplay, including cooperative
  `AbortSignal` cancellation for obsolete renders.
