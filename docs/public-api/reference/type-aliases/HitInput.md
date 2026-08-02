[**@dbzdrums/notation**](../index.md)

---

# Type Alias: HitInput\<A\>

```ts
type HitInput<A> =
  | Position
  | {
      articulations?: readonly A[];
      at: Position;
    };
```

One authored hit, either as an unqualified position or as a position with an
ordered list of articulation ids.

## Type Parameters

### A

`A` _extends_ `string` = `string`

## Union Members

[`Position`](Position.md)

---

### Type Literal

```ts
{
  articulations?: readonly A[];
  at: Position;
}
```

#### articulations?

```ts
readonly optional articulations?: readonly A[];
```

Requested articulations; omit to use the voice's base state.

#### at

```ts
readonly at: Position;
```

Position of the attack on the bar grid.
