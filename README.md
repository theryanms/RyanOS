This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Cloud accounts and cross-device saves

Connect a Neon Postgres database to the Vercel project through the Vercel Marketplace. Set its connection string as the server-only `DATABASE_URL` environment variable, then redeploy. The app creates its account, session, and rate-limit tables on the first account request. The connection needs permission to create these tables.

For local development, put the connection string in `.env.local` and restart the development server. Keep this file out of Git.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Open **Account & cloud saves** to create a unique username and password. Creating an account imports the device's quests, XP, teams, theme, and visualizer preferences. On another device, sign in with the same account and choose **Load account save**.

Usernames use 3–24 letters, numbers, or underscores and are unique regardless of capitalization. Passwords use 10–128 characters. Passwords are salted and hashed with scrypt. Sessions use an HttpOnly cookie that lasts 30 days. The database connection stays on the server.

Changes save automatically while signed in. Offline changes stay on the device and retry when the connection returns. If two devices change the same save, the app asks which copy to use and offers downloads of both copies. Device backups remain available before and after database setup. Account passwords currently have no automated recovery flow.

The database persists across deployments. Use the same production `DATABASE_URL` to keep accounts and progress when updating the app.

## Settings, recovery, and reports

Appearance controls live in the Settings module. Presets include dark and light themes, with custom accent/background colors, visualizer palettes, intensity, reduced motion, and quest-panel visibility controls. Guest users can choose **Continue as guest** to keep device saving and stop the welcome prompt on that browser.

Recovery commands include `doctor`, `logs`, `storage`, `version`, `safe`, `sync`, `repair`, `backup`, `reload`, and `report`. If the page is fully frozen, open `/?safe=1` from the browser address bar. Safe mode disables animated effects for that visit. `repair` validates readable data and refreshes quest periods. It preserves earned XP and teams. Invalid data can be downloaded for recovery instead of discarded.

Reports are stored in Neon and can include optional browser diagnostics. Set `ADMIN_USERNAMES` in Vercel to a comma-separated list of existing account usernames, then redeploy. Those accounts can read reports and change their status in **Settings → Reports**. Admin status does not change quest rewards or grant access to other users' saved progress.

Optional email notifications use Resend. Configure these server-only Vercel environment variables and redeploy to enable them.

```dotenv
RESEND_API_KEY=YOUR_RESEND_API_KEY
REPORT_EMAIL_FROM=RyanOS <reports@YOUR_VERIFIED_DOMAIN>
REPORT_EMAIL_TO=YOUR_EMAIL_ADDRESS
```

The sender must be verified with Resend. Reports remain in the admin inbox if email delivery fails. The inbox records notification status. Duplicate submissions with the same request ID are stored once.

## Daily balance and Champions REG M-C

New daily boards contain one quest for each of the six stats. Each core quest awards 15 XP. Templates rotate without repeating within seven days. Existing daily boards complete normally and adopt this rotation at the next daily reset. Optional library/custom quests and weekly focus quests remain available.

The team builder includes **VGC 2026 REG M-C** with a bundled Pokémon Showdown eligibility snapshot retrieved November 17, 2026. This includes exceptions such as Pikachu. The preset uses Champions level-50 stats, 66 stat points with a maximum of 32 per stat, Species Clause, Item Clause, and the Showdown calculator's Champions engine. Changing between custom and Champions formats converts stat allocations, so review the resulting spread. Species and roster checks are provided. Full move/ability legality should be validated in Showdown for the selected regulation.
