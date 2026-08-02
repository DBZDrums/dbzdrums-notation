[**@dbzdrums/notation**](../index.md)

---

# Interface: NotationIssue\<C\>

A machine-readable validation issue or compilation diagnostic.

## Type Parameters

### C

`C` _extends_ `string` = `string`

## Properties

### code

```ts
readonly code: C;
```

Stable code suitable for programmatic branching.

---

### message

```ts
readonly message: string;
```

Human-readable English explanation.

---

### path?

```ts
readonly optional path?: string;
```

Optional property path identifying the affected input or normalized event.
