import type {
  CompilationDiagnostic,
  NotationIssue,
  RenderCode,
  ValidationCode,
} from "./types.js";

/**
 * Aggregated input error thrown while constructing a bar, phrase, or drum kit.
 */
export class NotationValidationError extends Error {
  /** Ordered validation issues collected before construction failed. */
  readonly issues: readonly NotationIssue<ValidationCode>[];

  /**
   * Creates an aggregated validation error.
   *
   * @param issues - Machine-readable issues whose messages form the error message.
   */
  constructor(issues: readonly NotationIssue<ValidationCode>[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "NotationValidationError";
    this.issues = issues;
  }
}

/**
 * Compilation failure carrying diagnostics that prevented an accepted result.
 *
 * This is thrown when strict compilation encounters a degradation diagnostic,
 * or when a rhythmic subdivision cannot be represented in MusicXML.
 */
export class NotationCompilationError extends Error {
  /** Ordered diagnostics that caused compilation to fail. */
  readonly diagnostics: readonly CompilationDiagnostic[];

  /**
   * Creates a compilation error.
   *
   * @param diagnostics - Diagnostics whose messages form the error message.
   */
  constructor(diagnostics: readonly CompilationDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join("; "));
    this.name = "NotationCompilationError";
    this.diagnostics = diagnostics;
  }
}

/** Browser rendering failure with one stable machine-readable code. */
export class NotationRenderError extends Error {
  /** Code identifying the render validation, cancellation, OSMD, or SVG failure. */
  readonly code: RenderCode;

  /**
   * Creates a rendering error.
   *
   * @param code - Stable machine-readable render code.
   * @param message - Human-readable English explanation.
   * @param options - Optional standard error options, including an underlying cause.
   */
  constructor(code: RenderCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotationRenderError";
    this.code = code;
  }
}
