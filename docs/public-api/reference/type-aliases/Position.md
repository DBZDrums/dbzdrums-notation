[**@dbzdrums/notation**](../index.md)

---

# Type Alias: Position

```ts
type Position = `${number}.${number}`;
```

A canonical bar coordinate in `writtenUnit.subdivision` form.

Written units are one-based and subdivisions are zero-based. The template
literal type describes the string shape; [Bar](../classes/Bar.md) validates canonical
formatting and checks the coordinate against its grid at runtime.
