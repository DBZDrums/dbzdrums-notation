[**@dbzdrums/notation**](../index.md)

---

# Class: NotationValidationError

Aggregated input error thrown while constructing a bar, phrase, or drum kit.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new NotationValidationError(issues): NotationValidationError;
```

Creates an aggregated validation error.

#### Parameters

##### issues

readonly [`NotationIssue`](../interfaces/NotationIssue.md)\<[`ValidationCode`](../type-aliases/ValidationCode.md)\>[]

Machine-readable issues whose messages form the error message.

#### Returns

`NotationValidationError`

#### Overrides

```ts
Error.constructor;
```

## Properties

### issues

```ts
readonly issues: readonly NotationIssue<ValidationCode>[];
```

Ordered validation issues collected before construction failed.
