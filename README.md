# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## API configuration

The app uses the Express API for authentication, stores, ratings, and dashboards.
Create a local environment file from the example:

```bash
cp .env.example .env
```

Set `VITE_API_BASE_URL` to the backend API root. For local development this is
`http://localhost:3000/api`; for a deployed frontend use the HTTPS URL of the deployed
backend, including `/api`.

The backend reads the Neon connection string from `DATABASE_URL`, enables SSL for Neon
connection strings, and allows the frontend origin through `CORS_ORIGINS`. The schema is at
`backend/schema.sql`; run it in the Neon SQL Editor before starting the backend. Set these
values in the backend hosting provider rather than committing a real `.env` file:

```text
DATABASE_URL=postgresql://...neon.tech/...?...sslmode=require
JWT_SECRET=<long-random-secret>
CORS_ORIGINS=https://your-site.example
```

Start the API from this directory with `npm run backend:start`, or use
`npm run backend:dev` during development. The backend's local environment belongs in the
ignored `backend/.env` file; the Neon CLI can refresh its database variables with
`neon env pull --file backend/.env --env DATABASE_URL --env NEON_BRANCH`.

## Bootstrap the first administrator

Public signup intentionally creates Normal Users only. On a new database, create the first
System Administrator once from this directory. Choose the email and password; these values
are read from the shell environment and are never written to source code:

```bash
read -r -p "Admin name: " BOOTSTRAP_ADMIN_NAME
read -r -p "Admin email: " BOOTSTRAP_ADMIN_EMAIL
read -r -p "Admin address: " BOOTSTRAP_ADMIN_ADDRESS
read -r -s -p "Admin password: " BOOTSTRAP_ADMIN_PASSWORD
printf '\\n'
export BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_ADDRESS BOOTSTRAP_ADMIN_PASSWORD
npm run backend:bootstrap-admin
unset BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_ADDRESS BOOTSTRAP_ADMIN_PASSWORD
```

The name must be 20–60 characters and the password must be 8–16 characters with an uppercase
letter and a special character. After creation, log in through `/auth`; the administrator is
redirected to `/admin` and can create the remaining platform accounts.
