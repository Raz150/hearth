I'm building a private Progressive Web App (PWA) for exactly two users: me and my wife. We both use iPhones and will install it to the Home Screen. Everything must run on free tiers with no credit card.

## What the app does
A shared household app for a married couple. All data is shared between both users (one household). Timezone: Asia/Kuala_Lumpur.

This is v1 and contains ONE feature only. More features will be added later, one at a time, in separate sessions. Do not build or scaffold anything for future features (no placeholder tabs, tables, or routes). The only foundation to set up is: auth, a `households` table linking our two users, and RLS based on household membership.

Feature: Shared lists
- Create, rename, and delete lists (e.g. Groceries, To-do).
- Items: text, optional note/quantity, checked state, who added it, created time.
- Add, edit, check/uncheck, and delete items. Either of us can edit anything.
- Realtime sync: changes from one phone appear on the other instantly (Supabase Realtime).
- "Clear checked items" in one tap.
- Works well one-handed on iPhone; adding an item should take one tap + typing + enter.

Out of scope for now: push notifications, offline editing, sharing outside the household, attachments.

## Stack (fixed — don't suggest alternatives)
- Next.js (latest, App Router, TypeScript), Tailwind CSS
- Supabase Free: Postgres, Auth, Realtime
- @supabase/ssr for auth in Next.js
- Hosting: Vercel Hobby on the default *.vercel.app domain
- PWA: Next.js built-in app/manifest.ts + a hand-written service worker in /public. No PWA plugin libraries.

## Security (non-negotiable)
- Public sign-ups disabled. Only two pre-created accounts.
- Login via Supabase email OTP (6-digit code), NOT magic links (magic links open in Safari, not the installed iOS PWA).
- Row-level security enabled on EVERY table. Policies restrict access to members of our household. Write the SQL migration for this.
- Realtime subscriptions must respect RLS (only household members receive changes).
- Service-role key only in server code / env vars, never in client bundles.
- Validate all input on the server side (route handlers / server actions) or via database constraints.

## iOS PWA requirements
- Works full-screen when installed (display: standalone, apple-touch-icon, theme colour, safe-area insets).
- Mobile-first UI, large touch targets, light/dark mode following the iPhone setting.
- Must work well on iPhone Safari and as an installed Home Screen app.

## Operations
- GitHub Actions workflow that pings the database once a day so the Supabase free project doesn't pause after 7 days of inactivity.
- GitHub Actions workflow for a weekly pg_dump backup (free tier has no backups). Explain where the backup is stored and the trade-offs.
- .env.example listing every required variable.

## How to work
1. First, propose the data model (tables, columns, RLS policies) and wait for my approval before writing code.
2. Then build in this order: project setup → auth (OTP login, protected routes) → shared lists end-to-end → PWA manifest + service worker (install to Home Screen) → GitHub Actions (DB keep-alive + backup).
3. Keep it simple: no extra libraries unless they clearly save effort, no state-management library unless needed, no features I didn't ask for.
4. After each step, tell me exactly what to configure manually in the Supabase and Vercel dashboards, then stop so I can test before moving on.
5. Include a short README with setup and deploy steps.