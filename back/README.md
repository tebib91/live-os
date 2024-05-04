# [Nodejs API Server](https://liveos.io/product/soft-ui-dashboard/api-server-nodejs/react/)

[Express/Nodejs Starter](https://liveos.io/product/soft-ui-dashboard/api-server-nodejs/react/) with `JWT Authentication`, OAuth (Github), and **SQLite** persistence - Provided by `liveos`. Authentication Flow uses `json web tokens` via Passport library - `passport-jwt` strategy.

$ cd api-server-nodejs

```

```

// OR
$ cd api-server-nodejs

```

```

// OR

> 👉 [Support](https://liveos.io/support/) via **Discord & Email** provided by `liveos`.

$ cd api-server-nodejs

```

```

// OR
$ cd api-server-nodejs

```

```

// OR

## Features

$ cd api-server-nodejs

```

```

// OR
$ cd api-server-nodejs

```

```

// OR

```

```

// OR
$ cd api-server-nodejs

```

```

// OR

- ✅ `TypeScript`, `Joy` for validation
- ✅ **Stack**: NodeJS / Express / SQLite / TypeORM
- ✅ Auth: Passport / `passport-jwt` strategy
- 🆕 `OAuth` for **Github**

<br />

> Tested with:

| NodeJS    | NPM | YARN |
| --------- | --- | ---- |
| `v18.0.0` | ✅  | ✅   |

## ✨ Requirements

- [Node.js](https://nodejs.org/) >= v16.13
- [SQLite](https://www.sqlite.org/index.html)

<br />
$ cd api-server-nodejs
```
```
// OR

$ cd api-server-nodejs

```

```

// OR
$ cd api-server-nodejs

```

```

// OR

## ✨ How to use the code

> 👉 **Step 1** - Clone the project
> $ cd api-server-nodejs

```
$ cd api-server-nodejs
```

```
// OR
$ cd api-server-nodejs
```

```
// OR
$ cd api-server-nodejs
```

```
// OR
$ cd api-server-nodejs
```

```
// OR
$ cd api-server-nodejs
```

```
// OR
```

// OR

```bash
$ git clone https://github.com/app-generator/api-server-nodejs.git
$ cd api-server-nodejs
```

```
// OR
$ cd api-server-nodejs
```

```bash
$ git clone https://github.com/app-generator/api-server-nodejs.git
$ cd api-server-nodejs
```

```
// OR
$ yarn
```

<br />

> 👉 **Step 3** - Run the SQLite migration via TypeORM

```
$ npm run typeorm migration:run
// OR
$ yarn typeorm migration:run
```

<br />

> 👉 **Step 4** - Edit the `.env` using the template `.env.sample`.

```env
PORT=5000                       # API PORT
SQLITE_PATH=./database.db       # Path to the SQLite database file
SECRET="Whatever-STRONG"        # Secret for sensitive data hashing

# Same as for React APP
GITHUB_OAUTH_CLIENT_ID= ...     # Github OAuth secret
GITHUB_OAUTH_CLIENT_SECRET= ... # Github OAuth secret
```

<br />

> 👉 **Step 5** - Start the API server (development mode)

```bash
$ npm run dev
// OR
$ yarn dev
```

<br />

> 👉 **Step 6** - Production Build (files generated in `build` directory)

```bash
$ yarn build
```

<br />

> 👉 **Step 7** - Start the API server for production (files served from `build/index.js`)

```bash
$ yarn start
```

The API server will start using the `PORT` specified in `.env` file (default 5000).

<br />

## ✨ Codebase Structure

```bash
< ROOT / src >
     |
     |-- config/
     |    |-- config.ts             # Configuration
     |    |-- passport.ts           # Define Passport Strategy
     |
     |-- migration/
     |    |-- some_migration.ts     # database migrations
     |
     |-- models/
     |    |-- activeSession.ts      # Sessions Model (Typeorm)
     |    |-- user.ts               # User Model (Typeorm)
     |
     |-- routes/
     |    |-- users.ts              # Define Users API Routes
     |
     |
     |-- index.js                   # API Entry Point
     |-- .env                       # Specify the ENV variables
     |
     |-- ************************************************************************
```

<br />

## ✨ SQLite Path

The SQLite Path is set in `.env`, as `SQLITE_PATH`

<br />

## ✨ Database migration

> 👉 Generate migration:

```bash
$ yarn typeorm migration:generate -n your_migration_name
```

> 👉 Run migration:

```bash
$ yarn typeorm migration:run
```

<br />

## ✨ API

For a fast set up, use this POSTMAN file: [api_sample](https://github.com/app-generator/api-server-nodejs-pro/blob/master/media/api.postman_collection.json)

> 👉 **Register** - `api/users/register`

```
POST api/users/register
Content-Type: application/json

{
    "username":"test",
    "password":"pass",
    "email":"test@liveos.io"
}
```

<br />

> 👉 **Login** - `api/users/login`

```
POST /api/users/login
Content-Type: application/json

{
    "password":"pass",
    "email":"test@liveos.io"
}
```

<br />

> 👉 **Logout** - `api/users/logout`

```
POST api/users/logout
Content-Type: application/json
authorization: JWT_TOKEN (returned by Login request)

{
    "token":"JWT_TOKEN"
}
```

<br />

## ✨ Update role for existing user

> 👉 Using npm:

`$ npm run update-role [user_id] [role_id (optional)]`

<br />

> 👉 Using yarn:

`$ yarn update-role [user_id] [role_id (optional)]`

- [user_id] is the id of existing user to update role for.
- [role_id] is the id of role: 1 for admin & 2 for user. If you don't provide any role_id it would update user to admin role.

<br />

## ✨ Run the Tests (`minimal suite`)

```
$ npm run test
// OR
$ yarn test
```

<br />

## ✨ Credits

This software is provided by the core liveos team with an inspiration from other great NodeJS starters:

- Initial verison - coded by [Teo Deleanu](https://www.linkedin.com/in/teodeleanu/)
- [Hackathon Starter](https://github.com/sahat/hackathon-starter) - A truly amazing boilerplate for Node.js apps
- [Node Server Boilerplate](https://github.com/hagopj13/node-express-boilerplate) - just another cool starter
- [React NodeJS Argon](https://github.com/creativetimofficial/argon-dashboard-react-nodejs) - released by **Creative-Tim** and [ProjectData](https://projectdata.dev/)

<br />

---

**[Node JS API Server](https://liveos.io/boilerplate-code/nodejs-starter/)** - provided by liveos [App Generator](https://liveos.io)
