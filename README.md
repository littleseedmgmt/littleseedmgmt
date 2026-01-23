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
│   └── applications/            # Application-specific docs
│       ├── attendance.md
│       ├── calendar.md
│       ├── staff-planning.md
│       ├── inventory.md
│       └── financial.md
├── src/                         # Source code (when implemented)
│   ├── app/                     # Next.js app router
│   ├── components/              # React components
│   ├── lib/                     # Utilities and helpers
│   └── types/                   # TypeScript types
├── supabase/                    # Supabase configuration
│   └── migrations/              # Database migrations
└── tests/                       # Test files
```

## Getting Started

Documentation is currently in the planning phase. See the [Architecture Document](docs/ARCHITECTURE.md) for technical details.

## Links

- **Production**: https://littleseedmgmt.com
- **Repository**: https://github.com/kamalneel/littleseedmgmt
