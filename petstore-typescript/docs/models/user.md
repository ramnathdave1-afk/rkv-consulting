# User

## Example Usage

```typescript
import { User } from "petstore/models";

let value: User = {
  id: 10,
  username: "theUser",
  firstName: "John",
  lastName: "James",
  email: "john@email.com",
  password: "12345",
  phone: "12345",
  userStatus: 1,
};
```

## Fields

| Field              | Type               | Required           | Description        | Example            |
| ------------------ | ------------------ | ------------------ | ------------------ | ------------------ |
| `id`               | *number*           | :heavy_minus_sign: | N/A                | 10                 |
| `username`         | *string*           | :heavy_minus_sign: | N/A                | theUser            |
| `firstName`        | *string*           | :heavy_minus_sign: | N/A                | John               |
| `lastName`         | *string*           | :heavy_minus_sign: | N/A                | James              |
| `email`            | *string*           | :heavy_minus_sign: | N/A                | john@email.com     |
| `password`         | *string*           | :heavy_minus_sign: | N/A                | 12345              |
| `phone`            | *string*           | :heavy_minus_sign: | N/A                | 12345              |
| `userStatus`       | *number*           | :heavy_minus_sign: | User Status        | 1                  |