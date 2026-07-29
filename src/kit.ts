import { NotationValidationError } from "./errors.js";
import type { DrumKit, DrumVoiceDefinition, NotationIssue, ValidationCode, VoiceMap } from "./types.js";

function freezeVoice<T extends DrumVoiceDefinition>(voice: T): T {
  return Object.freeze({
    ...voice,
    display: Object.freeze({ ...voice.display }),
    defaultArticulations: Object.freeze([...voice.defaultArticulations]),
    articulations: Object.freeze(
      Object.fromEntries(
        Object.entries(voice.articulations).map(([id, articulation]) => [
          id,
          Object.freeze({
            ...articulation,
            ...(articulation.display
              ? { display: Object.freeze({ ...articulation.display }) }
              : {}),
            ...(articulation.graceDisplay
              ? { graceDisplay: Object.freeze({ ...articulation.graceDisplay }) }
              : {}),
          }),
        ]),
      ),
    ),
  }) as T;
}

/** Defines and validates a deterministic percussion-kit mapping. */
export function defineDrumKit<V extends VoiceMap>(definition: {
  readonly id: string;
  readonly name: string;
  readonly voices: V;
}): DrumKit<V> {
  const issues: NotationIssue<ValidationCode>[] = [];
  if (!/^[a-z][a-z0-9-]*$/i.test(definition.id)) {
    issues.push({
      code: "INVALID_KIT",
      message: "A drum kit id must contain letters, digits, and hyphens.",
      path: "id",
    });
  }

  const seenOrders = new Set<number>();
  for (const [voiceId, voice] of Object.entries(definition.voices)) {
    if (!/^[a-z][a-z0-9-]*$/i.test(voiceId)) {
      issues.push({
        code: "INVALID_KIT",
        message: `Voice id '${voiceId}' must contain letters, digits, and hyphens.`,
        path: `voices.${voiceId}`,
      });
    }
    if (!Number.isInteger(voice.order) || seenOrders.has(voice.order)) {
      issues.push({
        code: "INVALID_KIT",
        message: `Voice '${voiceId}' must have a unique integer order.`,
        path: `voices.${voiceId}.order`,
      });
    }
    seenOrders.add(voice.order);
    if (
      !Number.isInteger(voice.midiUnpitched) ||
      voice.midiUnpitched < 1 ||
      voice.midiUnpitched > 127
    ) {
      issues.push({
        code: "INVALID_KIT",
        message: `Voice '${voiceId}' must have a MIDI unpitched value from 1 through 127.`,
        path: `voices.${voiceId}.midiUnpitched`,
      });
    }
    for (const articulation of voice.defaultArticulations) {
      if (!voice.articulations[articulation]) {
        issues.push({
          code: "INVALID_KIT",
          message: `Voice '${voiceId}' defaults to unknown articulation '${articulation}'.`,
          path: `voices.${voiceId}.defaultArticulations`,
        });
      }
    }
  }
  if (issues.length > 0) throw new NotationValidationError(issues);

  const voices = Object.fromEntries(
    Object.entries(definition.voices).map(([id, voice]) => [id, freezeVoice(voice)]),
  ) as V;
  return Object.freeze({
    id: definition.id,
    name: definition.name,
    voices: Object.freeze(voices),
  });
}

export const standardDrumKit = defineDrumKit({
  id: "standard-drum-kit",
  name: "Standard drum kit",
  voices: {
    bassDrum: {
      name: "Bass Drum",
      order: 0,
      display: { step: "F", octave: 4, notehead: "normal", stem: "up" },
      midiUnpitched: 36,
      defaultArticulations: ["normal"],
      articulations: { normal: { role: "primary", render: "base" } },
    },
    floorTom: {
      name: "Floor Tom",
      order: 1,
      display: { step: "A", octave: 4, notehead: "normal", stem: "up" },
      midiUnpitched: 41,
      defaultArticulations: ["normal"],
      articulations: { normal: { role: "primary", render: "base" } },
    },
    snare: {
      name: "Snare Drum",
      order: 2,
      display: { step: "C", octave: 5, notehead: "normal", stem: "up" },
      midiUnpitched: 38,
      defaultArticulations: ["normal"],
      articulations: {
        normal: { role: "primary", render: "base" },
        rim: {
          role: "primary",
          render: "base",
          display: { notehead: "x" },
        },
        flam: {
          role: "primary",
          render: "grace",
          graceDisplay: { notehead: "normal" },
        },
      },
    },
    tom2: {
      name: "Mid Tom",
      order: 3,
      display: { step: "D", octave: 5, notehead: "normal", stem: "up" },
      midiUnpitched: 47,
      defaultArticulations: ["normal"],
      articulations: { normal: { role: "primary", render: "base" } },
    },
    tom1: {
      name: "High Tom",
      order: 4,
      display: { step: "E", octave: 5, notehead: "normal", stem: "up" },
      midiUnpitched: 50,
      defaultArticulations: ["normal"],
      articulations: { normal: { role: "primary", render: "base" } },
    },
    ride: {
      name: "Ride Cymbal",
      order: 5,
      display: { step: "F", octave: 5, notehead: "x", stem: "up" },
      midiUnpitched: 51,
      defaultArticulations: ["normal"],
      articulations: { normal: { role: "primary", render: "base" } },
    },
    hiHat: {
      name: "Hi-Hat",
      order: 6,
      display: { step: "G", octave: 5, notehead: "x", stem: "up" },
      midiUnpitched: 42,
      defaultArticulations: ["closed"],
      articulations: {
        closed: { role: "primary", render: "base" },
        open: {
          role: "primary",
          render: "base",
          display: { notehead: "circle-x" },
        },
        pedal: {
          role: "primary",
          render: "base",
          display: { step: "D", octave: 4, notehead: "x" },
        },
      },
    },
    crash: {
      name: "Crash Cymbal",
      order: 7,
      display: { step: "A", octave: 5, notehead: "x", stem: "up" },
      midiUnpitched: 49,
      defaultArticulations: ["normal"],
      articulations: { normal: { role: "primary", render: "base" } },
    },
  },
} as const);
