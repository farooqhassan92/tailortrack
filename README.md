# TailorTrack

TailorTrack is a cloth shop and tailoring management system for managing customers,
measurements, inventory, sales, invoices, stitching production, tailor work, salaries,
expenses, and business reporting.

The app is built for a single-organization shop workflow. A user signs in with Clerk,
creates a business profile for their shop, and then manages all shop records inside that
organization.

## Features

- Clerk sign in and sign up
- Required business profile setup before using the system
- Organization-scoped data with one admin role
- Dashboard with quick actions, today cash movement, key shop signals, and report links
- Professional dashboard report with printable PDF view
- Customer profiles with contact details, balances, sales history, orders, payments, and measurements
- Customer measurements saved when adding a customer or from the measurements module
- Guided sale flow for inventory, stitching, and combined invoices
- Automatic invoice print view after sale creation
- Separate invoices desk with payment status filters and balance settlement
- Inventory for readymade, unstitched, and stitching service/rate products
- Add stock, stock movement tracking, and automatic stock reduction on sale
- Production board for pending, cutting, stitching, ready, and delivered work
- Tailor profiles, assignment tracking, detailed work view, and pending payable dues
- Weekly tailor salary batches based on ready/delivered completed work that has not been paid
- Paid salary history with void, cancel, and edit support
- Expenses tracking, excluding tailor salary from normal expenses
- Global search across customers, invoices, orders, products, and tailors
- Business profile and document branding settings
- Modern status alerts, validation messages, and submit loading states

## Tech Stack

- Next.js App Router
- React and TypeScript
- PostgreSQL
- Prisma
- Clerk authentication
- Tailwind CSS
- Lucide icons
- Zod validation

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL database, recommended Neon Postgres
- Clerk application keys

## Environment

Create `.env.local` and add the database and Clerk values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DBNAME?sslmode=require"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Use Neon's pooled connection string for `DATABASE_URL` and the direct connection
string for `DIRECT_URL`. Both URLs should include `sslmode=require`.

## Getting Started

```bash
npm install
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`, sign in or sign up, then create the business profile
for the shop. The dashboard and app modules become available after the business
profile is completed.

## Production Setup

For production, configure the same environment variables in the hosting platform,
then run Prisma migrations with:

```bash
npm run prisma:deploy
```

Build the app with:

```bash
npm run build
```

## Development Commands

```bash
npm run dev
npm run build
npm run lint
npm run start
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
```

## Recommended Shop Workflow

1. Sign in or sign up.
2. Create the business profile for the shop.
3. Add stitching service products to define stitching rates.
4. Add inventory products and stock quantities.
5. Add customers with measurements when stitching work is needed.
6. Create sales from the guided sale flow.
7. Track stitching work on the production board.
8. Settle invoice balances from the invoices desk.
9. Create weekly tailor salary batches for completed unpaid work.
10. Review dashboard reports and printable PDF reports.

## Notes

- Walk-in customers must pay the full invoice amount at sale creation.
- Stitching orders require a selected customer with measurements.
- Tailor salary is calculated from completed stitching work and is tracked separately
  from normal shop expenses.
- The business profile controls shop details used in invoices, statements, and reports.
