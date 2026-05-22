# Freight Follow-up & CRM: Development Plan

## Project Context
Design a "Freight Follow-up & CRM" WebApp for a USA-based Freight Forwarder. This system acts as a specialized middleware to bridge the "follow-up gap" in the current ERP (CargoTrack). It will centralize shipment tracking (Air, Ocean, Ground, FTZ) from the initial quote/booking through coordination and final system entry.

---

## 1. Tech Stack Recommendation
We strongly recommend a modern Serverless/Edge stack designed for speed and rapid iteration.
* **Frontend**: **Next.js (React)** with **Tailwind CSS**. It provides a robust file-based routing system, clean abstractions, and excellent performance. For the "Airport Terminal" premium dashboard look, we will incorporate components from **Shadcn UI**, utilizing dark modes and vibrant, color-coded status badges.
* **Backend Backend & Database**: **Supabase (PostgreSQL)**. Supabase offers out-of-the-box PostgreSQL hosting with ultra-fast APIs, Row-Level Security (RLS) to separate Internal from External clients easily, and native real-time subscriptions, making the Activity Log and Board updates seamless without hard page reloads.
* **Authentication**: **Supabase Auth** to manage employees vs. clients access securely.

## 2. Data Architecture (Relational Schema)
* **Users**
  - `id` (UUID, Primary Key)
  - `email` (String)
  - `role` (Enum: Admin, Staff, Client)

* **Shipments** (Core Entity)
  - `id` (Integer, Auto-increment)
  - `parent_shipment_id` (Integer, Foreign Key to Shipments - for fragmented partial arrivals)
  - `client_name` (String, e.g., "masterline")
  - `reference` (String, Supplier Ref / PO)
  - `status_id` (Foreign Key to Status Master)
  - `shipment_type` (Enum: Import, Export, Transit)
  - `eta` (Date)
  - `etd` (Date)
  - `ct_file` (String, CargoTrack File)
  - `warehouse_receipt` (String)
  - `expo_mawb` (String)
  - `expo_hawb` (String)
  - `pcs` (Numeric)
  - `kgs` (Numeric)
  - `chw` (Numeric)
  - `aes` (String)

* **Logs** (Activity Feed)
  - `id` (UUID, PK)
  - `shipment_id` (FK to Shipments)
  - `user_id` (FK to Users)
  - `event_text` (String)
  - `is_external` (Boolean)
  - `billable_concept_id` (FK to Billables)
  - `created_at` (Timestamp)

* **Master Data Tables**
  - `Carriers`: `id`, `name`, `contact_phone`, `contact_email`
  - `Statuses`: `id`, `name` (Quoting, Arrived, etc.), `color_code`
  - `Billable_Concepts`: `id`, `name` (Freight, In & Out, Storage)
  - `User_Assignments`: `shipment_id`, `user_id` (Many-to-Many mapping for Staff Assignment)

## 3. Shipment Fragmentation Logic
To handle partial arrivals (Part A, Part B, Part C), we will use a **Self-Referential "Parent-Child" Relationship** in the `Shipments` table.
* The main shipment is created with `parent_shipment_id` as `NULL`.
* When a partial arrival occurs, the user clicks "Split Cargo." The system spawns a new record in `Shipments` where `parent_shipment_id` equals the original shipment's `id`.
* The "Child" inherits static fields (Client, Reference) from the Master but maintains its own independent lifecycle logs, pieces (`PCS`), weight (`KGS`), and `Status` (e.g., "Arrived" vs. "Pending").
* The UI will group these naturally in a tree-view dropdown under the parent shipment.

## 4. Field Mapping (Based on SHP.xlsx)
Based on the Excel ingestion analysis, the data points correspond as follows:
* **ID** ➔ `id` (PK)
* **Cliente** ➔ `client_name`
* **Reference** ➔ `reference`
* **followup** ➔ Will be historically migrated as the first entry in **Logs**, and a dynamic tracking URL field on the shipment.
* **Status** ➔ Linked to `Statuses` catalog (`STAGE 2 - Completed`).
* **ETA / ETD** ➔ `eta` / `etd`
* **Notes** ➔ Migrated as Internal `Logs`
* **CT File** ➔ `ct_file`
* **WH** ➔ `warehouse_receipt`
* **Expo MAWB / HAWB** ➔ `expo_mawb` / `expo_hawb`
* **PCS / KGS / CHW** ➔ `pcs` / `kgs` / `chw`
* **AES** ➔ `aes`
* **TYPE** ➔ mapped to `shipment_type`

## 5. UI/UX & Flow Design
1. **Internal Dashboard ("Airport Terminal")**: 
   A high-visibility grid using dark mode aesthetics and glowing `Status` badges. Interactive rows where clicking a generic row expands the `Subparts` (fragmented cargo) and side-pane slides over revealing the infinite scroll `Activity Log`.
2. **Client Portal Component**:
   A clean, isolated public-facing form. The client inputs their `Shipment ID` or `Reference`, and queries an endpoint that enforces RLS so only rows in `Logs` marked as `is_external = TRUE` are retrieved and displayed in a timeline format.
3. **Pre-Invoicing Action Board**:
   Within the log insertion box, a dropdown will let staff select `Billable Concept`. The system will automatically construct an aggregated sub-table on the shipment page showing "Owed Items" for final billing in cargo track.
