# petstore

Developer-friendly & type-safe Typescript SDK specifically catered to leverage *petstore* API.

[![Built by Speakeasy](https://img.shields.io/badge/Built_by-SPEAKEASY-374151?style=for-the-badge&labelColor=f3f4f6)](https://www.speakeasy.com/?utm_source=petstore&utm_campaign=typescript)
[![License: MIT](https://img.shields.io/badge/LICENSE_//_MIT-3b5bdb?style=for-the-badge&labelColor=eff6ff)](https://opensource.org/licenses/MIT)


<br /><br />
> [!IMPORTANT]
> This SDK is not yet ready for production use. To complete setup please follow the steps outlined in your [workspace](https://app.speakeasy.com/org/rkv-consulting/rkv-consulting). Delete this section before > publishing to a package manager.

<!-- Start Summary [summary] -->
## Summary

Petstore - OpenAPI 3.1: This is a sample Pet Store Server based on the OpenAPI 3.1 specification.

Some useful links:
- [OpenAPI Reference](https://www.speakeasy.com/openapi)
- [The Pet Store repository](https://github.com/swagger-api/swagger-petstore)
- [The source API definition for the Pet Store](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml)

For more information about the API: [Find out more about Swagger](http://swagger.io)
<!-- End Summary [summary] -->

<!-- Start Table of Contents [toc] -->
## Table of Contents
<!-- $toc-max-depth=2 -->
* [petstore](#petstore)
  * [SDK Installation](#sdk-installation)
  * [Requirements](#requirements)
  * [SDK Example Usage](#sdk-example-usage)
  * [Authentication](#authentication)
  * [Available Resources and Operations](#available-resources-and-operations)
  * [Standalone functions](#standalone-functions)
  * [File uploads](#file-uploads)
  * [Retries](#retries)
  * [Error Handling](#error-handling)
  * [Server Selection](#server-selection)
  * [Custom HTTP Client](#custom-http-client)
  * [Debugging](#debugging)
* [Development](#development)
  * [Maturity](#maturity)
  * [Contributions](#contributions)

<!-- End Table of Contents [toc] -->

<!-- Start SDK Installation [installation] -->
## SDK Installation

> [!TIP]
> To finish publishing your SDK to npm and others you must [run your first generation action](https://www.speakeasy.com/docs/github-setup#step-by-step-guide).


The SDK can be installed with either [npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/), [bun](https://bun.sh/) or [yarn](https://classic.yarnpkg.com/en/) package managers.

### NPM

```bash
npm add <UNSET>
```

### PNPM

```bash
pnpm add <UNSET>
```

### Bun

```bash
bun add <UNSET>
```

### Yarn

```bash
yarn add <UNSET>
```

> [!NOTE]
> This package is published with CommonJS and ES Modules (ESM) support.
<!-- End SDK Installation [installation] -->

<!-- Start Requirements [requirements] -->
## Requirements

For supported JavaScript runtimes, please consult [RUNTIMES.md](RUNTIMES.md).
<!-- End Requirements [requirements] -->

<!-- Start SDK Example Usage [usage] -->
## SDK Example Usage

### Example

```typescript
import { Petstore } from "petstore";

const petstore = new Petstore({
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  const result = await petstore.pet.updatePet({
    id: 10,
    name: "doggie",
    category: {
      id: 1,
      name: "Dogs",
    },
    photoUrls: [
      "<value 1>",
    ],
  });

  console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->

<!-- Start Authentication [security] -->
## Authentication

### Per-Client Security Schemes

This SDK supports the following security scheme globally:

| Name     | Type   | Scheme  | Environment Variable |
| -------- | ------ | ------- | -------------------- |
| `apiKey` | apiKey | API key | `PETSTORE_API_KEY`   |

To authenticate with the API the `apiKey` parameter must be set when initializing the SDK client instance. For example:
```typescript
import { Petstore } from "petstore";

const petstore = new Petstore({
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  const result = await petstore.pet.updatePet({
    id: 10,
    name: "doggie",
    category: {
      id: 1,
      name: "Dogs",
    },
    photoUrls: [
      "<value 1>",
    ],
  });

  console.log(result);
}

run();

```
<!-- End Authentication [security] -->

<!-- Start Available Resources and Operations [operations] -->
## Available Resources and Operations

<details open>
<summary>Available methods</summary>

### [Pet](docs/sdks/pet/README.md)

* [updatePet](docs/sdks/pet/README.md#updatepet) - Update an existing pet
* [addPet](docs/sdks/pet/README.md#addpet) - Add a new pet to the store
* [findPetsByStatus](docs/sdks/pet/README.md#findpetsbystatus) - Finds Pets by status
* [findPetsByTags](docs/sdks/pet/README.md#findpetsbytags) - Finds Pets by tags
* [getPetById](docs/sdks/pet/README.md#getpetbyid) - Find pet by ID
* [deletePet](docs/sdks/pet/README.md#deletepet) - Deletes a pet
* [uploadFile](docs/sdks/pet/README.md#uploadfile) - uploads an image

### [Store](docs/sdks/store/README.md)

* [getInventory](docs/sdks/store/README.md#getinventory) - Returns pet inventories by status
* [placeOrder](docs/sdks/store/README.md#placeorder) - Place an order for a pet
* [getOrderById](docs/sdks/store/README.md#getorderbyid) - Find purchase order by ID
* [deleteOrder](docs/sdks/store/README.md#deleteorder) - Delete purchase order by ID

### [User](docs/sdks/user/README.md)

* [createUser](docs/sdks/user/README.md#createuser) - Create user
* [createUsersWithListInput](docs/sdks/user/README.md#createuserswithlistinput) - Creates list of users with given input array
* [loginUser](docs/sdks/user/README.md#loginuser) - Logs user into the system
* [logoutUser](docs/sdks/user/README.md#logoutuser) - Logs out current logged in user session
* [getUserByName](docs/sdks/user/README.md#getuserbyname) - Get user by user name
* [updateUser](docs/sdks/user/README.md#updateuser) - Update user
* [deleteUser](docs/sdks/user/README.md#deleteuser) - Delete user

</details>
<!-- End Available Resources and Operations [operations] -->

<!-- Start Standalone functions [standalone-funcs] -->
## Standalone functions

All the methods listed above are available as standalone functions. These
functions are ideal for use in applications running in the browser, serverless
runtimes or other environments where application bundle size is a primary
concern. When using a bundler to build your application, all unused
functionality will be either excluded from the final bundle or tree-shaken away.

To read more about standalone functions, check [FUNCTIONS.md](./FUNCTIONS.md).

<details>

<summary>Available standalone functions</summary>

- [`petAddPet`](docs/sdks/pet/README.md#addpet) - Add a new pet to the store
- [`petDeletePet`](docs/sdks/pet/README.md#deletepet) - Deletes a pet
- [`petFindPetsByStatus`](docs/sdks/pet/README.md#findpetsbystatus) - Finds Pets by status
- [`petFindPetsByTags`](docs/sdks/pet/README.md#findpetsbytags) - Finds Pets by tags
- [`petGetPetById`](docs/sdks/pet/README.md#getpetbyid) - Find pet by ID
- [`petUpdatePet`](docs/sdks/pet/README.md#updatepet) - Update an existing pet
- [`petUploadFile`](docs/sdks/pet/README.md#uploadfile) - uploads an image
- [`storeDeleteOrder`](docs/sdks/store/README.md#deleteorder) - Delete purchase order by ID
- [`storeGetInventory`](docs/sdks/store/README.md#getinventory) - Returns pet inventories by status
- [`storeGetOrderById`](docs/sdks/store/README.md#getorderbyid) - Find purchase order by ID
- [`storePlaceOrder`](docs/sdks/store/README.md#placeorder) - Place an order for a pet
- [`userCreateUser`](docs/sdks/user/README.md#createuser) - Create user
- [`userCreateUsersWithListInput`](docs/sdks/user/README.md#createuserswithlistinput) - Creates list of users with given input array
- [`userDeleteUser`](docs/sdks/user/README.md#deleteuser) - Delete user
- [`userGetUserByName`](docs/sdks/user/README.md#getuserbyname) - Get user by user name
- [`userLoginUser`](docs/sdks/user/README.md#loginuser) - Logs user into the system
- [`userLogoutUser`](docs/sdks/user/README.md#logoutuser) - Logs out current logged in user session
- [`userUpdateUser`](docs/sdks/user/README.md#updateuser) - Update user

</details>
<!-- End Standalone functions [standalone-funcs] -->

<!-- Start File uploads [file-upload] -->
## File uploads

Certain SDK methods accept files as part of a multi-part request. It is possible and typically recommended to upload files as a stream rather than reading the entire contents into memory. This avoids excessive memory consumption and potentially crashing with out-of-memory errors when working with very large files. The following example demonstrates how to attach a file stream to a request.

> [!TIP]
>
> Depending on your JavaScript runtime, there are convenient utilities that return a handle to a file without reading the entire contents into memory:
>
> - **Node.js v20+:** Since v20, Node.js comes with a native `openAsBlob` function in [`node:fs`](https://nodejs.org/docs/latest-v20.x/api/fs.html#fsopenasblobpath-options).
> - **Bun:** The native [`Bun.file`](https://bun.sh/docs/api/file-io#reading-files-bun-file) function produces a file handle that can be used for streaming file uploads.
> - **Browsers:** All supported browsers return an instance to a [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) when reading the value from an `<input type="file">` element.
> - **Node.js v18:** A file stream can be created using the `fileFrom` helper from [`fetch-blob/from.js`](https://www.npmjs.com/package/fetch-blob).

```typescript
import { Petstore } from "petstore";

const petstore = new Petstore({
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  const result = await petstore.pet.uploadFile({
    petId: 150516,
  });

  console.log(result);
}

run();

```
<!-- End File uploads [file-upload] -->

<!-- Start Retries [retries] -->
## Retries

Some of the endpoints in this SDK support retries.  If you use the SDK without any configuration, it will fall back to the default retry strategy provided by the API.  However, the default retry strategy can be overridden on a per-operation basis, or across the entire SDK.

To change the default retry strategy for a single API call, simply provide a retryConfig object to the call:
```typescript
import { Petstore } from "petstore";

const petstore = new Petstore({
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  const result = await petstore.pet.updatePet({
    id: 10,
    name: "doggie",
    category: {
      id: 1,
      name: "Dogs",
    },
    photoUrls: [
      "<value 1>",
    ],
  }, {
    retries: {
      strategy: "backoff",
      backoff: {
        initialInterval: 1,
        maxInterval: 50,
        exponent: 1.1,
        maxElapsedTime: 100,
      },
      retryConnectionErrors: false,
    },
  });

  console.log(result);
}

run();

```

If you'd like to override the default retry strategy for all operations that support retries, you can provide a retryConfig at SDK initialization:
```typescript
import { Petstore } from "petstore";

const petstore = new Petstore({
  retryConfig: {
    strategy: "backoff",
    backoff: {
      initialInterval: 1,
      maxInterval: 50,
      exponent: 1.1,
      maxElapsedTime: 100,
    },
    retryConnectionErrors: false,
  },
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  const result = await petstore.pet.updatePet({
    id: 10,
    name: "doggie",
    category: {
      id: 1,
      name: "Dogs",
    },
    photoUrls: [
      "<value 1>",
    ],
  });

  console.log(result);
}

run();

```
<!-- End Retries [retries] -->

<!-- Start Error Handling [errors] -->
## Error Handling

[`PetstoreError`](./src/models/errors/petstore-error.ts) is the base class for all HTTP error responses. It has the following properties:

| Property            | Type       | Description                                                                             |
| ------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `error.message`     | `string`   | Error message                                                                           |
| `error.statusCode`  | `number`   | HTTP response status code eg `404`                                                      |
| `error.headers`     | `Headers`  | HTTP response headers                                                                   |
| `error.body`        | `string`   | HTTP body. Can be empty string if no body is returned.                                  |
| `error.rawResponse` | `Response` | Raw HTTP response                                                                       |
| `error.data$`       |            | Optional. Some errors may contain structured data. [See Error Classes](#error-classes). |

### Example
```typescript
import { Petstore } from "petstore";
import * as errors from "petstore/models/errors";

const petstore = new Petstore({
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  try {
    const result = await petstore.pet.updatePet({
      id: 10,
      name: "doggie",
      category: {
        id: 1,
        name: "Dogs",
      },
      photoUrls: [
        "<value 1>",
      ],
    });

    console.log(result);
  } catch (error) {
    // The base class for HTTP error responses
    if (error instanceof errors.PetstoreError) {
      console.log(error.message);
      console.log(error.statusCode);
      console.log(error.body);
      console.log(error.headers);

      // Depending on the method different errors may be thrown
      if (error instanceof errors.ApiErrorInvalidInput) {
        console.log(error.data$.status); // number
        console.log(error.data$.error); // string
      }
    }
  }
}

run();

```

### Error Classes
**Primary error:**
* [`PetstoreError`](./src/models/errors/petstore-error.ts): The base class for HTTP error responses.

<details><summary>Less common errors (9)</summary>

<br />

**Network errors:**
* [`ConnectionError`](./src/models/errors/http-client-errors.ts): HTTP client was unable to make a request to a server.
* [`RequestTimeoutError`](./src/models/errors/http-client-errors.ts): HTTP request timed out due to an AbortSignal signal.
* [`RequestAbortedError`](./src/models/errors/http-client-errors.ts): HTTP request was aborted by the client.
* [`InvalidRequestError`](./src/models/errors/http-client-errors.ts): Any input used to create a request is invalid.
* [`UnexpectedClientError`](./src/models/errors/http-client-errors.ts): Unrecognised or unexpected error.


**Inherit from [`PetstoreError`](./src/models/errors/petstore-error.ts)**:
* [`ApiErrorUnauthorized`](./src/models/errors/api-error-unauthorized.ts): Unauthorized error. Status code `401`. Applicable to 12 of 18 methods.*
* [`ApiErrorNotFound`](./src/models/errors/api-error-not-found.ts): Not Found error. Status code `404`. Applicable to 12 of 18 methods.*
* [`ApiErrorInvalidInput`](./src/models/errors/api-error-invalid-input.ts): Not Found error. Status code `400`. Applicable to 10 of 18 methods.*
* [`ResponseValidationError`](./src/models/errors/response-validation-error.ts): Type mismatch between the data returned from the server and the structure expected by the SDK. See `error.rawValue` for the raw value and `error.pretty()` for a nicely formatted multi-line string.

</details>

\* Check [the method documentation](#available-resources-and-operations) to see if the error is applicable.
<!-- End Error Handling [errors] -->

<!-- Start Server Selection [server] -->
## Server Selection

### Server Variables

The default server `https://{environment}.petstore.io` contains variables and is set to `https://prod.petstore.io` by default. To override default values, the following parameters are available when initializing the SDK client instance:

| Variable      | Parameter                               | Supported Values                           | Default  | Description                                                   |
| ------------- | --------------------------------------- | ------------------------------------------ | -------- | ------------------------------------------------------------- |
| `environment` | `environment: models.ServerEnvironment` | - `"prod"`<br/>- `"staging"`<br/>- `"dev"` | `"prod"` | The environment name. Defaults to the production environment. |

#### Example

```typescript
import { Petstore } from "petstore";

const petstore = new Petstore({
  serverIdx: 0,
  environment: "dev",
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  const result = await petstore.pet.updatePet({
    id: 10,
    name: "doggie",
    category: {
      id: 1,
      name: "Dogs",
    },
    photoUrls: [
      "<value 1>",
    ],
  });

  console.log(result);
}

run();

```

### Override Server URL Per-Client

The default server can be overridden globally by passing a URL to the `serverURL: string` optional parameter when initializing the SDK client instance. For example:
```typescript
import { Petstore } from "petstore";

const petstore = new Petstore({
  serverURL: "https://prod.petstore.io",
  apiKey: process.env["PETSTORE_API_KEY"] ?? "",
});

async function run() {
  const result = await petstore.pet.updatePet({
    id: 10,
    name: "doggie",
    category: {
      id: 1,
      name: "Dogs",
    },
    photoUrls: [
      "<value 1>",
    ],
  });

  console.log(result);
}

run();

```
<!-- End Server Selection [server] -->

<!-- Start Custom HTTP Client [http-client] -->
## Custom HTTP Client

The TypeScript SDK makes API calls using an `HTTPClient` that wraps the native
[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). This
client is a thin wrapper around `fetch` and provides the ability to attach hooks
around the request lifecycle that can be used to modify the request or handle
errors and response.

The `HTTPClient` constructor takes an optional `fetcher` argument that can be
used to integrate a third-party HTTP client or when writing tests to mock out
the HTTP client and feed in fixtures.

The following example shows how to:
- route requests through a proxy server using [undici](https://www.npmjs.com/package/undici)'s ProxyAgent
- use the `"beforeRequest"` hook to add a custom header and a timeout to requests
- use the `"requestError"` hook to log errors

```typescript
import { Petstore } from "petstore";
import { ProxyAgent } from "undici";
import { HTTPClient } from "petstore/lib/http";

const dispatcher = new ProxyAgent("http://proxy.example.com:8080");

const httpClient = new HTTPClient({
  // 'fetcher' takes a function that has the same signature as native 'fetch'.
  fetcher: (input, init) =>
    // 'dispatcher' is specific to undici and not part of the standard Fetch API.
    fetch(input, { ...init, dispatcher } as RequestInit),
});

httpClient.addHook("beforeRequest", (request) => {
  const nextRequest = new Request(request, {
    signal: request.signal || AbortSignal.timeout(5000)
  });

  nextRequest.headers.set("x-custom-header", "custom value");

  return nextRequest;
});

httpClient.addHook("requestError", (error, request) => {
  console.group("Request Error");
  console.log("Reason:", `${error}`);
  console.log("Endpoint:", `${request.method} ${request.url}`);
  console.groupEnd();
});

const sdk = new Petstore({ httpClient: httpClient });
```
<!-- End Custom HTTP Client [http-client] -->

<!-- Start Debugging [debug] -->
## Debugging

You can setup your SDK to emit debug logs for SDK requests and responses.

You can pass a logger that matches `console`'s interface as an SDK option.

> [!WARNING]
> Beware that debug logging will reveal secrets, like API tokens in headers, in log messages printed to a console or files. It's recommended to use this feature only during local development and not in production.

```typescript
import { Petstore } from "petstore";

const sdk = new Petstore({ debugLogger: console });
```

You can also enable a default debug logger by setting an environment variable `PETSTORE_DEBUG` to true.
<!-- End Debugging [debug] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->

# Development

## Maturity

This SDK is in beta, and there may be breaking changes between versions without a major version update. Therefore, we recommend pinning usage
to a specific package version. This way, you can install the same version each time without breaking changes unless you are intentionally
looking for the latest version.

## Contributions

While we value open-source contributions to this SDK, this library is generated programmatically. Any manual changes added to internal files will be overwritten on the next generation. 
We look forward to hearing your feedback. Feel free to open a PR or an issue with a proof of concept and we'll do our best to include it in a future release. 

### SDK Created by [Speakeasy](https://www.speakeasy.com/?utm_source=petstore&utm_campaign=typescript)
