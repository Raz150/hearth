# Hearth

Our little household journal: to-dos, chores and bills for two. Next.js on Vercel, Supabase for login and data, installable on iPhone.

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
   - `supabase/migrations/20261113000000_init.sql` (tables, RLS, realtime)
   - `supabase/seed.example.sql` with our two emails filled in (links both users to one household)

## Deploy (Vercel)

1. Import the GitHub repo in Vercel (framework: Next.js, no build changes).
2. Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Every push to `main` deploys. The app needs no secret keys.

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
3. Either way, re-enable realtime by running the last statement of the migration (`alter publication supabase_realtime add table ...`).

An error like `schema "public" already exists` during restore is harmless.

## Testing RLS locally (optional, needs Docker)

`supabase/tests/` has a stand-in for Supabase's `auth` schema plus a script that checks every policy (spouse can see, outsider and logged-out can't). Never run it against the real project.

```sh
docker run -d --name hearth-rls -e POSTGRES_PASSWORD=x postgres:17
cat supabase/tests/00_supabase_stub.sql supabase/reset.sql supabase/migrations/*.sql | docker exec -i hearth-rls psql -U postgres -v ON_ERROR_STOP=1 -q
docker exec -i hearth-rls psql -U postgres -q < supabase/tests/rls_test.sql   # ends with "ALL RLS TESTS PASSED"
docker rm -f hearth-rls
```
