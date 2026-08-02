[**@dbzdrums/notation**](../index.md)

---

# Interface: BarTextAnnotation

A non-empty, single-line text annotation attached to one bar position.

## Extended by

- [`PhraseTextAnnotation`](PhraseTextAnnotation.md)

## Properties

### at

```ts
readonly at: `${number}.${number}`;
```

Position on the containing bar's grid.

---

### placement?

```ts
readonly optional placement?: TextPlacement;
```

Placement relative to the staff.

#### Default Value

`"below"`

---

### text

```ts
readonly text: string;
```

Non-empty text without carriage returns or line feeds.
