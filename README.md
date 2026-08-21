# India Shared Transport Network (Empty-Return Truck Matching Platform)

> **One-Line Pitch:** A platform matching businesses needing to ship cargo with trucks already on the road (especially trucks making empty return trips), reducing empty-truck mileage, lowering freight costs, and increasing transporter revenue.

---

## 1. Core Feature Highlights

- **Signature Return-Load Matching Engine (`MatchingEngine.java`):**
  - Priority scoring boost (**+30 points**) for anticipated empty-return legs (`is_empty_return = true`).
  - Discounted pricing estimation reflecting lower marginal return leg cost for transporters.
  - Inter-city corridor matching (Hyderabad, Bengaluru, Chennai, Mumbai, Pune).
- **Transporter Empty-Leg KPI:** Tracks empty-leg utilization rate and wasted mileage converted into active revenue.
- **Real-Time GPS Tracking Map:** Native WebSocket stream (`/ws/tracking/{bookingId}`) with Leaflet.js / OpenStreetMap visual tracking.
- **Proof of Delivery & OTP Verification:** 6-digit OTP verification protocol upon delivery.
- **Strict Black & White Enterprise Theme:** Sleek dark navy (`#0B1220`) visual aesthetic with crisp typography and warm accent callouts.

---

## 2. Tech Stack

- **Backend:** Plain Java 17+ with **Javalin 6.x** (Zero Spring Boot). Hand-rolled JWT auth (`java-jwt`), BCrypt, direct JDBC / HikariCP connection pool, and `dotenv-java` configuration loader.
- **Frontend:** Plain HTML, CSS, Vanilla JavaScript ES Modules (`<script type="module">`). Zero React, zero TypeScript, zero bundlers/Vite. `frontend/index.html` lives at root of `/frontend`.
- **Database:** PostgreSQL (Supabase compatible). DDL and Seed scripts in `database/schema.sql` and `database/seed.sql`.
- **Maps:** Leaflet.js / OpenStreetMap via CDN.

---

## 3. Project Directory Structure

```
CargoNet/
├── backend/
│   ├── pom.xml
│   ├── .env.example
│   ├── .env
│   ├── src/
│   │   ├── main/java/com/cargonet/
│   │   │   ├── Main.java                        # Javalin server startup & routing
│   │   │   ├── config/DatabaseConfig.java       # HikariCP connection pool & dotenv
│   │   │   ├── auth/                            # JWT & Auth Middleware
│   │   │   ├── model/                           # Domain POJOs
│   │   │   ├── repository/                      # JDBC SQL repositories
│   │   │   ├── service/MatchingEngine.java      # Return-Load matching engine
│   │   │   ├── controller/                      # Javalin REST controllers
│   │   │   └── websocket/                       # GPS tracking WebSocket handler
│   │   └── test/java/com/cargonet/service/
│   │       └── MatchingEngineTest.java          # JUnit unit test
├── database/
│   ├── schema.sql                               # PostgreSQL DDL
│   └── seed.sql                                 # Corridor seed data
├── frontend/
│   ├── index.html                               # Master Landing Page
│   ├── css/style.css                            # B&W / Dark Navy design system
│   ├── js/                                      # ES Modules (config, api, auth)
│   ├── pages/                                   # Plain HTML pages (dashboards, forms, map)
│   └── assets/
└── README.md
```

---

## 4. How to Run Locally

### Backend Setup
1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Verify `.env` file settings (connects directly to Supabase Postgres via `SUPABASE_DB_URL`).
3. Run tests and start the Javalin server:
   ```bash
   mvn test
   mvn exec:java -Dexec.mainClass="com.cargonet.Main"
   ```

### Frontend Setup
1. Open `frontend/index.html` directly in any browser, or serve static folder:
   ```bash
   npx serve frontend
   ```
2. Demo Accounts (Password: `password123`):
   - **Business Shipper:** `shipping@apexpharma.com`
   - **Truck Transporter:** `venkatesh@transporter.com`
   - **Platform Admin:** `admin@cargonet.in`

---

## 5. Deployment Guide

- **Frontend (GitHub Pages):** Go to GitHub Repo Settings -> Pages -> Source: select `/frontend` folder on `main` branch. Ships as static HTML/CSS/JS with zero build step.
- **Backend (Render / Railway / Fly.io):** Deploy Java application using Maven package. Configure Environment Variables (`JDBC_URL`, `JWT_SECRET`, `CORS_ORIGINS`).
- **Database (Supabase):** Execute `database/schema.sql` and `database/seed.sql` in Supabase SQL Editor.
