[**@dbzdrums/notation**](../index.md)

---

# Interface: ArticulationDefinition

Defines the validation role and MusicXML fallback behavior of one articulation.

## Properties

### display?

```ts
readonly optional display?: Partial<VoiceDisplay>;
```

Overrides supported voice-display fields for the main note unless rendering
is unsupported. The current compiler writes upward stems.

---

### graceDisplay?

```ts
readonly optional graceDisplay?: Partial<VoiceDisplay>;
```

Overrides supported display fields for the preceding note when `render` is
`grace`. The current compiler writes upward stems.

---

### render

```ts
readonly render: ArticulationRender;
```

How the articulation is represented during compilation.

---

### role

```ts
readonly role: ArticulationRole;
```

Whether the articulation is an exclusive primary or an ordered modifier.
