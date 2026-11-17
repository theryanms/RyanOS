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
