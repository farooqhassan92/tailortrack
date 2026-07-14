# TailorTrack

TailorTrack is a cloth shop and tailoring management system for tracking readymade, unstitched, and custom-stitched clothing sales, storing customer measurements, managing stitching orders, and calculating tailor salaries based on completed work.

## Core Modules

- Dashboard overview
- Inventory for readymade and unstitched clothes
- Sales and invoice tracking
- Customer profiles and measurement records
- Custom stitching orders
- Tailor assignment and work status
- Tailor salary calculation
- Payments and balances

## Stack

- Next.js App Router
- React and TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS

## Database

TailorTrack uses Neon Postgres through Prisma.

Create a Neon project, then copy the connection strings into `.env.local`:

```bash
cp .env.example .env.local
```

Use Neon's pooled connection string for `DATABASE_URL` and the direct connection
string for `DIRECT_URL`. Both URLs should include `sslmode=require`.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DBNAME?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

After the env file is set, create the database tables:

```bash
npm run prisma:migrate
```

For production deployments, run:

```bash
npm run prisma:deploy
```

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run prisma:migrate
npm run dev
```

## Development Commands

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
```
