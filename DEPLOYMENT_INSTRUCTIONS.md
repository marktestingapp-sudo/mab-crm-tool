# MAB AI Strategies CRM — Complete Deployment Instructions

## Overview

Your CRM is ready for production deployment on Vercel with PostgreSQL. This document guides you through the entire process.

---

## Prerequisites

- **GitHub Account**: MABAIStrategies (already set up ✓)
- **Vercel Account**: https://vercel.com (create if needed)
- **Database**: We'll use Vercel Postgres (no setup required)

---

## Deployment Steps (5 minutes)

### 1. Push Code to GitHub

If not already pushed, run these commands in your project directory:

```bash
git remote -v
# Should show: https://github.com/MABAIStrategies/mab-ai-strategies-CRM-tool.git

git add .
git commit -m "Production deployment ready"
git push origin main
```

### 2. Create Vercel Project

1. Go to **https://vercel.com/dashboard**
2. Click **"Add New..."** → **"Project"**
3. Select GitHub repo: `MABAIStrategies/mab-ai-strategies-CRM-tool`
4. Click **"Import"**

Vercel will auto-detect this is a Next.js project.

### 3. Create Vercel Postgres Database

1. Still in Vercel project, go to **"Storage"** tab
2. Click **"Create Database"** → **"Postgres"**
3. Name it: `mab-crm-db` (or any name you like)
4. Click **"Create & Connect"**
5. Vercel automatically adds these environment variables:
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - Others...

### 4. Add Additional Environment Variables

In Vercel project settings, go to **"Settings"** → **"Environment Variables"** and add:

```
PASSCODE=mab
AUTH_SECRET=your-random-32-char-secret-here
APP_URL=https://your-project-name.vercel.app
NODE_ENV=production
AI_RATE_LIMIT_PER_MINUTE=30
AI_MAX_RETRIES=3
AI_BACKOFF_MS=1000
AI_COST_PER_1K_TOKENS=0.002
```

**To generate a random AUTH_SECRET**, use this command:
```bash
openssl rand -hex 16
# Example output: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
```

### 5. Enable Automatic Builds

In Vercel project, **"Settings"** → **"Git"**:
- ✓ Enable "Automatic deployments on push"
- ✓ Enable "Preview deployments"

### 6. Trigger Initial Build

Once env vars are set:
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** to trigger a new build with the new env vars
3. Wait for build to complete (2-3 minutes)
4. Check **"Logs"** if there are any errors

### 7. Run Database Migrations

After deployment succeeds:

**Option A: Via Vercel Dashboard**
- Go to project **"Functions"** → Check for migration logs
- Or create a one-time route at `/api/migrate` to run: `npx prisma migrate deploy`

**Option B: Via Local Terminal**
```bash
# From your local project directory
vercel env pull .env.production.local
POSTGRES_PRISMA_URL=$(cat .env.production.local | grep POSTGRES_PRISMA_URL) npx prisma migrate deploy
```

**Option C: Contact Support**
- If migrations don't run automatically, Vercel support can run them for you

### 8. Test the Deployment

Go to: `https://your-project-name.vercel.app`

You should see the **MAB AI Strategies CRM** login page.

- **Passcode**: `mab` (as set in environment variables)
- In **production mode**, you must enter the passcode
- In **development** (if NODE_ENV !== "production"), login is bypassed

---

## Security Setup (Important for Production)

### Change Default Credentials

⚠️ **DO NOT use defaults in production.** Change these:

1. **Passcode**: Update `PASSCODE` env var to something strong
   ```
   PASSCODE=YourSecurePasscode123!@#
   ```

2. **Auth Secret**: Keep it as a random 32+ character string
   ```
   AUTH_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8g9h0
   ```

3. **Database Password**: Vercel Postgres handles this, but verify in Storage dashboard

4. **Node Environment**: Confirm `NODE_ENV=production` is set (NOT development)

### Verify Security Headers

Vercel automatically adds these via `vercel.json`:
- ✓ X-Content-Type-Options: nosniff
- ✓ X-Frame-Options: DENY
- ✓ X-XSS-Protection: 1; mode=block
- ✓ Referrer-Policy: strict-origin-when-cross-origin
- ✓ HTTPS enforced (automatic on Vercel)

### Restrict Access (Optional)

If you want to limit who can access:
1. Enable **Vercel Authentication** in project settings
2. Or add auth middleware to require login before accessing the app

---

## Troubleshooting

### "Build failed" error
- Check **Logs** → **Build** for specific error messages
- Common issues:
  - Missing `POSTGRES_PRISMA_URL` env var
  - Node version mismatch (Vercel defaults to Node 20, should be fine)
  - Missing dependencies

### Login page not loading / Server error
- Verify `DATABASE_URL` and `POSTGRES_PRISMA_URL` are set
- Verify database migrations ran successfully
- Check **Functions** → **Runtime Logs** for errors

### Migrations didn't run automatically
- In Vercel CLI, run locally:
  ```bash
  npx prisma migrate deploy
  ```
- Or add to `vercel.json` buildCommand:
  ```json
  "buildCommand": "npm run build && npx prisma migrate deploy"
  ```

### Users can't login
- Verify `PASSCODE` env var is set to your desired value
- Verify `NODE_ENV=production` (NOT "development")
- Check Vercel Function logs for auth errors

### Database connection errors
- Verify `POSTGRES_PRISMA_URL` is correct
- Check Vercel Storage dashboard — database should show "Active"
- Ensure database didn't hit any usage limits

---

## Monitoring & Maintenance

### Monitor Database Usage

1. Go to Vercel project → **Storage** → **Postgres**
2. Check **Usage** tab for:
   - Rows stored
   - Storage used
   - Data operations per day

### View Logs

**Build Logs**:
- Deployments tab → Select deployment → View logs

**Runtime Logs**:
- Functions tab → Select function → View recent invocations

**Database Logs**:
- Storage → Postgres → View activity

### Set Up Alerts (Optional)

In Vercel dashboard:
- **Settings** → **Usage & Billing** → Set deployment and data transfer alerts

---

## Next Steps

✅ Deployed to Vercel
✅ Connected to PostgreSQL
✅ Set environment variables
✅ Database migrated

⏭️ **What to do next:**

1. **Update branding**:
   - Replace `/public/branding/mab-logo.svg` with your logo
   - Update `/public/branding/mab-headshot.svg` with your headshot

2. **Customize settings**:
   - Update app title in `app/layout.tsx`
   - Change color scheme in `tailwind.config.ts` (mab-navy, mab-gold, etc.)
   - Update `PASSCODE` to something unique

3. **Add team members**:
   - Share deployment URL with your team
   - They can log in with the passcode you set

4. **Integrate AI providers** (optional):
   - Add your AI provider API keys to env vars
   - Update `src/lib/ai-provider.ts` to use your preferred service

5. **Enable advanced features**:
   - Background jobs: Configure `src/worker.ts` with a queue service
   - Search: Update `src/components/global-search.tsx` to use your search backend
   - Webhooks: Add external integrations to API routes

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Your GitHub Repo**: https://github.com/MABAIStrategies/mab-ai-strategies-CRM-tool

---

**Your CRM is now live and ready to use! 🚀**

Questions? Check the logs, verify env vars, or reach out to Vercel support.
