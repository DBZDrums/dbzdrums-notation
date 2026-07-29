import { Bar } from "./bar.js";
import { NotationValidationError } from "./errors.js";
import type {
  DrumKit,
  NotationIssue,
  PhraseDefinition,
  ValidationCode,
} from "./types.js";

/** Immutable, ordered multi-bar drum notation input. */
export class Phrase<K extends DrumKit = DrumKit> {
  readonly bars: readonly Bar<K>[];
  readonly kit: K;

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

    if (issues.length > 0 || !(firstBar instanceof Bar)) {
      throw new NotationValidationError(issues);
    }

    this.bars = Object.freeze([...bars]) as readonly Bar<K>[];
    this.kit = firstBar.kit as K;
    Object.freeze(this);
  }
}
