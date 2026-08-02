/**
 * Public entrypoint for authoring validated drum notation, compiling MusicXML,
 * and rendering browser SVG scores.
 *
 * @packageDocumentation
 */

export { Bar } from "./bar.js";
export { Phrase } from "./phrase.js";
export {
  NotationCompilationError,
  NotationRenderError,
  NotationValidationError,
} from "./errors.js";
export { defineDrumKit, standardDrumKit } from "./kit.js";
export { compileMusicXml } from "./musicxml.js";
export { renderBarToSvg, renderPhraseToSvg } from "./render/osmd.js";
export type {
  ArticulationDefinition,
  ArticulationId,
  ArticulationRender,
  ArticulationRole,
  BarDefinition,
  BarEvent,
  BarTextAnnotation,
  CompilationDiagnostic,
  CompilationCode,
  DrumKit,
  DrumVoiceDefinition,
  HitInput,
  HitMap,
  Meter,
  MusicXmlCompileOptions,
  MusicXmlCompileResult,
  NotationIssue,
  Notehead,
  Position,
  PhraseDefinition,
  PhraseTextAnnotation,
  RenderCode,
  RenderOptions,
  RenderResult,
  ScorePresentationOptions,
  StemDirection,
  TextPlacement,
  ValidationCode,
  VoiceDisplay,
  VoiceId,
  VoiceMap,
} from "./types.js";
