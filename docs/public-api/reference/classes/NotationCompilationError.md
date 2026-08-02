[**@dbzdrums/notation**](../index.md)

---

# Class: NotationCompilationError

Compilation failure carrying diagnostics that prevented an accepted result.

This is thrown when strict compilation encounters a degradation diagnostic,
or when a rhythmic subdivision cannot be represented in MusicXML.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new NotationCompilationError(diagnostics): NotationCompilationError;
```

Creates a compilation error.

#### Parameters

##### diagnostics

readonly [`CompilationDiagnostic`](../type-aliases/CompilationDiagnostic.md)[]

Diagnostics whose messages form the error message.

#### Returns

`NotationCompilationError`

#### Overrides

```ts
Error.constructor;
```

## Properties

### diagnostics

```ts
readonly diagnostics: readonly CompilationDiagnostic[];
```

Ordered diagnostics that caused compilation to fail.
