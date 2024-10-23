# Guardflux

![License](https://img.shields.io/badge/License-MIT-blue)
![Version](https://img.shields.io/badge/Version-2.2.0-orange)

A light callable lib to keep your Node.Js API alive

- [Guardflux](#guardflux)
  - [Installation](#installation)
  - [Functions and usage](#functions-and-usage)
    - [schema](#schema)
    - [checkObject()](#checkobject)
    - [rateLimit()](#ratelimit)
  - [License](#license)

## Installation

```bash
npm i guardflux
```

## Functions and usage

### schema

This is expansion of [Joi](https://github.com/hapijs/joi) lib that we use it to verify API input. It can be `query` or `body` of a request. Here is the example of usage:

```ts
const ipSchema = schema.object({
    api_key: schema.string().min(10).max(10).required(),
})
```

### checkObject()

Then you can verify the input with `checkObject()` function and it returns result with two elements `isValid: boolean` and `log: any`. `isValid` returns `true` if given object and schema match and `log` returns `Joi` log if an error happen. Also this function has an element called `devMode` that prints all logs in `console` to get what is happening in function and defult setted to `true`. Here is the full example:

```ts
import { checkObject, schema } from 'guardflux'
import { CheckResult } from 'guardflux/dist/lib/types'

...
// This is the apikey or user ip or id that you can pass to function
const user_given_api_key: string = "x2a45B78C0"

const ipSchema = schema.object({
    api_key: schema.string().min(10).max(10).required(),
})

const check: CheckResult = await checkObject({ api_key: user_given_api_key }, ipSchema)
```

You can use `check.isValid` to response the user that given data in request is valid or not.

### rateLimit()

This is a very useful fucntion that make rate limit for every route based on user api-key/id/ip that you pass. We use [MikroOrm](https://github.com/mikro-orm/mikro-orm) because it is light and can handle several DBs. Because of needing to save data in DB we have to config the DB options first:

```ts
const dbConfig: DbConfig = {
    dbName: "guardflux", // Default name id "guardflux" but you can pass any name you want
    dbType: "mongodb", // Choose which DB you want to work with it. Supported DBs are 1-MySQL 2-MongoDB 3-PostgreSQL
    dbURI: MONGO_URI, // Pass URI of your DB
    dbDebug: true // Make MikroOrm debug mode on
}
```

If your DB has username and password, you can add it to you URI string. These are default DBs URI string that don't have username and password.

| Type       |        default connection url        |
| :--------- | :----------------------------------: |
| mongo      |      mongodb://127.0.0.1:27017       |
| mysql      |     mysql://root@127.0.0.1:3306      |
| postgresql | postgresql://postgres@127.0.0.1:5432 |

After we config the DB, we have to add `options` for `rateLimit` function:

```ts
const rlOptions: RateLimitOptions = {
    route: "/api/test_route", // API route to specify ratelimit based on route
    cycleTime: 60, // Rate limit cycle based on secounds
    maxRequests: 5 // Max requests that a user can make in cycleTime
}
```

Now we pass all consts to function. This function works based on two keys: 1- User API-key/ip/id 2- Route path. At least you can turn `devMode` to see in console what is happen. Like `checkObject` function, this method has `devMode` too that is enabled by default.This option will prints all data of `MikroOrm` and what is happen in function. This function returns like `checkObject` and you can use it to response the user if you want. All example is here:

```ts
import { checkObject, schema } from 'guardflux'
import { CheckResult } from 'guardflux/dist/lib/types'

...
// This is the apikey or user ip or id that you can pass to function
const user_given_api_key: string = "x2a45B78C0"

const rlOptions: RateLimitOptions = {
    route: "/api/test_route", // API route to specify ratelimit based on route
    cycleTime: 60, // Rate limit cycle based on secounds
    maxRequests: 5 // Max requests that a user can make in cycleTime
}

const dbConfig: DbConfig = {
    dbName: "guardflux", // Default name id "guardflux" but you can pass any name you want
    dbType: "mongodb", // Choose which DB you want to work with it. Supported DBs are 1-MySQL 2-MongoDB 3-PostgreSQL
    dbURI: MONGO_URI, // Pass URI of your DB
    dbDebug: true // Make MikroOrm debug mode on
}

const rl: CheckResult = await rateLimit(user_given_api_key, rlOptions, dbConfig)
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.