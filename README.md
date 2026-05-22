# WCS Tracker 🚀
### Integrated Logistics Tracking & Follow-up Middleware

WCS Tracker is a specialized **Freight Follow-up & CRM web application** designed for freight forwarders to bridge the "follow-up gap" in standard ERP systems (like CargoTrack). 

It centralizes shipment status tracking (Air, Ocean, Ground, FTZ), automates activity log timelines, handles partial shipment splits, and tracks pre-invoicing billable items from booking to final delivery.

---

## 🌟 Key Features

### 1. 🖥️ "Airport Terminal" Internal Dashboard
A high-visibility dark-themed dashboard showing all current active shipments.
* **Vibrant Status Badges**: Instantly identify stages (Quoting, Coordinating, On the Way, Arrived, Delivered, etc.).
* **Detailed Slide-Over Panel**: Click any shipment to open a right-side panel with an infinite scrolling history feed.
* **Staff Controls**: Add log updates, change statuses, record billable concepts, or split cargo.

### 2. 🧩 Cargo Splitting (Shipment Fragmentation)
Designed for partial arrivals (e.g., Part A, Part B, Part C).
* Spawns self-referential child shipments that inherit master details (Client, Reference) but maintain separate status, weight (KGS), piece count (PCS), and activity logs.
* Tree-view nested visualization on the dashboard for easy grouping.

### 3. 💸 Pre-Invoicing Action Board
* Log events can be linked to **Billable Concepts** (e.g., Air Freight, Storage, Customs Clearance, In & Out handling) with cost/selling amounts.
* Automatically compiles a summary invoice preview within each shipment details page to simplify transfer to the billing system.

### 4. 🌐 Public Client Portal
* Secure, public-facing timeline portal.
* Clients input their `Reference ID` or `Shipment ID` to view a real-time, filtered log timeline containing only updates marked as **External**.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [Next.js 15 (React 19)](https://nextjs.org/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
* **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL) with a fully functional **Local JSON Mock Database fallback** for offline/demo use.
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Repository Directory Structure

```
├── Iniciar_Tracker.bat      # Startup script for Windows
├── Material/                # SQL Schemas, spreadsheets, and specification docs
│   ├── Plan.md
│   ├── Schema.sql
│   └── SHP.xlsx
└── webapp/                  # Next.js Web Application
    ├── src/
    │   ├── actions/         # Server Actions for database integration
    │   ├── app/             # App Router pages (Dashboard, Portal, Shipment details)
    │   ├── components/      # React UI components
    │   ├── lib/             # Database connection, types, and mock DB logic
    └── package.json
```

---

## 🚀 Getting Started

### Run with Windows Startup Script
Double-click the **`Iniciar_Tracker.bat`** file at the root. It will:
1. Verify you have Node.js and NPM installed.
2. Install dependencies automatically if `node_modules` is missing.
3. Start the Next.js server.
4. Launch the Internal Dashboard and Client Portal automatically in your default browser.

### Run Manually
If you prefer running commands manually, navigate to the `webapp` folder and run:
```bash
cd webapp
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the internal dashboard and [http://localhost:3000/portal](http://localhost:3000/portal) for the client tracking portal.

---

## 🔌 Database Mode: Cloud vs Demo Fallback

The application features an auto-detection database layer inside [db.ts](file:///c:/Users/gbued/Documents/4_Tracker/webapp/src/lib/db.ts):
* **Cloud Mode (Supabase)**: Connects to your Supabase PostgreSQL cluster if the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables are provided.
* **Demo Fallback Mode**: If environment variables are missing or a connection error occurs, the app automatically switches to read/write from a local file [mock_db.json](file:///c:/Users/gbued/Documents/4_Tracker/webapp/src/lib/mock_db.json). This guarantees the app is fully interactive offline.

---

## ☁️ Deployment on Vercel

To host this application online so you can share it with clients:

1. Sign in to your account at [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Select your connected GitHub account and import the **`Tracker`** repository.
4. In the configuration step:
   - **Root Directory**: Set this to **`webapp`** (since the Next.js code is in the subfolder).
   - **Framework Preset**: Select **Next.js** (detected automatically).
5. *(Optional)* Add the following environment variables if you want to link it to your live Supabase database:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Deploy**!
