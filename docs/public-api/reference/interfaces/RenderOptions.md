[**@dbzdrums/notation**](../index.md)

---

# Interface: RenderOptions

Browser-only options accepted by both SVG rendering functions.

## Extends

- [`MusicXmlCompileOptions`](MusicXmlCompileOptions.md)

## Properties

### presentation?

```ts
readonly optional presentation?: ScorePresentationOptions;
```

Optional score-marking visibility controls; every marking defaults to visible.

#### Inherited from

[`MusicXmlCompileOptions`](MusicXmlCompileOptions.md).[`presentation`](MusicXmlCompileOptions.md#presentation)

---

### repeatCount?

```ts
readonly optional repeatCount?: number;
```

Total visual play count. A safe integer of 2 or greater adds `xN` to the
SVG only and does not alter MusicXML semantics.

---

### signal?

```ts
readonly optional signal?: AbortSignal;
```

Signal for cooperative cancellation at asynchronous checkpoints. It cannot
interrupt synchronous OpenSheetMusicDisplay work already in progress.

---

### strict?

```ts
readonly optional strict?: boolean;
```

Throw [NotationCompilationError](../classes/NotationCompilationError.md) instead of returning a result when
non-fatal diagnostics are produced.

#### Default Value

`false`

#### Inherited from

[`MusicXmlCompileOptions`](MusicXmlCompileOptions.md).[`strict`](MusicXmlCompileOptions.md#strict)

---

### zoom?

```ts
readonly optional zoom?: number;
```

OpenSheetMusicDisplay scale.

#### Default Value

`1`
