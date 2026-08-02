**@dbzdrums/notation**

---

# @dbzdrums/notation

Public entrypoint for authoring validated drum notation, compiling MusicXML,
and rendering browser SVG scores.

## Classes

| Class                                                           | Description                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Bar](classes/Bar.md)                                           | An immutable, validated bar of drum notation.                                       |
| [NotationCompilationError](classes/NotationCompilationError.md) | Compilation failure carrying diagnostics that prevented an accepted result.         |
| [NotationRenderError](classes/NotationRenderError.md)           | Browser rendering failure with one stable machine-readable code.                    |
| [NotationValidationError](classes/NotationValidationError.md)   | Aggregated input error thrown while constructing a bar, phrase, or drum kit.        |
| [Phrase](classes/Phrase.md)                                     | An immutable, ordered, non-empty sequence of existing [Bar](classes/Bar.md) values. |

## Interfaces

| Interface                                                          | Description                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [ArticulationDefinition](interfaces/ArticulationDefinition.md)     | Defines the validation role and MusicXML fallback behavior of one articulation.  |
| [BarDefinition](interfaces/BarDefinition.md)                       | Constructor input for an immutable, validated [Bar](classes/Bar.md).             |
| [BarEvent](interfaces/BarEvent.md)                                 | One normalized, immutable attack exposed by [Bar.events](classes/Bar.md#events). |
| [BarTextAnnotation](interfaces/BarTextAnnotation.md)               | A non-empty, single-line text annotation attached to one bar position.           |
| [DrumKit](interfaces/DrumKit.md)                                   | An immutable, validated mapping from authored voice ids to percussion output.    |
| [DrumVoiceDefinition](interfaces/DrumVoiceDefinition.md)           | Defines one named drum voice in a custom [DrumKit](interfaces/DrumKit.md).       |
| [MusicXmlCompileOptions](interfaces/MusicXmlCompileOptions.md)     | Options shared by MusicXML compilation and browser rendering.                    |
| [MusicXmlCompileResult](interfaces/MusicXmlCompileResult.md)       | The deterministic output of [compileMusicXml](functions/compileMusicXml.md).     |
| [NotationIssue](interfaces/NotationIssue.md)                       | A machine-readable validation issue or compilation diagnostic.                   |
| [PhraseDefinition](interfaces/PhraseDefinition.md)                 | Constructor input for an ordered, non-empty [Phrase](classes/Phrase.md).         |
| [PhraseTextAnnotation](interfaces/PhraseTextAnnotation.md)         | A text annotation attached to one specific bar occurrence in a phrase.           |
| [RenderOptions](interfaces/RenderOptions.md)                       | Browser-only options accepted by both SVG rendering functions.                   |
| [RenderResult](interfaces/RenderResult.md)                         | The browser rendering result returned by both SVG rendering functions.           |
| [ScorePresentationOptions](interfaces/ScorePresentationOptions.md) | Controls which standard score markings are visible in MusicXML and SVG output.   |
| [VoiceDisplay](interfaces/VoiceDisplay.md)                         | Defines where and how a drum voice is displayed on the percussion staff.         |

## Type Aliases

| Type Alias                                                     | Description                                                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ArticulationId](type-aliases/ArticulationId.md)               | Articulation ids accepted by one voice in a particular drum-kit type.                                                                                                                      |
| [ArticulationRender](type-aliases/ArticulationRender.md)       | The compiler behavior for an articulation: alter the main `base` note, add a preceding slashed `grace` note, or retain the hit with an `unsupported` diagnostic and base-display fallback. |
| [ArticulationRole](type-aliases/ArticulationRole.md)           | The conflict role of an articulation. A hit may have at most one `primary` articulation and may also have ordered `modifier` articulations.                                                |
| [CompilationCode](type-aliases/CompilationCode.md)             | Machine-readable compiler diagnostic and failure codes.                                                                                                                                    |
| [CompilationDiagnostic](type-aliases/CompilationDiagnostic.md) | A MusicXML degradation or unrepresentable-subdivision failure record.                                                                                                                      |
| [HitInput](type-aliases/HitInput.md)                           | One authored hit, either as an unqualified position or as a position with an ordered list of articulation ids.                                                                             |
| [HitMap](type-aliases/HitMap.md)                               | Type-safe, optional hit arrays keyed by the voices of a drum kit.                                                                                                                          |
| [Meter](type-aliases/Meter.md)                                 | A written time signature in `numerator/denominator` form, such as `4/4` or `6/8`. [Bar](classes/Bar.md) requires a positive numerator and a denominator of 1, 2, 4, 8, 16, or 32.          |
| [Notehead](type-aliases/Notehead.md)                           | A MusicXML notehead supported by drum-voice displays.                                                                                                                                      |
| [Position](type-aliases/Position.md)                           | A canonical bar coordinate in `writtenUnit.subdivision` form.                                                                                                                              |
| [RenderCode](type-aliases/RenderCode.md)                       | Machine-readable codes reported by [NotationRenderError](classes/NotationRenderError.md).                                                                                                  |
| [StemDirection](type-aliases/StemDirection.md)                 | Stem direction accepted in a voice display. The current MusicXML compiler writes percussion note stems upward.                                                                             |
| [TextPlacement](type-aliases/TextPlacement.md)                 | Placement of a text annotation relative to the staff.                                                                                                                                      |
| [ValidationCode](type-aliases/ValidationCode.md)               | Machine-readable codes reported by [NotationValidationError](classes/NotationValidationError.md).                                                                                          |
| [VoiceId](type-aliases/VoiceId.md)                             | String voice ids defined by a particular drum-kit type.                                                                                                                                    |
| [VoiceMap](type-aliases/VoiceMap.md)                           | A record of drum-voice ids to their definitions.                                                                                                                                           |

## Variables

| Variable                                        | Description                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [standardDrumKit](variables/standardDrumKit.md) | Built-in immutable drum kit used when [BarDefinition.kit](interfaces/BarDefinition.md#kit) is omitted. |

## Functions

| Function                                            | Description                                                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [compileMusicXml](functions/compileMusicXml.md)     | Compiles an immutable [Bar](classes/Bar.md) or [Phrase](classes/Phrase.md) to a complete, deterministic MusicXML 4.0 `score-partwise` document. |
| [defineDrumKit](functions/defineDrumKit.md)         | Defines, validates, copies, and freezes a deterministic percussion-kit mapping.                                                                 |
| [renderBarToSvg](functions/renderBarToSvg.md)       | Compiles and renders one [Bar](classes/Bar.md) into an owned browser container.                                                                 |
| [renderPhraseToSvg](functions/renderPhraseToSvg.md) | Compiles and renders an ordered [Phrase](classes/Phrase.md) into an owned browser container.                                                    |
