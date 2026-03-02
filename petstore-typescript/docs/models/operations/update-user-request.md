# UpdateUserRequest

## Example Usage

```typescript
import { UpdateUserRequest } from "petstore/models/operations";

let value: UpdateUserRequest = {
  username: "Dortha_Hoeger59",
};
```

## Fields

| Field                                | Type                                 | Required                             | Description                          |
| ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------ |
| `username`                           | *string*                             | :heavy_check_mark:                   | name that needs to be updated        |
| `body`                               | [models.User](../../models/user.md)  | :heavy_minus_sign:                   | Update an existent user in the store |