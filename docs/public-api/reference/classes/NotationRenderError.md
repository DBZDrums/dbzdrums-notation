[**@dbzdrums/notation**](../index.md)

---

# Class: NotationRenderError

Browser rendering failure with one stable machine-readable code.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new NotationRenderError(
   code,
   message,
   options?): NotationRenderError;
```

Creates a rendering error.

#### Parameters

##### code

[`RenderCode`](../type-aliases/RenderCode.md)

Stable machine-readable render code.

##### message

`string`

Human-readable English explanation.

##### options?

`ErrorOptions`

Optional standard error options, including an underlying cause.

#### Returns

`NotationRenderError`

#### Overrides

```ts
Error.constructor;
```

## Properties

### code

```ts
readonly code: RenderCode;
```

Code identifying the render validation, cancellation, OSMD, or SVG failure.
