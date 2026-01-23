# Deployment Guide

## Overview

LittleSeedMgmt uses a modern deployment pipeline with:
- **Vercel** for frontend hosting and serverless functions
- **Supabase** for database, authentication, and storage
- **GitHub** for version control and CI/CD triggers

## Environment Setup

### Prerequisites

1. Node.js 18+ installed locally
2. GitHub account with repository access
3. Vercel account (free tier available)
4. Supabase account (free tier available)

### Local Development

```bash
# Clone the repository
git clone https://github.com/kamalneel/littleseedmgmt.git
cd littleseedmgmt

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start Supabase locally (optional)
npx supabase start

# Start development server
npm run dev
```

### Environment Variables

```bash
# .env.local (development)
# .env.production (production - set in Vercel dashboard)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=LittleSeedMgmt

# Optional: Email (Resend)
RESEND_API_KEY=your-resend-key
```

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project in desired region (us-west-1 recommended for California)
3. Save the project URL and anon key

### 2. Run Database Migrations

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push

# Or manually via SQL Editor in Supabase dashboard
# Copy SQL from supabase/migrations/*.sql
```

### 3. Configure Authentication

In Supabase Dashboard → Authentication → Settings:

1. **Site URL**: Set to your production domain (https://littleseedmgmt.com)
2. **Redirect URLs**: Add all valid redirect URLs
   - http://localhost:3000/**
   - https://littleseedmgmt.com/**
   - https://*.vercel.app/** (for preview deployments)
3. **Email Settings**: Configure SMTP for production emails

### 4. Enable Row Level Security

Ensure RLS is enabled on all tables. Policies are defined in migrations.

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository: `kamalneel/littleseedmgmt`
3. Configure build settings (auto-detected for Next.js)

### 2. Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Environment | Value |
|----------|-------------|-------|
| NEXT_PUBLIC_SUPABASE_URL | Production, Preview | https://xxx.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Production, Preview | your-anon-key |
| SUPABASE_SERVICE_ROLE_KEY | Production | your-service-role-key |
| NEXT_PUBLIC_APP_URL | Production | https://littleseedmgmt.com |

### 3. Configure Custom Domain

1. Go to Project Settings → Domains
2. Add domain: `littleseedmgmt.com`
3. Add domain: `www.littleseedmgmt.com` (redirect to root)
4. Follow DNS configuration instructions

**DNS Configuration (at your domain registrar):**

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### 4. Deploy

Deployment is automatic on push to main branch:

```bash
# Merge to main triggers production deploy
git checkout main
git merge feature-branch
git push origin main
```

## Deployment Environments

### Development (Local)
- URL: http://localhost:3000
- Database: Local Supabase or separate dev project
- Purpose: Active development

### Preview (Vercel)
- URL: https://[branch]-littleseedmgmt.vercel.app
- Database: Staging Supabase project
- Purpose: PR reviews and testing
- Trigger: Any push to non-main branch

### Production (Vercel)
- URL: https://littleseedmgmt.com
- Database: Production Supabase project
- Purpose: Live application
- Trigger: Push to main branch

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
```

### Deployment Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Push to   │────▶│   GitHub    │────▶│   Vercel    │
│   Branch    │     │   Actions   │     │   Deploy    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │
       │                  ▼                   │
       │           ┌─────────────┐            │
       │           │  Run Tests  │            │
       │           │  Lint Check │            │
       │           │  Type Check │            │
       │           └─────────────┘            │
       │                  │                   │
       │                  ▼                   │
       │           ┌─────────────┐            │
       │           │   Pass?     │            │
       │           └─────────────┘            │
       │             │       │                │
       │          No │       │ Yes            │
       │             ▼       ▼                │
       │         [Block]  [Deploy]◀───────────┘
       │
       ▼
┌─────────────┐
│  Preview    │ (non-main branches)
│  Deployment │
└─────────────┘
       │
       ▼
┌─────────────┐
│ Production  │ (main branch only)
│ Deployment  │
└─────────────┘
```

## Database Migrations

### Creating Migrations

```bash
# Create a new migration
npx supabase migration new add_feature_name

# This creates: supabase/migrations/[timestamp]_add_feature_name.sql
```

### Applying Migrations

```bash
# Development (local)
npx supabase db reset  # Resets and applies all migrations

# Production
npx supabase db push   # Applies pending migrations
```

### Migration Best Practices

1. **Always test locally first** before pushing to production
2. **Make migrations reversible** when possible
3. **Never modify existing migrations** after they've been deployed
4. **Use transactions** for complex migrations
5. **Back up production database** before applying migrations

## Monitoring and Logging

### Vercel Analytics

Enable in Project Settings → Analytics for:
- Core Web Vitals monitoring
- Traffic insights
- Error tracking

### Supabase Monitoring

Available in Supabase Dashboard:
- Database metrics
- API request logs
- Authentication logs
- Storage usage

### Error Tracking (Recommended)

Consider adding Sentry for comprehensive error tracking:

```bash
npm install @sentry/nextjs
```

## Security Checklist

### Pre-Deployment

- [ ] All environment variables set correctly
- [ ] RLS policies enabled on all tables
- [ ] Service role key not exposed to client
- [ ] CORS configured correctly in Supabase
- [ ] Rate limiting configured

### Post-Deployment

- [ ] Verify authentication works
- [ ] Test RLS policies with different user roles
- [ ] Check error handling
- [ ] Verify SSL certificate active
- [ ] Test email delivery (if configured)

## Rollback Procedures

### Application Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Database Rollback

```bash
# Create backup before migrations
npx supabase db dump > backup.sql

# Restore if needed
psql -h [host] -U postgres -d postgres < backup.sql
```

## Scaling Considerations

### Current Tier (Free/Pro)
- Suitable for initial launch and growth
- Up to 500MB database
- 5GB bandwidth
- Adequate for ~100 concurrent users

### Future Scaling
- Upgrade Supabase plan for larger database
- Enable Vercel Edge Functions for lower latency
- Consider connection pooling for high traffic
- Add CDN for static assets

## Support Contacts

- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.io
- **Project Repository**: github.com/kamalneel/littleseedmgmt
