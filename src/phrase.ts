import { Bar } from "./bar.js";
import { NotationValidationError } from "./errors.js";
import type {
  DrumKit,
  NotationIssue,
  PhraseDefinition,
  PhraseTextAnnotation,
  ValidationCode,
} from "./types.js";
import { parseTextAnnotation } from "./validation.js";

/** Immutable, ordered multi-bar drum notation input. */
export class Phrase<K extends DrumKit = DrumKit> {
  readonly bars: readonly Bar<K>[];
  readonly kit: K;
  readonly annotations: readonly PhraseTextAnnotation[];

  constructor(definition: PhraseDefinition<K>) {
    const issues: NotationIssue<ValidationCode>[] = [];
    const bars = definition.bars;
    if (!Array.isArray(bars)) {
      issues.push({
        code: "INVALID_PHRASE",
        message: "Phrase bars must be an array of Bar instances.",
        path: "bars",
      });
    } else if (bars.length === 0) {
      issues.push({
        code: "EMPTY_PHRASE",
        message: "Phrase must contain at least one bar.",
        path: "bars",
      });
    }

    const firstBar = Array.isArray(bars) ? bars[0] : undefined;
    if (firstBar && !(firstBar instanceof Bar)) {
      issues.push({
        code: "INVALID_PHRASE",
        message: "Phrase bars must be Bar instances.",
        path: "bars[0]",
      });
    }
    if (firstBar instanceof Bar) {
      for (const [index, bar] of bars.entries()) {
        if (!(bar instanceof Bar)) {
          issues.push({
            code: "INVALID_PHRASE",
            message: "Phrase bars must be Bar instances.",
            path: `bars[${index}]`,
          });
          continue;
        }
        if (bar.kit !== firstBar.kit) {
          issues.push({
            code: "MIXED_KITS",
            message: "Every bar in a phrase must use the same drum kit instance.",
            path: `bars[${index}].kit`,
          });
        }
      }
    }

    const annotations: PhraseTextAnnotation[] = [];
    const seenAnnotations = new Set<string>();
    if (Array.isArray(bars)) {
      for (const [barIndex, bar] of bars.entries()) {
        if (!(bar instanceof Bar)) continue;
        for (const annotation of bar.annotations) {
          seenAnnotations.add(`${barIndex}\u0000${annotation.at}\u0000${annotation.placement ?? "below"}`);
        }
      }
    }

    if (definition.annotations !== undefined && !Array.isArray(definition.annotations)) {
      issues.push({
        code: "INVALID_ANNOTATION",
        message: "Phrase annotations must be an array.",
        path: "annotations",
      });
    } else {
      for (const [index, input] of (definition.annotations ?? []).entries()) {
        const path = `annotations[${index}]`;
        const parsed = parseTextAnnotation(input, path);
        issues.push(...parsed.issues);
        const barIndex = typeof input === "object" && input !== null && !Array.isArray(input)
          ? (input as Record<string, unknown>).bar
          : undefined;
        if (!Number.isSafeInteger(barIndex) || (barIndex as number) < 0) {
          issues.push({
            code: "INVALID_ANNOTATION",
            message: "A phrase annotation bar must be a non-negative safe integer.",
            path: `${path}.bar`,
          });
          continue;
        }
        const targetBar = Array.isArray(bars) ? bars[barIndex as number] : undefined;
        if (!(targetBar instanceof Bar)) {
          issues.push({
            code: "INVALID_ANNOTATION",
            message: `Phrase annotation bar '${barIndex}' is outside the phrase.`,
            path: `${path}.bar`,
          });
          continue;
        }
        if (!parsed.annotation) continue;
        if (
          parsed.annotation.unit > targetBar.timing.numerator ||
          parsed.annotation.subdivision >= targetBar.timing.subdivisionsPerUnit
        ) {
          issues.push({
            code: "POSITION_OUT_OF_RANGE",
            message: `Position '${parsed.annotation.at}' is outside bar ${barIndex}'s grid.`,
            path: `${path}.at`,
          });
          continue;
        }
        const duplicateKey = `${barIndex}\u0000${parsed.annotation.at}\u0000${parsed.annotation.placement}`;
        if (seenAnnotations.has(duplicateKey)) {
          issues.push({
            code: "DUPLICATE_ANNOTATION",
            message: `A '${parsed.annotation.placement}' annotation already exists at '${parsed.annotation.at}' in bar ${barIndex}.`,
            path,
          });
          continue;
        }
        seenAnnotations.add(duplicateKey);
        annotations.push(Object.freeze({
          bar: barIndex as number,
          at: parsed.annotation.at,
          text: parsed.annotation.text,
          placement: parsed.annotation.placement,
        }));
      }
    }

    if (issues.length > 0 || !(firstBar instanceof Bar)) {
      throw new NotationValidationError(issues);
    }

    this.bars = Object.freeze([...bars]) as readonly Bar<K>[];
    this.kit = firstBar.kit as K;
    this.annotations = Object.freeze(annotations);
    Object.freeze(this);
  }
}
