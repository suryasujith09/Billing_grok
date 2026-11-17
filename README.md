# Twinklestar Gold & Diamonds website and billing

This repository contains the existing jewellery billing application and the public Twinklestar Gold & Diamonds website. The public pages live at `/`, `/about`, `/collections`, `/services`, and `/contact`. Staff can enter the existing authentication flow from `/software/login`; authenticated billing routes and their session and role checks remain in place. The staff dashboard is at `/dashboard`.

## Local development

Install dependencies and configure the existing database and session variables from `.env.example` in `.env.local`. Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The billing application still requires a configured PostgreSQL `DATABASE_URL` and `SESSION_SECRET`. No schema or migration changes are required for the public site.

## Public contact details and enquiry delivery

Add only company contact details approved for publication to `.env.local`:

- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_CONTACT_PHONE`
- `NEXT_PUBLIC_BUSINESS_ADDRESS`

The contact form sends enquiries through Resend from a server route. To enable delivery, configure `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` (a sender verified with Resend), and `CONTACT_TO_EMAIL` (the approved company inbox). These values stay server-side. Until configured, the form reports that it is being set up. The endpoint validates input, checks the request origin, uses a honeypot, and applies basic per-process throttling; configure provider-side abuse controls for a multi-instance production deployment as well.

## Deployment

The repository is already configured for Vercel (`vercel.json`, existing `.vercel` project link). Deploy through that same Vercel project to preserve the current billing deployment and environment. Set the approved contact variables there, then verify the existing project has `twinklestargd.com` attached with valid SSL before directing production traffic. No DNS, database, hosting, or production environment changes were made here. The domain and production deployment have not been verified or changed by this work.

The existing production database migrations are unchanged. Continue using the existing baseline and deployment procedure below if you separately deploy pending database migrations; the public website itself does not require one.

## Database setup

Set `DATABASE_URL` to the PostgreSQL connection string for the target database.
For a new database, run `npm run db:migrate` to create the schema and apply the
printer and tag-tracking changes.

If the database already has the original Billing Grok schema (for example, it
was created from `supabase_setup.sql`), baseline that existing schema once, then
apply the new migration:

```bash
npx prisma migrate resolve --applied 20261001130000_init
npx prisma migrate deploy
```

Do not baseline an empty database; use `npm run db:migrate` instead. Production
deployments should use `npx prisma migrate deploy` after the existing database
has been baselined.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
