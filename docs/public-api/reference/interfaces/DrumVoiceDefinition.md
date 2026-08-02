[**@dbzdrums/notation**](../index.md)

---

# Interface: DrumVoiceDefinition

Defines one named drum voice in a custom [DrumKit](DrumKit.md).

## Properties

### articulations

```ts
readonly articulations: Readonly<Record<string, ArticulationDefinition>>;
```

Articulation definitions keyed by the ids accepted for this voice.

---

### defaultArticulations

```ts
readonly defaultArticulations: readonly string[];
```

Effective articulations prepended when a hit does not request a primary
articulation. Every id must exist in [DrumVoiceDefinition.articulations](#articulations).

---

### display

```ts
readonly display: VoiceDisplay;
```

Base staff display used by an unqualified hit.

---

### midiUnpitched

```ts
readonly midiUnpitched: number;
```

MIDI unpitched note number from 1 through 127.

---

### name

```ts
readonly name: string;
```

Human-readable instrument name used in MusicXML.

---

### order

```ts
readonly order: number;
```

Unique integer that controls deterministic chord and instrument ordering.
