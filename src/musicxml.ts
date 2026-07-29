import { Bar } from "./bar.js";
import { NotationCompilationError } from "./errors.js";
import type {
  BarEvent,
  CompilationDiagnostic,
  DrumKit,
  MusicXmlCompileOptions,
  MusicXmlCompileResult,
  Notehead,
  VoiceDisplay,
} from "./types.js";

interface Segment {
  readonly start: number;
  readonly length: number;
  readonly events: readonly BarEvent[];
  readonly group: number;
}

interface SegmentNotation {
  readonly type: string;
  readonly typeDenominator: number;
  readonly dots: number;
  readonly timeModification: readonly [number, number] | undefined;
}

interface EventDisplay {
  readonly display: VoiceDisplay;
  readonly grace: boolean;
  readonly graceDisplay: VoiceDisplay;
}

const NOTE_TYPES: Readonly<Record<number, string>> = {
  1: "whole",
  2: "half",
  4: "quarter",
  8: "eighth",
  16: "16th",
  32: "32nd",
  64: "64th",
  128: "128th",
  256: "256th",
  512: "512th",
  1024: "1024th",
};

const DOT_FACTORS = [
  { dots: 0, numerator: 1, denominator: 1 },
  { dots: 1, numerator: 3, denominator: 2 },
  { dots: 2, numerator: 7, denominator: 4 },
] as const;

function voiceFor(bar: Bar<any>, voiceId: string) {
  return (bar.kit as DrumKit).voices[voiceId];
}

function gcd(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function noteheadXml(notehead: Notehead): string {
  return notehead === "normal" ? "" : `<notehead>${notehead}</notehead>`;
}

function defaultGrouping(bar: Bar<any>): readonly number[] {
  if (bar.grouping) return bar.grouping;
  if (bar.timing.denominator === 8 && bar.timing.numerator % 3 === 0) {
    return Object.freeze(Array.from({ length: bar.timing.numerator / 3 }, () => 3));
  }
  return Object.freeze(Array.from({ length: bar.timing.numerator }, () => 1));
}

function notationForLength(bar: Bar<any>, length: number): SegmentNotation | undefined {
  const subdivisions = bar.timing.subdivisionsPerUnit;
  const candidates: SegmentNotation[] = [];
  for (const [denominatorText, type] of Object.entries(NOTE_TYPES)) {
    const typeDenominator = Number(denominatorText);
    for (const dotFactor of DOT_FACTORS) {
      const numerator = length * typeDenominator * dotFactor.denominator;
      const denominator =
        bar.timing.denominator * subdivisions * dotFactor.numerator;
      const divisor = gcd(numerator, denominator);
      const normalNotes = numerator / divisor;
      const actualNotes = denominator / divisor;
      if (
        !Number.isInteger(normalNotes) ||
        !Number.isInteger(actualNotes) ||
        normalNotes <= 0 ||
        actualNotes < normalNotes ||
        actualNotes > 32
      ) {
        continue;
      }
      candidates.push({
        type,
        typeDenominator,
        dots: dotFactor.dots,
        timeModification: actualNotes === normalNotes
          ? undefined
          : Object.freeze([actualNotes, normalNotes] as const),
      });
    }
  }
  candidates.sort((left, right) => {
    const leftTuplet = left.timeModification ? 1 : 0;
    const rightTuplet = right.timeModification ? 1 : 0;
    if (leftTuplet !== rightTuplet) return leftTuplet - rightTuplet;
    if (left.dots !== right.dots) return left.dots - right.dots;
    return right.typeDenominator - left.typeDenominator;
  });
  return candidates[0];
}

function largestNotatableLength(bar: Bar<any>, maximum: number): number {
  for (let length = maximum; length >= 1; length -= 1) {
    if (notationForLength(bar, length)) return length;
  }
  throw new NotationCompilationError([
    {
      code: "UNSUPPORTED_SUBDIVISION",
      message: `Grid resolution '${bar.timing.subdivisionsPerUnit}' cannot be expressed with a MusicXML note type.`,
    },
  ]);
}

function planSegments(bar: Bar<any>): readonly Segment[] {
  const eventsBySlot = new Map<number, BarEvent[]>();
  for (const event of bar.events) {
    const events = eventsBySlot.get(event.slot) ?? [];
    events.push(event);
    eventsBySlot.set(event.slot, events);
  }

  const segments: Segment[] = [];
  const subdivisions = bar.timing.subdivisionsPerUnit;
  let groupStart = 0;
  for (const [group, units] of defaultGrouping(bar).entries()) {
    const groupEnd = groupStart + units * subdivisions;
    let cursor = groupStart;
    while (cursor < groupEnd) {
      const events = eventsBySlot.get(cursor);
      let nextEvent = groupEnd;
      for (let slot = cursor + 1; slot < groupEnd; slot += 1) {
        if (eventsBySlot.has(slot)) {
          nextEvent = slot;
          break;
        }
      }
      const length = largestNotatableLength(bar, nextEvent - cursor);
      segments.push({
        start: cursor,
        length,
        events: events ? Object.freeze([...events]) : Object.freeze([]),
        group,
      });
      cursor += length;
    }
    groupStart = groupEnd;
  }
  return Object.freeze(segments);
}

function resolveEventDisplay(
  bar: Bar<any>,
  event: BarEvent,
  diagnostics: CompilationDiagnostic[],
): EventDisplay {
  const voice = voiceFor(bar, event.voice);
  if (!voice) throw new Error(`Validated Bar references unknown voice '${event.voice}'.`);

  let display: VoiceDisplay = { ...voice.display };
  let graceDisplay: VoiceDisplay = { ...voice.display };
  let grace = false;
  for (const articulationId of event.articulations) {
    const articulation = voice.articulations[articulationId];
    if (!articulation) continue;
    if (articulation.render === "unsupported") {
      diagnostics.push({
        code: "UNSUPPORTED_ARTICULATION_RENDERING",
        message: `Articulation '${articulationId}' on '${event.voice}' has no MusicXML display mapping.`,
        path: `events.${event.voice}.${event.at}`,
      });
      continue;
    }
    if (articulation.display) display = { ...display, ...articulation.display };
    if (articulation.render === "grace") {
      grace = true;
      if (articulation.graceDisplay) {
        graceDisplay = { ...graceDisplay, ...articulation.graceDisplay };
      }
    }
  }
  return { display, grace, graceDisplay };
}

function beamLevel(typeDenominator: number): number {
  return typeDenominator < 8 ? 0 : Math.round(Math.log2(typeDenominator / 4));
}

function beamXml(
  segments: readonly Segment[],
  index: number,
  typeDenominator: number,
  types: readonly number[],
): string {
  const level = beamLevel(typeDenominator);
  if (level === 0) return "";
  const result: string[] = [];
  for (let beam = 1; beam <= level; beam += 1) {
    let first = index;
    let last = index;
    while (
      first > 0 &&
      segments[first - 1]!.group === segments[index]!.group &&
      beamLevel(types[first - 1] ?? 0) >= beam
    ) {
      first -= 1;
    }
    while (
      last < segments.length - 1 &&
      segments[last + 1]!.group === segments[index]!.group &&
      beamLevel(types[last + 1] ?? 0) >= beam
    ) {
      last += 1;
    }
    if (first === last) continue;
    const state = index === first ? "begin" : index === last ? "end" : "continue";
    result.push(`<beam number="${beam}">${state}</beam>`);
  }
  return result.join("");
}

function sameTimeModification(
  left: readonly [number, number] | undefined,
  right: readonly [number, number] | undefined,
): boolean {
  return left?.[0] === right?.[0] && left?.[1] === right?.[1];
}

function tupletXml(
  segments: readonly Segment[],
  notations: readonly SegmentNotation[],
  index: number,
): string {
  const notation = notations[index]!;
  if (!notation.timeModification) return "";
  let first = index;
  let last = index;
  while (
    first > 0 &&
    segments[first - 1]!.group === segments[index]!.group &&
    sameTimeModification(notations[first - 1]?.timeModification, notation.timeModification)
  ) {
    first -= 1;
  }
  while (
    last < segments.length - 1 &&
    segments[last + 1]!.group === segments[index]!.group &&
    sameTimeModification(notations[last + 1]?.timeModification, notation.timeModification)
  ) {
    last += 1;
  }
  const tuplets = [
    ...(index === first ? ['<tuplet type="start" number="1" bracket="yes" show-number="actual"/>'] : []),
    ...(index === last ? ['<tuplet type="stop" number="1"/>'] : []),
  ];
  return tuplets.length > 0 ? `<notations>${tuplets.join("")}</notations>` : "";
}

function noteTimingXml(
  duration: number,
  type: string,
  dots: number,
  timeModification: readonly [number, number] | undefined,
  beams: string,
  tuplet: string,
): string {
  return [
    `<duration>${duration}</duration>`,
    "<voice>1</voice>",
    `<type>${type}</type>`,
    ...Array.from({ length: dots }, () => "<dot/>"),
    ...(timeModification
      ? [
          `<time-modification><actual-notes>${timeModification[0]}</actual-notes><normal-notes>${timeModification[1]}</normal-notes></time-modification>`,
        ]
      : []),
    "<stem>up</stem>",
    beams,
    tuplet,
  ].join("");
}

function percussionNoteXml(
  bar: Bar<any>,
  event: BarEvent,
  display: VoiceDisplay,
  timing: string,
  chord: boolean,
): string {
  const voice = voiceFor(bar, event.voice);
  if (!voice) throw new Error(`Validated Bar references unknown voice '${event.voice}'.`);
  return [
    "<note>",
    ...(chord ? ["<chord/>"] : []),
    `<instrument id="P1-I${voice.order + 1}"/>`,
    "<unpitched>",
    `<display-step>${display.step}</display-step>`,
    `<display-octave>${display.octave}</display-octave>`,
    "</unpitched>",
    timing,
    noteheadXml(display.notehead),
    "<staff>1</staff>",
    "</note>",
  ].join("");
}

function graceNoteXml(bar: Bar<any>, event: BarEvent, display: VoiceDisplay): string {
  const voice = voiceFor(bar, event.voice);
  if (!voice) throw new Error(`Validated Bar references unknown voice '${event.voice}'.`);
  return [
    "<note>",
    '<grace slash="yes"/>',
    `<instrument id="P1-I${voice.order + 1}"/>`,
    "<unpitched>",
    `<display-step>${display.step}</display-step>`,
    `<display-octave>${display.octave}</display-octave>`,
    "</unpitched>",
    "<voice>1</voice>",
    "<type>eighth</type>",
    "<stem>up</stem>",
    noteheadXml(display.notehead),
    "<staff>1</staff>",
    "</note>",
  ].join("");
}

function restXml(timing: string): string {
  return `<note><rest/>${timing}<staff>1</staff></note>`;
}

/** Compiles an immutable Bar to a complete, deterministic MusicXML score. */
export function compileMusicXml(
  bar: Bar<any>,
  options: MusicXmlCompileOptions = {},
): MusicXmlCompileResult {
  const diagnostics: CompilationDiagnostic[] = [];
  const segments = planSegments(bar);
  const divisionFactor = gcd(4, bar.timing.denominator * bar.timing.subdivisionsPerUnit);
  const musicXmlDivisions =
    (bar.timing.denominator * bar.timing.subdivisionsPerUnit) / divisionFactor;
  const slotDuration = 4 / divisionFactor;
  const segmentNotations = segments.map((segment) => {
    const notation = notationForLength(bar, segment.length);
    if (!notation) {
      throw new NotationCompilationError([
        {
          code: "UNSUPPORTED_SUBDIVISION",
          message: `Grid resolution '${bar.timing.subdivisionsPerUnit}' cannot be expressed with a MusicXML note type.`,
        },
      ]);
    }
    return notation;
  });
  const segmentTypes = segmentNotations.map((notation) => notation.typeDenominator);
  const measure: string[] = [
    "<attributes>",
    `<divisions>${musicXmlDivisions}</divisions>`,
    `<time><beats>${bar.timing.numerator}</beats><beat-type>${bar.timing.denominator}</beat-type></time>`,
    "<clef number=\"1\"><sign>percussion</sign><line>2</line></clef>",
    "<staff-details number=\"1\"><staff-lines>5</staff-lines></staff-details>",
    "</attributes>",
  ];

  for (const [index, segment] of segments.entries()) {
    const notation = segmentNotations[index]!;
    const timing = noteTimingXml(
      slotDuration * segment.length,
      notation.type,
      notation.dots,
      notation.timeModification,
      beamXml(segments, index, notation.typeDenominator, segmentTypes),
      tupletXml(segments, segmentNotations, index),
    );
    if (segment.events.length === 0) {
      measure.push(restXml(timing));
      continue;
    }

    const displays = segment.events.map((event) =>
      resolveEventDisplay(bar, event, diagnostics),
    );
    for (const [eventIndex, event] of segment.events.entries()) {
      const display = displays[eventIndex]!;
      if (display.grace) measure.push(graceNoteXml(bar, event, display.graceDisplay));
    }
    for (const [eventIndex, event] of segment.events.entries()) {
      measure.push(
        percussionNoteXml(
          bar,
          event,
          displays[eventIndex]!.display,
          timing,
          eventIndex > 0,
        ),
      );
    }
  }
  measure.push('<barline location="right"><bar-style>light-heavy</bar-style></barline>');

  const voices = Object.entries((bar.kit as DrumKit).voices).sort(
    ([, left], [, right]) => left.order - right.order,
  );
  const instruments = voices
    .map(
      ([id, voice]) =>
        `<score-instrument id="P1-I${voice.order + 1}"><instrument-name>${escapeXml(voice.name)}</instrument-name></score-instrument><midi-instrument id="P1-I${voice.order + 1}"><midi-channel>10</midi-channel><midi-unpitched>${voice.midiUnpitched}</midi-unpitched></midi-instrument>`,
    )
    .join("");
  const musicXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "https://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    `<part-list><score-part id="P1"><part-name>${escapeXml(bar.kit.name)}</part-name>${instruments}</score-part></part-list>`,
    '<part id="P1"><measure number="1">',
    ...measure,
    "</measure></part>",
    "</score-partwise>",
  ].join("");

  const result: MusicXmlCompileResult = Object.freeze({
    musicXml,
    diagnostics: Object.freeze(diagnostics),
  });
  if (options.strict && diagnostics.length > 0) {
    throw new NotationCompilationError(result.diagnostics);
  }
  return result;
}
