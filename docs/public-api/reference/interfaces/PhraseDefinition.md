[**@dbzdrums/notation**](../index.md)

---

# Interface: PhraseDefinition\<K\>

Constructor input for an ordered, non-empty [Phrase](../classes/Phrase.md).

## Type Parameters

### K

`K` _extends_ [`DrumKit`](DrumKit.md) = [`DrumKit`](DrumKit.md)

## Properties

### annotations?

```ts
readonly optional annotations?: readonly PhraseTextAnnotation[];
```

Occurrence-specific annotations. Annotations stored on a bar remain
attached to every occurrence of that bar.

#### Default Value

```ts
An empty array.
```

---

### bars

```ts
readonly bars: readonly Bar<K>[];
```

Bars in score order; every bar must use the same drum-kit instance.
