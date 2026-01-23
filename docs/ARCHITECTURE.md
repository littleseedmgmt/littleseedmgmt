# System Architecture

## Overview

LittleSeedMgmt follows a modern web application architecture using Next.js as the full-stack framework with Supabase providing backend services.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Desktop    │  │   Tablet     │  │   Mobile     │          │
│  │   Browser    │  │   Browser    │  │   Browser    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL EDGE NETWORK                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Application                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   App       │  │   API       │  │   Server            │ │ │
│  │  │   Router    │  │   Routes    │  │   Components        │ │ │
│  │  │   (Pages)   │  │   (Backend) │  │   (SSR)             │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Auth       │  │   Database   │  │   Storage    │          │
│  │   Service    │  │   (Postgres) │  │   (Files)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   Realtime   │  │   Edge       │                             │
│  │   Subscript. │  │   Functions  │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Decisions

### Frontend: Next.js 14+

**Rationale**:
- Server-side rendering for better performance and SEO
- App Router provides modern React patterns (Server Components)
- API routes eliminate need for separate backend server
- Excellent TypeScript support
- Vercel integration is seamless

### Database: Supabase (PostgreSQL)

**Rationale**:
- Managed PostgreSQL with automatic backups
- Built-in authentication with role-based access control
- Row Level Security (RLS) for data isolation between schools
- Real-time subscriptions for live updates
- Storage for file uploads (documents, images)
- Generous free tier for development

### Hosting: Vercel

**Rationale**:
- Optimized for Next.js applications
- Automatic deployments from GitHub
- Edge functions for low-latency responses
- Preview deployments for pull requests
- Custom domain support (littleseedmgmt.com)

### Styling: Tailwind CSS + shadcn/ui

**Rationale**:
- Utility-first approach for consistent styling
- shadcn/ui provides accessible, customizable components
- Matches the clean Robinhood-style aesthetic

## Multi-Tenancy Architecture

The system supports multiple schools through a **shared database with row-level isolation**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        SCHOOLS TABLE                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ id │ name              │ address        │ timezone          ││
│  │ 1  │ LittleSeed North  │ San Jose, CA   │ America/Los_Angeles│
│  │ 2  │ LittleSeed South  │ Fremont, CA    │ America/Los_Angeles│
│  │ 3  │ LittleSeed East   │ Milpitas, CA   │ America/Los_Angeles│
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ALL DATA TABLES INCLUDE school_id                   │
│  - students.school_id → schools.id                              │
│  - teachers.school_id → schools.id                              │
│  - attendance.school_id → schools.id                            │
│  - inventory.school_id → schools.id                             │
│  - Row Level Security enforces data isolation                   │
└─────────────────────────────────────────────────────────────────┘
```

## User Roles

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| **Super Admin** | All schools | Full system access, user management, all reports |
| **School Admin** | Single school | Manage their school's data, staff, reports |
| **Teacher** | Single school | View schedules, mark attendance, request PTO |
| **Staff** | Single school | Limited access based on assigned permissions |

## Security Considerations

1. **Authentication**: Supabase Auth with email/password, potential SSO integration
2. **Authorization**: Row Level Security policies on all tables
3. **Data Encryption**: TLS in transit, encryption at rest (Supabase default)
4. **Audit Logging**: Track all data modifications with user and timestamp
5. **Session Management**: JWT tokens with appropriate expiration

## Integration Points

### Phase 1 (Internal)
- Cross-application data sharing (attendance ↔ calendar)
- Unified user management

### Phase 2 (External - Future)
- Email notifications (Resend or SendGrid)
- SMS alerts (Twilio)
- Calendar sync (Google Calendar API)
- Accounting software export (QuickBooks)

## Performance Targets

| Metric | Target |
|--------|--------|
| Page Load (LCP) | < 2.5 seconds |
| Time to Interactive | < 3.5 seconds |
| API Response Time | < 200ms (p95) |
| Database Query Time | < 50ms (p95) |
| Uptime | 99.9% |

## Development Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Local     │    │   Preview   │    │  Production │
│   Dev       │───▶│   (Vercel)  │───▶│  (Vercel)   │
│   Branch    │    │   PR Deploy │    │   Main      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Local     │    │   Staging   │    │  Production │
│   Supabase  │    │   Supabase  │    │  Supabase   │
└─────────────┘    └─────────────┘    └─────────────┘
```
