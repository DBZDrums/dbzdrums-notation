[**@dbzdrums/notation**](../index.md)

---

# Type Alias: VoiceId\<K\>

```ts
type VoiceId<K> = Extract<keyof K["voices"], string>;
```

String voice ids defined by a particular drum-kit type.

## Type Parameters

### K

`K` _extends_ [`DrumKit`](../interfaces/DrumKit.md)
