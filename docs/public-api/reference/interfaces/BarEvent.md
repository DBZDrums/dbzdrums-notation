[**@dbzdrums/notation**](../index.md)

---

# Interface: BarEvent

One normalized, immutable attack exposed by [Bar.events](../classes/Bar.md#events).

## Properties

### articulations

```ts
readonly articulations: readonly string[];
```

Ordered, effective articulations after defaults have been applied.

---

### at

```ts
readonly at: `${number}.${number}`;
```

Canonical authored position.

---

### slot

```ts
readonly slot: number;
```

Zero-based absolute position in the bar grid.

---

### subdivision

```ts
readonly subdivision: number;
```

Zero-based subdivision parsed from `at`.

---

### unit

```ts
readonly unit: number;
```

One-based written unit parsed from `at`.

---

### voice

```ts
readonly voice: string;
```

Authored drum-voice id.
