# Local Development

These commands are written for Windows.

## Prerequisites

- Node.js
- npm
- Supabase CLI
- Docker for local Supabase if you run the full local stack

PowerShell may block `npm.ps1` or `npx.ps1`. Use `npm.cmd` and `npx.cmd` on Windows.

## Install And Run

```powershell
cd "C:\Проекты\Otoyali-blueprint\apps\web"
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Useful local routes:

- `http://localhost:3000/search`
- `http://localhost:3000/video`
- `http://localhost:3000/admin`
- `http://localhost:3000/sitemap.xml`
- `http://localhost:3000/robots.txt`

## Quality Commands

```powershell
cd "C:\Проекты\Otoyali-blueprint\apps\web"
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Expected current lint note:

- `src/components/ui/SafeImage.tsx` may show a Next.js `<img>` optimization warning. This is known and has been accepted for now.

## Supabase Migrations

Run migrations from the project root:

```powershell
cd "C:\Проекты\Otoyali-blueprint"
npx.cmd supabase db push
```

Windows/Docker may print cache or Docker-related warnings. If the command ends with `Finished supabase db push`, treat the push as successful.

## Debug Route

`/debug/supabase` is development-only and returns 404 in production. It checks env presence and safe public view counts.
