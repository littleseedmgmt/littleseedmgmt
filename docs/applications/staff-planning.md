# Staff Planning Application

## Purpose

Manage teacher shifts, paid time off (PTO) requests, and workforce planning. Ensures adequate staffing levels while tracking employee hours and time-off balances.

## Priority

**Phase 1** - Core application for daily operations

## User Stories

### As a Teacher
- I want to submit PTO requests so that I can plan my time off
- I want to see my PTO balance so that I know how much time I have available
- I want to view my shift history so that I can verify my hours
- I want to receive notifications about PTO approvals so that I can plan accordingly

### As a School Admin
- I want to approve/reject PTO requests so that I can ensure adequate coverage
- I want to see upcoming time off so that I can plan for substitutes
- I want to track teacher hours so that I can manage overtime
- I want to see staffing levels by day so that I can identify potential issues

### As a Super Admin
- I want to set PTO policies so that they're consistent across schools
- I want to view organization-wide staffing reports so that I can optimize resources
- I want to manage holiday schedules so that all schools are aligned

## Features

### Core Features (MVP)
1. **Shift Management**
   - Record actual work hours (clock in/out)
   - Compare scheduled vs actual hours
   - Track regular and overtime hours

2. **PTO Requests**
   - Submit vacation, sick, personal time requests
   - Approval workflow with admin review
   - Automatic balance deduction upon approval

3. **PTO Balance Tracking**
   - View current balance by type
   - Accrual tracking
   - Carry-over management

4. **Staffing Dashboard**
   - Daily staffing levels by school/classroom
   - Upcoming PTO calendar view
   - Coverage gap identification

### Enhanced Features (Post-MVP)
- Shift swap requests between teachers
- Automatic substitute suggestions
- Payroll integration
- Overtime alerts

## Input/Output Specification

### Inputs

| Input | Type | Source | Validation |
|-------|------|--------|------------|
| Teacher ID | UUID | System/Dropdown | Must be active teacher |
| PTO Type | Enum | Dropdown | vacation/sick/personal/unpaid |
| Start Date | Date | Date picker | Cannot be in past (unless sick) |
| End Date | Date | Date picker | Must be >= start date |
| Hours | Decimal | Calculated/Manual | > 0, matches day range |
| Notes | Text | Text area | Optional, max 500 chars |
| Clock In Time | Timestamp | Button | Current time |
| Clock Out Time | Timestamp | Button | Must be after clock in |

### Outputs

| Output | Type | Format | Destination |
|--------|------|--------|-------------|
| PTO Request | Object | JSON | Database + Notification |
| PTO Balance | Object | JSON | Dashboard widget |
| Shift Record | Object | JSON | Database |
| Hours Summary | Report | Table | Admin dashboard |
| Staffing Report | Report | PDF/CSV | Export |

### API Endpoints

```
# PTO Requests
POST   /api/pto                    Create PTO request
GET    /api/pto                    List PTO requests (with filters)
GET    /api/pto/:id                Get single request
PUT    /api/pto/:id                Update request
DELETE /api/pto/:id                Cancel request
PUT    /api/pto/:id/approve        Approve request
PUT    /api/pto/:id/reject         Reject request

# Shifts
POST   /api/shifts/clock-in        Clock in
PUT    /api/shifts/:id/clock-out   Clock out
GET    /api/shifts                 List shifts
GET    /api/shifts/summary         Get hours summary

# Balances
GET    /api/pto/balance            Get PTO balance
GET    /api/pto/balance/:teacher   Get specific teacher's balance
```

### Request/Response Examples

**Submit PTO Request**
```json
// POST /api/pto
// Request
{
  "teacher_id": "uuid",
  "type": "vacation",
  "start_date": "2026-02-14",
  "end_date": "2026-02-15",
  "hours_requested": 16,
  "notes": "Valentine's Day weekend getaway"
}

// Response
{
  "id": "uuid",
  "teacher": {
    "id": "uuid",
    "name": "Sarah Johnson"
  },
  "type": "vacation",
  "start_date": "2026-02-14",
  "end_date": "2026-02-15",
  "hours_requested": 16,
  "status": "pending",
  "notes": "Valentine's Day weekend getaway",
  "created_at": "2026-01-22T10:00:00Z",
  "current_balance": 48,
  "balance_after_approval": 32
}
```

**Get PTO Balance**
```json
// GET /api/pto/balance?teacher_id=uuid
// Response
{
  "teacher_id": "uuid",
  "teacher_name": "Sarah Johnson",
  "balances": {
    "vacation": {
      "available": 48,
      "used_ytd": 16,
      "pending": 16,
      "accrual_rate": 8,
      "next_accrual_date": "2026-02-01"
    },
    "sick": {
      "available": 24,
      "used_ytd": 8,
      "pending": 0,
      "accrual_rate": 4,
      "next_accrual_date": "2026-02-01"
    },
    "personal": {
      "available": 16,
      "used_ytd": 0,
      "pending": 0,
      "accrual_rate": 0,
      "annual_allowance": 16
    }
  },
  "as_of": "2026-01-22"
}
```

**Clock In/Out**
```json
// POST /api/shifts/clock-in
// Request
{
  "teacher_id": "uuid"
}

// Response
{
  "id": "uuid",
  "teacher_id": "uuid",
  "date": "2026-01-22",
  "clock_in": "2026-01-22T08:02:00Z",
  "clock_out": null,
  "status": "in_progress",
  "scheduled_start": "08:00:00",
  "scheduled_end": "12:00:00"
}
```

## UI Screens

### View Modes

The Staff Planning app has two distinct view modes based on user role:

1. **Owner View (Alpna/Prashant)**: All three schools stacked vertically on one screen
2. **Director View**: Single school only (their assigned school)

### 1. Owner Multi-School Staff Planning View (Stacked)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Staff Planning                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Peter Pan Mariner Square ─────────────────────────────────────────────┐│
│  │  On Duty: 16  │  On PTO: 2  │  Pending PTO: 3  │  Hours Today: 128     ││
│  │  ⚠️ Julie needs coverage Wed 1/22                        [View Details] ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─ Little Seeds Children's Center ───────────────────────────────────────┐│
│  │  On Duty: 8   │  On PTO: 0  │  Pending PTO: 1  │  Hours Today: 64      ││
│  │  ✓ Fully staffed                                         [View Details] ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─ Peter Pan Harbor Bay ─────────────────────────────────────────────────┐│
│  │  On Duty: 9   │  On PTO: 1  │  Pending PTO: 2  │  Hours Today: 72      ││
│  │  ✓ Fully staffed                                         [View Details] ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─ All Schools - Pending PTO Requests ───────────────────────────────────┐│
│  │  6 requests awaiting approval                            [Review All]  ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Director Staff Planning Dashboard (Single School)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Staff Planning                                                             │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ On Duty     │ │ On PTO      │ │ Pending PTO │ │ Hours Today │           │
│  │     28      │ │      3      │ │      5      │ │    112      │           │
│  │  teachers   │ │  teachers   │ │  requests   │ │  scheduled  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  ┌───────────────────────────────────────┬─────────────────────────────────┐│
│  │ Pending PTO Requests                  │ Upcoming Time Off               ││
│  │                                       │                                 ││
│  │ ┌───────────────────────────────────┐ │ January 2026                    ││
│  │ │ Sarah Johnson                     │ │ ┌───┬───┬───┬───┬───┬───┬───┐ ││
│  │ │ Feb 14-15 (2 days) Vacation       │ │ │ S │ M │ T │ W │ T │ F │ S │ ││
│  │ │ Balance: 48h → 32h                │ │ ├───┼───┼───┼───┼───┼───┼───┤ ││
│  │ │ [Approve] [Reject] [View]         │ │ │   │   │   │ 1 │ 2 │ 3 │ 4 │ ││
│  │ └───────────────────────────────────┘ │ │   │   │   │   │ 1 │   │   │ ││
│  │ ┌───────────────────────────────────┐ │ ├───┼───┼───┼───┼───┼───┼───┤ ││
│  │ │ Mike Chen                         │ │ │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │ ││
│  │ │ Jan 28 (1 day) Personal           │ │ │   │   │   │   │   │ 2 │   │ ││
│  │ │ Balance: 16h → 8h                 │ │ └───┴───┴───┴───┴───┴───┴───┘ ││
│  │ │ [Approve] [Reject] [View]         │ │                                 ││
│  │ └───────────────────────────────────┘ │ Legend: Number = Teachers out   ││
│  └───────────────────────────────────────┴─────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Today's Shifts                                          January 22, 2026││
│  │ ┌───────────────────────────────────────────────────────────────────────┐│
│  │ │ Teacher          │ Scheduled   │ Actual      │ Status     │ Location ││
│  │ ├───────────────────────────────────────────────────────────────────────┤│
│  │ │ Sarah Johnson    │ 8:00-12:00  │ 8:02-       │ ● On Duty  │ Toddler A││
│  │ │ Mike Chen        │ 8:00-12:00  │ 7:58-       │ ● On Duty  │ Toddler A││
│  │ │ Emily Davis      │ 12:00-5:00  │ -           │ ○ Upcoming │ Toddler A││
│  │ │ Jane Wilson      │ 8:00-5:00   │ -           │ ● PTO      │ -        ││
│  │ └───────────────────────────────────────────────────────────────────────┘│
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Teacher PTO Request View
```
┌─────────────────────────────────────────────────────────────────┐
│  My Time Off                                                    │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Vacation   │ │    Sick     │ │  Personal   │               │
│  │   48 hrs    │ │   24 hrs    │ │   16 hrs    │               │
│  │  available  │ │  available  │ │  available  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  [+ Request Time Off]                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Pending Requests                                            ││
│  │ ┌─────────────────────────────────────────────────────────┐ ││
│  │ │ Feb 14-15, 2026                                         │ ││
│  │ │ Vacation (16 hours)                                     │ ││
│  │ │ Status: ● Pending Review                                │ ││
│  │ │ Submitted: Jan 22, 2026                   [Cancel]      │ ││
│  │ └─────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Past Requests                                    [View All] ││
│  │ ┌─────────────────────────────────────────────────────────┐ ││
│  │ │ Jan 2, 2026         │ Sick (8 hrs)     │ ● Approved     │ ││
│  │ │ Dec 24-25, 2025     │ Vacation (16 hrs)│ ● Approved     │ ││
│  │ │ Nov 28, 2025        │ Personal (8 hrs) │ ● Approved     │ ││
│  │ └─────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3. PTO Request Form
```
┌─────────────────────────────────────────────────────────────────┐
│  Request Time Off                                        [×]    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Type                                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ○ Vacation (48 hrs available)                              ││
│  │  ○ Sick (24 hrs available)                                  ││
│  │  ○ Personal (16 hrs available)                              ││
│  │  ○ Unpaid                                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Dates                                                          │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ Start: Feb 14, 2026 📅 │  │ End: Feb 15, 2026  📅  │        │
│  └────────────────────────┘  └────────────────────────┘        │
│                                                                 │
│  Hours: 16 (2 full days)                                        │
│                                                                 │
│  Notes (optional)                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Valentine's Day weekend getaway                             ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Balance after approval: 32 hrs vacation                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                    [Cancel]  [Submit Request]   │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Hours Summary View
```
┌─────────────────────────────────────────────────────────────────┐
│  Hours Summary                                   [Export CSV]   │
│                                                                 │
│  Period: [Jan 1 - Jan 22, 2026 ▼]    School: [All Schools ▼]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Teacher         │Scheduled│ Actual │Overtime│  PTO  │ Total ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Sarah Johnson   │  160 hrs│ 158 hrs│   0 hrs│  8 hrs│166 hrs││
│  │ Mike Chen       │  160 hrs│ 165 hrs│   5 hrs│  0 hrs│165 hrs││
│  │ Emily Davis     │  120 hrs│ 122 hrs│   2 hrs│  0 hrs│122 hrs││
│  │ Jane Wilson     │  160 hrs│ 144 hrs│   0 hrs│ 16 hrs│160 hrs││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ TOTAL           │  600 hrs│ 589 hrs│   7 hrs│ 24 hrs│613 hrs││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Submit valid PTO | Valid dates, type, hours | Request created |
| Submit PTO exceeding balance | Hours > available | Error: insufficient balance |
| Submit overlapping PTO | Overlapping date range | Error: dates conflict |
| Approve PTO | Valid request ID | Status updated, balance deducted |
| Clock in twice | Already clocked in | Error: already clocked in |

### Integration Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Full PTO workflow | Submit → Admin review → Approve | Balance updated, calendar shows PTO |
| PTO + Schedule integration | Approve PTO → Check calendar | Schedule shows teacher unavailable |
| Clock in/out cycle | Clock in → Work → Clock out | Shift record created with duration |

### E2E Tests

| Scenario | Steps | Verification |
|----------|-------|--------------|
| Teacher submits PTO | Login → Request → Submit | Request appears in admin queue |
| Admin approves PTO | Login → Review → Approve | Teacher notified, balance updated |
| Monthly hours report | Generate report → Export | Accurate hours for all teachers |

### Performance Tests

| Metric | Target | Test Method |
|--------|--------|-------------|
| PTO submission | < 500ms | Submit 100 concurrent requests |
| Balance calculation | < 200ms | Calculate for 50 teachers |
| Report generation | < 5s | Generate monthly report, 100 teachers |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| PTO request approval time | < 24 hours | Time from submit to decision |
| Staffing coverage | 100% | No understaffed shifts |
| Time tracking accuracy | > 99% | Verified against manual records |
| Employee satisfaction | > 4/5 | Survey on PTO process |

## Dependencies

- **Teachers Module**: Teacher records
- **Calendar Module**: Schedule integration
- **Notifications Module** (future): Approval notifications
- **Payroll Module** (future): Hours export
