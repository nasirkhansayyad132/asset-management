# Repository Quick Reference Guide

## 📋 Table of Contents
- [Quick Overview](#quick-overview)
- [Architecture Summary](#architecture-summary)
- [Directory Structure](#directory-structure)
- [How to Read the Code](#how-to-read-the-code)
- [Key Concepts](#key-concepts)
- [Common Questions & Answers](#common-questions--answers)
- [Documentation Index](#documentation-index)

---

## Quick Overview

**Project Name:** Ministry Asset Management System  
**Type:** Full-stack web application  
**Purpose:** Single-tenant asset tracking for government/ministry deployments  
**Lines of Code:** ~4,000  
**Tech Stack:** React + TypeScript + Node.js + PostgreSQL  

### Core Features
1. **Asset Registry** - Track computers, furniture, equipment
2. **QR Code Tagging** - Generate and scan asset QR codes
3. **Assignment Workflow** - Request → Approval → Handover
4. **Maintenance Tracking** - Open tickets, track repairs
5. **Inventory Sessions** - Verify assets by location
6. **Audit Logging** - Track all system actions
7. **AI Integration** - Asset extraction and risk summaries (mock)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (User)                        │
│  React SPA (http://localhost:5173)                      │
│  - UI Components                                         │
│  - TanStack Query (data fetching)                       │
│  - JWT Token in localStorage                            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON
                         │ Authorization: Bearer <token>
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 EXPRESS BACKEND                          │
│  Node.js + TypeScript (http://localhost:4000)           │
│  - JWT Authentication                                    │
│  - Role-Based Access Control                            │
│  - REST API Endpoints                                   │
│  - File Upload (multer)                                 │
│  - QR Code Generation                                   │
└────────────────────────┬────────────────────────────────┘
                         │ Prisma ORM
                         ▼
┌─────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                         │
│  - Users (with roles)                                   │
│  - Assets (with tags)                                   │
│  - Requests (assignments/transfers)                     │
│  - Maintenance Tickets                                  │
│  - Inventory Sessions                                   │
│  - Audit Logs                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
asset-management/
│
├── backend/                    # Node.js + Express backend
│   ├── src/
│   │   ├── app.ts             # Express app configuration
│   │   ├── server.ts          # Server entry point
│   │   ├── config.ts          # Environment configuration
│   │   ├── db.ts              # Prisma client
│   │   ├── types.ts           # TypeScript types
│   │   ├── middleware/        # Auth and roles
│   │   ├── routes/            # API endpoints (9 files)
│   │   └── utils/             # Helpers (7 files)
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── scripts/
│   │   └── seed.ts            # Demo data seeder
│   ├── tests/                 # Unit tests (4 files)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx           # App entry point
│   │   ├── App.tsx            # Routes configuration
│   │   ├── components/        # Reusable UI (3 files)
│   │   ├── pages/             # Page components (10 files)
│   │   └── lib/               # API client + auth (2 files)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml          # Docker orchestration
├── README.md                   # Setup instructions
│
└── Documentation (NEW):
    ├── CODEBASE_GUIDE.md      # Complete architecture guide
    ├── CODE_EXPLANATIONS.md   # Line-by-line code explanations
    └── API_REFERENCE.md       # API docs + workflow diagrams
```

---

## How to Read the Code

### Starting Points

#### 1. **Backend Entry Point**
- Start: `backend/src/server.ts`
- Follow: `app.ts` → see all routes
- Then: `routes/` → see API implementations

#### 2. **Frontend Entry Point**
- Start: `frontend/src/main.tsx`
- Follow: `App.tsx` → see all pages
- Then: `pages/` → see UI implementations

#### 3. **Database Schema**
- Read: `backend/prisma/schema.prisma`
- Understand: All data models and relationships

### Code Flow Example: User Login

```
1. User enters email/password in:
   frontend/src/pages/Login.tsx
   
2. Frontend sends POST to /auth/login via:
   frontend/src/lib/api.ts (apiFetch function)
   
3. Backend receives request in:
   backend/src/routes/auth.ts (POST /login)
   
4. Backend validates with bcrypt and creates JWT in:
   backend/src/middleware/auth.ts (signToken)
   
5. Backend logs action in:
   backend/src/utils/audit.ts (logAudit)
   
6. Frontend stores token and user in:
   frontend/src/lib/auth.tsx (login function)
   
7. Frontend redirects to dashboard:
   frontend/src/pages/Dashboard.tsx
```

### Code Flow Example: Create Asset

```
1. User fills form in:
   frontend/src/pages/Assets.tsx
   
2. Frontend POSTs to /assets via:
   frontend/src/lib/api.ts
   
3. Backend checks permissions in:
   backend/src/middleware/auth.ts (requireAuth)
   backend/src/middleware/roles.ts (requireRoles)
   
4. Backend generates asset tag in:
   backend/src/utils/assetTag.ts (generateAssetTag)
   
5. Backend saves to database in:
   backend/src/routes/assets.ts (POST /)
   
6. Backend creates event in:
   backend/src/utils/assetEvents.ts (createAssetEvent)
   
7. Backend logs audit in:
   backend/src/utils/audit.ts (logAudit)
   
8. Frontend updates UI via:
   TanStack Query auto-refetch
```

---

## Key Concepts

### 1. **JWT Authentication**
- User logs in → receives JWT token
- Token contains: user ID, email, role
- Token stored in browser localStorage
- Token sent in Authorization header
- Token expires after 8 hours

### 2. **Role-Based Access Control (RBAC)**
Six roles:
- **ADMIN**: Full access to everything
- **STORE_CLERK**: Manage assets in store
- **APPROVER**: Approve/reject requests
- **MAINTENANCE**: Manage maintenance tickets
- **INVENTORY**: Conduct inventory sessions
- **AUDITOR**: View audit logs

Implemented via `requireRoles()` middleware.

### 3. **Asset Lifecycle**
```
IN_STORE → (Assignment Request) → (Approval) → ASSIGNED
    ↓                                              ↓
DISPOSED ← (Disposal) ← UNDER_MAINTENANCE ← (Maintenance)
```

### 4. **Asset Tag Format**
```
MINISTRY-YEAR-SEQUENCE
Example: MOHE-2024-00001

MOHE = Ministry code (from env)
2024 = Current year
00001 = Auto-incrementing sequence (5 digits)
```

### 5. **QR Code Security**
```
Payload: { assetId, timestamp, sig }

sig = HMAC-SHA256(assetId:timestamp, QR_SECRET)

Validation:
1. Recompute signature
2. Compare with provided sig
3. Check timestamp < 24 hours old
```

### 6. **Prisma ORM**
- Schema defined in `schema.prisma`
- Models auto-generated as TypeScript types
- Used via `prisma.modelName.operation()`
- Example: `prisma.asset.create({ data: {...} })`

### 7. **TanStack Query (React Query)**
- Manages server state in frontend
- Auto-caching and refetching
- Used via `useQuery()` and `useMutation()` hooks
- Simplifies loading states and error handling

---

## Common Questions & Answers

### Q: How do I add a new API endpoint?
A: 
1. Add route handler in `backend/src/routes/<module>.ts`
2. Add route to `backend/src/app.ts` if new module
3. Add permission checks with `requireRoles()` if needed
4. Update `API_REFERENCE.md` documentation

### Q: How do I add a new page to the frontend?
A:
1. Create component in `frontend/src/pages/<PageName>.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `frontend/src/components/Layout.tsx`
4. Optionally protect with `RequireRole` wrapper

### Q: How do I add a new database field?
A:
1. Update `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Run `npx prisma generate` to update types
4. Update TypeScript code to use new field

### Q: How do I add a new user role?
A:
1. Add role to `enum Role` in `schema.prisma`
2. Run migration: `npx prisma migrate dev`
3. Update permission checks in route handlers
4. Update frontend role checks in `RequireRole` components

### Q: Where are uploaded files stored?
A: In the directory specified by `STORAGE_DIR` environment variable (default: `./storage`)
- Handover documents: `storage/handovers/`
- Files named: `asset-<assetId>-<timestamp>.<ext>`

### Q: How do I run tests?
A:
```bash
cd backend
npm test              # Run all tests
npm test -- qr       # Run specific test file
```

### Q: How do I reset the database?
A:
```bash
cd backend
npx prisma migrate reset   # Drops DB, re-runs migrations
npm run seed               # Creates demo data
```

### Q: What are the demo credentials?
A: All use password `Password123!`
- admin@ministry.local (ADMIN)
- clerk@ministry.local (STORE_CLERK)
- approver@ministry.local (APPROVER)
- inventory@ministry.local (INVENTORY)
- maintenance@ministry.local (MAINTENANCE)
- auditor@ministry.local (AUDITOR)

### Q: How does the approval workflow work?
A:
1. User creates assignment/transfer request
2. Request status = PENDING
3. Approver reviews in Approvals page
4. Approver clicks Approve or Reject
5. If approved: Asset status/custodian updated
6. User can upload handover document

### Q: What is the inventory session flow?
A:
1. Inventory user starts session for a location
2. User scans assets (manually enter ID or scan QR)
3. System records each scan
4. User ends session
5. System generates report:
   - Verified: Assets scanned in this location
   - Missing: Assets not scanned but should be here
   - Unexpected: Assets scanned but from other locations

### Q: How is security implemented?
A:
- **Passwords**: Hashed with bcrypt (10 salt rounds)
- **Auth**: JWT tokens (8-hour expiration)
- **Authorization**: Role-based middleware checks
- **File Uploads**: Type and size validation
- **File Integrity**: SHA-256 hashing
- **QR Codes**: HMAC-SHA256 signatures
- **Audit**: All critical actions logged

---

## Documentation Index

### 📘 Main Documentation Files

1. **README.md** (Root)
   - Quick setup instructions
   - Environment variables
   - Docker compose usage
   - Demo script

2. **CODEBASE_GUIDE.md** ⭐ (NEW)
   - Complete architecture overview
   - Backend deep dive (all 25 files explained)
   - Frontend deep dive (all 17 files explained)
   - Database schema details
   - API endpoint overview
   - Authentication & authorization
   - Key workflows
   - Development guide

3. **CODE_EXPLANATIONS.md** ⭐ (NEW)
   - Line-by-line code explanations
   - Backend files (app.ts, server.ts, config.ts, etc.)
   - Middleware (auth, roles)
   - Routes (auth, assets)
   - Utils (assetTag, qr, storage)
   - Frontend files (api.ts, auth.tsx)
   - Every line explained with purpose

4. **API_REFERENCE.md** ⭐ (NEW)
   - Complete API endpoint documentation
   - Request/response examples
   - Error codes
   - Query parameters
   - Side effects and audit logs
   - Workflow diagrams (ASCII art)
   - Authentication details

### 📂 Code Documentation (Inline)
- `backend/src/app.ts`: Express setup comments
- `backend/src/middleware/auth.ts`: JWT comments
- `backend/prisma/schema.prisma`: Model relationships
- `frontend/src/lib/api.ts`: Fetch wrapper comments

### 🧪 Test Documentation
- `backend/tests/rbac.test.ts`: RBAC testing
- `backend/tests/qr.test.ts`: QR signing/verification
- `backend/tests/inventory.test.ts`: Inventory report logic
- `backend/tests/roles.test.ts`: Role middleware

### 🎯 Quick Reference
For specific questions:
- **"How does X work?"** → See CODEBASE_GUIDE.md
- **"What does this line do?"** → See CODE_EXPLANATIONS.md
- **"What's the API format?"** → See API_REFERENCE.md
- **"How do I set up?"** → See README.md
- **"How do I test?"** → See backend/tests/

---

## Learning Path

### Beginner (Understanding the System)
1. Read README.md for overview
2. Read CODEBASE_GUIDE.md - Architecture Overview section
3. Look at `backend/prisma/schema.prisma` for data model
4. Explore `frontend/src/App.tsx` for page routing
5. Read API_REFERENCE.md - Workflow Diagrams section

### Intermediate (Understanding Implementation)
1. Read CODEBASE_GUIDE.md - Backend Deep Dive
2. Read CODE_EXPLANATIONS.md - All files
3. Read API_REFERENCE.md - Complete API Reference
4. Read backend route files in `backend/src/routes/`
5. Read frontend page files in `frontend/src/pages/`

### Advanced (Contributing)
1. Read all documentation files
2. Run and understand tests in `backend/tests/`
3. Trace code flows for key workflows
4. Review middleware and utilities
5. Understand database migrations
6. Review security implementations

---

## File Statistics

```
Backend:
- TypeScript files: 25
- Routes: 9 modules (auth, users, assets, requests, scan, maintenance, inventory, audit, ai)
- Middleware: 2 files (auth, roles)
- Utils: 7 files (assetTag, assetEvents, audit, csv, inventory, qr, storage)
- Tests: 4 files (9 test cases total, all passing)

Frontend:
- TypeScript/TSX files: 17
- Pages: 10 components
- Components: 3 reusable
- Library: 2 utilities (api, auth)

Database:
- Models: 9 (User, Asset, AssetEvent, Request, HandoverDocument, MaintenanceTicket, InventorySession, InventoryScan, AuditLog)
- Enums: 6 (Role, AssetStatus, AssetEventType, RequestType, RequestStatus, MaintenanceStatus)

Total Lines of Code: ~4,000
Documentation Lines (NEW): ~2,800
```

---

## Build & Test Status

✅ **Backend Build**: Successful  
✅ **Backend Tests**: 9/9 passing  
✅ **Frontend Build**: Successful  
✅ **Frontend Tests**: No test framework configured  
✅ **Documentation**: Complete  

---

## Next Steps for Developers

1. **Clone and Setup**
   ```bash
   git clone <repo>
   cd asset-management
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit .env files with secrets
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Run Migrations and Seed**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev --name init
   npm run seed
   ```

3. **Start Development**
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2
   cd frontend && npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:4000
   - Login: admin@ministry.local / Password123!

5. **Read Documentation**
   - Start with CODEBASE_GUIDE.md
   - Refer to CODE_EXPLANATIONS.md for details
   - Use API_REFERENCE.md for API integration

---

## Support & Resources

- **Repository**: https://github.com/nasirkhansayyad132/asset-management
- **Documentation**: See files listed in Documentation Index
- **Questions**: Refer to "Common Questions & Answers" section
- **Code Examples**: See CODE_EXPLANATIONS.md for detailed examples

---

**Last Updated**: 2024-12-27  
**Documentation Version**: 1.0  
**Codebase Version**: As of commit 1cdfab9
