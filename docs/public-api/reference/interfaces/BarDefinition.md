[**@dbzdrums/notation**](../index.md)

---

# Interface: BarDefinition\<K\>

Constructor input for an immutable, validated [Bar](../classes/Bar.md).

## Type Parameters

### K

`K` _extends_ [`DrumKit`](DrumKit.md) = [`DrumKit`](DrumKit.md)

## Properties

### annotations?

```ts
readonly optional annotations?: readonly BarTextAnnotation[];
```

Position-anchored text annotations.

#### Default Value

```ts
An empty array.
```

---

### divisions

```ts
readonly divisions: number;
```

Total grid positions in the bar. Must be a positive safe-integer multiple
of the meter numerator and produce 1 through 32 subdivisions per written unit.

---

### grouping?

```ts
readonly optional grouping?: readonly number[];
```

Optional positive-integer beam groups whose sum is the meter numerator.
Coordinates are unaffected. Compound `n/8` meters divisible by three
default to groups of three; other meters default to one unit per group.

---

### hits?

```ts
readonly optional hits?: Partial<{ readonly [V in string]: readonly HitInput<Extract<keyof K["voices"][V]["articulations"], string>>[] }>;
```

Authored hits keyed by voice.

#### Default Value

```ts
An empty hit map.
```

---

### kit?

```ts
readonly optional kit?: K;
```

Drum kit used to validate and compile hits.

#### Default Value

[standardDrumKit](../variables/standardDrumKit.md)

---

### meter

```ts
readonly meter: `${number}/${number}`;
```

Written time signature.
