# Bingo Familiar Premium API

NestJS + Fastify API for Bingo Familiar Premium, with match projection, authentication, WebSocket events, and a PostgreSQL-ready Prisma schema.

## Scripts

```bash
npm run start:dev
npm run build
npm run test
npm run test:e2e
npm run prisma:generate
npm run prisma:seed
```

## Demo Credentials

- Email: `admin@bingo.local`
- Password: `bingo123`

## Notes

- The API can run in demo mode with in-memory data even if PostgreSQL and Redis are not up yet.
- Prisma schema and Docker artifacts are included so the project can be moved to real infra without changing the public contracts.
