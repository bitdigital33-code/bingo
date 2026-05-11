# Bingo Familiar Premium

Bingo Familiar Premium is a multi-tenant SaaS monorepo for family events, churches, company parties, friend groups, and projector-ready bingo nights, with premium visuals, authenticated printed cards, digital cards, real-time host controls, and a cinematic TV mode.

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
- Printable A4 cards with individual QR codes
- Public QR card page that opens the same printed card without asking for a player name
- Admin authenticity checker for printed cards by QR, code, or serial
- Admin controls for prize rounds, player management, room settings, TV reset/end, recent numbers, and near-win alerts
- REST snapshots plus WebSocket synchronization
- Near-win radar, "na boa" messaging, and proximity ranking
- TV mode with current-draw spotlight, prize showcases, recent-number showcase, and admin-triggered stage moments
- Persistent win claims, audit logs, and administrative room history

## Workspace Layout

```text
apps/
  api/   -> API, bingo engine, WebSocket, Prisma, empty seed
  web/   -> login, admin panel, join flow, player room, printed-card QR page, TV mode
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

When printing QR cards for phones on the same network, open the admin panel through the machine IP, for example `http://192.168.x.x:5173/app`. The printed QR uses the browser origin when possible, so the phone does not receive a `localhost` link.

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
- `PATCH /api/v1/rooms/:id`
- `DELETE /api/v1/rooms/:id`
- `GET /api/v1/rooms/:id/history`
- `POST /api/v1/rooms/:id/print-cards`
- `POST /api/v1/rooms/:id/print-cards/verify`
- `PATCH /api/v1/rooms/:id/prize-rounds`
- `POST /api/v1/rooms/:id/prize-showcase`
- `POST /api/v1/rooms/:id/stage-moment`
- `POST /api/v1/rooms/:id/tv/recent-draws`
- `POST /api/v1/rooms/:id/tv/reset`
- `POST /api/v1/matches/:id/draws`
- `POST /api/v1/matches/:id/draws/:drawId/correct`
- `POST /api/v1/matches/:id/draws/:drawId/revert`
- `POST /api/v1/matches/:id/replay-last`
- `POST /api/v1/matches/:id/claims`
- `POST /public/rooms/:joinCode/join`
- `GET /public/rooms/:joinCode/state`
- `GET /public/rooms/:joinCode/tv-state`
- `GET /public/cards/:accessCode`

## Printed Card QR Flow

1. The admin generates printable cards from the admin panel.
2. Each `BingoCard` is stored with a unique serial, matrix, room link, print batch, issued timestamp, and `digitalAccessCode`.
3. The printed QR opens `/card/:accessCode`.
4. The web app calls `/public/cards/:accessCode` and renders the exact same numbers from the paper card.
5. The card can be marked locally on the phone for convenience, without creating a player session or asking for a name.
6. The admin can verify authenticity through `/api/v1/rooms/:id/print-cards/verify`.

## Architecture Notes

- The bingo globe remains physical and manual; the software acts as the digital control brain.
- The backend recalculates projections and winners server-side for anti-fraud validation.
- Printed-card QR pages are convenience views. Authenticity and prize validation remain backend/admin responsibilities.
- Prisma is the only application persistence path. The previous in-memory demo fallback has been removed.
- Redis remains optional in local development and is used only for realtime bridge/analytics support when configured.
