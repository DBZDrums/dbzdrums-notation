[**@dbzdrums/notation**](../index.md)

---

# Interface: RenderResult

The browser rendering result returned by both SVG rendering functions.

## Extends

- [`MusicXmlCompileResult`](MusicXmlCompileResult.md)

## Properties

### diagnostics

```ts
readonly diagnostics: readonly CompilationDiagnostic[];
```

Ordered degradation diagnostics; empty when compilation is fully supported.

#### Inherited from

[`MusicXmlCompileResult`](MusicXmlCompileResult.md).[`diagnostics`](MusicXmlCompileResult.md#diagnostics)

---

### musicXml

```ts
readonly musicXml: string;
```

Complete MusicXML 4.0 `score-partwise` document.

#### Inherited from

[`MusicXmlCompileResult`](MusicXmlCompileResult.md).[`musicXml`](MusicXmlCompileResult.md#musicxml)

---

### svg

```ts
readonly svg: SVGSVGElement;
```

The generated SVG element currently owned through the target container.

## Methods

### dispose()

```ts
dispose(): void;
```

Clears the owned target container and releases renderer-managed output.

#### Returns

`void`
