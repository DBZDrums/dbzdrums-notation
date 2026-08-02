[**@dbzdrums/notation**](../index.md)

---

# Function: renderBarToSvg()

```ts
function renderBarToSvg(bar, container, options?): Promise<RenderResult>;
```

Compiles and renders one [Bar](../classes/Bar.md) into an owned browser container.

OpenSheetMusicDisplay is loaded only when this function is called. The target
must be connected to `document` and have a positive rendered width. A
successful render replaces its children and returns the generated five-line
SVG plus a synchronous [RenderResult.dispose](../interfaces/RenderResult.md#dispose) cleanup function.

## Parameters

### bar

[`Bar`](../classes/Bar.md)\<`any`\>

Validated bar to compile and render.

### container

`HTMLElement`

Connected browser element whose contents become renderer-owned.

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) = `{}`

Compilation, presentation, scale, repeat-label, and cancellation options.

## Returns

`Promise`\<[`RenderResult`](../interfaces/RenderResult.md)\>

A promise of the frozen compilation and SVG result.

## Throws

[NotationCompilationError](../classes/NotationCompilationError.md) when strict compilation fails.

## Throws

[NotationRenderError](../classes/NotationRenderError.md) when the target or options are invalid,
cancellation is observed, OSMD fails, five staff lines cannot be verified, or
a requested repeat label cannot be added safely.
