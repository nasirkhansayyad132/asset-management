# Asset Management System - Complete Codebase Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend Deep Dive](#backend-deep-dive)
3. [Frontend Deep Dive](#frontend-deep-dive)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [Key Workflows](#key-workflows)
8. [File Structure](#file-structure)
9. [Development Guide](#development-guide)

---

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + React Router + TanStack Query
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15 + Prisma ORM
- **Authentication**: JWT tokens with Role-Based Access Control (RBAC)
- **Storage**: Local file system (configurable via `STORAGE_DIR`)
- **Containerization**: Docker + Docker Compose

### System Design
This is a **single-tenant** asset management system designed for ministry/government deployments with the following core features:
- Asset registry with QR code generation
- Assignment/transfer workflow with approval process
- Maintenance ticket tracking
- Inventory sessions with scan verification
- Audit logging with CSV export
- AI-assisted asset extraction and risk summaries

---

## Backend Deep Dive

### Project Structure
```
backend/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # Server entry point
│   ├── config.ts           # Environment configuration
│   ├── db.ts               # Prisma client instance
│   ├── types.ts            # TypeScript type definitions
│   ├── middleware/         # Auth and role middleware
│   │   ├── auth.ts
│   │   └── roles.ts
│   ├── routes/             # API route handlers
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── assets.ts
│   │   ├── requests.ts
│   │   ├── scan.ts
│   │   ├── maintenance.ts
│   │   ├── inventory.ts
│   │   ├── audit.ts
│   │   └── ai.ts
│   └── utils/              # Utility functions
│       ├── assetEvents.ts
│       ├── assetTag.ts
│       ├── audit.ts
│       ├── csv.ts
│       ├── inventory.ts
│       ├── qr.ts
│       └── storage.ts
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── scripts/
│   └── seed.ts             # Database seeding script
└── tests/                  # Test files
    ├── rbac.test.ts
    ├── inventory.test.ts
    ├── qr.test.ts
    └── roles.test.ts
```

### Key Files Explained

#### `src/app.ts`
- Main Express application setup
- CORS configuration for cross-origin requests
- JSON body parsing with 2MB limit
- Route registration (auth, users, assets, requests, etc.)
- Global error handler for file upload errors
- Health check endpoint at `/health`

#### `src/server.ts`
- Imports and starts the Express app
- Listens on port from config (default 4000)

#### `src/config.ts`
- Loads environment variables from `.env`
- Exports configuration object with:
  - `port`: Server port
  - `jwtSecret`: Secret for signing JWT tokens
  - `qrSecret`: Secret for signing QR codes
  - `ministryCode`: Ministry identifier (e.g., "MOHE")
  - `storageDir`: Directory for uploaded files
  - `aiApiKey`, `aiApiBaseUrl`, `aiModel`: AI service config

#### `src/db.ts`
- Creates and exports Prisma client instance
- Singleton pattern ensures one database connection

#### `src/types.ts`
- Defines `AuthUser` type with id, role, email
- Used for JWT payload and request.user

### Middleware

#### `middleware/auth.ts`
- `signToken(user)`: Creates JWT with 8-hour expiration
- `requireAuth`: Validates Bearer token, sets `req.user`
- Returns 401 for missing/invalid tokens

#### `middleware/roles.ts`
- `requireRoles([...roles])`: Checks if `req.user.role` matches allowed roles
- Returns 403 if user doesn't have required role
- Used to protect admin/approver/maintenance/etc. endpoints

### Routes

#### `routes/auth.ts`
- **POST /auth/login**: Validates email/password, returns JWT token
  - Compares hashed password with bcrypt
  - Logs audit event for login
  - Returns token + user object

#### `routes/users.ts`
- **GET /users**: List all users (admin only)
- **POST /users**: Create new user (admin only)
  - Hashes password with bcrypt
  - Validates role enum
  - Logs audit event

#### `routes/assets.ts`
- **GET /assets**: List assets with filters (status, location, category)
  - Pagination support
  - Includes latest events
- **GET /assets/:id**: Get single asset with full details
- **POST /assets**: Create new asset (admin/store_clerk)
  - Auto-generates asset tag (MINISTRY-XXXX-NNNNN)
  - Creates CREATED event
- **PATCH /assets/:id**: Update asset fields
- **POST /assets/:id/assign-request**: Request asset assignment
- **POST /assets/:id/transfer-request**: Request asset transfer
- **POST /assets/:id/handover/upload**: Upload handover document
  - Accepts PDF/JPG/PNG
  - Computes SHA-256 hash
  - Stores in STORAGE_DIR
- **GET /assets/:id/qr**: Generate QR code image
  - Includes assetId, timestamp, signature
  - Returns PNG image

#### `routes/requests.ts`
- **GET /requests**: List all requests with filters
- **GET /requests/:id**: Get request details
- **POST /requests/:id/approve**: Approve/reject request (approver)
  - Updates asset status and custodian on approval
  - Creates ASSIGNED/TRANSFERRED event
  - Logs audit event

#### `routes/scan.ts`
- **GET /scan/verify**: Verify QR code payload
  - Validates signature with QR_SECRET
  - Checks timestamp freshness (24 hours)
  - Returns asset details if valid

#### `routes/maintenance.ts`
- **GET /maintenance**: List maintenance tickets
- **POST /maintenance**: Create maintenance ticket (maintenance role)
  - Sets asset status to UNDER_MAINTENANCE
  - Creates MAINTENANCE_OPENED event
- **POST /maintenance/:id/close**: Close ticket
  - Restores asset status (to ASSIGNED or IN_STORE)
  - Creates MAINTENANCE_CLOSED event

#### `routes/inventory.ts`
- **POST /inventory/sessions**: Start inventory session (inventory role)
- **GET /inventory/sessions**: List sessions
- **GET /inventory/sessions/:id**: Get session details
- **POST /inventory/sessions/:id/scan**: Scan asset in session
  - Records scanned asset
  - Creates VERIFIED event
- **GET /inventory/sessions/:id/report**: Generate inventory report
  - Lists verified, missing, unexpected assets
  - Compares scanned assets vs. expected location

#### `routes/audit.ts`
- **GET /audit**: List audit logs with filters (action, entityType, date range)
- **GET /audit/export.csv**: Export audit logs as CSV
  - Includes actor email, action, entity, timestamp

#### `routes/ai.ts`
- **POST /ai/extract-asset**: Extract asset fields from text/image (mock)
  - Returns mock data if AI_API_KEY not configured
- **POST /ai/risk-summary**: Generate risk summary for assets (mock)
  - Returns mock summary if AI_API_KEY not configured

### Utilities

#### `utils/assetTag.ts`
- `generateAssetTag()`: Creates unique tag like "MOHE-2024-00001"
  - Format: MINISTRY_CODE-YEAR-SEQUENCE
  - Finds max sequence for current year and increments

#### `utils/assetEvents.ts`
- `createAssetEvent()`: Records asset lifecycle events
  - Types: CREATED, ASSIGNED, TRANSFERRED, MAINTENANCE_OPENED, etc.
  - Stores metadata as JSON

#### `utils/audit.ts`
- `logAudit()`: Records user actions in audit log
  - Captures actor, action, entity type/ID, metadata

#### `utils/qr.ts`
- `buildQrPayload()`: Creates signed QR code payload
  - Includes assetId, timestamp, HMAC signature
- `verifyQrSignature()`: Validates QR code signature

#### `utils/storage.ts`
- `ensureDir()`: Creates directory if not exists
- `sanitizeFileName()`: Removes dangerous characters
- `computeSha256()`: Hashes file content for integrity

#### `utils/csv.ts`
- `arrayToCsv()`: Converts array of objects to CSV string
  - Escapes quotes and special characters

#### `utils/inventory.ts`
- `buildInventoryReport()`: Generates inventory session report
  - Categorizes assets as verified/missing/unexpected

---

## Frontend Deep Dive

### Project Structure
```
frontend/
├── src/
│   ├── main.tsx            # App entry point
│   ├── App.tsx             # Route configuration
│   ├── styles.css          # Global styles
│   ├── components/         # Reusable components
│   │   ├── Layout.tsx
│   │   ├── RequireAuth.tsx
│   │   └── RequireRole.tsx
│   ├── pages/              # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Assets.tsx
│   │   ├── AssetDetail.tsx
│   │   ├── Approvals.tsx
│   │   ├── Inventory.tsx
│   │   ├── Maintenance.tsx
│   │   ├── Audit.tsx
│   │   ├── Users.tsx
│   │   └── NotFound.tsx
│   └── lib/                # Utilities
│       ├── api.ts
│       └── auth.tsx
├── index.html              # HTML template
└── vite.config.ts          # Vite configuration
```

### Key Files Explained

#### `src/main.tsx`
- React app entry point
- Sets up:
  - React Router (BrowserRouter)
  - TanStack Query (QueryClient)
  - Auth context provider
- Mounts to `#root` element

#### `src/App.tsx`
- Defines all application routes
- Protected routes with RequireAuth and RequireRole
- Routes:
  - `/login`: Public login page
  - `/`: Dashboard (authenticated)
  - `/assets`: Asset list
  - `/assets/:id`: Asset detail
  - `/approvals`: Approval queue (admin/approver)
  - `/inventory`: Inventory sessions (admin/inventory)
  - `/maintenance`: Maintenance tickets (admin/maintenance)
  - `/audit`: Audit logs (admin/auditor)
  - `/users`: User management (admin)

#### `src/components/Layout.tsx`
- Main application layout with navigation
- Shows current user and logout button
- Navigation links based on user role

#### `src/components/RequireAuth.tsx`
- Checks if user is authenticated
- Redirects to /login if not authenticated
- Uses auth context

#### `src/components/RequireRole.tsx`
- Checks if user has required role
- Shows "Access Denied" if role not matched
- Used for role-specific pages

#### `src/lib/api.ts`
- `apiFetch()`: Generic fetch wrapper
  - Adds Authorization header with JWT
  - Handles JSON and blob responses
  - Throws errors for non-2xx responses
- `getToken()`: Retrieves JWT from localStorage

#### `src/lib/auth.tsx`
- AuthContext and AuthProvider
- `login()`: Calls /auth/login, stores token
- `logout()`: Clears token and redirects
- `useAuth()`: Hook to access auth state

### Pages

#### `pages/Login.tsx`
- Email/password form
- Calls login API
- Redirects to dashboard on success

#### `pages/Dashboard.tsx`
- Shows welcome message
- Displays stats (total assets, pending requests, etc.)
- Role-specific quick actions

#### `pages/Assets.tsx`
- Asset list with search/filters
- Pagination
- Create new asset button (admin/clerk)
- Links to asset detail

#### `pages/AssetDetail.tsx`
- Full asset information
- Events timeline
- QR code download
- Request assignment/transfer
- Upload handover document
- Related requests and maintenance tickets

#### `pages/Approvals.tsx`
- List of pending requests
- Approve/reject buttons
- Shows requester, asset, custodian info

#### `pages/Inventory.tsx`
- Start new inventory session
- Scan assets by ID or QR
- End session and view report
- Report shows verified/missing/unexpected

#### `pages/Maintenance.tsx`
- List maintenance tickets
- Create new ticket
- Close ticket with notes
- Option to recommend disposal

#### `pages/Audit.tsx`
- Audit log viewer with filters
- Date range picker
- Export to CSV button

#### `pages/Users.tsx`
- User management (admin only)
- Create new user
- Shows user email, role, created date

---

## Database Schema

### Models

#### User
- **id**: CUID primary key
- **email**: Unique email address
- **passwordHash**: Bcrypt hashed password
- **role**: Enum (ADMIN, STORE_CLERK, APPROVER, MAINTENANCE, INVENTORY, AUDITOR)
- **createdAt**: Timestamp
- **Relations**: assetEvents, requests, approvals, handovers, maintenance tickets, inventory sessions

#### Asset
- **id**: CUID primary key
- **assetTag**: Unique tag (e.g., "MOHE-2024-00001")
- **category**: Asset category (e.g., "Computer", "Furniture")
- **make**: Manufacturer (optional)
- **model**: Model name (optional)
- **serialNumber**: Serial number (optional, indexed)
- **cost**: Decimal price (optional)
- **vendor**: Vendor name (optional)
- **purchaseDate**: Date of purchase (optional)
- **location**: Current location
- **status**: Enum (IN_STORE, ASSIGNED, UNDER_MAINTENANCE, DISPOSED)
- **condition**: Condition notes (optional)
- **custodian**: Current custodian name (optional)
- **createdAt**: Timestamp
- **Relations**: events, requests, handovers, maintenance tickets, inventory scans

#### AssetEvent
- **id**: CUID primary key
- **assetId**: Foreign key to Asset
- **type**: Enum (CREATED, UPDATED, ASSIGN_REQUESTED, TRANSFERRED, MAINTENANCE_OPENED, etc.)
- **actorUserId**: User who performed action
- **metaJson**: JSON metadata
- **createdAt**: Timestamp

#### Request
- **id**: CUID primary key
- **assetId**: Foreign key to Asset
- **type**: Enum (ASSIGN, TRANSFER, DISPOSE)
- **fromCustodian**: Previous custodian (optional)
- **toCustodian**: New custodian
- **status**: Enum (PENDING, APPROVED, REJECTED)
- **requestedBy**: User ID who requested
- **approvedBy**: User ID who approved (optional)
- **createdAt**: Timestamp

#### HandoverDocument
- **id**: CUID primary key
- **assetId**: Foreign key to Asset
- **requestId**: Foreign key to Request (optional)
- **filePath**: Path to uploaded file
- **sha256**: SHA-256 hash for integrity
- **uploadedBy**: User ID who uploaded
- **uploadedAt**: Timestamp

#### MaintenanceTicket
- **id**: CUID primary key
- **assetId**: Foreign key to Asset
- **status**: Enum (OPEN, CLOSED)
- **issue**: Description of issue
- **vendor**: Repair vendor (optional)
- **cost**: Repair cost (optional)
- **notes**: Additional notes (optional)
- **recommendDisposal**: Boolean flag
- **openedBy**: User ID who opened
- **closedBy**: User ID who closed (optional)
- **openedAt**: Timestamp
- **closedAt**: Timestamp (optional)

#### InventorySession
- **id**: CUID primary key
- **location**: Location being inventoried
- **startedBy**: User ID who started
- **startedAt**: Timestamp
- **endedAt**: Timestamp (optional)

#### InventoryScan
- **id**: CUID primary key
- **sessionId**: Foreign key to InventorySession
- **assetId**: Foreign key to Asset
- **scannedBy**: User ID who scanned
- **scannedAt**: Timestamp
- **Index**: Composite on (sessionId, assetId)

#### AuditLog
- **id**: CUID primary key
- **actorUserId**: User who performed action
- **action**: Action name (e.g., "LOGIN", "CREATE_ASSET")
- **entityType**: Entity type (e.g., "Asset", "User")
- **entityId**: Entity ID (optional)
- **metaJson**: JSON metadata
- **createdAt**: Timestamp

---

## API Endpoints

### Authentication
- **POST /auth/login**
  - Body: `{ email, password }`
  - Response: `{ token, user: { id, email, role } }`

### Users
- **GET /users** (Admin only)
  - Response: `[{ id, email, role, createdAt }]`
- **POST /users** (Admin only)
  - Body: `{ email, password, role }`
  - Response: `{ id, email, role, createdAt }`

### Assets
- **GET /assets**
  - Query: `status`, `location`, `category`, `page`, `perPage`
  - Response: `{ assets: [...], total, page, perPage }`
- **GET /assets/:id**
  - Response: Full asset with events and related data
- **POST /assets** (Admin/Store Clerk)
  - Body: `{ category, make, model, serialNumber, cost, vendor, purchaseDate, location, condition }`
  - Response: Created asset
- **PATCH /assets/:id** (Admin/Store Clerk)
  - Body: Partial asset fields
  - Response: Updated asset
- **POST /assets/:id/assign-request**
  - Body: `{ toCustodian }`
  - Response: Created request
- **POST /assets/:id/transfer-request**
  - Body: `{ fromCustodian, toCustodian }`
  - Response: Created request
- **POST /assets/:id/handover/upload**
  - Body: FormData with file
  - Response: `{ filePath, sha256 }`
- **GET /assets/:id/qr**
  - Response: PNG image

### Requests
- **GET /requests**
  - Query: `status`, `page`, `perPage`
  - Response: `{ requests: [...], total }`
- **GET /requests/:id**
  - Response: Request with asset and handovers
- **POST /requests/:id/approve** (Approver)
  - Body: `{ approved: boolean }`
  - Response: Updated request

### Scan
- **GET /scan/verify**
  - Query: `assetId`, `timestamp`, `sig`
  - Response: Asset details or error

### Maintenance
- **GET /maintenance**
  - Query: `status`, `assetId`
  - Response: `[{ ...ticket }]`
- **POST /maintenance** (Maintenance role)
  - Body: `{ assetId, issue, vendor, cost, notes }`
  - Response: Created ticket
- **POST /maintenance/:id/close** (Maintenance role)
  - Body: `{ notes, recommendDisposal }`
  - Response: Updated ticket

### Inventory
- **POST /inventory/sessions** (Inventory role)
  - Body: `{ location }`
  - Response: Created session
- **GET /inventory/sessions**
  - Response: `[{ ...session }]`
- **GET /inventory/sessions/:id**
  - Response: Session with scans
- **POST /inventory/sessions/:id/scan** (Inventory role)
  - Body: `{ assetId }`
  - Response: Created scan
- **GET /inventory/sessions/:id/report**
  - Response: `{ verified: [...], missing: [...], unexpected: [...] }`

### Audit
- **GET /audit**
  - Query: `action`, `entityType`, `startDate`, `endDate`, `page`, `perPage`
  - Response: `{ logs: [...], total }`
- **GET /audit/export.csv**
  - Query: Same as GET /audit
  - Response: CSV file

### AI
- **POST /ai/extract-asset**
  - Body: `{ text }` or `{ imageUrl }`
  - Response: `{ category, make, model, serialNumber, cost, vendor }`
- **POST /ai/risk-summary**
  - Body: `{ assetIds: [...] }`
  - Response: `{ summary: "..." }`

---

## Authentication & Authorization

### JWT Flow
1. User submits email/password to POST /auth/login
2. Backend validates credentials with bcrypt
3. Backend signs JWT with user info (id, email, role) and JWT_SECRET
4. Frontend stores token in localStorage (`mam_auth`)
5. Frontend includes token in Authorization header: `Bearer <token>`
6. Backend verifies token on each protected request
7. Token expires after 8 hours

### Role-Based Access Control (RBAC)

#### Roles
- **ADMIN**: Full system access
- **STORE_CLERK**: Manage assets in store
- **APPROVER**: Approve/reject requests
- **MAINTENANCE**: Manage maintenance tickets
- **INVENTORY**: Conduct inventory sessions
- **AUDITOR**: View audit logs

#### Permission Matrix
| Endpoint | Admin | Store Clerk | Approver | Maintenance | Inventory | Auditor |
|----------|-------|-------------|----------|-------------|-----------|---------|
| Create Asset | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| View Assets | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Request Assignment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve Request | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Create Maintenance | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Start Inventory | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Manage Users | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## Key Workflows

### Asset Assignment Workflow
1. User creates assignment request (POST /assets/:id/assign-request)
2. Request status = PENDING
3. ASSIGN_REQUESTED event created
4. Approver reviews request in Approvals page
5. Approver approves (POST /requests/:id/approve with approved=true)
6. Asset status → ASSIGNED
7. Asset custodian updated
8. ASSIGNED event created
9. User uploads handover document (POST /assets/:id/handover/upload)
10. HANDOVER_UPLOADED event created

### Maintenance Workflow
1. Maintenance user creates ticket (POST /maintenance)
2. Asset status → UNDER_MAINTENANCE
3. MAINTENANCE_OPENED event created
4. Maintenance performed
5. Maintenance user closes ticket (POST /maintenance/:id/close)
6. Asset status → previous status (ASSIGNED or IN_STORE)
7. MAINTENANCE_CLOSED event created
8. Optional: recommendDisposal flag set

### Inventory Workflow
1. Inventory user starts session (POST /inventory/sessions)
2. User scans assets (POST /inventory/sessions/:id/scan)
   - By manual ID entry
   - Or by scanning QR code (GET /scan/verify → asset ID → scan)
3. VERIFIED event created for each scan
4. User ends session (endedAt set)
5. Report generated (GET /inventory/sessions/:id/report)
   - Verified: Assets scanned in this location
   - Missing: Assets expected but not scanned
   - Unexpected: Assets scanned but from other locations

### QR Code Workflow
1. Asset created
2. User downloads QR code (GET /assets/:id/qr)
3. QR contains: `{ assetId, timestamp, sig }`
4. Physical QR label printed and affixed to asset
5. During inventory/verification, QR scanned
6. Scan decoded and verified (GET /scan/verify?assetId=...&timestamp=...&sig=...)
7. If valid and fresh (<24h), asset details returned

---

## File Structure

### Backend Files (25 TypeScript files)
- **Core**: app.ts, server.ts, config.ts, db.ts, types.ts
- **Middleware**: auth.ts, roles.ts
- **Routes**: auth.ts, users.ts, assets.ts, requests.ts, scan.ts, maintenance.ts, inventory.ts, audit.ts, ai.ts
- **Utils**: assetEvents.ts, assetTag.ts, audit.ts, csv.ts, inventory.ts, qr.ts, storage.ts
- **Tests**: rbac.test.ts, inventory.test.ts, qr.test.ts, roles.test.ts
- **Scripts**: seed.ts

### Frontend Files (17 TypeScript/TSX files)
- **Core**: main.tsx, App.tsx
- **Components**: Layout.tsx, RequireAuth.tsx, RequireRole.tsx
- **Pages**: Login.tsx, Dashboard.tsx, Assets.tsx, AssetDetail.tsx, Approvals.tsx, Inventory.tsx, Maintenance.tsx, Audit.tsx, Users.tsx, NotFound.tsx
- **Lib**: api.ts, auth.tsx

### Configuration Files
- **Backend**: package.json, tsconfig.json, .env.example, Dockerfile
- **Frontend**: package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, .env.example, Dockerfile, nginx.conf
- **Root**: docker-compose.yml, README.md, .gitignore
- **Database**: schema.prisma, migrations/

---

## Development Guide

### Local Setup
1. Clone repository
2. Copy environment files:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env`
3. Update secrets in backend/.env (JWT_SECRET, QR_SECRET)
4. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
5. Setup database:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev --name init
   npm run seed  # Creates demo users and data
   ```
6. Start services:
   - Terminal 1: `cd backend && npm run dev` (port 4000)
   - Terminal 2: `cd frontend && npm run dev` (port 5173)

### Docker Setup
```bash
docker compose up --build
```
Services:
- PostgreSQL: localhost:5432
- Backend: localhost:4000
- Frontend: localhost:5173

### Demo Credentials
All users share password: `Password123!`
- admin@ministry.local (ADMIN)
- clerk@ministry.local (STORE_CLERK)
- approver@ministry.local (APPROVER)
- inventory@ministry.local (INVENTORY)
- maintenance@ministry.local (MAINTENANCE)
- auditor@ministry.local (AUDITOR)

### Running Tests
```bash
cd backend
npm test  # Runs vitest
```

Tests cover:
- RBAC (role-based access control)
- Inventory report generation
- QR code signing/verification
- Role middleware

### Building for Production
```bash
# Backend
cd backend
npm run build  # Compiles TypeScript to dist/
npm start      # Runs dist/server.js

# Frontend
cd frontend
npm run build  # Creates dist/ with optimized bundle
```

### Environment Variables

#### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/asset_management
JWT_SECRET=your-secret-key
QR_SECRET=your-qr-secret
MINISTRY_CODE=MOHE
STORAGE_DIR=./storage
AI_API_KEY=optional
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

#### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:4000
```

---

## Code Statistics
- **Total Lines**: ~4,000
- **Backend Files**: 25 TypeScript files
- **Frontend Files**: 17 TypeScript/TSX files
- **Database Models**: 9 models
- **API Endpoints**: ~30 endpoints
- **User Roles**: 6 roles
- **Asset Statuses**: 4 statuses
- **Event Types**: 11 event types

---

## Key Dependencies

### Backend
- **@prisma/client**: Database ORM
- **express**: Web framework
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **qrcode**: QR code generation
- **multer**: File upload handling
- **cors**: CORS middleware

### Frontend
- **react**: UI library
- **react-router-dom**: Routing
- **@tanstack/react-query**: Data fetching/caching
- **vite**: Build tool

---

## Security Features
1. **Password Hashing**: Bcrypt with salt rounds
2. **JWT Authentication**: 8-hour expiration
3. **Role-Based Access**: Middleware checks on routes
4. **File Upload Validation**: Type and size checks
5. **SHA-256 Hashing**: Document integrity verification
6. **QR Signature**: HMAC-based signing
7. **Timestamp Validation**: QR codes expire after 24 hours
8. **CORS**: Configurable origin restrictions
9. **Audit Logging**: All critical actions logged

---

## Future Enhancements (Not Yet Implemented)
- Real AI integration (currently mock)
- Email notifications
- Multi-tenant support
- Advanced reporting and analytics
- Mobile app
- Barcode scanner integration
- Asset depreciation tracking
- Service level agreements (SLAs)
- Automated disposal workflow

---

## Troubleshooting

### Common Issues
1. **Database connection failed**: Check DATABASE_URL in backend/.env
2. **JWT token invalid**: Check JWT_SECRET matches between sessions
3. **File upload fails**: Ensure STORAGE_DIR exists and is writable
4. **QR verification fails**: Check QR_SECRET and timestamp freshness
5. **CORS errors**: Update CORS config in backend/src/app.ts
6. **Prisma errors**: Run `npx prisma generate` after schema changes

---

This comprehensive guide covers the complete codebase architecture, implementation details, and operational aspects of the Ministry Asset Management System.
