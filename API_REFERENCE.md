# API Reference and Workflow Diagrams

## Complete API Reference

### Base URL
- **Development**: `http://localhost:4000`
- **Production**: Configured via environment

### Authentication
All endpoints except `/auth/login` and `/health` require JWT authentication.

**Header Format:**
```
Authorization: Bearer <jwt_token>
```

---

## Authentication Endpoints

### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "admin@ministry.local",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxxxx",
    "email": "admin@ministry.local",
    "role": "ADMIN"
  }
}
```

**Errors:**
- `400`: Missing email or password
- `401`: Invalid credentials

**Audit Log:** Creates LOGIN event

---

## User Management Endpoints

### GET /users
List all users (Admin only).

**Response (200 OK):**
```json
[
  {
    "id": "clxxxxx",
    "email": "admin@ministry.local",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Errors:**
- `401`: Not authenticated
- `403`: Not admin

---

### POST /users
Create new user (Admin only).

**Request:**
```json
{
  "email": "newuser@ministry.local",
  "password": "SecurePass123!",
  "role": "STORE_CLERK"
}
```

**Response (201 Created):**
```json
{
  "id": "clyyyyy",
  "email": "newuser@ministry.local",
  "role": "STORE_CLERK",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `400`: Missing fields or invalid role
- `401`: Not authenticated
- `403`: Not admin
- `409`: Email already exists

**Audit Log:** Creates CREATE_USER event

---

## Asset Endpoints

### GET /assets
List assets with optional filters.

**Query Parameters:**
- `status`: Filter by status (IN_STORE, ASSIGNED, UNDER_MAINTENANCE, DISPOSED)
- `location`: Filter by location
- `category`: Filter by category
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 20, max: 100)

**Example:** `GET /assets?status=ASSIGNED&location=Building%20A&page=1&perPage=20`

**Response (200 OK):**
```json
{
  "assets": [
    {
      "id": "clxxxxx",
      "assetTag": "MOHE-2024-00001",
      "category": "Computer",
      "make": "Dell",
      "model": "Latitude 7420",
      "serialNumber": "ABC123",
      "cost": "1200.00",
      "vendor": "Tech Supply Co",
      "purchaseDate": "2024-01-15T00:00:00.000Z",
      "location": "Building A",
      "status": "ASSIGNED",
      "condition": "Good",
      "custodian": "John Doe",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "events": [
        {
          "id": "clevvvv",
          "type": "CREATED",
          "actorUserId": "clxxxxx",
          "createdAt": "2024-01-15T10:00:00.000Z"
        }
      ]
    }
  ],
  "total": 100,
  "page": 1,
  "perPage": 20
}
```

---

### GET /assets/:id
Get detailed asset information.

**Response (200 OK):**
```json
{
  "id": "clxxxxx",
  "assetTag": "MOHE-2024-00001",
  "category": "Computer",
  "make": "Dell",
  "model": "Latitude 7420",
  "serialNumber": "ABC123",
  "cost": "1200.00",
  "vendor": "Tech Supply Co",
  "purchaseDate": "2024-01-15T00:00:00.000Z",
  "location": "Building A",
  "status": "ASSIGNED",
  "condition": "Good",
  "custodian": "John Doe",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "events": [...],
  "requests": [...],
  "handovers": [...],
  "maintenanceTickets": [...]
}
```

**Errors:**
- `404`: Asset not found

---

### POST /assets
Create new asset (Admin or Store Clerk).

**Request:**
```json
{
  "category": "Computer",
  "make": "Dell",
  "model": "Latitude 7420",
  "serialNumber": "ABC123",
  "cost": 1200,
  "vendor": "Tech Supply Co",
  "purchaseDate": "2024-01-15",
  "location": "Building A",
  "condition": "New"
}
```

**Response (201 Created):**
```json
{
  "id": "clxxxxx",
  "assetTag": "MOHE-2024-00001",
  "category": "Computer",
  ...
}
```

**Errors:**
- `400`: Missing required fields (category, location)
- `403`: Insufficient permissions

**Audit Log:** Creates CREATE_ASSET event
**Asset Event:** Creates CREATED event

---

### PATCH /assets/:id
Update asset fields (Admin or Store Clerk).

**Request (partial):**
```json
{
  "location": "Building B",
  "condition": "Fair"
}
```

**Response (200 OK):**
```json
{
  "id": "clxxxxx",
  "assetTag": "MOHE-2024-00001",
  ...
  "location": "Building B",
  "condition": "Fair"
}
```

**Errors:**
- `404`: Asset not found
- `403`: Insufficient permissions

**Audit Log:** Creates UPDATE_ASSET event
**Asset Event:** Creates UPDATED event

---

### POST /assets/:id/assign-request
Request to assign asset to custodian.

**Request:**
```json
{
  "toCustodian": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "id": "clrrrrr",
  "assetId": "clxxxxx",
  "type": "ASSIGN",
  "fromCustodian": null,
  "toCustodian": "John Doe",
  "status": "PENDING",
  "requestedBy": "cluuuuu",
  "approvedBy": null,
  "createdAt": "2024-01-20T10:00:00.000Z"
}
```

**Errors:**
- `400`: Missing toCustodian
- `404`: Asset not found

**Audit Log:** Creates REQUEST_ASSIGN event
**Asset Event:** Creates ASSIGN_REQUESTED event

---

### POST /assets/:id/transfer-request
Request to transfer asset from one custodian to another.

**Request:**
```json
{
  "fromCustodian": "John Doe",
  "toCustodian": "Jane Smith"
}
```

**Response (201 Created):**
```json
{
  "id": "clrrrrr",
  "assetId": "clxxxxx",
  "type": "TRANSFER",
  "fromCustodian": "John Doe",
  "toCustodian": "Jane Smith",
  "status": "PENDING",
  ...
}
```

**Errors:**
- `400`: Missing fromCustodian or toCustodian
- `404`: Asset not found

**Audit Log:** Creates REQUEST_TRANSFER event
**Asset Event:** Creates TRANSFER_REQUESTED event

---

### POST /assets/:id/handover/upload
Upload handover document (PDF, JPG, PNG).

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (PDF/JPG/PNG, max 10MB)
- Optional field: `requestId` (links to specific request)

**Response (200 OK):**
```json
{
  "id": "clhhhhh",
  "assetId": "clxxxxx",
  "requestId": "clrrrrr",
  "filePath": "storage/handovers/asset-clxxxxx-1234567890.pdf",
  "sha256": "abc123def456...",
  "uploadedBy": "cluuuuu",
  "uploadedAt": "2024-01-20T11:00:00.000Z"
}
```

**Errors:**
- `400`: Unsupported file type
- `404`: Asset not found
- `413`: File too large

**Audit Log:** Creates UPLOAD_HANDOVER event
**Asset Event:** Creates HANDOVER_UPLOADED event

---

### GET /assets/:id/qr
Generate QR code image for asset.

**Response (200 OK):**
- Content-Type: `image/png`
- Binary PNG image data

**QR Code Contains:**
```
https://app.example.com/scan/verify?assetId=clxxxxx&timestamp=1234567890&sig=abc123def456
```

**Errors:**
- `404`: Asset not found

---

## Request Endpoints

### GET /requests
List all requests with optional filters.

**Query Parameters:**
- `status`: Filter by status (PENDING, APPROVED, REJECTED)
- `page`: Page number
- `perPage`: Results per page

**Response (200 OK):**
```json
{
  "requests": [
    {
      "id": "clrrrrr",
      "assetId": "clxxxxx",
      "type": "ASSIGN",
      "fromCustodian": null,
      "toCustodian": "John Doe",
      "status": "PENDING",
      "requestedBy": "cluuuuu",
      "approvedBy": null,
      "createdAt": "2024-01-20T10:00:00.000Z",
      "asset": {
        "assetTag": "MOHE-2024-00001",
        "category": "Computer"
      },
      "requester": {
        "email": "clerk@ministry.local"
      }
    }
  ],
  "total": 50
}
```

---

### GET /requests/:id
Get single request with full details.

**Response (200 OK):**
```json
{
  "id": "clrrrrr",
  "assetId": "clxxxxx",
  "type": "ASSIGN",
  "fromCustodian": null,
  "toCustodian": "John Doe",
  "status": "PENDING",
  "requestedBy": "cluuuuu",
  "approvedBy": null,
  "createdAt": "2024-01-20T10:00:00.000Z",
  "asset": {...},
  "requester": {...},
  "approver": null,
  "handovers": [...]
}
```

**Errors:**
- `404`: Request not found

---

### POST /requests/:id/approve
Approve or reject request (Approver or Admin).

**Request:**
```json
{
  "approved": true
}
```

**Response (200 OK):**
```json
{
  "id": "clrrrrr",
  "status": "APPROVED",
  "approvedBy": "clappppp",
  ...
}
```

**Side Effects (if approved):**
- Asset status updated to ASSIGNED
- Asset custodian updated to toCustodian
- Creates ASSIGNED or TRANSFERRED asset event

**Errors:**
- `404`: Request not found
- `400`: Request already processed
- `403`: Insufficient permissions

**Audit Log:** Creates APPROVE_REQUEST or REJECT_REQUEST event

---

## Scan Endpoints

### GET /scan/verify
Verify QR code signature and retrieve asset.

**Query Parameters:**
- `assetId`: Asset ID from QR code
- `timestamp`: Timestamp from QR code
- `sig`: HMAC signature from QR code

**Example:** `GET /scan/verify?assetId=clxxxxx&timestamp=1234567890&sig=abc123def456`

**Response (200 OK):**
```json
{
  "valid": true,
  "asset": {
    "id": "clxxxxx",
    "assetTag": "MOHE-2024-00001",
    "category": "Computer",
    ...
  }
}
```

**Errors:**
- `400`: Invalid signature or expired QR code
- `404`: Asset not found

---

## Maintenance Endpoints

### GET /maintenance
List maintenance tickets.

**Query Parameters:**
- `status`: Filter by status (OPEN, CLOSED)
- `assetId`: Filter by asset ID

**Response (200 OK):**
```json
[
  {
    "id": "clmmmmmm",
    "assetId": "clxxxxx",
    "status": "OPEN",
    "issue": "Screen flickering",
    "vendor": "Repair Shop",
    "cost": "150.00",
    "notes": "Need to replace screen",
    "recommendDisposal": false,
    "openedBy": "clmainnn",
    "closedBy": null,
    "openedAt": "2024-01-25T09:00:00.000Z",
    "closedAt": null,
    "asset": {...},
    "opener": {...}
  }
]
```

---

### POST /maintenance
Create maintenance ticket (Maintenance or Admin).

**Request:**
```json
{
  "assetId": "clxxxxx",
  "issue": "Screen flickering",
  "vendor": "Repair Shop",
  "cost": 150,
  "notes": "Need to replace screen"
}
```

**Response (201 Created):**
```json
{
  "id": "clmmmmmm",
  "assetId": "clxxxxx",
  "status": "OPEN",
  ...
}
```

**Side Effects:**
- Asset status set to UNDER_MAINTENANCE
- Creates MAINTENANCE_OPENED asset event

**Errors:**
- `400`: Missing assetId or issue
- `404`: Asset not found
- `403`: Insufficient permissions

**Audit Log:** Creates CREATE_MAINTENANCE event

---

### POST /maintenance/:id/close
Close maintenance ticket (Maintenance or Admin).

**Request:**
```json
{
  "notes": "Screen replaced successfully",
  "recommendDisposal": false
}
```

**Response (200 OK):**
```json
{
  "id": "clmmmmmm",
  "status": "CLOSED",
  "closedBy": "clmainnn",
  "closedAt": "2024-01-26T15:00:00.000Z",
  ...
}
```

**Side Effects:**
- Asset status restored (ASSIGNED if has custodian, IN_STORE otherwise)
- Creates MAINTENANCE_CLOSED asset event

**Errors:**
- `404`: Ticket not found
- `400`: Ticket already closed
- `403`: Insufficient permissions

**Audit Log:** Creates CLOSE_MAINTENANCE event

---

## Inventory Endpoints

### POST /inventory/sessions
Start new inventory session (Inventory or Admin).

**Request:**
```json
{
  "location": "Building A"
}
```

**Response (201 Created):**
```json
{
  "id": "cliiiiiii",
  "location": "Building A",
  "startedBy": "clinvvvv",
  "startedAt": "2024-02-01T08:00:00.000Z",
  "endedAt": null
}
```

**Errors:**
- `400`: Missing location
- `403`: Insufficient permissions

**Audit Log:** Creates START_INVENTORY event

---

### GET /inventory/sessions
List all inventory sessions.

**Response (200 OK):**
```json
[
  {
    "id": "cliiiiiii",
    "location": "Building A",
    "startedBy": "clinvvvv",
    "startedAt": "2024-02-01T08:00:00.000Z",
    "endedAt": "2024-02-01T12:00:00.000Z",
    "starter": {
      "email": "inventory@ministry.local"
    }
  }
]
```

---

### GET /inventory/sessions/:id
Get session details with all scans.

**Response (200 OK):**
```json
{
  "id": "cliiiiiii",
  "location": "Building A",
  "startedBy": "clinvvvv",
  "startedAt": "2024-02-01T08:00:00.000Z",
  "endedAt": null,
  "scans": [
    {
      "id": "clsssss",
      "sessionId": "cliiiiiii",
      "assetId": "clxxxxx",
      "scannedBy": "clinvvvv",
      "scannedAt": "2024-02-01T09:00:00.000Z",
      "asset": {
        "assetTag": "MOHE-2024-00001",
        ...
      }
    }
  ]
}
```

**Errors:**
- `404`: Session not found

---

### POST /inventory/sessions/:id/scan
Scan asset in inventory session (Inventory or Admin).

**Request:**
```json
{
  "assetId": "clxxxxx"
}
```

**Response (201 Created):**
```json
{
  "id": "clsssss",
  "sessionId": "cliiiiiii",
  "assetId": "clxxxxx",
  "scannedBy": "clinvvvv",
  "scannedAt": "2024-02-01T09:00:00.000Z"
}
```

**Side Effects:**
- Creates VERIFIED asset event

**Errors:**
- `404`: Session or asset not found
- `400`: Asset already scanned in this session
- `403`: Insufficient permissions

**Audit Log:** Creates SCAN_ASSET event

---

### GET /inventory/sessions/:id/report
Generate inventory report for session.

**Response (200 OK):**
```json
{
  "sessionId": "cliiiiiii",
  "location": "Building A",
  "startedAt": "2024-02-01T08:00:00.000Z",
  "endedAt": "2024-02-01T12:00:00.000Z",
  "verified": [
    {
      "id": "clxxxxx",
      "assetTag": "MOHE-2024-00001",
      "category": "Computer",
      "location": "Building A"
    }
  ],
  "missing": [
    {
      "id": "clyyyyyy",
      "assetTag": "MOHE-2024-00002",
      "category": "Printer",
      "location": "Building A"
    }
  ],
  "unexpected": [
    {
      "id": "clzzzzzz",
      "assetTag": "MOHE-2024-00003",
      "category": "Monitor",
      "location": "Building B"
    }
  ]
}
```

**Report Categories:**
- **Verified**: Assets in this location that were scanned
- **Missing**: Assets in this location that were NOT scanned
- **Unexpected**: Assets scanned but not in this location

**Errors:**
- `404`: Session not found

---

## Audit Endpoints

### GET /audit
List audit log entries with filters.

**Query Parameters:**
- `action`: Filter by action (e.g., LOGIN, CREATE_ASSET)
- `entityType`: Filter by entity type (e.g., Asset, User)
- `startDate`: Filter by start date (ISO 8601)
- `endDate`: Filter by end date (ISO 8601)
- `page`: Page number
- `perPage`: Results per page

**Response (200 OK):**
```json
{
  "logs": [
    {
      "id": "claaaa",
      "actorUserId": "cluuuuu",
      "action": "CREATE_ASSET",
      "entityType": "Asset",
      "entityId": "clxxxxx",
      "metaJson": {
        "assetTag": "MOHE-2024-00001",
        "category": "Computer"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "actor": {
        "email": "clerk@ministry.local"
      }
    }
  ],
  "total": 1000
}
```

---

### GET /audit/export.csv
Export audit logs as CSV file.

**Query Parameters:**
- Same as GET /audit

**Response (200 OK):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="audit-export-<timestamp>.csv"`

**CSV Format:**
```csv
ID,Actor Email,Action,Entity Type,Entity ID,Timestamp,Metadata
claaaa,clerk@ministry.local,CREATE_ASSET,Asset,clxxxxx,2024-01-15T10:00:00.000Z,"{""assetTag"":""MOHE-2024-00001""}"
```

---

## AI Endpoints

### POST /ai/extract-asset
Extract asset information from text or image (Mock).

**Request:**
```json
{
  "text": "Dell Latitude 7420, Serial: ABC123, Cost: $1200"
}
```

**OR:**
```json
{
  "imageUrl": "https://example.com/invoice.jpg"
}
```

**Response (200 OK):**
```json
{
  "category": "Computer",
  "make": "Dell",
  "model": "Latitude 7420",
  "serialNumber": "ABC123",
  "cost": 1200,
  "vendor": "Tech Supply Co"
}
```

**Note:** Returns mock data if AI_API_KEY not configured.

---

### POST /ai/risk-summary
Generate risk summary for assets (Mock).

**Request:**
```json
{
  "assetIds": ["clxxxxx", "clyyyyyy"]
}
```

**Response (200 OK):**
```json
{
  "summary": "2 assets analyzed. 1 high-value asset requires enhanced security. 1 asset overdue for maintenance."
}
```

**Note:** Returns mock summary if AI_API_KEY not configured.

---

## Workflow Diagrams

### Asset Assignment Workflow

```
┌─────────────┐
│ User        │
│ (Any Role)  │
└──────┬──────┘
       │
       │ 1. POST /assets/:id/assign-request
       │    { toCustodian: "John Doe" }
       ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Create Request (status=PENDING)    │
│ - Create ASSIGN_REQUESTED event      │
│ - Log audit event                    │
└──────────────────────────────────────┘
       │
       │ 2. Notification (manual check)
       ▼
┌─────────────┐
│ Approver    │
│ (APPROVER)  │
└──────┬──────┘
       │
       │ 3. POST /requests/:id/approve
       │    { approved: true }
       ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Update Request (status=APPROVED)   │
│ - Update Asset (status=ASSIGNED)     │
│ - Update Asset (custodian="John Doe")│
│ - Create ASSIGNED event              │
│ - Log audit event                    │
└──────────────────────────────────────┘
       │
       │ 4. Optional: Upload handover document
       ▼
┌─────────────┐
│ User        │
└──────┬──────┘
       │
       │ 5. POST /assets/:id/handover/upload
       │    FormData with PDF/JPG/PNG file
       ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Save file to STORAGE_DIR           │
│ - Compute SHA-256 hash               │
│ - Create HandoverDocument record     │
│ - Create HANDOVER_UPLOADED event     │
│ - Log audit event                    │
└──────────────────────────────────────┘
```

---

### Inventory Session Workflow

```
┌─────────────────┐
│ Inventory User  │
│ (INVENTORY)     │
└────────┬────────┘
         │
         │ 1. POST /inventory/sessions
         │    { location: "Building A" }
         ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Create InventorySession            │
│ - Log audit event                    │
└──────────────────────────────────────┘
         │
         │ Session ID returned
         ▼
┌─────────────────┐
│ Inventory User  │
└────────┬────────┘
         │
         │ 2a. Manual Entry: POST /inventory/sessions/:id/scan
         │     { assetId: "clxxxxx" }
         │
         │ OR
         │
         │ 2b. QR Scan: 
         │     Scan QR → GET /scan/verify → Get assetId
         │     → POST /inventory/sessions/:id/scan
         ▼
┌──────────────────────────────────────┐
│ Backend (for each scan)              │
│ - Create InventoryScan record        │
│ - Create VERIFIED event              │
│ - Log audit event                    │
└──────────────────────────────────────┘
         │
         │ 3. Repeat step 2 for all assets
         │
         │ 4. End session (set endedAt)
         ▼
┌─────────────────┐
│ Inventory User  │
└────────┬────────┘
         │
         │ 5. GET /inventory/sessions/:id/report
         ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Find all assets in location        │
│ - Compare with scanned assets        │
│ - Generate report:                   │
│   • Verified (scanned, in location)  │
│   • Missing (not scanned, in location)│
│   • Unexpected (scanned, wrong loc)  │
└──────────────────────────────────────┘
         │
         │ Report JSON returned
         ▼
┌─────────────────┐
│ Inventory User  │
│ (Reviews report)│
└─────────────────┘
```

---

### Maintenance Workflow

```
┌──────────────────┐
│ Maintenance User │
│ (MAINTENANCE)    │
└────────┬─────────┘
         │
         │ 1. POST /maintenance
         │    { assetId, issue, vendor, cost, notes }
         ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Create MaintenanceTicket (OPEN)   │
│ - Update Asset (status=UNDER_MAINT)  │
│ - Create MAINTENANCE_OPENED event    │
│ - Log audit event                    │
└──────────────────────────────────────┘
         │
         │ 2. Perform maintenance (external)
         ▼
┌──────────────────┐
│ Maintenance User │
└────────┬─────────┘
         │
         │ 3. POST /maintenance/:id/close
         │    { notes, recommendDisposal }
         ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Update Ticket (status=CLOSED)      │
│ - Restore Asset status:              │
│   • ASSIGNED (if has custodian)      │
│   • IN_STORE (if no custodian)       │
│ - Create MAINTENANCE_CLOSED event    │
│ - Log audit event                    │
└──────────────────────────────────────┘
```

---

### QR Code Verification Flow

```
┌──────────┐
│ Asset    │
│ Created  │
└────┬─────┘
     │
     │ 1. GET /assets/:id/qr
     ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Generate QR payload:               │
│   { assetId, timestamp, sig }        │
│ - Create QR code image (PNG)         │
└──────────────────────────────────────┘
     │
     │ 2. Download and print QR code
     │ 3. Affix to physical asset
     ▼
┌──────────┐
│ Physical │
│ Asset    │
│ with QR  │
└────┬─────┘
     │
     │ (Later) User scans QR with camera
     ▼
┌──────────────────────────────────────┐
│ Mobile Device / QR Scanner            │
│ - Decodes QR to URL:                 │
│   /scan/verify?assetId=...&          │
│   timestamp=...&sig=...              │
└──────────────────────────────────────┘
     │
     │ GET /scan/verify?assetId=...&timestamp=...&sig=...
     ▼
┌──────────────────────────────────────┐
│ Backend                               │
│ - Verify HMAC signature              │
│ - Check timestamp (<24 hours)        │
│ - If valid, return asset details     │
│ - If invalid, return error           │
└──────────────────────────────────────┘
     │
     │ Asset details returned
     ▼
┌──────────┐
│ User     │
│ Confirms │
│ Asset    │
└──────────┘
```

---

This comprehensive API reference and workflow documentation provides complete details for all backend endpoints, request/response formats, error codes, side effects, and visual workflow diagrams for key system processes.
