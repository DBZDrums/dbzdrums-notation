[**@dbzdrums/notation**](../index.md)

---

# Interface: DrumKit\<V\>

An immutable, validated mapping from authored voice ids to percussion output.

## Type Parameters

### V

`V` _extends_ [`VoiceMap`](../type-aliases/VoiceMap.md) = [`VoiceMap`](../type-aliases/VoiceMap.md)

## Properties

### id

```ts
readonly id: string;
```

Stable kit id starting with a letter, followed by letters, digits, or hyphens.

---

### name

```ts
readonly name: string;
```

Human-readable kit name used as the MusicXML part name.

---

### voices

```ts
readonly voices: Readonly<V>;
```

Frozen voice definitions keyed by authored voice id.
