# Weekly Coupon Tracker

Weekly Thursday coupon tracker: employees claim via QR scan; admins view/export claims.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS)
- PostgreSQL via Drizzle ORM
- Server-rendered auth with session cookies
- Excel export for claim records

## Getting started

1. Copy `.env.example` to `.env.local` and fill in real values.
2. Install dependencies: `npm install`
3. Run database migrations: `npm run db:migrate`
4. Seed initial data: `npm run seed`
5. Start the dev server: `npm run dev`

## Scripts

- `npm run dev` — start the development server
- `npm run build` / `npm run start` — production build and start
- `npm run test` — run the test suite (Vitest)
- `npm run typecheck` — run the TypeScript compiler in check-only mode
- `npm run db:generate` / `npm run db:migrate` — Drizzle schema generation and migration
- `npm run seed` — seed the database with initial records

## Configuration

All configuration is provided via environment variables (see `.env.example`). The weekly claim cap is configurable and not hardcoded.
