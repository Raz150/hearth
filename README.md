# Hearth

Private shared-lists PWA for one household. Next.js, Supabase and Vercel, all on free tiers.

## Setup

1. Create a Supabase project.
2. In the SQL Editor, run `supabase/migrations/20261109000000_init.sql`.
3. Under Authentication > Users, create both accounts.
4. In the SQL Editor, run `supabase/seed.example.sql` with your real emails and names. Don't commit them.
5. Under Authentication > Sign In / Providers, turn off new sign-ups and set Email OTP Length to 6.
6. Copy `.env.example` to `.env.local` and fill in the values.
7. Run `npm install`, then `npm run dev`.

## Deploy

1. Import the GitHub repo into Vercel and add the variables from `.env.example`. `GMAIL_APP_PASSWORD` is a Google app password.
2. In Supabase under Authentication > Hooks, add a Send Email hook of type HTTPS pointing at `https://<your-app>.vercel.app/api/send-email`.
3. Copy the secret it generates into `SEND_EMAIL_HOOK_SECRET` in Vercel and redeploy.

Login codes are sent by the app through Gmail because Supabase's SMTP connection to Gmail timed out.
