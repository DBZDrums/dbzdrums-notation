[**@dbzdrums/notation**](../index.md)

---

# Type Alias: ArticulationId\<K, V\>

```ts
type ArticulationId<K, V> = Extract<
  keyof K["voices"][V]["articulations"],
  string
>;
```

Articulation ids accepted by one voice in a particular drum-kit type.

## Type Parameters

### K

`K` _extends_ [`DrumKit`](../interfaces/DrumKit.md)

### V

`V` _extends_ [`VoiceId`](VoiceId.md)\<`K`\>
