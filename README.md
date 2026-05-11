# Bingo Familiar Premium

Bingo Familiar Premium is a multi-tenant SaaS monorepo for family events, churches, company parties, friend groups, and projector-ready bingo nights, with premium visuals, digital cards, real-time host controls, and a cinematic TV mode.

## Stack

- `apps/api`: `NestJS + Fastify + Socket.IO + Prisma + BullMQ + optional Redis bridge`
- `apps/web`: `React + Vite + Tailwind + Framer Motion`
- `packages/contracts`: shared DTOs, events, snapshots, and domain types
- `packages/ui`: shared premium design-system primitives

## Included

- Admin login and tenant onboarding without billing
- Production-first PostgreSQL persistence with Prisma
- Empty first-use seed, with no preloaded room, user, players, or draws
- Room management and live `75-ball` bingo matches
- Manual draw flow with correction, revert, and replay-last
- Digital player cards with 1 to 3 cards per player
- REST snapshots plus WebSocket synchronization
- Near-win radar, "na boa" messaging, and proximity ranking
- TV mode with giant QR code, current-draw spotlight, and browser voice narration
- Persistent win claims, audit logs, and administrative room history

## Workspace Layout

```text
apps/
  api/   -> API, bingo engine, WebSocket, Prisma, empty seed
  web/   -> login, admin panel, join flow, player room, TV mode
packages/
  contracts/ -> shared contracts and snapshots
  ui/        -> theme tokens, glass panels, buttons, toggles
```

## Quick Start

Start PostgreSQL first. The included Docker Compose file provides PostgreSQL and Redis:

```bash
docker compose up -d
```

Then run:

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Local URLs:

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

First use:

- Open `/login`
- Choose `Criar organizacao`
- Create the first tenant and owner account

## Empty Local Reset

For a local development database only, this drops existing data and returns the app to a clean first-use state:

```bash
npm run prisma:reset:empty
```

## Environment

Copy `.env.example` to `.env` when needed and adjust:

- `DATABASE_URL` required by the API
- `REDIS_URL` optional for local development
- `JWT_SECRET`
- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `WEB_BASE_URL` optional for public join links and QR codes

## Useful Scripts

```bash
npm run dev
npm run build
npm run test
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run prisma:reset:empty
```

## Main Endpoints

- `POST /api/v1/tenants`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/bootstrap`
- `POST /api/v1/rooms`
- `GET /api/v1/rooms/:id/history`
- `POST /api/v1/matches/:id/draws`
- `POST /api/v1/matches/:id/claims`
- `POST /public/rooms/:joinCode/join`
- `GET /public/rooms/:joinCode/state`
- `GET /public/rooms/:joinCode/tv-state`

## Architecture Notes

- The bingo globe remains physical and manual; the software acts as the digital control brain.
- The backend recalculates projections and winners server-side for anti-fraud validation.
- Prisma is the only application persistence path. The previous in-memory demo fallback has been removed.
- Redis remains optional in local development and is used only for realtime bridge/analytics support when configured.
