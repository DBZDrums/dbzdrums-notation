[**@dbzdrums/notation**](../index.md)

---

# Type Alias: Meter

```ts
type Meter = `${number}/${number}`;
```

A written time signature in `numerator/denominator` form, such as `4/4` or
`6/8`. [Bar](../classes/Bar.md) requires a positive numerator and a denominator of 1, 2,
4, 8, 16, or 32.
