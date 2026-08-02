[**@dbzdrums/notation**](../index.md)

---

# Interface: VoiceDisplay

Defines where and how a drum voice is displayed on the percussion staff.

## Properties

### notehead

```ts
readonly notehead: Notehead;
```

Written notehead shape.

---

### octave

```ts
readonly octave: number;
```

MusicXML display octave.

---

### stem

```ts
readonly stem: StemDirection;
```

Requested stem direction; current compiled percussion notes use upward stems.

---

### step

```ts
readonly step: "A" | "B" | "C" | "D" | "E" | "F" | "G";
```

MusicXML diatonic display step.
