[**@dbzdrums/notation**](../index.md)

---

# Class: Bar\<K\>

An immutable, validated bar of drum notation.

Construction copies and freezes grouping, normalized events, annotations,
and timing metadata. The selected drum-kit instance is retained by identity.

## Type Parameters

### K

`K` _extends_ [`DrumKit`](../interfaces/DrumKit.md) = _typeof_ [`standardDrumKit`](../variables/standardDrumKit.md)

## Constructors

### Constructor

```ts
new Bar<K>(definition): Bar<K>;
```

Creates a validated bar.

#### Parameters

##### definition

[`BarDefinition`](../interfaces/BarDefinition.md)\<`K`\>

Meter, grid, optional kit, hits, grouping, and annotations.

#### Returns

`Bar`\<`K`\>

#### Throws

[NotationValidationError](NotationValidationError.md) with every detected validation issue.

## Properties

### annotations

```ts
readonly annotations: readonly BarTextAnnotation[];
```

Normalized text annotations in authoring order.

---

### divisions

```ts
readonly divisions: number;
```

Total number of grid positions in the bar.

---

### events

```ts
readonly events: readonly BarEvent[];
```

Normalized attacks sorted by grid slot and then drum-voice order.

---

### grouping

```ts
readonly grouping: readonly number[] | undefined;
```

Explicit beam grouping, or `undefined` when compiler defaults apply.

---

### kit

```ts
readonly kit: K;
```

Drum-kit instance used to validate and compile this bar.

---

### meter

```ts
readonly meter: `${number}/${number}`;
```

Canonical written meter.

---

### timing

```ts
readonly timing: object;
```

Derived meter and grid values.

#### denominator

```ts
readonly denominator: number;
```

Supported meter denominator.

#### numerator

```ts
readonly numerator: number;
```

Positive meter numerator.

#### subdivisionsPerUnit

```ts
readonly subdivisionsPerUnit: number;
```

Number of authored grid positions in each written unit.

## Methods

### add()

```ts
add<V>(voice, ...hits): Bar<K>;
```

Adds the supplied hits without mutating this bar.

Existing normalized hits and annotations are preserved in the returned bar.
An empty `hits` rest argument returns a newly validated equivalent bar.

#### Type Parameters

##### V

`V` _extends_ `string`

#### Parameters

##### voice

`V`

Voice id from this bar's drum kit.

##### hits

...readonly [`HitInput`](../type-aliases/HitInput.md)\<[`ArticulationId`](../type-aliases/ArticulationId.md)\<`K`, `V`\>\>[]

Positions or articulated hit objects to append.

#### Returns

`Bar`\<`K`\>

A newly validated immutable bar using the same kit instance.

#### Throws

[NotationValidationError](NotationValidationError.md) if an addition conflicts with existing
hits or violates any bar, position, voice, or articulation constraint.
