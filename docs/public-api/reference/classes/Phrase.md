[**@dbzdrums/notation**](../index.md)

---

# Class: Phrase\<K\>

An immutable, ordered, non-empty sequence of existing [Bar](Bar.md) values.

Bars may use different meters, divisions, and groupings, but must retain the
exact same drum-kit instance. A phrase has no name or repeat semantics.

## Type Parameters

### K

`K` _extends_ [`DrumKit`](../interfaces/DrumKit.md) = [`DrumKit`](../interfaces/DrumKit.md)

## Constructors

### Constructor

```ts
new Phrase<K>(definition): Phrase<K>;
```

Creates a validated phrase.

#### Parameters

##### definition

[`PhraseDefinition`](../interfaces/PhraseDefinition.md)\<`K`\>

Ordered bars and optional occurrence-specific annotations.

#### Returns

`Phrase`\<`K`\>

#### Throws

[NotationValidationError](NotationValidationError.md) if bars are absent, empty, invalid, use
different kit instances, or if any phrase annotation is invalid.

## Properties

### annotations

```ts
readonly annotations: readonly PhraseTextAnnotation[];
```

Normalized annotations that target specific zero-based bar occurrences.

---

### bars

```ts
readonly bars: readonly Bar<K>[];
```

Frozen array of bars in score order. Bar instances are retained by reference.

---

### kit

```ts
readonly kit: K;
```

Shared drum-kit instance, taken from the first bar.
