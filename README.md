# Gunther Werks Manufacturing OS Demo

Production-quality admin dashboard demo for Gunther Werks bespoke restomod operations.

## Stack
- Next.js App Router + TypeScript
- TailwindCSS
- Prisma + Neon Postgres

## Local Setup
1. Install dependencies: `npm install`
2. Create `.env.local` with `DATABASE_URL`
3. Introspect DB: `npm run prisma:pull`
4. Generate client: `npm run prisma:generate`
5. Start dev server: `npm run dev`

## Environment Variables
- `DATABASE_URL` (Neon Postgres, required)

## Amplify Deployment
- Add `DATABASE_URL` in Amplify environment variables.
- Build uses `npm run build`, which runs `prisma generate` automatically.

## Demo Routes
- `/builds`
- `/builds/[id]`
- `/parts`
- `/inventory`
- `/work-orders`


## DB Scripts
- `/db/002_seed.sql` optional seed helper (do not auto-run)
- `/db/003_verify.sql` demo story verification queries
