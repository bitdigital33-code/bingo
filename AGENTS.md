# AGENTS.md

## Mission

Continue building `Bingo Familiar Premium` as a premium multi-tenant SaaS for real-world family bingo events.

This repository is already scaffolded and operational.
Do not recreate the project from scratch.
Extend the current monorepo and preserve the existing architecture.

## Product Context

- The bingo globe is physical and manual.
- The system is the digital control panel, validation engine, player experience, and TV/projection experience.
- The product must feel premium, cinematic, simple for families, and easy for older players.
- Primary language is `pt-BR`.

## Current Repository State

- Monorepo with:
  - `apps/api` -> `NestJS + Fastify + Socket.IO + Prisma + BullMQ + Redis bridge`
  - `apps/web` -> `React + Vite + Tailwind + Framer Motion`
  - `packages/contracts` -> shared DTOs and snapshots
  - `packages/ui` -> shared design system
- Backend supports two persistence modes:
  - `prisma` for real PostgreSQL persistence
  - `demo` for in-memory fallback
- Real Prisma persistence is already wired for:
  - tenants
  - users and memberships
  - rooms
  - matches
  - prize rounds
  - player sessions
  - cards and assignments
  - draw events
- Demo and Prisma modes should both keep working.
- Seed creates a real demo room:
  - room code: `NATAL26`
  - admin login: `admin@bingo.local`
  - password: `bingo123`

## First Rule

Before changing anything, inspect the current implementation and continue from it.
Prefer evolving existing modules instead of replacing them.

## Important Files

- `README.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `apps/api/src/modules/bingo/application/bingo-facade.service.ts`
- `apps/api/src/modules/bingo/infrastructure/bingo-store.service.ts`
- `apps/api/src/modules/bingo/infrastructure/prisma-bingo-store.service.ts`
- `apps/api/src/modules/bingo/domain/bingo-engine.service.ts`
- `apps/web/src/pages/admin-dashboard-page.tsx`
- `apps/web/src/pages/join-room-page.tsx`
- `apps/web/src/pages/player-room-page.tsx`
- `apps/web/src/pages/tv-room-page.tsx`

## Setup On A New Machine

Run this from the repo root:

```bash
npm install
npm run prisma:generate
```

If PostgreSQL is available and configured:

```bash
npm run prisma:push
npm run prisma:seed
npm run dev
```

If PostgreSQL is not available yet:

```bash
npm run dev
```

In that case, use:

- `BINGO_PERSISTENCE=demo`

## Environment Notes

- Copy `.env.example` to a local `.env` when needed.
- Never commit secrets.
- `apps/api/.env` and `apps/web/.env` may exist locally on some machines, but should be treated as local-only runtime config.
- Redis is optional for local development but should remain supported.

## Non-Negotiable Technical Rules

- Preserve the monorepo structure.
- Preserve DDD-style separation inside the API:
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`
- Keep anti-fraud decisions on the server.
- Keep winner detection server-side.
- Do not move game truth into the frontend.
- Keep WebSocket updates aligned with REST snapshots.
- Keep the fallback `demo` mode working even while expanding `prisma`.

## Non-Negotiable Product Rules

- Keep the premium visual direction.
- Keep UX friendly for elderly and family audiences.
- Keep large buttons, readable type, and high-contrast support.
- Keep the TV mode optimized for projector and Smart TV usage.
- Keep the playful social layer:
  - near-win alerts
  - hype messages
  - announcements
  - celebration states

## Current Verified State

The following were already validated before this file was created:

- `npm run build:contracts`
- `npm run build:api`
- `npm run build:web`
- `npm run prisma:generate`
- `npm run prisma:push`
- `npm run prisma:seed`
- `npm run test`
- `npm run test:e2e -w apps/api -- --runInBand`

Prisma smoke test also worked with:

- `persistenceMode=prisma`
- room `NATAL26`
- `8` seeded players

## Next Recommended Work

Implement real persistence for the remaining operational SaaS trail:

1. Persist `win claims` in Prisma.
2. Persist `audit logs` for admin actions, draw corrections, reverts, pauses, resumes, and room changes.
3. Persist match-operation history for later analytics and support.
4. Expose that history cleanly in admin-facing APIs.

## Guardrails For The Next Agent

- Do not remove or bypass existing tests.
- Add or update tests when changing game rules or persistence.
- Do not replace Prisma with another ORM.
- Do not rewrite the frontend shell unnecessarily.
- Do not downgrade the UI into a generic dashboard.
- Do not commit credentials or machine-specific secrets.

## Definition Of Good Continuation

A good next step is one that:

- strengthens real persistence
- improves reliability
- preserves the premium experience
- keeps demo mode intact
- ships with tests
