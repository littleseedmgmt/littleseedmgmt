# Attendance Management Application

## Purpose

Track daily attendance for all students across LittleSeed schools. Provides check-in/check-out functionality, attendance history, and reporting for compliance and parent communication.

## Priority

**Phase 1** - Core application for daily operations

## User Stories

### As a Teacher
- I want to quickly mark students as present/absent so that I can complete morning check-in efficiently
- I want to record check-in times so that late arrivals are documented
- I want to add notes to attendance records so that I can document reasons for absences
- I want to see today's attendance at a glance so that I know who is expected

### As a School Admin
- I want to view attendance reports so that I can identify patterns
- I want to export attendance data so that I can share with parents or regulators
- I want to see real-time attendance counts so that I know current capacity

### As a Super Admin
- I want to compare attendance across schools so that I can identify trends
- I want to access historical attendance data so that I can generate compliance reports

## Features

### Core Features (MVP)
1. **Daily Check-in/Check-out**
   - Quick mark present/absent for entire class
   - Record exact check-in and check-out times
   - Mobile-friendly for tablet use at entrance

2. **Attendance Status**
   - Present: Student is at school
   - Absent: Student did not attend
   - Late: Arrived after designated start time
   - Excused: Absent with valid reason (illness, appointment)

3. **Attendance Dashboard**
   - Today's attendance summary by classroom
   - Quick stats: total present, absent, late
   - List of students not yet checked in

4. **Attendance History**
   - View attendance by student
   - View attendance by date
   - View attendance by classroom

### Enhanced Features (Post-MVP)
- Parent notification for absences
- Absence streak alerts
- Attendance pattern analytics
- Integration with calendar for expected absences

## Input/Output Specification

### Inputs

| Input | Type | Source | Validation |
|-------|------|--------|------------|
| Student selection | UUID | Dropdown/List | Must be enrolled student at school |
| Date | Date | Date picker | Cannot be future date |
| Check-in time | Time | Auto/Manual | Must be valid time |
| Check-out time | Time | Auto/Manual | Must be after check-in |
| Status | Enum | Dropdown | present/absent/late/excused |
| Notes | Text | Text input | Max 500 characters |

### Outputs

| Output | Type | Format | Destination |
|--------|------|--------|-------------|
| Attendance record | Object | JSON | Database |
| Daily summary | Report | Table/PDF | Dashboard/Export |
| Attendance rate | Percentage | Number | Dashboard widgets |
| Absence alerts | Notification | Push/Email | Admin dashboard |

### API Endpoints

```
POST   /api/attendance              Create attendance record
GET    /api/attendance              List attendance (with filters)
GET    /api/attendance/:id          Get single record
PUT    /api/attendance/:id          Update record
DELETE /api/attendance/:id          Delete record (admin only)

GET    /api/attendance/summary      Get attendance summary
GET    /api/attendance/report       Generate attendance report
POST   /api/attendance/bulk         Bulk create/update records
```

### Request/Response Examples

**Create Attendance Record**
```json
// POST /api/attendance
// Request
{
  "student_id": "uuid",
  "date": "2026-01-22",
  "status": "present",
  "check_in_time": "08:15:00",
  "notes": ""
}

// Response
{
  "id": "uuid",
  "student_id": "uuid",
  "student_name": "Emma Wilson",
  "date": "2026-01-22",
  "status": "present",
  "check_in_time": "08:15:00",
  "check_out_time": null,
  "notes": "",
  "recorded_by": "uuid",
  "created_at": "2026-01-22T08:15:00Z"
}
```

**Get Daily Summary**
```json
// GET /api/attendance/summary?date=2026-01-22&school_id=uuid
// Response
{
  "date": "2026-01-22",
  "school_id": "uuid",
  "summary": {
    "total_enrolled": 247,
    "present": 238,
    "absent": 5,
    "late": 3,
    "excused": 1,
    "not_recorded": 0
  },
  "by_classroom": [
    {
      "classroom_id": "uuid",
      "classroom_name": "Toddler A",
      "present": 12,
      "absent": 1,
      "late": 0
    }
  ]
}
```

## UI Screens

### 1. Attendance Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  Attendance                                    January 22, 2026 │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Present   │ │   Absent    │ │    Late     │ │  Excused  │ │
│  │     238     │ │      5      │ │      3      │ │     1     │ │
│  │    96.4%    │ │    2.0%     │ │    1.2%     │ │   0.4%    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Not Yet Checked In (4)                         [Mark All ▼] ││
│  │ ○ Emma Wilson (Toddler A)         [Present] [Absent] [Late] ││
│  │ ○ Liam Johnson (Toddler A)        [Present] [Absent] [Late] ││
│  │ ○ Olivia Brown (Preschool)        [Present] [Absent] [Late] ││
│  │ ○ Noah Davis (Pre-K)              [Present] [Absent] [Late] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ By Classroom                                                ││
│  │ ┌──────────────────────────────────────────────────────────┐││
│  │ │ Toddler A       12/13 present  ████████████░ 92%        │││
│  │ │ Toddler B       14/14 present  █████████████ 100%       │││
│  │ │ Preschool A     18/19 present  ████████████░ 95%        │││
│  │ │ Preschool B     17/18 present  ████████████░ 94%        │││
│  │ └──────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2. Classroom Check-in View
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    Toddler A - Check In                 January 22, 2026│
│                                                                 │
│  [Mark All Present]                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 👦 Alexander Smith                                          ││
│  │    Check-in: 8:05 AM                           ● Present    ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 👧 Emma Wilson                                              ││
│  │    Not checked in                              ○ ─────      ││
│  │    [Present]  [Late]  [Absent]  [Excused]                   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 👦 Liam Johnson                                             ││
│  │    Check-in: 8:32 AM                           ● Late       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3. Student Attendance History
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    Emma Wilson - Attendance History                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ This Month                                                  ││
│  │ ● Present: 18 days (90%)                                    ││
│  │ ● Absent: 1 day                                             ││
│  │ ● Late: 1 day                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  January 2026                                      [◀] [▶]     │
│  ┌───┬───┬───┬───┬───┬───┬───┐                                 │
│  │ S │ M │ T │ W │ T │ F │ S │                                 │
│  ├───┼───┼───┼───┼───┼───┼───┤                                 │
│  │   │   │   │ 1 │ 2 │ 3 │ 4 │                                 │
│  │   │   │   │ ● │ ● │ ● │   │                                 │
│  ├───┼───┼───┼───┼───┼───┼───┤                                 │
│  │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │                                 │
│  │   │ ● │ ● │ ● │ ○ │ ● │   │  ○ = Absent                     │
│  └───┴───┴───┴───┴───┴───┴───┘  ● = Present                    │
│                                  ◐ = Late                       │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Create valid attendance | Valid student, date, status | Record created |
| Create duplicate attendance | Same student + date | Error: already exists |
| Create future attendance | Future date | Error: invalid date |
| Update check-out before check-in | check_out < check_in | Error: invalid time |
| Mark student from wrong school | Other school's student | Error: unauthorized |

### Integration Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Morning check-in flow | 1. Open classroom view 2. Mark all present 3. Mark one late | All records created, summary updates |
| Afternoon check-out | 1. Select checked-in student 2. Record check-out time | Check-out time saved |
| Generate daily report | 1. Select date 2. Generate report | PDF with accurate counts |

### E2E Tests

| Scenario | Steps | Verification |
|----------|-------|--------------|
| Complete day workflow | Login → Check-in all → Check-out all → View report | All attendance recorded, report accurate |
| Multi-school admin view | Login as super admin → Switch schools → Verify data isolation | Each school shows only its data |

### Performance Tests

| Metric | Target | Test Method |
|--------|--------|-------------|
| Check-in response time | < 200ms | Load test with 100 concurrent users |
| Dashboard load time | < 1s | Measure with 1000 students |
| Report generation | < 3s | Generate 30-day report for all students |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Check-in completion rate | > 98% by 9 AM | % students checked in by time |
| Data accuracy | > 99.5% | Audit checks vs manual counts |
| Time to check-in class | < 2 minutes | Time from start to completion |
| User satisfaction | > 4.5/5 | Teacher feedback surveys |

## Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Teacher   │────▶│   Check-in  │────▶│  Database   │
│   (Input)   │     │    Form     │     │  (Storage)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Validation │
                    │  - Student exists
                    │  - Date valid
                    │  - No duplicate
                    └─────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌───────────┐  ┌───────────┐  ┌───────────┐
     │ Dashboard │  │   Parent  │  │   Audit   │
     │  Update   │  │   Alert   │  │    Log    │
     └───────────┘  └───────────┘  └───────────┘
```

## Dependencies

- **Students Module**: Student records must exist before attendance can be recorded
- **Classrooms Module**: Classroom assignments for grouping
- **Users Module**: Track who recorded attendance
- **Notifications Module** (future): Alert parents of absences
