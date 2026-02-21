# MAB AI Strategies CRM — Vercel Deployment Guide

## Quick Start

This CRM is ready to deploy to Vercel with Vercel Postgres.

### Step 1: Create Vercel Postgres Database

1. Go to **Vercel Dashboard** → Your Project → **Storage**
2. Create a new **Postgres** database
3. Copy the `POSTGRES_PRISMA_URL` from the connection details

### Step 2: Set Environment Variables in Vercel

In your Vercel project settings, add these environment variables:

```
DATABASE_URL=<your POSTGRES_PRISMA_URL from above>
POSTGRES_PRISMA_URL=<your POSTGRES_PRISMA_URL from above>
POSTGRES_URL_NON_POOLING=<your non-pooling URL from Vercel Postgres>
APP_URL=https://your-deployed-domain.vercel.app
PASSCODE=mab
AUTH_SECRET=<generate a random 32-char string, e.g., "$(openssl rand -hex 16)">
AI_RATE_LIMIT_PER_MINUTE=30
AI_MAX_RETRIES=3
AI_BACKOFF_MS=1000
AI_COST_PER_1K_TOKENS=0.002
NODE_ENV=production
```

### Step 3: Deploy to Vercel

#### Option A: Auto-deploy from GitHub
1. Push this code to GitHub (https://github.com/MABAIStrategies/mab-ai-strategies-CRM-tool)
2. In Vercel Dashboard, **New Project** → select this repo
3. Vercel automatically syncs and deploys on every push

#### Option B: Manual Deploy via Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

### Step 4: Run Database Migrations

After deployment, run Prisma migrations to set up the schema:

```bash
# From the Vercel deployment environment
npx prisma migrate deploy
```

Or add this to `vercel.json` to run automatically:

```json
{
  "buildCommand": "npm run build && npx prisma migrate deploy",
  "outputDirectory": ".next"
}
```

### Step 5: Access Your CRM

- **URL**: https://your-project-name.vercel.app
- **Login**:
  - Passcode: `mab` (default, change in production)
  - In **development mode** (NODE_ENV !== "production"), the login is bypassed and you go straight to `/today`

---

## Production Security Checklist

- [ ] Change `PASSCODE` from default "mab" to a strong random string
- [ ] Generate a new `AUTH_SECRET` (at least 32 random characters)
- [ ] Set `NODE_ENV=production` in Vercel environment variables
- [ ] Enable HTTPS (Vercel does this automatically)
- [ ] Set up a strong database password in Vercel Postgres
- [ ] Configure rate limiting: `AI_RATE_LIMIT_PER_MINUTE` (default: 30)
- [ ] Restrict Vercel project access to authorized team members only
- [ ] Monitor database usage in Vercel Storage dashboard

---

## Key Features in This Build

✅ **Auth System**
- Custom HMAC-based session tokens (no NextAuth dependencies)
- Passcode-protected login with optional dev-mode bypass
- Rate-limited API endpoints
- Secure HTTP-only cookies

✅ **API Endpoints**
- `POST /api/auth/login` — Authenticate with passcode
- `GET/POST /api/tasks` — Task management with filtering & sorting
- `GET/POST /api/notes` — Note capture with title/body & legacy rawText support
- All endpoints include CSRF protection and rate limiting

✅ **Database (Prisma + PostgreSQL)**
- Task model with status enum: TODO, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED
- Note model with title, body, rawText, summary fields
- Memory, Contact, Company, Deal models for CRM functionality

✅ **Navigation**
- 11-item canonical nav (Today, Pipeline, Companies, Contacts, Outreach, Workspace, Deals, Tasks, Assets, Search, Finish Line)
- Active route highlighting on desktop (Sidebar) and mobile (Mobile Nav)
- Responsive mobile-first design with Tailwind CSS

✅ **Middleware**
- Server-side auth gating (production mode)
- Dev-mode bypass: auto-redirect /login → /today when NODE_ENV !== "production"
- Public paths: /login, /api/auth/login, /_next, /favicon.ico, /branding

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Prisma) | `postgresql://user:pass@host/dbname` |
| `POSTGRES_PRISMA_URL` | Prisma-compatible Postgres URL | `postgresql://...` |
| `POSTGRES_URL_NON_POOLING` | Non-pooling connection for migrations | `postgresql://...` |
| `APP_URL` | Public URL of the deployed app | `https://mab-crm.vercel.app` |
| `PASSCODE` | Login passcode (change from "mab") | `your-secret-passcode` |
| `AUTH_SECRET` | HMAC secret for session tokens | 32+ random characters |
| `NODE_ENV` | Environment mode | `production` or `development` |
| `AI_RATE_LIMIT_PER_MINUTE` | Rate limit for API calls | `30` |
| `AI_MAX_RETRIES` | Retry attempts on failure | `3` |
| `AI_BACKOFF_MS` | Delay between retries (ms) | `1000` |
| `AI_COST_PER_1K_TOKENS` | Cost tracking per 1K tokens | `0.002` |

---

## Troubleshooting

**Login page keeps loading / middleware redirect not working:**
- Ensure `NODE_ENV=production` is set in Vercel
- Verify database connection string is correct
- Check Vercel build logs for errors

**Database migration failed:**
- Verify `DATABASE_URL` connection works
- Run `npx prisma migrate deploy` manually in Vercel CLI
- Check Vercel Postgres dashboard for database status

**Rate limiting errors:**
- Increase `AI_RATE_LIMIT_PER_MINUTE` in environment variables
- Verify rate-limit.ts is not hitting in-memory limit

**CORS or 500 errors:**
- Check Vercel function logs
- Ensure all required env vars are set
- Verify Prisma schema matches database

---

## Next Steps

1. ✅ Fork/clone this repo to MABAIStrategies GitHub
2. ✅ Create Vercel project and link GitHub repo
3. ✅ Set up Vercel Postgres database
4. ✅ Add environment variables from Step 2 above
5. ✅ Deploy and run migrations
6. ✅ Test login at https://your-project.vercel.app
7. ⏭️ Customize branding, add team members, configure AI provider

---

## Support

For issues or questions:
- Check Vercel deployment logs: https://vercel.com/dashboard/[project]/deployments
- Review Prisma migration status
- Verify all environment variables are set correctly
