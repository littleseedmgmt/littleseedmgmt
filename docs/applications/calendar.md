# Calendar Management Application

## Purpose

Manage teacher schedules, classroom assignments, and school events. Provides a unified view of who is teaching where and when, enabling efficient resource allocation and schedule coordination.

## Priority

**Phase 1** - Core application for daily operations

## User Stories

### As a Teacher
- I want to see my weekly schedule so that I know which classrooms I'm assigned to
- I want to see classroom assignments so that I know my co-teachers
- I want to request schedule changes so that I can accommodate personal needs

### As a School Admin
- I want to assign teachers to classrooms so that all rooms are properly staffed
- I want to see gaps in coverage so that I can address staffing issues
- I want to manage school events and closures so that everyone is informed

### As a Super Admin
- I want to view schedules across all schools so that I can understand staffing patterns
- I want to manage organization-wide holidays so that all schools are synchronized

## Features

### Core Features (MVP)
1. **Weekly Schedule View**
   - Calendar grid showing teacher-classroom assignments
   - Daily view with time slots
   - Filter by teacher, classroom, or date range

2. **Classroom Assignments**
   - Assign primary and assistant teachers to classrooms
   - Set regular weekly schedules
   - Handle one-off assignments and substitutions

3. **School Events**
   - Create school-wide events (holidays, professional development)
   - Recurring events support
   - Event visibility controls

4. **Coverage Alerts**
   - Identify understaffed classrooms
   - Alert when teacher-to-student ratios exceeded
   - Highlight scheduling conflicts

### Enhanced Features (Post-MVP)
- Google Calendar sync
- Parent event portal
- Automatic scheduling suggestions
- Room booking for activities

## Input/Output Specification

### Inputs

| Input | Type | Source | Validation |
|-------|------|--------|------------|
| Teacher ID | UUID | Dropdown | Must be active teacher |
| Classroom ID | UUID | Dropdown | Must be active classroom |
| Date | Date | Date picker | Valid date |
| Start time | Time | Time picker | Valid time |
| End time | Time | Time picker | Must be after start |
| Event title | String | Text input | Required, max 100 chars |
| Event type | Enum | Dropdown | regular/holiday/event |
| Recurrence | Object | Form | Weekly pattern |

### Outputs

| Output | Type | Format | Destination |
|--------|------|--------|-------------|
| Schedule grid | Array | JSON | Calendar component |
| Conflicts | Array | JSON | Alert panel |
| Coverage report | Report | Table | Admin dashboard |
| Event list | Array | JSON | Event sidebar |

### API Endpoints

```
# Schedules
POST   /api/schedules              Create schedule entry
GET    /api/schedules              List schedules (with filters)
GET    /api/schedules/:id          Get single schedule
PUT    /api/schedules/:id          Update schedule
DELETE /api/schedules/:id          Delete schedule

# Events
POST   /api/events                 Create event
GET    /api/events                 List events
PUT    /api/events/:id             Update event
DELETE /api/events/:id             Delete event

# Coverage
GET    /api/coverage               Get coverage report
GET    /api/coverage/gaps          Get coverage gaps
```

### Request/Response Examples

**Create Schedule Entry**
```json
// POST /api/schedules
// Request
{
  "teacher_id": "uuid",
  "classroom_id": "uuid",
  "day_of_week": 1,  // Monday
  "start_time": "08:00:00",
  "end_time": "12:00:00",
  "role": "lead",
  "effective_date": "2026-01-01",
  "end_date": null  // Ongoing
}

// Response
{
  "id": "uuid",
  "teacher": {
    "id": "uuid",
    "name": "Sarah Johnson"
  },
  "classroom": {
    "id": "uuid",
    "name": "Toddler A"
  },
  "day_of_week": 1,
  "start_time": "08:00:00",
  "end_time": "12:00:00",
  "role": "lead",
  "created_at": "2026-01-22T10:00:00Z"
}
```

**Get Weekly Schedule**
```json
// GET /api/schedules?school_id=uuid&week=2026-01-20
// Response
{
  "week_start": "2026-01-20",
  "week_end": "2026-01-26",
  "schedules": [
    {
      "date": "2026-01-20",
      "day_name": "Monday",
      "assignments": [
        {
          "classroom": "Toddler A",
          "time_slots": [
            {
              "start": "08:00",
              "end": "12:00",
              "teachers": [
                {"name": "Sarah Johnson", "role": "lead"},
                {"name": "Mike Chen", "role": "assistant"}
              ]
            },
            {
              "start": "12:00",
              "end": "17:00",
              "teachers": [
                {"name": "Emily Davis", "role": "lead"}
              ]
            }
          ]
        }
      ]
    }
  ],
  "events": [
    {
      "date": "2026-01-20",
      "title": "Staff Meeting",
      "time": "07:30-08:00"
    }
  ]
}
```

## UI Screens

### 1. Weekly Calendar View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Calendar                              [◀ Week]  Jan 20-26, 2026  [Week ▶]  │
│                                                                             │
│  [Day] [Week] [Month]              [+ Add Event]   [Filter: All Teachers ▼] │
│                                                                             │
│  ┌────────────┬────────────┬────────────┬────────────┬────────────┐        │
│  │   Monday   │  Tuesday   │ Wednesday  │  Thursday  │   Friday   │        │
│  │   Jan 20   │   Jan 21   │   Jan 22   │   Jan 23   │   Jan 24   │        │
│  ├────────────┼────────────┼────────────┼────────────┼────────────┤        │
│  │ Toddler A  │ Toddler A  │ Toddler A  │ Toddler A  │ Toddler A  │        │
│  │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │        │
│  │ │8-12    │ │ │8-12    │ │ │8-12    │ │ │8-12    │ │ │8-12    │ │        │
│  │ │Sarah J │ │ │Sarah J │ │ │Sarah J │ │ │Sarah J │ │ │Sarah J │ │        │
│  │ │Mike C  │ │ │Mike C  │ │ │Mike C  │ │ │Mike C  │ │ │Mike C  │ │        │
│  │ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘ │        │
│  │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │        │
│  │ │12-5    │ │ │12-5    │ │ │12-5    │ │ │12-5    │ │ │12-5    │ │        │
│  │ │Emily D │ │ │Emily D │ │ │Emily D │ │ │Emily D │ │ │Emily D │ │        │
│  │ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘ │        │
│  ├────────────┼────────────┼────────────┼────────────┼────────────┤        │
│  │ Toddler B  │ Toddler B  │ Toddler B  │ Toddler B  │ Toddler B  │        │
│  │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │        │
│  │ │8-5     │ │ │8-5     │ │ │8-5     │ │ │8-5     │ │ │8-5     │ │        │
│  │ │Jane W  │ │ │Jane W  │ │ │ ⚠️ GAP  │ │ │Jane W  │ │ │Jane W  │ │        │
│  │ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘ │        │
│  └────────────┴────────────┴────────────┴────────────┴────────────┘        │
│                                                                             │
│  ⚠️ 1 Coverage Gap Detected                                    [Resolve]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Teacher Schedule View
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    Sarah Johnson's Schedule                             │
│                                                                 │
│  Regular Weekly Schedule                            [Edit]      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Monday-Friday │ 8:00 AM - 12:00 PM │ Toddler A (Lead)       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  This Week                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Mon 1/20 │ 8:00 AM - 12:00 PM │ Toddler A         │ Regular ││
│  │ Tue 1/21 │ 8:00 AM - 12:00 PM │ Toddler A         │ Regular ││
│  │ Wed 1/22 │ 8:00 AM - 12:00 PM │ Toddler A         │ Regular ││
│  │ Thu 1/23 │ 8:00 AM - 5:00 PM  │ Toddler A + B     │ Sub     ││
│  │ Fri 1/24 │ OFF - PTO Approved                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Upcoming Time Off                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Jan 24   │ Vacation (1 day)   │ Approved                    ││
│  │ Feb 14-15│ Personal (2 days)  │ Pending                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3. Classroom Schedule View
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    Toddler A - Weekly Schedule                          │
│                                                                 │
│  Capacity: 12 students  │  Current: 11 enrolled                 │
│  Required ratio: 1:4    │  Minimum staff: 3                     │
│                                                                 │
│  Monday - Friday                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ TIME        │ LEAD TEACHER    │ ASSISTANT      │ STATUS     ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 7:00-8:00   │ -               │ -              │ ⚠️ Unstaffed││
│  │ 8:00-12:00  │ Sarah Johnson   │ Mike Chen      │ ✓ Staffed  ││
│  │ 12:00-1:00  │ Emily Davis     │ -              │ ✓ Staffed  ││
│  │ 1:00-5:00   │ Emily Davis     │ Lisa Park      │ ✓ Staffed  ││
│  │ 5:00-6:00   │ -               │ Lisa Park      │ ⚠️ No Lead ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [+ Assign Teacher]                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Create valid schedule | Valid teacher, classroom, time | Schedule created |
| Create overlapping schedule | Same teacher, overlapping time | Error: conflict |
| Create schedule for inactive teacher | Inactive teacher ID | Error: invalid teacher |
| End time before start time | end_time < start_time | Error: invalid time range |

### Integration Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Weekly view population | 1. Create 5 schedules 2. Load week view | All schedules displayed correctly |
| Coverage gap detection | 1. Create partial coverage 2. Check gaps | Gap correctly identified |
| Schedule + PTO integration | 1. Create schedule 2. Approve PTO 3. Check week | PTO shown, replacement needed |

### E2E Tests

| Scenario | Steps | Verification |
|----------|-------|--------------|
| Admin creates weekly schedule | Login → Create schedules → Verify all classrooms covered | No coverage gaps |
| Teacher views their schedule | Login as teacher → View my schedule | Only their assignments shown |
| Handle substitution | Create PTO → Assign substitute → Verify calendar | Sub appears in schedule |

### Performance Tests

| Metric | Target | Test Method |
|--------|--------|-------------|
| Calendar render | < 500ms | Load month view with 200 events |
| Schedule search | < 200ms | Search across 50 teachers |
| Coverage calculation | < 1s | Calculate for all classrooms |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scheduling conflicts | 0 | Number of double-bookings |
| Coverage gaps | < 2 per week | Unresolved gaps at day start |
| Schedule accuracy | 100% | Actual vs scheduled |
| Admin time saved | 50% | Time spent on scheduling |

## Dependencies

- **Teachers Module**: Teacher records and availability
- **Classrooms Module**: Classroom capacity and requirements
- **Staff Planning Module**: PTO integration
- **Notifications Module** (future): Schedule change alerts
