# LittleSeedMgmt

**School Management System for LittleSeed Schools**

## Overview

LittleSeedMgmt is an enterprise resource planning (ERP) system designed to manage the day-to-day operations of the LittleSeed school conglomerate. The system provides a unified platform for managing multiple schools, their staff, students, resources, and finances.

### Organization

- **Owners**: Alpna Wadhwa and Prashant Wadhwa
- **Current Scope**: 3 schools in Northern California
- **Vision**: Scalable multi-school management platform

## Project Goals

1. **Centralized Operations**: Provide a single platform to manage all operational aspects across multiple schools
2. **Efficiency**: Reduce manual administrative work through automation and streamlined workflows
3. **Visibility**: Offer real-time insights into attendance, staffing, inventory, and finances
4. **Scalability**: Build a foundation that can support additional schools and features over time
5. **Compliance**: Ensure proper record-keeping for regulatory requirements

## Applications

LittleSeedMgmt consists of the following integrated applications:

| Application | Description | Priority |
|-------------|-------------|----------|
| [Attendance Management](docs/applications/attendance.md) | Track student and staff attendance | Phase 1 |
| [Calendar Management](docs/applications/calendar.md) | Manage teacher and classroom schedules | Phase 1 |
| [Staff Planning](docs/applications/staff-planning.md) | Handle teacher shifts and PTO | Phase 1 |
| [Inventory Management](docs/applications/inventory.md) | Track supplies and orders | Phase 2 |
| [Financial Management](docs/applications/financial.md) | P&L statements and tax filing | Phase 3 |

## Technical Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14+ | React-based web application with App Router |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Database | Supabase (PostgreSQL) | Managed database with auth and real-time |
| Authentication | Supabase Auth | User management and role-based access |
| Hosting | Vercel | Frontend hosting with edge functions |
| Domain | littleseedmgmt.com | Production domain |

## Repository Structure

```
littleseedmgmt/
├── README.md                    # This file
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── DATABASE.md              # Database schema design
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── DESIGN_SYSTEM.md         # UI/UX design guidelines
│   └── applications/            # Application-specific docs
│       ├── attendance.md
│       ├── calendar.md
│       ├── staff-planning.md
│       ├── inventory.md
│       └── financial.md
├── src/                         # Source code
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   ├── lib/                     # Utilities and helpers
│   └── types/                   # TypeScript type definitions
├── supabase/                    # Supabase configuration
│   └── migrations/              # Database migrations
└── public/                      # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier available)

### Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

See the [Deployment Guide](docs/DEPLOYMENT.md) for complete setup instructions.

## Links

- **Production**: https://littleseedmgmt.com
- **Repository**: https://github.com/kamalneel/littleseedmgmt
