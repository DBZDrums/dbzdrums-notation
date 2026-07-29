import { NotationValidationError } from "./errors.js";
import { standardDrumKit } from "./kit.js";
import type {
  ArticulationId,
  BarDefinition,
  BarEvent,
  DrumKit,
  HitInput,
  Meter,
  NotationIssue,
  Position,
  ValidationCode,
  VoiceId,
} from "./types.js";
import { isIssue, parseMeter, parsePosition, type ParsedMeter } from "./validation.js";

function freezeEvent(event: BarEvent): BarEvent {
  return Object.freeze({
    ...event,
    articulations: Object.freeze([...event.articulations]),
  });
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

export interface BarTiming {
  readonly numerator: number;
  readonly denominator: number;
  readonly subdivisionsPerUnit: number;
}

/** Immutable, validated one-bar drum notation input. */
export class Bar<K extends DrumKit = typeof standardDrumKit> {
  readonly meter: Meter;
  readonly divisions: number;
  readonly grouping: readonly number[] | undefined;
  readonly kit: K;
  readonly events: readonly BarEvent[];
  readonly timing: BarTiming;

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
    this.timing = Object.freeze({
      numerator: meter.numerator,
      denominator: meter.denominator,
      subdivisionsPerUnit,
    });
    Object.freeze(this);
  }

  /** Adds one or more hits without mutating the source bar. */
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
