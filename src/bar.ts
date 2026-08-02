import { NotationValidationError } from "./errors.js";
import { standardDrumKit } from "./kit.js";
import type {
  ArticulationId,
  BarDefinition,
  BarEvent,
  BarTextAnnotation,
  DrumKit,
  HitInput,
  Meter,
  NotationIssue,
  Position,
  ValidationCode,
  VoiceId,
} from "./types.js";
import {
  isIssue,
  parseMeter,
  parsePosition,
  parseTextAnnotation,
  type ParsedMeter,
} from "./validation.js";

function freezeEvent(event: BarEvent): BarEvent {
  return Object.freeze({
    ...event,
    articulations: Object.freeze([...event.articulations]),
  });
}

function freezeAnnotation(annotation: BarTextAnnotation): BarTextAnnotation {
  return Object.freeze({ ...annotation });
}

function copyGrouping(grouping: readonly number[] | undefined): readonly number[] | undefined {
  return grouping ? Object.freeze([...grouping]) : undefined;
}

function hitAt<A extends string>(input: HitInput<A>): {
  readonly at: Position;
  readonly requestedArticulations: readonly string[];
} {
  if (typeof input === "string") {
    return { at: input, requestedArticulations: [] };
  }
  return {
    at: input.at,
    requestedArticulations: input.articulations ? [...input.articulations] : [],
  };
}

function resolveArticulations(
  kit: DrumKit,
  voiceId: string,
  requested: readonly string[],
  issues: NotationIssue<ValidationCode>[],
  path: string,
): readonly string[] {
  const voice = kit.voices[voiceId];
  if (!voice) return [];
  const seen = new Set<string>();
  const primary = [] as string[];

  for (const articulationId of requested) {
    const articulation = voice.articulations[articulationId];
    if (!articulation) {
      issues.push({
        code: "UNKNOWN_ARTICULATION",
        message: `Voice '${voiceId}' does not support articulation '${articulationId}'.`,
        path,
      });
      continue;
    }
    if (seen.has(articulationId)) {
      issues.push({
        code: "ARTICULATION_CONFLICT",
        message: `Articulation '${articulationId}' is repeated for voice '${voiceId}'.`,
        path,
      });
      continue;
    }
    seen.add(articulationId);
    if (articulation.role === "primary") primary.push(articulationId);
  }

  if (primary.length > 1) {
    issues.push({
      code: "ARTICULATION_CONFLICT",
      message: `Voice '${voiceId}' has more than one primary articulation at the same position.`,
      path,
    });
  }

  if (primary.length === 0) {
    const defaults = voice.defaultArticulations.filter(
      (defaultArticulation) => !seen.has(defaultArticulation),
    );
    return Object.freeze([...defaults, ...requested]);
  }
  return Object.freeze([...requested]);
}

/**
 * Derived, immutable timing metadata exposed by a validated {@link Bar}.
 *
 * @inline
 */
export interface BarTiming {
  /** Positive meter numerator. */
  readonly numerator: number;
  /** Supported meter denominator. */
  readonly denominator: number;
  /** Number of authored grid positions in each written unit. */
  readonly subdivisionsPerUnit: number;
}

/**
 * An immutable, validated bar of drum notation.
 *
 * Construction copies and freezes grouping, normalized events, annotations,
 * and timing metadata. The selected drum-kit instance is retained by identity.
 */
export class Bar<K extends DrumKit = typeof standardDrumKit> {
  /** Canonical written meter. */
  readonly meter: Meter;
  /** Total number of grid positions in the bar. */
  readonly divisions: number;
  /** Explicit beam grouping, or `undefined` when compiler defaults apply. */
  readonly grouping: readonly number[] | undefined;
  /** Drum-kit instance used to validate and compile this bar. */
  readonly kit: K;
  /** Normalized attacks sorted by grid slot and then drum-voice order. */
  readonly events: readonly BarEvent[];
  /** Normalized text annotations in authoring order. */
  readonly annotations: readonly BarTextAnnotation[];
  /** Derived meter and grid values. */
  readonly timing: BarTiming;

  /**
   * Creates a validated bar.
   *
   * @param definition - Meter, grid, optional kit, hits, grouping, and annotations.
   * @throws {@link NotationValidationError} with every detected validation issue.
   */
  constructor(definition: BarDefinition<K>) {
    const issues: NotationIssue<ValidationCode>[] = [];
    const parsedMeter = parseMeter(definition.meter);
    if (isIssue<ValidationCode>(parsedMeter)) issues.push(parsedMeter);

    const meter = isIssue<ValidationCode>(parsedMeter) ? undefined : parsedMeter;
    const divisions = definition.divisions;
    if (
      !Number.isSafeInteger(divisions) ||
      divisions <= 0 ||
      (meter !== undefined && divisions % meter.numerator !== 0)
    ) {
      issues.push({
        code: "INVALID_DIVISIONS",
        message: "Divisions must be a positive safe integer and a multiple of the meter numerator.",
        path: "divisions",
      });
    }

    const subdivisionsPerUnit =
      meter !== undefined && Number.isSafeInteger(divisions) && divisions > 0
        ? divisions / meter.numerator
        : 0;
    if (
      meter !== undefined &&
      (subdivisionsPerUnit < 1 ||
        subdivisionsPerUnit > 32 ||
        !Number.isInteger(subdivisionsPerUnit))
    ) {
      issues.push({
        code: "INVALID_DIVISIONS",
        message: "Divisions must express from 1 through 32 subdivisions per written unit.",
        path: "divisions",
      });
    }

    const grouping = copyGrouping(definition.grouping);
    if (grouping) {
      const groupingIsValid =
        meter !== undefined &&
        grouping.length > 0 &&
        grouping.every((group) => Number.isSafeInteger(group) && group > 0) &&
        grouping.reduce((sum, group) => sum + group, 0) === meter.numerator;
      if (!groupingIsValid) {
        issues.push({
          code: "INVALID_GROUPING",
          message: "Grouping must contain positive integers that sum to the meter numerator.",
          path: "grouping",
        });
      }
    }

    const annotations: BarTextAnnotation[] = [];
    const seenAnnotations = new Set<string>();
    if (definition.annotations !== undefined && !Array.isArray(definition.annotations)) {
      issues.push({
        code: "INVALID_ANNOTATION",
        message: "Bar annotations must be an array.",
        path: "annotations",
      });
    } else {
      for (const [index, input] of (definition.annotations ?? []).entries()) {
        const path = `annotations[${index}]`;
        const parsed = parseTextAnnotation(input, path);
        issues.push(...parsed.issues);
        if (!parsed.annotation) continue;
        if (
          meter === undefined ||
          subdivisionsPerUnit < 1 ||
          parsed.annotation.unit > meter.numerator ||
          parsed.annotation.subdivision >= subdivisionsPerUnit
        ) {
          issues.push({
            code: "POSITION_OUT_OF_RANGE",
            message: `Position '${parsed.annotation.at}' is outside the bar grid.`,
            path: `${path}.at`,
          });
          continue;
        }
        const duplicateKey = `${parsed.annotation.at}\u0000${parsed.annotation.placement}`;
        if (seenAnnotations.has(duplicateKey)) {
          issues.push({
            code: "DUPLICATE_ANNOTATION",
            message: `A '${parsed.annotation.placement}' annotation already exists at '${parsed.annotation.at}'.`,
            path,
          });
          continue;
        }
        seenAnnotations.add(duplicateKey);
        annotations.push(freezeAnnotation({
          at: parsed.annotation.at,
          text: parsed.annotation.text,
          placement: parsed.annotation.placement,
        }));
      }
    }

    const kit = (definition.kit ?? standardDrumKit) as K;
    const events: BarEvent[] = [];
    const seenEvents = new Set<string>();
    for (const [voiceId, hits] of Object.entries(definition.hits ?? {})) {
      const voice = kit.voices[voiceId];
      if (!voice) {
        issues.push({
          code: "UNKNOWN_VOICE",
          message: `Drum kit '${kit.id}' has no '${voiceId}' voice.`,
          path: `hits.${voiceId}`,
        });
        continue;
      }
      for (const [index, input] of hits.entries()) {
        const path = `hits.${voiceId}[${index}]`;
        const hit = hitAt(input);
        const parsedPosition = parsePosition(hit.at);
        if (isIssue<ValidationCode>(parsedPosition)) {
          issues.push({ ...parsedPosition, path });
          continue;
        }
        if (
          meter === undefined ||
          subdivisionsPerUnit < 1 ||
          parsedPosition.unit > meter.numerator ||
          parsedPosition.subdivision >= subdivisionsPerUnit
        ) {
          issues.push({
            code: "POSITION_OUT_OF_RANGE",
            message: `Position '${hit.at}' is outside the bar grid.`,
            path,
          });
          continue;
        }
        const duplicateKey = `${voiceId}\u0000${hit.at}`;
        if (seenEvents.has(duplicateKey)) {
          issues.push({
            code: "DUPLICATE_HIT",
            message: `Voice '${voiceId}' already has a hit at '${hit.at}'.`,
            path,
          });
          continue;
        }
        seenEvents.add(duplicateKey);
        const articulations = resolveArticulations(
          kit,
          voiceId,
          hit.requestedArticulations,
          issues,
          path,
        );
        events.push(
          freezeEvent({
            voice: voiceId,
            at: hit.at,
            unit: parsedPosition.unit,
            subdivision: parsedPosition.subdivision,
            slot: (parsedPosition.unit - 1) * subdivisionsPerUnit + parsedPosition.subdivision,
            articulations,
          }),
        );
      }
    }

    if (issues.length > 0 || meter === undefined) {
      throw new NotationValidationError(issues);
    }

    events.sort((left, right) => {
      if (left.slot !== right.slot) return left.slot - right.slot;
      return kit.voices[left.voice]!.order - kit.voices[right.voice]!.order;
    });
    this.meter = meter.meter;
    this.divisions = divisions;
    this.grouping = grouping;
    this.kit = kit;
    this.events = Object.freeze(events);
    this.annotations = Object.freeze(annotations);
    this.timing = Object.freeze({
      numerator: meter.numerator,
      denominator: meter.denominator,
      subdivisionsPerUnit,
    });
    Object.freeze(this);
  }

  /**
   * Adds the supplied hits without mutating this bar.
   *
   * Existing normalized hits and annotations are preserved in the returned bar.
   * An empty `hits` rest argument returns a newly validated equivalent bar.
   *
   * @param voice - Voice id from this bar's drum kit.
   * @param hits - Positions or articulated hit objects to append.
   * @returns A newly validated immutable bar using the same kit instance.
   * @throws {@link NotationValidationError} if an addition conflicts with existing
   * hits or violates any bar, position, voice, or articulation constraint.
   */
  add<V extends VoiceId<K>>(
    voice: V,
    ...hits: readonly HitInput<ArticulationId<K, V>>[]
  ): Bar<K> {
    const existingHits = this.toHitMap();
    const current = existingHits[voice] ?? [];
    const hitsWithAddition = {
      ...existingHits,
      [voice]: [...current, ...hits],
    } as unknown as NonNullable<BarDefinition<K>["hits"]>;
    return new Bar<K>({
      meter: this.meter,
      divisions: this.divisions,
      ...(this.grouping ? { grouping: this.grouping } : {}),
      kit: this.kit,
      hits: hitsWithAddition,
      annotations: this.annotations,
    });
  }

  private toHitMap(): Record<string, readonly HitInput[]> {
    const hits: Record<string, readonly HitInput[]> = {};
    for (const event of this.events) {
      const existing = hits[event.voice] ?? [];
      hits[event.voice] = [
        ...existing,
        { at: event.at, articulations: event.articulations },
      ];
    }
    return hits;
  }
}

export function parsedBarMeter(bar: Bar): ParsedMeter {
  const meter = parseMeter(bar.meter);
  if (isIssue<ValidationCode>(meter)) {
    throw new Error("A validated Bar always has a valid meter.");
  }
  return meter;
}
