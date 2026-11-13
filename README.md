# Complete Cafe POS & Management System

A modern, fast, professional, and reliable Cafe Point of Sale (POS) and Floor Management Web Application built specifically for cafe owners, administrators, and waiters.

---

## ☕ Key Features

1. **Secure Authentication & Role-Based Access Control (RBAC)**
   - Managed admin onboarding (`npm run seed:admin`) avoiding public first-run setup risks.
   - Secure login screen (`/login` and root `/`) with single-device "Remember me on this device", rate limiting, and secure HTTP-only cookies via `iron-session`.
   - Distinct **Admin** and **Waiter** dashboards with server-side permission verification.
2. **Physical Table & Location Management**
   - Independent physical tables representing real cafe seating.
   - Customizable table locations/sections (*Indoor*, *Terrace*, *Balcony*, *Rooftop*, *Garden*, etc.) with dedicated location management.
   - Visually attractive table cards with capacity, sectioning, and live order value.
   - Real-time status: **Available**, **Occupied**, **Disabled**.
   - Admin can add, edit, reorder, and soft-deactivate tables to expand or adjust seating capacity without losing historical records.
3. **Menu & Category Management**
   - Category organization (Coffee, Bakery, Bites, Desserts).
   - Menu items with description, tax-inclusive prices, and manual **Available / Unavailable** toggle.
   - Waiters cannot add unavailable items to orders.
4. **Order Management & Shared Waiter Operations**
   - Tablet-optimized order taking (`/dashboard/orders/new`).
   - Category filtering, fast item search, cooking notes, and instant quantity adjustments.
   - **Shared Waiter Access**: Any authorized waiter can open any active table, view the order, and add more items.
   - Concurrency protection: Exactly one active order per physical table.
   - Historical price protection: Snapshots unit prices at order time so future menu price changes never affect historical or open orders.
   - Order cancellation with mandatory reason logging.
5. **Billing & Tax-Inclusive Financial Calculations**
   - All item prices are final customer prices (tax-inclusive). No surprise VAT, tax, or hidden percentage is added.
   - Accurate decimal arithmetic powered by `decimal.js`.
   - Instant bill preview (**Unpaid Bill** marked clearly as "PAYMENT DUE").
6. **Payment Recording & Cash Register**
   - Supports **Cash**, **QR Payment**, **Card**, and **Other**.
   - Atomic database transactions ensure no duplicate payments.
   - Auto-generates unique sequential receipt numbers (`RCP-YYYYMMDD-XXX`).
   - Table immediately resets back to Available upon payment.
7. **58mm & 80mm Thermal Receipt Printing**
   - Browser-native clean thermal printing template (`ThermalReceipt`).
   - Dedicated support for both **58 mm** and **80 mm** receipt rolls.
   - Automatically hides navigation, toolbars, and buttons during print (`@media print`).
   - Complete historical preservation: Stores a snapshot of cafe details, address, and PAN on each receipt so reprints always reflect original historical details.
8. **Admin Analytics & Basic Sales Reports**
   - Dashboard with today's revenue, order counts, occupied table count, and 7-day sales graph.
   - Filterable reports by Today, Last 7 Days, Last 30 Days, or Custom Date Range.
   - Revenue breakdown by payment method (Cash vs QR vs Card).
   - Top 10 best-selling items by volume and revenue.
   - One-click **CSV Export** for accounting.
9. **Staff & Waiter Management**
   - Admin can create waiter accounts, toggle active/inactive status, and reset passwords.
   - Foreign-key integrity preserves staff attributions across historical orders and payments.
10. **Business Settings**
    - Cafe name, legal name, PAN/VAT label, and PAN number.
    - Business address, phone number, and contact email.
    - Thermal printer paper size preference (58mm or 80mm).
    - Customizable receipt footer note and tax-inclusive pricing notice.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Server Actions, Dynamic Route Handlers)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Warm Cafe Palette: `#FFF8EB`, `#E5AE45`, `#3C2A20`)
- **Database & ORM**: SQLite with Prisma ORM v6
- **Session & Security**: `iron-session` (HTTP-only encrypted cookies) + `bcryptjs`
- **Arithmetic Engine**: `decimal.js` (precise financial calculations)
- **Icons**: `lucide-react`
- **Charts**: `recharts`

---

## 🚀 Getting Started

### 1. Installation
Clone or navigate to the project directory and install dependencies:
```bash
cd cafe-pos
npm install
```

### 2. Environment Configuration
Verify your `.env` file exists:
```env
DATABASE_URL="file:./dev.db"
SESSION_PASSWORD="change-this-to-a-random-string-at-least-32-characters-long-for-production"
```

### 3. Database Initialization
Generate the Prisma client and synchronize the SQLite schema:
```bash
npx prisma generate
npx prisma db push
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔑 Administrator Provisioning & Staff Onboarding

1. Initialize the primary administrator credentials securely via terminal:
   ```bash
   npm run seed:admin
   ```
   *(Default: username `admin`, password `admin123`. You can customize via `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables).*
2. Log in at [http://localhost:3000](http://localhost:3000).
3. The owner can immediately change their password under **My Account** (`/dashboard/account`).
4. The admin can then add waiter accounts under **Staff Management** (`/dashboard/staff`), provide waiters with their individual credentials, or toggle and reset access at any time. Waiters cannot access settings, financial reports, or staff management.

---

## 🧾 Thermal Receipt Printing Setup

1. Navigate to **Dashboard -> Settings** (`/dashboard/settings`).
2. Under **Thermal Printer Specifications**:
   - Choose your roll size: **80 mm (Standard POS)** or **58 mm (Compact Roll)**.
   - Set your **Receipt Footer Message** (e.g. *Thank you for visiting!*).
   - Enter your cafe's **PAN / VAT Number** and **Address**.
3. When viewing any bill or paid order, click **Print Receipt** (or press Ctrl+P). The system formats the output strictly for thermal rolls with navigation hidden.

---

## 🧪 Testing & Verification

An automated end-to-end acceptance script verifies all 40 acceptance test criteria:
```bash
npx tsx test-e2e.ts
```

To run a production build:
```bash
npm run build
npm run start
```

---

## 💾 Database Backup & Restore

Since SQLite is used, creating a full backup is as simple as copying `prisma/dev.db`:
```bash
# Backup
copy prisma\dev.db prisma\dev.db.bak

# Restore
copy prisma\dev.db.bak prisma\dev.db
```
To transition to PostgreSQL in the future, change the provider in `prisma/schema.prisma` to `postgresql` and update `DATABASE_URL`.
