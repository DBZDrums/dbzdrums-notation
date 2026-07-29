/** A bar coordinate written as a one-based unit and zero-based subdivision. */
export type Position = `${number}.${number}`;

/** A written time signature such as `4/4` or `6/8`. */
export type Meter = `${number}/${number}`;

export type Notehead = "normal" | "x" | "circle-x";
export type StemDirection = "up" | "down";
export type ArticulationRole = "primary" | "modifier";
export type ArticulationRender = "base" | "grace" | "unsupported";

export interface VoiceDisplay {
  readonly step: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  readonly octave: number;
  readonly notehead: Notehead;
  readonly stem: StemDirection;
}

export interface ArticulationDefinition {
  readonly role: ArticulationRole;
  /** `grace` produces a preceding slashed grace note. */
  readonly render: ArticulationRender;
  /** Overrides the base voice display for this articulation. */
  readonly display?: Partial<VoiceDisplay>;
  /** Overrides the display used for the grace note itself. */
  readonly graceDisplay?: Partial<VoiceDisplay>;
}

export interface DrumVoiceDefinition {
  readonly name: string;
  readonly order: number;
  readonly display: VoiceDisplay;
  readonly midiUnpitched: number;
  readonly defaultArticulations: readonly string[];
  readonly articulations: Readonly<Record<string, ArticulationDefinition>>;
}

export type VoiceMap = Record<string, DrumVoiceDefinition>;

export interface DrumKit<V extends VoiceMap = VoiceMap> {
  readonly id: string;
  readonly name: string;
  readonly voices: Readonly<V>;
}

export type VoiceId<K extends DrumKit> = Extract<keyof K["voices"], string>;
export type ArticulationId<
  K extends DrumKit,
  V extends VoiceId<K>,
> = Extract<keyof K["voices"][V]["articulations"], string>;

export type HitInput<A extends string = string> =
  | Position
  | {
      readonly at: Position;
      readonly articulations?: readonly A[];
    };

export type HitMap<K extends DrumKit> = Partial<{
  readonly [V in VoiceId<K>]: readonly HitInput<ArticulationId<K, V>>[];
}>;

export interface BarDefinition<K extends DrumKit = DrumKit> {
  readonly meter: Meter;
  readonly divisions: number;
  readonly grouping?: readonly number[];
  readonly kit?: K;
  readonly hits?: HitMap<K>;
}

export interface BarEvent {
  readonly voice: string;
  readonly at: Position;
  readonly unit: number;
  readonly subdivision: number;
  readonly slot: number;
  /** Ordered, effective articulations after defaults have been applied. */
  readonly articulations: readonly string[];
}

export type ValidationCode =
  | "INVALID_METER"
  | "INVALID_DIVISIONS"
  | "INVALID_GROUPING"
  | "INVALID_POSITION_FORMAT"
  | "POSITION_OUT_OF_RANGE"
  | "UNKNOWN_VOICE"
  | "UNKNOWN_ARTICULATION"
  | "ARTICULATION_CONFLICT"
  | "DUPLICATE_HIT"
  | "INVALID_KIT";

export type CompilationCode =
  | "UNSUPPORTED_ARTICULATION_RENDERING"
  | "UNSUPPORTED_SUBDIVISION";

export type RenderCode =
  | "RENDER_TARGET_INVALID"
  | "OSMD_RENDER_FAILED"
  | "STAFF_LINE_COUNT_INVALID";

export interface NotationIssue<C extends string = string> {
  readonly code: C;
  readonly message: string;
  readonly path?: string;
}

export type CompilationDiagnostic = NotationIssue<CompilationCode>;

export interface MusicXmlCompileOptions {
  readonly strict?: boolean;
}

export interface MusicXmlCompileResult {
  readonly musicXml: string;
  readonly diagnostics: readonly CompilationDiagnostic[];
}

export interface RenderOptions extends MusicXmlCompileOptions {
  /** OSMD scale; defaults to 1. */
  readonly zoom?: number;
}

export interface RenderResult extends MusicXmlCompileResult {
  readonly svg: SVGSVGElement;
  dispose(): void;
}
