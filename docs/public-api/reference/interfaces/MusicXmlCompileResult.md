[**@dbzdrums/notation**](../index.md)

---

# Interface: MusicXmlCompileResult

The deterministic output of [compileMusicXml](../functions/compileMusicXml.md).

## Extended by

- [`RenderResult`](RenderResult.md)

## Properties

### diagnostics

```ts
readonly diagnostics: readonly CompilationDiagnostic[];
```

Ordered degradation diagnostics; empty when compilation is fully supported.

---

### musicXml

```ts
readonly musicXml: string;
```

Complete MusicXML 4.0 `score-partwise` document.
