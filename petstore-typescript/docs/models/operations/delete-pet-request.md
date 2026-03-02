# DeletePetRequest

## Example Usage

```typescript
import { DeletePetRequest } from "petstore/models/operations";

let value: DeletePetRequest = {
  petId: 264740,
};
```

## Fields

| Field              | Type               | Required           | Description        |
| ------------------ | ------------------ | ------------------ | ------------------ |
| `apiKey`           | *string*           | :heavy_minus_sign: | N/A                |
| `petId`            | *number*           | :heavy_check_mark: | Pet id to delete   |