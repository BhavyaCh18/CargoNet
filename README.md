# CargoNet (India Shared Transport Network — Empty-Return Truck Matching Platform)

> **One-Line Pitch:** A platform matching businesses needing to ship cargo with trucks already on the road (especially trucks making empty return trips), reducing empty-truck mileage, lowering freight costs, and increasing transporter revenue.

---

## 1. Core Feature Highlights

- **Signature Return-Load Matching Engine:**
  - Priority matching for anticipated empty-return legs (`is_return_load = true`).
  - Discounted pricing estimation reflecting lower marginal return leg cost for transporters.
  - Inter-city corridor matching (Hyderabad, Bengaluru, Chennai, Mumbai, Pune, Delhi, Jaipur, etc.).
- **Transporter Empty-Leg KPI & Notifications:** Automatically sets trucks to `RETURN_AVAILABLE` upon cargo delivery and alerts truck owners of available return cargo.
- **Shipment Tracking Map:** Interactive OpenStreetMap / Leaflet.js visualization with dynamic route rendering between origin pickup, current location, and destination.
- **Strict Enterprise Theme:** Sleek dark navy (`#0B1220`) visual aesthetic with crisp typography and responsive dashboard views.

---

## 2. Tech Stack

- **Backend:** Node.js CommonJS serverless functions (`api/`) deployed natively on **Vercel**. Direct PostgreSQL connection pool via `pg` (`lib/db.js`), hand-rolled JWT authentication (`jsonwebtoken`), and BCrypt password verification (`bcryptjs`).
- **Frontend:** HTML5, Vanilla CSS, Vanilla JavaScript ES Modules (`<script type="module">`). Zero React, zero TypeScript, zero bundlers.
- **Database:** PostgreSQL (Supabase compatible). DDL schema in `database/schema.sql`.
- **Maps:** Leaflet.js / OpenStreetMap via CDN.

---

## 3. Project Directory Structure

```
CargoNet/
├── api/                                  # Vercel Node.js Serverless Functions (CommonJS)
│   ├── auth/                             # Login, register, session verification
│   ├── admin/                            # Platform statistics, user management, fleet & cargo monitoring
│   ├── bookings/                         # Booking creation, details, history, trip status advancing, return loads
│   ├── complaints/                       # Dispute logging and admin resolution
│   ├── matching/                         # Outbound and Return-Load matching engines
│   ├── notifications/                    # Transporter and business notifications
│   ├── payments/                         # Payment processing
│   ├── tracking/                         # Shipment tracking REST API
│   ├── cargo.js                          # Cargo postings API
│   ├── trucks.js                         # Fleet management API
│   └── health.js                         # Serverless health check
├── database/
│   ├── schema.sql                        # PostgreSQL DDL
│   └── seed.sql                          # Database seed data
├── frontend/
│   ├── index.html                        # Master Landing Page
│   ├── css/style.css                     # Design system styles
│   ├── js/                               # Frontend ES Modules (API client, Auth, Business, TruckOwner, Admin)
│   └── pages/                            # HTML pages (dashboards, tracking, forms)
├── lib/
│   └── db.js                             # PostgreSQL database pool (`pg`)
├── .env.example                          # Environment variable template
├── vercel.json                           # Vercel routing and rewrite configuration
│
└── [ARCHIVED / REFERENCE ONLY]
    ├── backend/                          # Legacy Java backend (Archived / Reference Only)
    └── scratch/                          # Ad-hoc development debug scripts (Archived / Internal)
```

---

## 4. How to Run Locally

### Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure `SUPABASE_DB_URL` and `JWT_SECRET` in `.env`.

### Local Server Execution
Use Node.js or `vercel dev` to run the serverless functions and frontend:
```bash
npx vercel dev
```

---

## 5. Deployment Guide

- **Vercel:** Connect GitHub repository to Vercel. Set `SUPABASE_DB_URL` and `JWT_SECRET` in Vercel Environment Variables. Deployment happens automatically on git push.
- **Database:** Execute `database/schema.sql` in Supabase SQL Editor.
