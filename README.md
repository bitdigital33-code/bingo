# Bingo Familiar Premium

Bingo Familiar Premium is a multi-tenant SaaS monorepo for family events, churches, company parties, friend groups, and projector-ready bingo nights, with premium visuals, digital cards, real-time host controls, and a cinematic TV mode.

## Stack

- `apps/api`: `NestJS + Fastify + Socket.IO + Prisma + BullMQ + optional Redis bridge`
- `apps/web`: `React + Vite + Tailwind + Framer Motion`
- `packages/contracts`: shared DTOs, events, snapshots, and domain types
- `packages/ui`: shared premium design-system primitives

## MVP Included

- Admin login and tenant onboarding without billing
- Room management and live `75-ball` bingo matches
- Manual draw flow with correction, revert, and replay-last
- Digital player cards with 1 to 3 cards per player
- REST snapshots plus WebSocket synchronization
- Near-win radar, "na boa" messaging, and proximity ranking
- TV mode with giant QR code, current-draw spotlight, and browser voice narration
- Demo in-memory seed data plus PostgreSQL-ready Prisma schema

## Workspace Layout

```text
apps/
  api/   -> API, bingo engine, WebSocket, Prisma, seeds
  web/   -> login, admin panel, join flow, player room, TV mode
packages/
  contracts/ -> shared contracts and snapshots
  ui/        -> theme tokens, glass panels, buttons, toggles
```

## Quick Start

```bash
npm install
npm run prisma:generate
npm run dev
```

Local URLs:

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

Demo credentials:

- Email: `admin@bingo.local`
- Password: `bingo123`

## Environment

Copy `.env.example` to `.env` and adjust:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `WEB_BASE_URL` optional for public join links and QR codes

## Optional Infra with Docker Compose

```bash
docker compose up -d
```

Services included:

- PostgreSQL 16
- Redis 7

If Docker is not installed yet, the backend still runs in demo mode using in-memory storage, which is enough to explore the product and validate the main experience.

## Useful Scripts

```bash
npm run dev
npm run build
npm run test
npm run prisma:generate
npm run prisma:seed
```

## Main Endpoints

- `POST /api/v1/tenants`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/bootstrap`
- `POST /api/v1/rooms`
- `POST /api/v1/matches/:id/draws`
- `POST /public/rooms/:joinCode/join`
- `GET /public/rooms/:joinCode/state`
- `GET /public/rooms/:joinCode/tv-state`

## Architecture Notes

- The bingo globe remains physical and manual; the software acts as the digital control brain.
- The backend recalculates projections and winners server-side for anti-fraud validation.
- Prisma, Dockerfiles, and `docker-compose.yml` are already in the repo, while the API still supports a no-database demo mode for local validation.
