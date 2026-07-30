# Changelog

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
