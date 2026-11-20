# Hearth

Our little household journal: to-dos, chores and doa for two. Next.js on Vercel, Supabase for login and data, installable on iPhone.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the two values from Supabase → Project Settings → API Keys (use the **publishable** key).
3. `npm run dev` → http://localhost:3000
4. `npm test` runs the date tests; `npm run lint`; `npm run build`.

## Supabase setup (once)

1. **Authentication → Sign In / Providers → Email**: on. **Allow new users to sign up**: off.
2. **Authentication → Users → Add user → Create new user** for each of us: email + password, tick **Auto Confirm User**.
3. **Authentication → URL Configuration**: Site URL = `https://<app>.vercel.app`.
4. **SQL Editor**, in order:
   - `supabase/reset.sql` (only when wiping an old database; deletes all app tables)
   - every file in `supabase/migrations/`, oldest first (tables, RLS, realtime)
   - `supabase/seed.example.sql` with our two emails filled in (links both users to one household)

## Deploy (Vercel)

1. Import the GitHub repo in Vercel (framework: Next.js, no build changes).
2. Settings → Environment Variables: everything in `.env.example` (see Push notifications below for the push ones).
3. Every push to `main` deploys. Only the push routes use a secret key, and it stays on the server.

**Install on iPhone:** open the `*.vercel.app` URL in Safari → Share → Add to Home Screen.

## GitHub Actions

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | Supabase → **Connect** → **Session pooler** URI, with the database password filled in. (Not "Direct connection": that is IPv6-only and GitHub runners can't reach it. Not the transaction pooler on port 6543: pg_dump doesn't work through it.) URL-encode special characters in the password. |
| `BACKUP_PASSPHRASE` | A long random passphrase (16+ characters). **Save it in your password manager**: without it the backups can't be opened. |

- **Keep database awake** (`keep-alive.yml`): daily at 03:00 KL, runs one query so the free project never hits the 7-day pause.
- **Weekly backup** (`backup.yml`): Sundays at 04:00 KL.

Both have a **Run workflow** button (Actions tab) for testing. GitHub emails you when a run fails.

> In a **public** repo, GitHub disables scheduled workflows after 60 days with no commits. GitHub emails a warning first; re-enable from the Actions tab. Private repos don't have this.

## Backups

**What's in it:** our tables (structure, data, RLS policies) plus the two login accounts (`auth.users`, `auth.identities`, including password hashes), as `app.sql` + `auth.sql` in a tar.gz encrypted with AES-256 using `BACKUP_PASSPHRASE`.

**Where it's stored:** as a GitHub Actions **artifact** on each backup run (Actions → Weekly backup → a run → Artifacts), kept **90 days**, so about 13 weekly backups at any time. They are tiny (KBs), well inside the free 500 MB artifact storage.

**Trade-offs:**
- ✅ Free, automatic, no extra service or keys; encrypted, so safe even if the repo is public.
- ⚠️ Older than 90 days is gone. Download one to your own storage (e.g. iCloud Drive) every few months for a long-term copy.
- ⚠️ It lives in the same GitHub account as the code. Losing the account loses the backups (another reason to keep an occasional download).
- ⚠️ Weekly, so up to 7 days of changes can be lost. Run the workflow by hand before risky changes.
- ⚠️ Files people upload (Supabase Storage) would not be included; Hearth doesn't use Storage today.

**Restore** (needs `psql` 17 and `gpg`, e.g. `brew install libpq gnupg` or Postgres for Windows + Gpg4win):

```sh
unzip hearth-YYYY-MM-DD.zip                  # the artifact download
gpg -d hearth-YYYY-MM-DD.tar.gz.gpg > b.tar.gz   # asks for BACKUP_PASSPHRASE
mkdir b && tar -xzf b.tar.gz -C b
```

1. **Same project, data broken:** in the SQL editor run `supabase/reset.sql`, then `psql "$SUPABASE_DB_URL" -f b/app.sql`. Skip `auth.sql`: the logins still exist.
2. **Brand-new project:** first `psql "$SUPABASE_DB_URL" -f b/auth.sql` (recreates our logins with the same ids and passwords), then `psql "$SUPABASE_DB_URL" -f b/app.sql`. Redo the dashboard settings above and update the env vars in Vercel and GitHub.
3. Either way, re-enable realtime by running every `alter publication supabase_realtime add table ...` statement from the migrations.

An error like `schema "public" already exists` during restore is harmless.

## Push notifications

The other person gets a ping for: a note (always), thanks, shopping added (collapsed into one ping after a 50s pause), "finished shopping", and a to-do assigned to them. Plus a morning summary at about 08:00 KL (Vercel Hobby cron runs once a day, sometime within that hour). Quiet 23:00–07:00 KL except notes; the morning summary mentions what was held back.

How: database triggers (`private.push_ping`, via `pg_net`) POST to `/api/push`, which sends with `web-push` using the Supabase secret key (server only). iPhone only gets pings in the Home Screen app, iOS 16.4+.

Setup (once):
1. `npx web-push generate-vapid-keys` and two random strings (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
2. Vercel → Environment Variables: `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys → Secret keys), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_WEBHOOK_SECRET`, `CRON_SECRET`. Redeploy.
3. Supabase SQL Editor: run `supabase/migrations/20261125000000_push.sql`, then:
   ```sql
   select vault.create_secret('https://<app>.vercel.app/api/push', 'push_url');
   select vault.create_secret('<PUSH_WEBHOOK_SECRET>', 'push_secret');
   ```
4. On each iPhone: open Hearth from the Home Screen → Settings → Turn on notifications → Allow.

Debugging: Supabase → `select * from net._http_response order by created desc limit 10;` shows the server's replies (202 = accepted). Vercel → Logs shows send errors.

## Doa library

The Doa tab is for learning authentic doa by heart, together: each doa has a three-step practice (listen & repeat, first-letter fade, from memory), and each of us marks it learning or memorised (`doa_progress`, visible to both). No counted zikir. The doa live in `lib/doa.json`, built by `node scripts/doa.mjs` (edit `GROUPS` in it to add or drop doa, re-run, commit the JSON). Arabic, Rumi, English and audio come from the Hisnul Muslim API; Bahasa Melayu and the hadith source come from JPN Johor's Hisnul Muslim page. The script refuses to build if the two sources' Arabic don't match, so a Malay text can't end up under the wrong doa. Quran doa come from alquran.cloud.

## Habits

Each habit is written as "After I <cue>, I'll <action>" with a days-a-week target (no daily streaks, so a missed day is never a failure). Each of us ticks only our own days (`habit_checks`, up to 6 days back); the other can see them and cheer. From two weeks in, a habit asks every two weeks "how automatic does this feel?" (1–5, `habit_ratings`); after eight weeks with two answers of 4 or more, it offers to graduate it to "Habits we've built". The rules live in `lib/habits.ts`.

## Testing RLS locally (optional, needs Docker)

`supabase/tests/` has a stand-in for Supabase's `auth` schema plus a script that checks every policy (spouse can see, outsider and logged-out can't). Never run it against the real project.

```sh
docker run -d --name hearth-rls -e POSTGRES_PASSWORD=x postgres:17
cat supabase/tests/00_supabase_stub.sql supabase/reset.sql supabase/migrations/*.sql | docker exec -i hearth-rls psql -U postgres -v ON_ERROR_STOP=1 -q
docker exec -i hearth-rls psql -U postgres -q < supabase/tests/rls_test.sql   # ends with "ALL RLS TESTS PASSED"
docker rm -f hearth-rls
```
