[**@dbzdrums/notation**](../index.md)

---

# Function: compileMusicXml()

```ts
function compileMusicXml(input, options?): MusicXmlCompileResult;
```

Compiles an immutable [Bar](../classes/Bar.md) or [Phrase](../classes/Phrase.md) to a complete,
deterministic MusicXML 4.0 `score-partwise` document.

The compiler is synchronous and works in Node.js and browser environments.
It emits one percussion part on MIDI channel 10, a five-line staff, inferred
note and rest durations, chords, beams, tuplets, annotations, and requested
score-presentation settings. It does not mutate its input.

## Parameters

### input

\| [`Bar`](../classes/Bar.md)\<`any`\>
\| [`Phrase`](../classes/Phrase.md)\<`any`\>

Validated bar or ordered phrase to compile.

### options?

[`MusicXmlCompileOptions`](../interfaces/MusicXmlCompileOptions.md) = `{}`

Strict diagnostic handling and score presentation controls.

## Returns

[`MusicXmlCompileResult`](../interfaces/MusicXmlCompileResult.md)

Frozen MusicXML text and an ordered, frozen diagnostics array.

## Throws

[NotationCompilationError](../classes/NotationCompilationError.md) when `options.strict` is `true` and
any degradation diagnostic is produced, or when a rhythmic subdivision cannot
be represented by the supported MusicXML note types.
