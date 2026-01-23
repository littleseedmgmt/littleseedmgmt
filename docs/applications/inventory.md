# Inventory Management Application

## Purpose

Track school supplies, equipment, and consumables. Manage ordering, receiving, and stock levels to ensure schools have necessary materials while controlling costs.

## Priority

**Phase 2** - Operational efficiency enhancement

## User Stories

### As a Teacher
- I want to request supplies so that my classroom has needed materials
- I want to see what's available so that I know what I can use
- I want to report low stock so that items are reordered timely

### As a School Admin
- I want to track inventory levels so that I can prevent stockouts
- I want to approve supply orders so that I can control spending
- I want to see spending by category so that I can budget effectively
- I want to receive low stock alerts so that I can reorder proactively

### As a Super Admin
- I want to see inventory across all schools so that I can identify bulk ordering opportunities
- I want to standardize inventory items so that reporting is consistent
- I want to set spending limits so that costs are controlled

## Features

### Core Features (MVP)
1. **Inventory Catalog**
   - Item database with categories
   - Current stock levels per school
   - Minimum threshold settings
   - Storage location tracking

2. **Stock Management**
   - Add/remove inventory
   - Transfer between locations
   - Stock count and adjustment

3. **Ordering Workflow**
   - Create purchase requests
   - Approval workflow
   - Order tracking
   - Receiving and verification

4. **Alerts and Reporting**
   - Low stock notifications
   - Consumption reports
   - Spending summaries

### Enhanced Features (Post-MVP)
- Vendor management
- Automatic reorder suggestions
- Barcode/QR scanning
- Integration with accounting software

## Input/Output Specification

### Inputs

| Input | Type | Source | Validation |
|-------|------|--------|------------|
| Item name | String | Text input | Required, unique per school |
| Category | Enum | Dropdown | Valid category |
| Quantity | Decimal | Number input | >= 0 |
| Unit | String | Text/Dropdown | Required (each, box, case) |
| Min threshold | Decimal | Number input | > 0 |
| Unit price | Decimal | Number input | >= 0 |
| Vendor | String | Text/Dropdown | Optional |
| Location | String | Text/Dropdown | Optional |

### Outputs

| Output | Type | Format | Destination |
|--------|------|--------|-------------|
| Inventory list | Array | JSON | Inventory view |
| Low stock alerts | Array | JSON | Dashboard/Notifications |
| Order record | Object | JSON | Database |
| Spending report | Report | Table/PDF | Admin dashboard |

### API Endpoints

```
# Inventory Items
POST   /api/inventory               Create item
GET    /api/inventory               List items (with filters)
GET    /api/inventory/:id           Get single item
PUT    /api/inventory/:id           Update item
DELETE /api/inventory/:id           Delete item

# Stock Operations
POST   /api/inventory/:id/adjust    Adjust stock level
POST   /api/inventory/:id/transfer  Transfer between locations

# Orders
POST   /api/orders                  Create order
GET    /api/orders                  List orders
GET    /api/orders/:id              Get single order
PUT    /api/orders/:id              Update order
PUT    /api/orders/:id/approve      Approve order
PUT    /api/orders/:id/receive      Mark as received

# Reports
GET    /api/inventory/low-stock     Get low stock items
GET    /api/inventory/report        Get inventory report
GET    /api/orders/spending         Get spending report
```

### Request/Response Examples

**Create Inventory Item**
```json
// POST /api/inventory
// Request
{
  "name": "Crayola Crayons 24-pack",
  "category": "educational",
  "quantity": 48,
  "unit": "box",
  "min_threshold": 12,
  "location": "Supply Closet A",
  "notes": "Preferred brand for all classrooms"
}

// Response
{
  "id": "uuid",
  "school_id": "uuid",
  "name": "Crayola Crayons 24-pack",
  "category": "educational",
  "quantity": 48,
  "unit": "box",
  "min_threshold": 12,
  "location": "Supply Closet A",
  "status": "in_stock",
  "created_at": "2026-01-22T10:00:00Z"
}
```

**Create Order**
```json
// POST /api/orders
// Request
{
  "items": [
    {
      "item_id": "uuid",
      "quantity": 24,
      "unit_price": 4.99
    },
    {
      "item_id": "uuid",
      "quantity": 10,
      "unit_price": 12.99
    }
  ],
  "vendor": "Amazon",
  "notes": "Need by end of month"
}

// Response
{
  "id": "uuid",
  "school_id": "uuid",
  "order_number": "ORD-2026-0042",
  "items": [
    {
      "item_name": "Crayola Crayons 24-pack",
      "quantity": 24,
      "unit_price": 4.99,
      "total": 119.76
    },
    {
      "item_name": "Construction Paper Ream",
      "quantity": 10,
      "unit_price": 12.99,
      "total": 129.90
    }
  ],
  "subtotal": 249.66,
  "status": "pending",
  "ordered_by": "uuid",
  "created_at": "2026-01-22T10:00:00Z"
}
```

**Get Low Stock Items**
```json
// GET /api/inventory/low-stock
// Response
{
  "items": [
    {
      "id": "uuid",
      "name": "Paper Towels",
      "category": "cleaning",
      "current_quantity": 5,
      "unit": "roll",
      "min_threshold": 10,
      "shortage": 5,
      "last_ordered": "2026-01-10",
      "location": "Janitor Closet"
    },
    {
      "id": "uuid",
      "name": "Hand Sanitizer",
      "category": "medical",
      "current_quantity": 2,
      "unit": "bottle",
      "min_threshold": 6,
      "shortage": 4,
      "last_ordered": "2026-01-05",
      "location": "Supply Closet B"
    }
  ],
  "total_items_low": 2
}
```

## UI Screens

### 1. Inventory Dashboard
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Inventory                                           [+ Add Item] [Order]   │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Total Items │ │  Low Stock  │ │Pending Orders│ │ This Month │           │
│  │     156     │ │      8      │ │      3       │ │   $1,247   │           │
│  │   in stock  │ │   items     │ │   orders     │ │   spent    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  ⚠️ 8 items below minimum stock                           [View All]        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Paper Towels         │ 5/10 rolls  │ ████░░░░░░ 50%  │ [Reorder]       ││
│  │ Hand Sanitizer       │ 2/6 bottles │ ███░░░░░░░ 33%  │ [Reorder]       ││
│  │ Glue Sticks          │ 8/20 each   │ ████░░░░░░ 40%  │ [Reorder]       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  [Search items...]                      Category: [All ▼]  Location: [All ▼]│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Item                 │ Category    │ Qty     │ Location   │ Actions    ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Crayola Crayons      │ Educational │ 48 box  │ Closet A   │ [⋮]        ││
│  │ Construction Paper   │ Educational │ 25 ream │ Closet A   │ [⋮]        ││
│  │ Tissue Boxes         │ Supplies    │ 36 box  │ Closet B   │ [⋮]        ││
│  │ Cleaning Wipes       │ Cleaning    │ 12 pack │ Janitor    │ [⋮]        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Create Order View
```
┌─────────────────────────────────────────────────────────────────┐
│  Create Order                                            [×]    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Vendor                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Amazon                                                    ▼ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Items                                        [+ Add Item]      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Crayola Crayons 24-pack                                     ││
│  │ Qty: [24]  ×  Unit Price: [$4.99]  =  $119.76      [🗑]     ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Construction Paper Ream                                     ││
│  │ Qty: [10]  ×  Unit Price: [$12.99] =  $129.90      [🗑]     ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Paper Towels (12-pack)                                      ││
│  │ Qty: [5]   ×  Unit Price: [$18.99] =  $94.95       [🗑]     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Notes                                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Priority order - need by end of January                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                          Subtotal:    $344.61   │
│                                                                 │
│                               [Cancel]  [Submit for Approval]   │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Order Approval Queue
```
┌─────────────────────────────────────────────────────────────────┐
│  Pending Orders                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ORD-2026-0042                               Submitted Today ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ Requested by: Sarah Johnson                                 ││
│  │ Vendor: Amazon                                              ││
│  │ Items: 3                        Total: $344.61              ││
│  │                                                             ││
│  │ • Crayola Crayons 24-pack (24) - $119.76                    ││
│  │ • Construction Paper Ream (10) - $129.90                    ││
│  │ • Paper Towels 12-pack (5) - $94.95                         ││
│  │                                                             ││
│  │ Note: Priority order - need by end of January               ││
│  │                                                             ││
│  │                        [Reject]  [Request Changes]  [Approve]││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ORD-2026-0041                            Submitted Yesterday││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ Requested by: Mike Chen                                     ││
│  │ Items: 2                        Total: $89.98               ││
│  │                        [Reject]  [Request Changes]  [Approve]││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Create valid item | Valid name, category, qty | Item created |
| Create duplicate item | Same name in school | Error: already exists |
| Adjust stock below zero | Negative adjustment > current | Error: insufficient stock |
| Create order with invalid item | Non-existent item ID | Error: item not found |
| Approve order | Valid order ID | Status updated, stock not yet changed |

### Integration Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Full order lifecycle | Create → Approve → Order → Receive | Stock levels updated |
| Low stock alert trigger | Reduce qty below threshold | Alert generated |
| Cross-school inventory view | View as super admin | All schools' items visible |

### E2E Tests

| Scenario | Steps | Verification |
|----------|-------|--------------|
| Teacher requests supplies | Login → Request → Submit | Request in approval queue |
| Admin processes order | Approve → Mark ordered → Receive | Stock updated, history logged |
| Monthly spending report | Generate report for January | Accurate totals by category |

### Performance Tests

| Metric | Target | Test Method |
|--------|--------|-------------|
| Inventory list load | < 500ms | Load 500 items with filters |
| Order creation | < 1s | Create order with 20 items |
| Report generation | < 3s | Generate quarterly spending report |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Stockout incidents | < 2 per month | Times item unavailable when needed |
| Order processing time | < 48 hours | Submit to approval time |
| Inventory accuracy | > 98% | Periodic physical counts |
| Cost savings | 10% reduction | Year-over-year comparison |

## Dependencies

- **Users Module**: Order creator and approver tracking
- **Schools Module**: Multi-school inventory separation
- **Financial Module** (future): Budget integration
- **Notifications Module** (future): Low stock alerts
