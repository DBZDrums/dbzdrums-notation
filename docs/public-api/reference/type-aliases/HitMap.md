[**@dbzdrums/notation**](../index.md)

---

# Type Alias: HitMap\<K\>

```ts
type HitMap<K> = Partial<{
  readonly [V in VoiceId<K>]: readonly HitInput<ArticulationId<K, V>>[];
}>;
```

Type-safe, optional hit arrays keyed by the voices of a drum kit.

## Type Parameters

### K

`K` _extends_ [`DrumKit`](../interfaces/DrumKit.md)
