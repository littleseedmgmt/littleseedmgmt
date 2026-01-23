# Break Coverage Model

## Overview

Every teacher receives:
- **Two 10-minute breaks** (one before lunch, one after lunch)
- **One lunch break** (variable: 1 hour or 90 minutes, per Column D of schedule)

During breaks, another staff member must cover to maintain ratio compliance. This document captures the coverage dependencies.

---

## Peter Pan Mariner Square

### Infant Rooms

Mariner Square has two infant areas: **Upstairs** and **Downstairs**.

#### Downstairs Infant Room

| Teacher | Shift | Break 1 | Lunch | Break 2 | Coverage Provider |
|---------|-------|---------|-------|---------|-------------------|
| **Shelly Ortiz** | 7:30-5:00 | 9:45 (10 min) | 12:00-1:30 | 3:30 (10 min) | Julie (Director) |
| **Sally Du** | 8:15-5:30 | 10:00 (10 min) | 1:30-2:30 | 3:45 (10 min) | Julie (Director) |
| **Sherry Chan** | 8:30-5:30 | 10:30 (10 min) | 12:00-1:00 | 3:00-3:10 | Julie (Director) |

**Note**: Diaper change at 4:30pm requires Shelly, Sally, and Sherry - breaks must be completed before then.

#### Upstairs Infant Room

| Teacher | Shift | Break 1 | Lunch | Break 2 | Coverage Provider |
|---------|-------|---------|-------|---------|-------------------|
| **Pat Adkins** | 8:30-5:30 | 10:50 (10 min) | 1:30-2:30 | 4:00-4:10 | Izzy (morning), Mackishia (afternoon) |
| **Isabel (Izzy) Kasaab** | 8:30-12:30 | 10:30 (10 min) | N/A (part-time) | N/A | Pat |
| **Mackishia Stevenson** | 1:30-5:30 | N/A | N/A | 3:30 (10 min) | Pat |

**Coverage Chain**:
- Morning (8:30-12:30): Pat ↔ Izzy cover each other
- Afternoon (1:30-5:30): Pat ↔ Mackishia cover each other
- Pat's lunch: Mackishia arrives at 1:30, Sherry helps transition

---

### Tigers (2 Year Olds)

| Teacher | Shift | Break 1 | Lunch | Break 2 | Coverage Provider |
|---------|-------|---------|-------|---------|-------------------|
| **Maricon Alcontin** | 8:30-5:30 | 10:30 (10 min) | 1:00-2:00 | 4:15 (10 min) | Self-coverage (kids in playground) |
| **Corazon (Cora) Velasquez** | 8:00-5:00 | 10:00 (10 min) | 12:00-1:00 | 3:30 (10 min) | Muoi / playground time |
| **Muoi Tran** | 8:00-5:00 | 10:00 (10 min) | 12:00-1:00 | 3:30 (10 min) | Cora / playground time |

**Ratio Compliance Notes**:
- 9:30-11:00 AM: Kids are outside (playground) - ratio is naturally met
- Lunch breaks staggered so coverage is maintained
- "Kids are in playground, so ratio is ok" during breaks

---

### Ponies (3 Year Olds)

| Teacher | Shift | Break 1 | Lunch | Break 2 | Coverage Provider |
|---------|-------|---------|-------|---------|-------------------|
| **Angel Lewis** (Lead) | 8:15-5:15 | TBD | 1:00-2:00 | TBD | Shirley |
| **Shirley Liu** | 7:30-5:00 | TBD | 12:00-1:00 | TBD | Angel |

---

### Pre-K / Soda Pop (4-5 Year Olds)

| Teacher | Shift | Break 1 | Lunch | Break 2 | Coverage Provider |
|---------|-------|---------|-------|---------|-------------------|
| **Christina Sagun** (Lead) | 8:30-5:30 | TBD | 1:30-2:30 | TBD | Kevin, Jules |
| **Kevin Dupre** | 8:00-5:00 | TBD | 12:30-1:30 | TBD | Christina, Jules |
| **Jules Leung** | 8:15-5:15 | TBD | 1:30-2:30 | TBD | Christina, Kevin |

---

### Floater

| Teacher | Shift | Notes |
|---------|-------|-------|
| **Aura Batres** | 10:30-5:30 | Provides coverage across classrooms as needed |

---

### Director Coverage Role

**Julie DeMauri** (Director, 8:30-5:30) provides coverage for:
- Downstairs infant room breaks (Shelly, Sally, Sherry)
- Emergency coverage across school

**Shannon Atthowe** (Assistant Director, 7:30-5:00) provides:
- Opening coverage
- Additional break coverage as needed

---

## Coverage Dependency Graph (Mariner Square)

```
                    ┌─────────────────┐
                    │  Julie DeMauri  │
                    │   (Director)    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Shelly (Infant) │ │ Sally (Infant)  │ │ Sherry (Infant) │
│   Downstairs    │ │   Downstairs    │ │   Downstairs    │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  Pat (Infant)   │◄───────►│ Izzy (morning)  │
│    Upstairs     │         │ Mackishia (PM)  │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ Maricon (Tigers)│◄───────►│ Cora & Muoi     │
│                 │         │  (playground)   │
└─────────────────┘         └─────────────────┘

┌─────────────────┐
│  Aura (Floater) │ ──────► Provides backup across all rooms
└─────────────────┘
```

---

## Little Seeds Children's Center

| Teacher | Classroom | Shift | Lunch | Coverage Notes |
|---------|-----------|-------|-------|----------------|
| **Sarah Hallford** | Director | 8:30-5:30 | Varies | Provides coverage across school |
| **Judi Thach** | Squirrels (Infant) | 8:00-5:00 | 12:00-1:00 | Tam covers |
| **Tam Tran** | Squirrels (Infant) | 8:30-5:30 | 1:00-2:00 | Judi covers |
| **Kristy Meli** | Bunnies (2s) | 7:30-5:00 | 1:00-2:30 | Quyen covers |
| **Quyen Duong** | Bunnies (2s) | 8:15-5:15 | 12:00-1:00 | Kristy covers |
| **Sonia Hernandez** | Chipmunks (3s) | 8:30-5:30 | 12:00-1:00 | Cross-coverage |
| **Mona Watson** | Bears (4-5) | 7:30-5:00 | 1:00-2:30 | Tiffany floater |
| **Tiffany Louie** | Floater | 8:15-5:15 | 1:00-2:00 | Provides coverage |

---

## Peter Pan Harbor Bay

| Teacher | Classroom | Shift | Lunch | Coverage Notes |
|---------|-----------|-------|-------|----------------|
| **Theresa Clement** | Director | 8:30-5:30 | Varies | Provides coverage across school |
| **Kirsten Cesar** | Ladybugs (Infant) | 7:30-4:30 | 1:00-2:00 | Thao/Melody cover |
| **Thao Ho** | Ladybugs (Infant) | 7:30-4:30 | 12:00-1:00 | Kirsten/Melody cover |
| **Melody Chan** | Ladybugs (Infant) | 8:15-5:15 | 12:30-1:30 | Kirsten/Thao cover |
| **Anotnia Ortiz** | Grasshoppers (2s) | 7:30-4:30 | 12:00-1:00 | Cross-coverage |
| **Vynn Alcontin** | Butterflies (3s) | 8:30-5:30 | 12:30-1:30 | Cross-coverage |
| **Lois Steenhard** | Dragonflies (4-5) | 8:15-5:15 | 12:00-1:00 | Jennie covers |
| **Jennie Mendoza** | Dragonflies (4-5) | 8:30-5:30 | 1:00-2:00 | Lois covers |

---

## Break Scheduling Rules

1. **Stagger breaks** within each classroom so at least one qualified teacher is always present
2. **Directors provide backup** for infant rooms where ratios are strictest
3. **Floaters** (Aura at MS, Tiffany at LS) provide flexible coverage
4. **Playground time** (9:30-11:00 AM for 2s and 3s) naturally maintains ratios
5. **Part-time staff** (Izzy, Mackishia) scheduled to fill coverage gaps
6. **Lunch breaks must complete** before afternoon activities (e.g., 4:30 PM diaper change)

---

## System Implications

### For Staff Planning App

When approving PTO, the system should:
1. Check if the absent teacher is a **coverage provider** for someone else
2. Alert if a break cannot be covered
3. Suggest alternative coverage (floater, director, cross-classroom)

### For Calendar App

When displaying schedules:
1. Show **who is on break** at any given time
2. Highlight **coverage gaps** when a provider is unavailable
3. Allow **reassigning coverage** when schedules change

### Database Consideration

Consider adding a `break_coverage` table:

```sql
CREATE TABLE break_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id), -- Teacher taking break
  coverage_provider_id UUID NOT NULL REFERENCES teachers(id), -- Who covers
  break_type VARCHAR(20) CHECK (break_type IN ('break1', 'lunch', 'break2')),
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
  effective_from DATE,
  effective_to DATE,
  notes TEXT,
  UNIQUE(teacher_id, break_type, day_of_week, effective_from)
);
```

This allows querying "Who covers Sarah's lunch on Tuesdays?" and detecting conflicts.
