# smgray.com Deployment

This repo is the single Next.js app for the public SMGray website and private tools.
The contact form sends through Amazon SES, and `/tools` is protected by Clerk.

## Local Preview

```powershell
$env:CONTACT_DRY_RUN="true"
$env:CONTACT_TO_EMAIL="to@example.com"
$env:CONTACT_FROM_EMAIL="from@example.com"
npm install
npm run dev
```

Open `http://localhost:3000`.

## CapRover / Hetzner

Deploy `ShaunMike1789/smgray.com` to the CapRover app for `smgray.com`, and set these environment variables:

```text
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<ses-smtp-or-iam-access-key>
AWS_SECRET_ACCESS_KEY=<ses-smtp-or-iam-secret>
CONTACT_FROM_EMAIL=<verified SES sender>
CONTACT_TO_EMAIL=<destination inbox>
CONTACT_SUBJECT_PREFIX=SMGray contact
CONTACT_DRY_RUN=false
CONTACT_RATE_WINDOW_SECONDS=900
CONTACT_RATE_MAX_ATTEMPTS=5
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
CLERK_SECRET_KEY=<clerk-secret-key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/tools
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/tools
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/tools
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/tools
AUTHORIZED_EMAILS=<your-email-address>
AUTHORIZED_CLERK_USER_IDS=<your-clerk-user-id>
```

SES notes:

- `CONTACT_FROM_EMAIL` must be a verified SES identity.
- If the SES account is still in sandbox mode, `CONTACT_TO_EMAIL` must also be verified.
- Give the IAM user only the permissions needed for `ses:SendEmail`.

Clerk notes:

- Disable public sign-up in Clerk.
- Manually provision the one account that should access `/tools`.
- Keep magic-link email sign-in enabled.
- Set `AUTHORIZED_EMAILS` to the same email address, and optionally set
  `AUTHORIZED_CLERK_USER_IDS` to the Clerk user ID for a more reliable
  production allowlist. The app rejects every other signed-in Clerk user.

The Dockerfile builds Next.js standalone output and runs `node server.js` on port `80`.

Production deploys are triggered from CapRover Method 3 using the GitHub push webhook for the `master` branch of `ShaunMike1789/smgray.com`.
