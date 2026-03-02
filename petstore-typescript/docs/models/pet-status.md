# PetStatus

pet status in the store

## Example Usage

```typescript
import { PetStatus } from "petstore/models";

let value: PetStatus = "sold";
```

## Values

This is an open enum. Unrecognized values will be captured as the `Unrecognized<string>` branded type.

```typescript
"available" | "pending" | "sold" | Unrecognized<string>
```