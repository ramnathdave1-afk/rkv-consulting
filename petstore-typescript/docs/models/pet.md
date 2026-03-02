# Pet

## Example Usage

```typescript
import { Pet } from "petstore/models";

let value: Pet = {
  id: 10,
  name: "doggie",
  category: {
    id: 1,
    name: "Dogs",
  },
  photoUrls: [],
};
```

## Fields

| Field                                       | Type                                        | Required                                    | Description                                 | Example                                     |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `id`                                        | *number*                                    | :heavy_minus_sign:                          | N/A                                         | 10                                          |
| `name`                                      | *string*                                    | :heavy_check_mark:                          | N/A                                         | doggie                                      |
| `category`                                  | [models.Category](../models/category.md)    | :heavy_minus_sign:                          | N/A                                         |                                             |
| `photoUrls`                                 | *string*[]                                  | :heavy_check_mark:                          | N/A                                         |                                             |
| `tags`                                      | [models.Tag](../models/tag.md)[]            | :heavy_minus_sign:                          | N/A                                         |                                             |
| `status`                                    | [models.PetStatus](../models/pet-status.md) | :heavy_minus_sign:                          | pet status in the store                     |                                             |