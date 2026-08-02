# Errors and diagnostics

Use machine-readable codes for control flow. Human-readable `message` text explains a failure but is not the compatibility surface for branching. Validation and compilation records use `NotationIssue<C>` with `code`, `message`, and an optional `path` to the affected input or event.

## Error classes

### `NotationValidationError`

Thrown by `new Bar()`, `bar.add()`, `new Phrase()`, and `defineDrumKit()` when validation fails. Its frozen `issues` array contains `NotationIssue<ValidationCode>` records. Validation normally collects multiple detectable issues before throwing; do not assume only one.

```ts
import { Bar, NotationValidationError } from "@dbzdrums/notation";

try {
  new Bar({ meter: "4/3", divisions: 7 });
} catch (error) {
  if (error instanceof NotationValidationError) {
    for (const issue of error.issues) {
      console.error(issue.code, issue.path, issue.message);
    }
  } else {
    throw error;
  }
}
```

### `NotationCompilationError`

Thrown by `compileMusicXml()` and, transitively, by either render function when:

- `strict: true` converts one or more degradation diagnostics into a failure; or
- a grid interval cannot be represented by the compiler's supported MusicXML note types, so no complete result can be returned.

Its frozen `diagnostics` array contains `CompilationDiagnostic` records.

### `NotationRenderError`

Thrown asynchronously by `renderBarToSvg()` and `renderPhraseToSvg()`. Its `code` is one `RenderCode`. OSMD-related errors may expose their underlying exception through the standard `cause` property.

Render functions can also reject with `NotationCompilationError` when compilation fails. Check that class separately rather than treating every render rejection as `NotationRenderError`.

## Validation codes

| Code | Meaning |
| --- | --- |
| `INVALID_METER` | The meter is not canonical, has no positive safe-integer numerator, or uses a denominator other than 1, 2, 4, 8, 16, or 32. |
| `INVALID_DIVISIONS` | Divisions is not a positive safe integer, is not a multiple of the meter numerator, or produces fewer than 1 or more than 32 subdivisions per written unit. |
| `INVALID_GROUPING` | Grouping is empty, contains a non-positive/non-safe integer, or does not sum to the meter numerator. |
| `INVALID_POSITION_FORMAT` | A hit or annotation position is not canonical `writtenUnit.subdivision`, starts outside the allowed numeric form, or exceeds safe-integer precision. |
| `POSITION_OUT_OF_RANGE` | A canonical hit or annotation position lies outside its containing bar's units or subdivisions. |
| `UNKNOWN_VOICE` | A hit map key is not a voice in the selected kit. |
| `UNKNOWN_ARTICULATION` | A hit requests an articulation id not defined by its voice. |
| `ARTICULATION_CONFLICT` | An articulation id is repeated or a hit requests more than one primary articulation. |
| `DUPLICATE_HIT` | The same voice attacks more than once at the same position. Different voices at one position are allowed. |
| `INVALID_KIT` | A kit/voice id is malformed, voice order is not a unique integer, a MIDI unpitched value is outside 1–127, or a default articulation id is unknown. |
| `INVALID_PHRASE` | `bars` is not an array of `Bar` instances or an array member is not a `Bar`. |
| `EMPTY_PHRASE` | A phrase contains no bars. |
| `MIXED_KITS` | Phrase bars do not all use the exact same kit instance. |
| `INVALID_ANNOTATION` | An annotation collection/value, text, placement, or phrase bar index is invalid. This includes empty or multiline text and an out-of-range phrase bar index. |
| `DUPLICATE_ANNOTATION` | Two annotations target the same bar occurrence, position, and placement, including collisions between a bar annotation and phrase annotation. |

A malformed annotation position can report `INVALID_POSITION_FORMAT`, and a well-formed position outside its target grid reports `POSITION_OUT_OF_RANGE`.

## Compilation codes and strict mode

| Code | Returned or thrown | Meaning |
| --- | --- | --- |
| `UNSUPPORTED_ARTICULATION_RENDERING` | Returned in `diagnostics`, or thrown through `NotationCompilationError` in strict mode. | A custom articulation uses `render: "unsupported"`. The rhythmic hit is retained with its supported base-display fallback. |
| `UNSUPPORTED_SUBDIVISION` | Thrown through `NotationCompilationError`. | A required rhythmic interval cannot be represented by the compiler's supported MusicXML note types. No valid result is returned. |

For a `Bar`, an unsupported-articulation diagnostic path identifies the normalized event. For a `Phrase`, it is prefixed with the zero-based bar path, for example `bars[1].events.splash.1.0`.

Use non-strict mode when visual fallback is acceptable, and strict mode when any degradation must block output:

```ts
import {
  compileMusicXml,
  type Bar,
  type MusicXmlCompileResult,
} from "@dbzdrums/notation";

function compileAllowingFallback(bar: Bar): MusicXmlCompileResult {
  const result = compileMusicXml(bar);
  if (result.diagnostics.length > 0) {
    console.warn("Export uses visual fallbacks", result.diagnostics);
  }
  return result;
}

function compileStrictly(bar: Bar): MusicXmlCompileResult {
  return compileMusicXml(bar, { strict: true });
}
```

## Render codes

| Code | Meaning and cleanup |
| --- | --- |
| `RENDER_TARGET_INVALID` | The target is disconnected or has no positive rendered width. Rendering does not start. |
| `RENDER_OPTIONS_INVALID` | `repeatCount` is present but is not a safe integer of at least 2. Rendering does not start. |
| `RENDER_ABORTED` | The supplied signal is already aborted or cancellation is observed at a cooperative checkpoint. The owned target is cleared. |
| `OSMD_RENDER_FAILED` | OSMD could not be loaded, initialized, loaded with MusicXML, rendered, or completed without an SVG. Renderer-owned output is cleared; an underlying `cause` may be present. |
| `STAFF_LINE_COUNT_INVALID` | The generated SVG did not contain exactly five verified full-length staff lines in every staff span. Renderer-owned output is cleared. |
| `REPEAT_LABEL_RENDER_FAILED` | The requested visual repeat label could not be located, placed, or kept inside the SVG viewport. Renderer-owned output is cleared. |

Cancellation takes precedence when an already-aborted signal is observed. Because cancellation cannot interrupt synchronous OSMD work, rejection may occur only at the next checkpoint.

## Catching compilation and render failures

```ts
import {
  NotationCompilationError,
  NotationRenderError,
  renderBarToSvg,
  type Bar,
  type RenderResult,
} from "@dbzdrums/notation";

async function renderStrictly(
  bar: Bar,
  target: HTMLElement,
  controller: AbortController,
): Promise<RenderResult | undefined> {
  try {
    return await renderBarToSvg(bar, target, {
      strict: true,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof NotationCompilationError) {
      console.error("Compilation blocked", error.diagnostics);
    } else if (error instanceof NotationRenderError) {
      if (error.code !== "RENDER_ABORTED") console.error(error.code, error);
    } else {
      throw error;
    }
    return undefined;
  }
}
```
