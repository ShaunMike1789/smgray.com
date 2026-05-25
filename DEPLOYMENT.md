# SMGray Deployment

This site is now a small Flask app so it can receive contact-form submissions and send them through Amazon SES.

## Local Preview

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
$env:CONTACT_DRY_RUN="true"
$env:CONTACT_TO_EMAIL="to@example.com"
$env:CONTACT_FROM_EMAIL="from@example.com"
$env:PORT="8081"
.\.venv\Scripts\python app.py
```

Open `http://localhost:8081`.

## CapRover / Hetzner

Create a CapRover app for `smgray.com`, deploy this repo, and set these environment variables:

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
```

SES notes:

- `CONTACT_FROM_EMAIL` must be a verified SES identity.
- If the SES account is still in sandbox mode, `CONTACT_TO_EMAIL` must also be verified.
- Give the IAM user only the permissions needed for `ses:SendEmail`.

The Dockerfile runs gunicorn on port `80`, which matches your existing DashDork/GovRet CapRover pattern.
