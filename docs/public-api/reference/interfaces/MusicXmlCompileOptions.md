[**@dbzdrums/notation**](../index.md)

---

# Interface: MusicXmlCompileOptions

Options shared by MusicXML compilation and browser rendering.

## Extended by

- [`RenderOptions`](RenderOptions.md)

## Properties

### presentation?

```ts
readonly optional presentation?: ScorePresentationOptions;
```

Optional score-marking visibility controls; every marking defaults to visible.

---

### strict?

```ts
readonly optional strict?: boolean;
```

Throw [NotationCompilationError](../classes/NotationCompilationError.md) instead of returning a result when
non-fatal diagnostics are produced.

#### Default Value

`false`
