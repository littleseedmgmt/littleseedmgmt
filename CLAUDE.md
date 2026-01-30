# LittleSeedMgmt - Claude Code Context

## Project Overview

ERP platform for Little Seed, a group of 3 schools in Northern California owned by Prashant and Alpna Wadhwa. The goal is to replace manual processes with automated management modules, starting with teacher management and expanding to admissions, inventory, and finance.

**Schools**: Peter Pan Mariner Square, Little Seeds Children's Center, Peter Pan Harbor Bay (all Alameda, CA)

**Stack**: Next.js 16 (App Router) + Supabase (PostgreSQL + Auth) + Tailwind CSS, hosted on Vercel at littleseedmgmt.com

## Current State (January 2026)

### What's Built
- Multi-tenant architecture with school-based data isolation (RLS)
- Authentication with role-based access (super admin, director, teacher, staff)
- Dashboard with school selector and stacked multi-school views for owners
- **Teacher Management Module (Phase 1 - Active)**:
  - Staff CRUD (list, view, update teachers across schools)
  - Shift management with regular schedules and lunch breaks
  - PTO request workflow (submit, approve/reject)
  - Calendar optimization using Claude AI (full + minimal modes)
  - Break scheduling with staggering and section-based limits
  - Coverage analysis (actual vs hypothetical staffing views)
  - Director daily summaries
  - Classroom-level nap/circle/playground time settings
- Student records and classroom assignments
- Attendance tracking (basic: record, bulk import, summary)
- Dev tools: seed, reset, migrate API endpoints

### What's Being Tested
The teacher management module is in active testing/bug-fixing mode to reach production quality. Recent work has focused on:
- Classroom name matching (handling parenthetical names, "2s"/"3s" suffixes)
- Break staggering with section-based limits
- Staff schedule data corrections
- Director availability counts in calendar views

### Known Issues / Active Work
- Calendar optimization relies on Claude AI calls which are slow/expensive for large schedules
- Some UI polish needed before production launch
- Aura Batres transferred from Mariner Square to Harbor Bay (Jan 29, 2026)
- Harbor Bay lunch times updated to match super optimized schedule
- Optimization algorithm updated: tiered coverage priority, qualification boundaries, nap consolidation, playground self-coverage

## Architecture Decisions
- **Multi-tenancy**: Shared database with `school_id` on all tables + Row Level Security
- **Owner view**: All schools stacked vertically (not merged) on one screen
- **Teacher optimization**: Uses Anthropic Claude API to generate optimal classroom assignments
- **No separate backend**: Next.js API routes serve as the backend
- **Database migrations**: Raw SQL files in `supabase/migrations/`, run via Supabase CLI

## Key Files & Directories
- `src/app/api/calendar/optimize/route.ts` - Core calendar optimization (Claude AI)
- `src/app/api/calendar/optimize-minimal/route.ts` - Lightweight optimization
- `src/app/api/staff/route.ts` - Staff listing with school/role/status filters
- `src/app/api/staff/shifts/route.ts` - Shift management
- `src/app/api/pto/route.ts` - PTO request workflow
- `src/app/(dashboard)/` - All protected dashboard pages
- `src/components/dashboard/` - Dashboard UI components
- `supabase/migrations/` - 14 database migration files
- `docs/` - Architecture, database schema, feature specs

## Development Commands
```bash
npm run dev          # Start dev server on port 3005
npm run build        # Production build
npm run lint         # ESLint
npm run db:reset     # Re-seed database from supabase/seed-real-data.sql
npm run test         # Run Vitest
npm run test:watch   # Vitest in watch mode
```

## Module Roadmap

### Module 1: Teacher Management [IN PROGRESS]
Status: Testing & bug-fixing for production readiness

- [x] Staff CRUD operations
- [x] Shift management (regular schedules, lunch breaks)
- [x] PTO request and approval workflow
- [x] Calendar optimization (AI-powered classroom assignments)
- [x] Break scheduling with staggering
- [x] Coverage analysis views (actual + hypothetical)
- [x] Director daily summaries
- [x] Classroom time settings (nap, circle, playground)
- [x] Multi-school stacked owner view
- [ ] Full test coverage for API routes
- [ ] UI polish and edge case handling
- [ ] Performance optimization for large schedules
- [ ] Production deployment and validation

### Module 2: Admissions Management [PLANNED]
Goal: Automate parent engagement from inquiry to enrollment

- [ ] Parent inquiry capture and storage
- [ ] Engagement pipeline/CRM (inquiry -> tour -> application -> enrolled)
- [ ] Automated outreach sequences (email/SMS)
- [ ] Tour scheduling and follow-up
- [ ] Application processing workflow
- [ ] Waitlist management
- [ ] Conversion analytics and reporting
- [ ] Integration with student records on enrollment

### Module 3: Inventory Management [PLANNED - Phase 2]
See `docs/applications/inventory.md` for full spec

- [ ] Inventory catalog with stock levels
- [ ] Stock management (add, remove, transfer)
- [ ] Purchase order workflow with approvals
- [ ] Low stock alerts and reorder suggestions
- [ ] Spending reports

### Module 4: Financial Management [PLANNED - Phase 3]
See `docs/applications/financial.md` for full spec

- [ ] Transaction recording (income + expenses)
- [ ] Chart of accounts
- [ ] P&L statements (by school + consolidated)
- [ ] Expense categorization and reporting
- [ ] Tax-ready report generation

### Future Modules
- Notifications (email via Resend/SendGrid, SMS via Twilio)
- Parent portal
- Google Calendar sync
- Accounting integration (QuickBooks)

## Session Start Checklist
1. Read this file for context
2. Check `git log --oneline -10` for recent changes
3. Run `npm run test` to verify nothing is broken
4. Check the module roadmap above for next work item
