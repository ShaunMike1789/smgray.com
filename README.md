# smgray.com

Public SMGray website plus private browser-first tools in one Next.js app.

## Local Development

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

On Windows, `npm run dev` uses Webpack by default because the current Next.js 16 Turbopack path can fail to resolve Tailwind/PostCSS imports correctly. To try Turbopack anyway:

```powershell
npm run dev:turbo
```

## Private Tools

The `/tools` area is protected by Clerk. Configure the Clerk variables from `.env.example`, disable public sign-up in Clerk, manually provision the account that should have access, and set `AUTHORIZED_EMAILS` to your approved email address.

Audio Splitter still uses the local Windows helper:

```powershell
npm run helper:build
npm run helper:run
```

## Verification

```powershell
npm run lint
npm run test:unit
npm run build
npm run helper:build
```
