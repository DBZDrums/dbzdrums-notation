[**@dbzdrums/notation**](../index.md)

---

# Type Alias: ArticulationRender

```ts
type ArticulationRender = "base" | "grace" | "unsupported";
```

The compiler behavior for an articulation: alter the main `base` note, add a
preceding slashed `grace` note, or retain the hit with an `unsupported`
diagnostic and base-display fallback.
