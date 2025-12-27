# Ministry Asset Management

Production-style MVP for single-tenant ministry deployments. Includes assets registry, QR tagging, assignment/transfer workflow, maintenance, inventory sessions, audit logs, and AI-assisted extraction/summaries.

## Stack

- Frontend: React + Vite + TypeScript + React Router + TanStack Query
- Backend: Node.js + TypeScript + Express
- DB: PostgreSQL + Prisma ORM
- Auth: JWT + RBAC
- Storage: local disk in `STORAGE_DIR` (default `./storage`)

## Features

- JWT login with role-based access control
- Assets registry with filters and QR tag generation
- Assignment/transfer requests with approver workflow
- Signed handover upload (PDF/JPG/PNG) + SHA-256 hash
- Maintenance ticket lifecycle with asset status updates
- Inventory sessions with verified/missing/unexpected report
- Audit log with filters + CSV export
- AI endpoints for asset extraction and risk summary (mock fallback)

## Setup (local dev)

1. Backend env:
   - Copy `backend/.env.example` to `backend/.env` and update secrets.
2. Frontend env:
   - Copy `frontend/.env.example` to `frontend/.env`.
3. Install dependencies:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
4. Migrate database:
   - `cd ../backend && npx prisma generate`
   - `npx prisma migrate dev --name init`
5. Seed demo data:
   - `npm run seed`
6. Start services:
   - `npm run dev` in `backend/`
   - `npm run dev` in `frontend/`

Frontend runs at `http://localhost:5173`, backend at `http://localhost:4000`.

## Setup (Docker)

```
docker compose up --build
```

Postgres: `localhost:5432`, backend: `http://localhost:4000`, frontend: `http://localhost:5173`.

## Default Roles + Demo Credentials

All demo users share password: `Password123!`

- ADMIN: `admin@ministry.local`
- STORE_CLERK: `clerk@ministry.local`
- APPROVER: `approver@ministry.local`
- INVENTORY: `inventory@ministry.local`
- MAINTENANCE: `maintenance@ministry.local`
- AUDITOR: `auditor@ministry.local`

## API Overview (selected)

- POST `/auth/login`
- GET `/assets` + filters
- GET `/assets/:id`
- POST `/assets/:id/assign-request`
- POST `/assets/:id/transfer-request`
- POST `/requests/:requestId/approve`
- POST `/assets/:id/handover/upload`
- GET `/assets/:id/qr`
- GET `/scan/verify?assetId=...&timestamp=...&sig=...`
- POST `/inventory/sessions`
- POST `/inventory/sessions/:id/scan`
- GET `/inventory/sessions/:id/report`
- GET `/audit` and `/audit/export.csv`
- POST `/ai/extract-asset`
- POST `/ai/risk-summary`

## Demo Script

1. Login as `admin@ministry.local`.
2. Create a new asset from the Assets page.
3. Open the asset detail page and download the QR code.
4. Submit an assignment request to a custodian.
5. Login as `approver@ministry.local` and approve the request.
6. Return to the asset detail and upload a signed handover scan.
7. Login as `inventory@ministry.local`, start an inventory session, scan the asset ID or QR payload, and generate the report.
8. Login as `maintenance@ministry.local` and open/close a maintenance ticket for the asset.
9. Visit Audit Logs as `auditor@ministry.local` and export CSV.
10. Call AI endpoints to extract asset fields or generate a risk summary (mock output if `AI_API_KEY` is empty).

## Tests

Backend tests:

```
cd backend
npm test
```

## Environment Variables

Backend (`backend/.env`):

- `DATABASE_URL`
- `JWT_SECRET`
- `QR_SECRET`
- `MINISTRY_CODE`
- `STORAGE_DIR`
- `AI_API_KEY` (optional)
- `AI_API_BASE_URL` (optional)
- `AI_MODEL` (optional)

Frontend (`frontend/.env`):

- `VITE_API_BASE_URL`
