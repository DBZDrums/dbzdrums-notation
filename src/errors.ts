import type {
  CompilationDiagnostic,
  NotationIssue,
  RenderCode,
  ValidationCode,
} from "./types.js";

export class NotationValidationError extends Error {
  readonly issues: readonly NotationIssue<ValidationCode>[];

  constructor(issues: readonly NotationIssue<ValidationCode>[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "NotationValidationError";
    this.issues = issues;
  }
}

export class NotationCompilationError extends Error {
  readonly diagnostics: readonly CompilationDiagnostic[];

  constructor(diagnostics: readonly CompilationDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join("; "));
    this.name = "NotationCompilationError";
    this.diagnostics = diagnostics;
  }
}

export class NotationRenderError extends Error {
  readonly code: RenderCode;

  constructor(code: RenderCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotationRenderError";
    this.code = code;
  }
}
