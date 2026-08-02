/**
 * A canonical bar coordinate in `writtenUnit.subdivision` form.
 *
 * Written units are one-based and subdivisions are zero-based. The template
 * literal type describes the string shape; {@link Bar} validates canonical
 * formatting and checks the coordinate against its grid at runtime.
 */
export type Position = `${number}.${number}`;

/**
 * A written time signature in `numerator/denominator` form, such as `4/4` or
 * `6/8`. {@link Bar} requires a positive numerator and a denominator of 1, 2,
 * 4, 8, 16, or 32.
 */
export type Meter = `${number}/${number}`;

/** A MusicXML notehead supported by drum-voice displays. */
export type Notehead = "normal" | "x" | "circle-x";

/**
 * Stem direction accepted in a voice display. The current MusicXML compiler
 * writes percussion note stems upward.
 */
export type StemDirection = "up" | "down";

/** Placement of a text annotation relative to the staff. */
export type TextPlacement = "above" | "below";

/**
 * The conflict role of an articulation. A hit may have at most one `primary`
 * articulation and may also have ordered `modifier` articulations.
 */
export type ArticulationRole = "primary" | "modifier";

/**
 * The compiler behavior for an articulation: alter the main `base` note, add a
 * preceding slashed `grace` note, or retain the hit with an `unsupported`
 * diagnostic and base-display fallback.
 */
export type ArticulationRender = "base" | "grace" | "unsupported";

/** Defines where and how a drum voice is displayed on the percussion staff. */
export interface VoiceDisplay {
  /** MusicXML diatonic display step. */
  readonly step: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  /** MusicXML display octave. */
  readonly octave: number;
  /** Written notehead shape. */
  readonly notehead: Notehead;
  /** Requested stem direction; current compiled percussion notes use upward stems. */
  readonly stem: StemDirection;
}

/** Defines the validation role and MusicXML fallback behavior of one articulation. */
export interface ArticulationDefinition {
  /** Whether the articulation is an exclusive primary or an ordered modifier. */
  readonly role: ArticulationRole;
  /** How the articulation is represented during compilation. */
  readonly render: ArticulationRender;
  /**
   * Overrides supported voice-display fields for the main note unless rendering
   * is unsupported. The current compiler writes upward stems.
   */
  readonly display?: Partial<VoiceDisplay>;
  /**
   * Overrides supported display fields for the preceding note when `render` is
   * `grace`. The current compiler writes upward stems.
   */
  readonly graceDisplay?: Partial<VoiceDisplay>;
}

/** Defines one named drum voice in a custom {@link DrumKit}. */
export interface DrumVoiceDefinition {
  /** Human-readable instrument name used in MusicXML. */
  readonly name: string;
  /** Unique integer that controls deterministic chord and instrument ordering. */
  readonly order: number;
  /** Base staff display used by an unqualified hit. */
  readonly display: VoiceDisplay;
  /** MIDI unpitched note number from 1 through 127. */
  readonly midiUnpitched: number;
  /**
   * Effective articulations prepended when a hit does not request a primary
   * articulation. Every id must exist in {@link DrumVoiceDefinition.articulations}.
   */
  readonly defaultArticulations: readonly string[];
  /** Articulation definitions keyed by the ids accepted for this voice. */
  readonly articulations: Readonly<Record<string, ArticulationDefinition>>;
}

/** A record of drum-voice ids to their definitions. */
export type VoiceMap = Record<string, DrumVoiceDefinition>;

/** An immutable, validated mapping from authored voice ids to percussion output. */
export interface DrumKit<V extends VoiceMap = VoiceMap> {
  /** Stable kit id starting with a letter, followed by letters, digits, or hyphens. */
  readonly id: string;
  /** Human-readable kit name used as the MusicXML part name. */
  readonly name: string;
  /** Frozen voice definitions keyed by authored voice id. */
  readonly voices: Readonly<V>;
}

/** String voice ids defined by a particular drum-kit type. */
export type VoiceId<K extends DrumKit> = Extract<keyof K["voices"], string>;

/** Articulation ids accepted by one voice in a particular drum-kit type. */
export type ArticulationId<
  K extends DrumKit,
  V extends VoiceId<K>,
> = Extract<keyof K["voices"][V]["articulations"], string>;

/**
 * One authored hit, either as an unqualified position or as a position with an
 * ordered list of articulation ids.
 */
export type HitInput<A extends string = string> =
  | Position
  | {
      /** Position of the attack on the bar grid. */
      readonly at: Position;
      /** Requested articulations; omit to use the voice's base state. */
      readonly articulations?: readonly A[];
    };

/** Type-safe, optional hit arrays keyed by the voices of a drum kit. */
export type HitMap<K extends DrumKit> = Partial<{
  readonly [V in VoiceId<K>]: readonly HitInput<ArticulationId<K, V>>[];
}>;

/** A non-empty, single-line text annotation attached to one bar position. */
export interface BarTextAnnotation {
  /** Position on the containing bar's grid. */
  readonly at: Position;
  /** Non-empty text without carriage returns or line feeds. */
  readonly text: string;
  /** Placement relative to the staff. @defaultValue `"below"` */
  readonly placement?: TextPlacement;
}

/** A text annotation attached to one specific bar occurrence in a phrase. */
export interface PhraseTextAnnotation extends BarTextAnnotation {
  /** Zero-based index into {@link PhraseDefinition.bars}. */
  readonly bar: number;
}

/** Constructor input for an immutable, validated {@link Bar}. */
export interface BarDefinition<K extends DrumKit = DrumKit> {
  /** Written time signature. */
  readonly meter: Meter;
  /**
   * Total grid positions in the bar. Must be a positive safe-integer multiple
   * of the meter numerator and produce 1 through 32 subdivisions per written unit.
   */
  readonly divisions: number;
  /**
   * Optional positive-integer beam groups whose sum is the meter numerator.
   * Coordinates are unaffected. Compound `n/8` meters divisible by three
   * default to groups of three; other meters default to one unit per group.
   */
  readonly grouping?: readonly number[];
  /** Drum kit used to validate and compile hits. @defaultValue {@link standardDrumKit} */
  readonly kit?: K;
  /** Authored hits keyed by voice. @defaultValue An empty hit map. */
  readonly hits?: HitMap<K>;
  /** Position-anchored text annotations. @defaultValue An empty array. */
  readonly annotations?: readonly BarTextAnnotation[];
}

/** Constructor input for an ordered, non-empty {@link Phrase}. */
export interface PhraseDefinition<K extends DrumKit = DrumKit> {
  /** Bars in score order; every bar must use the same drum-kit instance. */
  readonly bars: readonly import("./bar.js").Bar<K>[];
  /**
   * Occurrence-specific annotations. Annotations stored on a bar remain
   * attached to every occurrence of that bar. @defaultValue An empty array.
   */
  readonly annotations?: readonly PhraseTextAnnotation[];
}

/** One normalized, immutable attack exposed by {@link Bar.events}. */
export interface BarEvent {
  /** Authored drum-voice id. */
  readonly voice: string;
  /** Canonical authored position. */
  readonly at: Position;
  /** One-based written unit parsed from `at`. */
  readonly unit: number;
  /** Zero-based subdivision parsed from `at`. */
  readonly subdivision: number;
  /** Zero-based absolute position in the bar grid. */
  readonly slot: number;
  /** Ordered, effective articulations after defaults have been applied. */
  readonly articulations: readonly string[];
}

/** Machine-readable codes reported by {@link NotationValidationError}. */
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
  | "INVALID_KIT"
  | "INVALID_PHRASE"
  | "EMPTY_PHRASE"
  | "MIXED_KITS"
  | "INVALID_ANNOTATION"
  | "DUPLICATE_ANNOTATION";

/** Machine-readable compiler diagnostic and failure codes. */
export type CompilationCode =
  | "UNSUPPORTED_ARTICULATION_RENDERING"
  | "UNSUPPORTED_SUBDIVISION";

/** Machine-readable codes reported by {@link NotationRenderError}. */
export type RenderCode =
  | "RENDER_TARGET_INVALID"
  | "RENDER_OPTIONS_INVALID"
  | "RENDER_ABORTED"
  | "OSMD_RENDER_FAILED"
  | "STAFF_LINE_COUNT_INVALID"
  | "REPEAT_LABEL_RENDER_FAILED";

/** A machine-readable validation issue or compilation diagnostic. */
export interface NotationIssue<C extends string = string> {
  /** Stable code suitable for programmatic branching. */
  readonly code: C;
  /** Human-readable English explanation. */
  readonly message: string;
  /** Optional property path identifying the affected input or normalized event. */
  readonly path?: string;
}

/** A MusicXML degradation or unrepresentable-subdivision failure record. */
export type CompilationDiagnostic = NotationIssue<CompilationCode>;

/** Controls which standard score markings are visible in MusicXML and SVG output. */
export interface ScorePresentationOptions {
  /** Whether to show the percussion clef. @defaultValue `true` */
  readonly showClef?: boolean;
  /** Whether to show written time signatures. @defaultValue `true` */
  readonly showTimeSignature?: boolean;
  /** Whether to show the score's final barline. @defaultValue `true` */
  readonly showFinalBarline?: boolean;
}

/** Options shared by MusicXML compilation and browser rendering. */
export interface MusicXmlCompileOptions {
  /**
   * Throw {@link NotationCompilationError} instead of returning a result when
   * non-fatal diagnostics are produced. @defaultValue `false`
   */
  readonly strict?: boolean;
  /** Optional score-marking visibility controls; every marking defaults to visible. */
  readonly presentation?: ScorePresentationOptions;
}

/** The deterministic output of {@link compileMusicXml}. */
export interface MusicXmlCompileResult {
  /** Complete MusicXML 4.0 `score-partwise` document. */
  readonly musicXml: string;
  /** Ordered degradation diagnostics; empty when compilation is fully supported. */
  readonly diagnostics: readonly CompilationDiagnostic[];
}

/** Browser-only options accepted by both SVG rendering functions. */
export interface RenderOptions extends MusicXmlCompileOptions {
  /** OpenSheetMusicDisplay scale. @defaultValue `1` */
  readonly zoom?: number;
  /**
   * Total visual play count. A safe integer of 2 or greater adds `xN` to the
   * SVG only and does not alter MusicXML semantics.
   */
  readonly repeatCount?: number;
  /**
   * Signal for cooperative cancellation at asynchronous checkpoints. It cannot
   * interrupt synchronous OpenSheetMusicDisplay work already in progress.
   */
  readonly signal?: AbortSignal;
}

/** The browser rendering result returned by both SVG rendering functions. */
export interface RenderResult extends MusicXmlCompileResult {
  /** The generated SVG element currently owned through the target container. */
  readonly svg: SVGSVGElement;
  /** Clears the owned target container and releases renderer-managed output. */
  dispose(): void;
}
