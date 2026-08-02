[**@dbzdrums/notation**](../index.md)

---

# Interface: PhraseTextAnnotation

A text annotation attached to one specific bar occurrence in a phrase.

## Extends

- [`BarTextAnnotation`](BarTextAnnotation.md)

## Properties

### at

```ts
readonly at: `${number}.${number}`;
```

Position on the containing bar's grid.

#### Inherited from

[`BarTextAnnotation`](BarTextAnnotation.md).[`at`](BarTextAnnotation.md#at)

---

### bar

```ts
readonly bar: number;
```

Zero-based index into [PhraseDefinition.bars](PhraseDefinition.md#bars).

---

### placement?

```ts
readonly optional placement?: TextPlacement;
```

Placement relative to the staff.

#### Default Value

`"below"`

#### Inherited from

[`BarTextAnnotation`](BarTextAnnotation.md).[`placement`](BarTextAnnotation.md#placement)

---

### text

```ts
readonly text: string;
```

Non-empty text without carriage returns or line feeds.

#### Inherited from

[`BarTextAnnotation`](BarTextAnnotation.md).[`text`](BarTextAnnotation.md#text)
