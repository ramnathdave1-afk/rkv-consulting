# OrderStatus

Order Status

## Example Usage

```typescript
import { OrderStatus } from "petstore/models";

let value: OrderStatus = "approved";
```

## Values

This is an open enum. Unrecognized values will be captured as the `Unrecognized<string>` branded type.

```typescript
"placed" | "approved" | "delivered" | Unrecognized<string>
```