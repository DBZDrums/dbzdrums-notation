[**@dbzdrums/notation**](../index.md)

---

# Function: defineDrumKit()

```ts
function defineDrumKit<V>(definition): DrumKit<V>;
```

Defines, validates, copies, and freezes a deterministic percussion-kit mapping.

Literal voice and articulation ids are preserved in the return type so that
[BarDefinition.hits](../interfaces/BarDefinition.md#hits) and [Bar.add](../classes/Bar.md#add) remain kit-specific.

## Type Parameters

### V

`V` _extends_ [`VoiceMap`](../type-aliases/VoiceMap.md)

## Parameters

### definition

Kit identity, display name, and voice definitions.

#### id

`string`

Id starting with a letter, followed by letters, digits, or hyphens.

#### name

`string`

Human-readable MusicXML part name.

#### voices

`V`

Voice definitions keyed by ids with the same format as the kit id.

## Returns

[`DrumKit`](../interfaces/DrumKit.md)\<`V`\>

A deeply frozen drum-kit value.

## Throws

[NotationValidationError](../classes/NotationValidationError.md) with `INVALID_KIT` issues when kit or
voice ids are malformed, voice orders are not unique integers, MIDI values are
outside 1 through 127, or a default articulation id is unknown.
