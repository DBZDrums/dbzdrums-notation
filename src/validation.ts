import type { Meter, NotationIssue, Position, ValidationCode } from "./types.js";

export interface ParsedMeter {
  readonly meter: Meter;
  readonly numerator: number;
  readonly denominator: number;
}

export interface ParsedPosition {
  readonly at: Position;
  readonly unit: number;
  readonly subdivision: number;
}

const METER_RE = /^([1-9]\d*)\/(1|2|4|8|16|32)$/;
const POSITION_RE = /^([1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseMeter(
  meter: string,
): ParsedMeter | NotationIssue<ValidationCode> {
  const match = METER_RE.exec(meter);
  if (!match) {
    return {
      code: "INVALID_METER",
      message: `Meter '${meter}' must be a positive numerator over 1, 2, 4, 8, 16, or 32.`,
      path: "meter",
    };
  }
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    return {
      code: "INVALID_METER",
      message: `Meter '${meter}' exceeds safe integer precision.`,
      path: "meter",
    };
  }
  return { meter: meter as Meter, numerator, denominator };
}

export function parsePosition(
  position: string,
): ParsedPosition | NotationIssue<ValidationCode> {
  const match = POSITION_RE.exec(position);
  if (!match) {
    return {
      code: "INVALID_POSITION_FORMAT",
      message: `Position '${position}' must use canonical writtenUnit.subdivision form, such as '2.0'.`,
      path: "position",
    };
  }
  const unit = Number(match[1]);
  const subdivision = Number(match[2]);
  if (!Number.isSafeInteger(unit) || !Number.isSafeInteger(subdivision)) {
    return {
      code: "INVALID_POSITION_FORMAT",
      message: `Position '${position}' exceeds safe integer precision.`,
      path: "position",
    };
  }
  return { at: position as Position, unit, subdivision };
}

export function isIssue<T extends string>(
  value: unknown,
): value is NotationIssue<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}
