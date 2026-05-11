# Bingo Familiar Premium API

NestJS + Fastify API for Bingo Familiar Premium, with match projection, authentication, WebSocket events, Prisma persistence, win claims, audit logs, and administrative history.

## Scripts

```bash
npm run start:dev
npm run build
npm run test
npm run test:e2e
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run prisma:reset:empty
```

## First Use

The API no longer creates demo data.

1. Configure `DATABASE_URL`.
2. Run `npm run prisma:push`.
3. Run `npm run prisma:seed` to confirm the empty seed.
4. Create the first organization through `POST /api/v1/tenants` or the web login page.

## Empty Local Reset

For local development only:

```bash
npm run prisma:reset:empty
```

This drops existing local data, reapplies the schema, and leaves the database without tenants, users, rooms, players, or draws.

## Notes

- PostgreSQL through Prisma is required for application data.
- Redis is optional in local development and remains supported for bridge/analytics flows.
- The old in-memory demo fallback has been removed so operational history always lands in real persistence.
