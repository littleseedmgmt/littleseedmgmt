# Financial Management Application

## Purpose

Track income and expenses, generate profit & loss statements, and prepare financial data for tax filing. Provides financial visibility across all schools for business decision-making.

## Priority

**Phase 3** - Business intelligence and compliance

## User Stories

### As a School Admin
- I want to record daily expenses so that spending is tracked
- I want to see my school's P&L so that I understand financial health
- I want to categorize transactions so that reporting is accurate
- I want to submit expense receipts so that records are complete

### As a Super Admin (Owner)
- I want to see consolidated P&L across all schools so that I understand overall business performance
- I want to compare schools' financial performance so that I can identify issues
- I want to generate tax-ready reports so that filing is simplified
- I want to set budgets and track variances so that spending is controlled
- I want to see cash flow projections so that I can plan ahead

## Features

### Core Features (MVP)
1. **Transaction Recording**
   - Record income (tuition, fees, grants)
   - Record expenses (payroll, supplies, rent)
   - Category and subcategory classification
   - Receipt attachment

2. **Profit & Loss Statements**
   - Monthly/quarterly/annual P&L
   - By school and consolidated
   - Category breakdown
   - Year-over-year comparison

3. **Expense Categories**
   - Standard chart of accounts
   - Custom subcategories
   - Tax category mapping

4. **Basic Reporting**
   - Income summary
   - Expense summary
   - Category breakdown
   - Export to CSV/PDF

### Enhanced Features (Post-MVP)
- QuickBooks/Xero integration
- Payroll integration
- Automated tuition billing
- Budget planning and variance tracking
- Tax form generation (1099s)
- Bank feed integration

## Input/Output Specification

### Inputs

| Input | Type | Source | Validation |
|-------|------|--------|------------|
| Transaction type | Enum | Dropdown | income/expense |
| Amount | Decimal | Number input | > 0 |
| Date | Date | Date picker | Required |
| Category | Enum | Dropdown | Valid category |
| Description | String | Text input | Required, max 255 |
| Vendor/Payer | String | Text input | Optional |
| Receipt | File | File upload | Optional, images/PDF |
| Payment method | Enum | Dropdown | cash/check/card/transfer |

### Outputs

| Output | Type | Format | Destination |
|--------|------|--------|-------------|
| Transaction record | Object | JSON | Database |
| P&L Statement | Report | Table/PDF | Dashboard/Export |
| Category summary | Report | Chart | Dashboard |
| Tax report | Report | PDF | Export |

### API Endpoints

```
# Transactions
POST   /api/transactions           Create transaction
GET    /api/transactions           List transactions (with filters)
GET    /api/transactions/:id       Get single transaction
PUT    /api/transactions/:id       Update transaction
DELETE /api/transactions/:id       Delete transaction

# Categories
GET    /api/categories             List categories
POST   /api/categories             Create custom category
PUT    /api/categories/:id         Update category

# Reports
GET    /api/reports/pnl            Get P&L statement
GET    /api/reports/income         Get income summary
GET    /api/reports/expenses       Get expense summary
GET    /api/reports/tax            Get tax report
GET    /api/reports/cash-flow      Get cash flow projection
```

### Request/Response Examples

**Create Transaction**
```json
// POST /api/transactions
// Request
{
  "type": "expense",
  "amount": 245.67,
  "date": "2026-01-22",
  "category": "supplies",
  "subcategory": "classroom_supplies",
  "description": "Art supplies for Preschool A",
  "vendor": "Michaels",
  "payment_method": "card",
  "receipt_url": null
}

// Response
{
  "id": "uuid",
  "school_id": "uuid",
  "type": "expense",
  "amount": 245.67,
  "date": "2026-01-22",
  "category": "supplies",
  "subcategory": "classroom_supplies",
  "description": "Art supplies for Preschool A",
  "vendor": "Michaels",
  "payment_method": "card",
  "receipt_url": null,
  "created_by": "uuid",
  "created_at": "2026-01-22T10:00:00Z"
}
```

**Get P&L Statement**
```json
// GET /api/reports/pnl?start_date=2026-01-01&end_date=2026-01-31&school_id=all
// Response
{
  "period": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  },
  "schools": "all",
  "income": {
    "total": 125000.00,
    "categories": [
      {"name": "Tuition", "amount": 115000.00},
      {"name": "Registration Fees", "amount": 5000.00},
      {"name": "Late Fees", "amount": 500.00},
      {"name": "Other Income", "amount": 4500.00}
    ]
  },
  "expenses": {
    "total": 89500.00,
    "categories": [
      {"name": "Payroll", "amount": 65000.00},
      {"name": "Rent", "amount": 12000.00},
      {"name": "Utilities", "amount": 2500.00},
      {"name": "Supplies", "amount": 3500.00},
      {"name": "Insurance", "amount": 2000.00},
      {"name": "Food", "amount": 2500.00},
      {"name": "Other", "amount": 2000.00}
    ]
  },
  "net_income": 35500.00,
  "margin_percentage": 28.4,
  "by_school": [
    {
      "school_id": "uuid",
      "school_name": "LittleSeed North",
      "income": 50000.00,
      "expenses": 35000.00,
      "net_income": 15000.00
    },
    {
      "school_id": "uuid",
      "school_name": "LittleSeed South",
      "income": 45000.00,
      "expenses": 32000.00,
      "net_income": 13000.00
    },
    {
      "school_id": "uuid",
      "school_name": "LittleSeed East",
      "income": 30000.00,
      "expenses": 22500.00,
      "net_income": 7500.00
    }
  ]
}
```

## Chart of Accounts

### Income Categories
```
INCOME
├── Tuition
│   ├── Full-time Tuition
│   ├── Part-time Tuition
│   └── Drop-in Care
├── Fees
│   ├── Registration Fees
│   ├── Late Pick-up Fees
│   ├── Late Payment Fees
│   └── Activity Fees
├── Grants
│   ├── Government Subsidies
│   └── Private Grants
└── Other Income
    ├── Fundraising
    └── Miscellaneous
```

### Expense Categories
```
EXPENSES
├── Payroll
│   ├── Teacher Salaries
│   ├── Admin Salaries
│   ├── Payroll Taxes
│   └── Benefits
├── Facilities
│   ├── Rent/Mortgage
│   ├── Utilities
│   ├── Maintenance
│   └── Insurance
├── Operations
│   ├── Supplies
│   ├── Food
│   ├── Equipment
│   └── Technology
├── Professional
│   ├── Training
│   ├── Licensing
│   └── Legal/Accounting
└── Other
    ├── Marketing
    ├── Bank Fees
    └── Miscellaneous
```

## UI Screens

### 1. Financial Dashboard
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Financial Overview                               January 2026  [All Schools▼]│
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Income    │ │  Expenses   │ │ Net Income  │ │   Margin    │           │
│  │  $125,000   │ │  $89,500    │ │  $35,500    │ │   28.4%     │           │
│  │  ▲ 5% YoY   │ │  ▼ 3% YoY   │ │  ▲ 12% YoY  │ │  ▲ 2.1%     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Monthly Trend                                                          │ │
│  │                                                                        │ │
│  │  $150k ┤                                          ╭────╮               │ │
│  │        │                              ╭────╮  ╭───╯    │               │ │
│  │  $100k ┤──────────────────────────────╯    ╰──╯        │               │ │
│  │        │  ╭────╮  ╭────╮  ╭────╮                       ╰───            │ │
│  │   $50k ┤──╯    ╰──╯    ╰──╯    ╰─────────────────────────              │ │
│  │        │                                                               │ │
│  │     $0 ┼────────────────────────────────────────────────────           │ │
│  │          Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec    │ │
│  │                                                                        │ │
│  │  ── Income  ── Expenses  ── Net Income                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────┬──────────────────────────────────────┐ │
│  │ Expense Breakdown               │ School Comparison                    │ │
│  │                                 │                                      │ │
│  │  Payroll      ████████████ 73%  │ North   $50k ████████████ $35k      │ │
│  │  Rent         ███░░░░░░░░ 13%   │ South   $45k ██████████░ $32k       │ │
│  │  Supplies     █░░░░░░░░░░  4%   │ East    $30k ██████░░░░░ $22.5k     │ │
│  │  Other        █░░░░░░░░░░ 10%   │                                      │ │
│  │                                 │ ■ Income  ■ Expenses                 │ │
│  └─────────────────────────────────┴──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. P&L Statement View
```
┌─────────────────────────────────────────────────────────────────┐
│  Profit & Loss Statement                           [Export PDF] │
│                                                                 │
│  Period: January 1 - January 31, 2026    School: All Schools   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ INCOME                                                      ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │   Tuition                                       $115,000.00 ││
│  │   Registration Fees                               $5,000.00 ││
│  │   Late Fees                                         $500.00 ││
│  │   Other Income                                    $4,500.00 ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ TOTAL INCOME                                    $125,000.00 ││
│  │                                                             ││
│  │ EXPENSES                                                    ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │   Payroll                                        $65,000.00 ││
│  │     Teacher Salaries              $52,000.00                ││
│  │     Admin Salaries                $10,000.00                ││
│  │     Payroll Taxes                  $3,000.00                ││
│  │   Rent                                           $12,000.00 ││
│  │   Utilities                                       $2,500.00 ││
│  │   Supplies                                        $3,500.00 ││
│  │   Insurance                                       $2,000.00 ││
│  │   Food                                            $2,500.00 ││
│  │   Other                                           $2,000.00 ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ TOTAL EXPENSES                                   $89,500.00 ││
│  │                                                             ││
│  │ ═══════════════════════════════════════════════════════════ ││
│  │ NET INCOME                                       $35,500.00 ││
│  │ ═══════════════════════════════════════════════════════════ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3. Transaction Entry
```
┌─────────────────────────────────────────────────────────────────┐
│  Record Transaction                                      [×]    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Type                                                           │
│  ┌──────────────────────┐ ┌──────────────────────┐             │
│  │     ● Income         │ │     ○ Expense        │             │
│  └──────────────────────┘ └──────────────────────┘             │
│                                                                 │
│  Amount                          Date                           │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │ $                  │         │ Jan 22, 2026   📅  │         │
│  └────────────────────┘         └────────────────────┘         │
│                                                                 │
│  Category                        Subcategory                    │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │ Supplies        ▼  │         │ Classroom Supplies▼│         │
│  └────────────────────┘         └────────────────────┘         │
│                                                                 │
│  Description                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Art supplies for Preschool A                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Vendor/Payer                    Payment Method                 │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │ Michaels           │         │ Credit Card     ▼  │         │
│  └────────────────────┘         └────────────────────┘         │
│                                                                 │
│  Receipt                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📎 Drop file here or click to upload                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                      [Cancel]  [Save Transaction]│
└─────────────────────────────────────────────────────────────────┘
```

### 4. Transaction List
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Transactions                                    [+ Add Transaction]        │
│                                                                             │
│  [Search...]   Type: [All ▼]  Category: [All ▼]  Date: [Jan 2026 ▼]        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Date       │ Description              │ Category │ Amount    │ Type    ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Jan 22     │ Art supplies Preschool A │ Supplies │   -$245.67│ Expense ││
│  │ Jan 22     │ January tuition - Smith  │ Tuition  │ +$1,200.00│ Income  ││
│  │ Jan 21     │ Office supplies          │ Supplies │   -$89.99 │ Expense ││
│  │ Jan 21     │ January tuition - Jones  │ Tuition  │ +$1,200.00│ Income  ││
│  │ Jan 20     │ PG&E Electric            │ Utilities│  -$456.78 │ Expense ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Showing 1-25 of 156                                    [< 1 2 3 ... 7 >]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Create valid transaction | All required fields | Transaction created |
| Create transaction negative amount | Negative amount | Error: invalid amount |
| P&L calculation | Date range, transactions | Accurate totals |
| Category validation | Invalid category | Error: invalid category |

### Integration Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Full P&L generation | Create transactions → Generate P&L | Accurate statement |
| Multi-school consolidation | Transactions across schools → Consolidated report | All schools included |
| Receipt upload | Upload receipt → Attach to transaction | Receipt stored and linked |

### E2E Tests

| Scenario | Steps | Verification |
|----------|-------|--------------|
| Monthly close | Record transactions → Generate reports → Export | Complete financial package |
| Tax report | Generate annual report → Verify categories | Tax-ready export |
| Budget tracking | Set budget → Record transactions → View variance | Accurate variance calculation |

### Performance Tests

| Metric | Target | Test Method |
|--------|--------|-------------|
| Transaction list load | < 500ms | Load 1000 transactions |
| P&L generation | < 2s | Generate annual P&L |
| Report export | < 5s | Export full year PDF |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Transaction entry time | < 1 minute | Average time to record |
| Data accuracy | 100% | Reconciliation with bank |
| Report generation | < 5 minutes | Time from request to delivery |
| Tax prep time reduction | 50% | Compared to manual process |

## Compliance Considerations

1. **Record Retention**: Maintain 7 years of financial records
2. **Audit Trail**: All changes logged with user and timestamp
3. **Access Control**: Restrict financial data to authorized users
4. **Data Security**: Encrypt sensitive financial information
5. **Receipt Storage**: Secure storage for uploaded receipts

## Dependencies

- **Users Module**: Transaction creator tracking
- **Schools Module**: Multi-school financial separation
- **Inventory Module**: Purchase order integration
- **Staff Planning Module** (future): Payroll integration
