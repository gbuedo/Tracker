-- 1. Create System Master Data Tables

-- Statuses Table
CREATE TABLE public.statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color_code VARCHAR(50) DEFAULT '#000000',
    sort_order INTEGER DEFAULT 0
);

-- Carriers Table
CREATE TABLE public.carriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255)
);

-- Billable Concepts Table
CREATE TABLE public.billable_concepts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Employee / Staff Profiles (Optional, links to Supabase auth.users eventually)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY, -- Will eventually map to auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Staff' -- Roles: 'Admin', 'Staff', 'Client'
);

-- 2. Create Core Tracking Tables

-- Shipments Table
CREATE TABLE public.shipments (
    id SERIAL PRIMARY KEY,
    parent_shipment_id INTEGER REFERENCES public.shipments(id) ON DELETE CASCADE, -- For Split / Partial Arrivals
    client_name VARCHAR(255) NOT NULL,
    reference VARCHAR(255),
    status_id INTEGER REFERENCES public.statuses(id),
    shipment_type VARCHAR(50), -- 'Import', 'Export', 'Transit'
    eta DATE,
    etd DATE,
    ct_file VARCHAR(255), -- CargoTrack File Reference
    warehouse_receipt VARCHAR(255),
    expo_mawb VARCHAR(255),
    expo_hawb VARCHAR(255),
    pcs NUMERIC(10,2),
    kgs NUMERIC(15,2),
    chw NUMERIC(15,2),
    aes VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activity Logs Table (Chronological feed)
CREATE TABLE public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id INTEGER NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who made the update
    event_text TEXT NOT NULL,
    is_external BOOLEAN DEFAULT FALSE, -- TRUE = visible to clients, FALSE = internal only
    billable_concept_id INTEGER REFERENCES public.billable_concepts(id), -- For Pre-Invoicing
    amount NUMERIC(15,2), -- Cost capture if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Shipment Staff Assignment Table (Many-to-Many connection between Shipments and Profiles)
CREATE TABLE public.shipment_assignments (
    shipment_id INTEGER REFERENCES public.shipments(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (shipment_id, profile_id)
);


-- 3. Initial Populate Data (Seed)

-- Insert Basic Statuses
INSERT INTO public.statuses (name, color_code, sort_order) VALUES
('Quoting', '#94a3b8', 1),         -- Gray
('Quoted', '#38bdf8', 2),          -- Sky Blue
('Coordinating', '#fbbf24', 3),    -- Amber
('On the Way', '#818cf8', 4),      -- Indigo
('STAGE 2 - Completed', '#4ade80', 5), -- Green
('Arrived', '#2dd4bf', 6),         -- Teal
('Delivered', '#22c55e', 7),       -- Green
('Cancelled', '#f87171', 8);       -- Red

-- Insert some dummy Billable Concepts
INSERT INTO public.billable_concepts (name) VALUES
('Air Freight'),
('Ocean Freight'),
('In & Out'),
('Storage'),
('Customs Clearance');

-- Enable RLS (Row Level Security) - Basic Setup for now
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- Temporary Policies to allow all access while we develop (In production we will restrict this)
CREATE POLICY "Enable read/write access for all users on shipments" ON public.shipments FOR ALL USING (true);
CREATE POLICY "Enable read/write access for all users on logs" ON public.logs FOR ALL USING (true);
CREATE POLICY "Enable read access for all users on statuses" ON public.statuses FOR SELECT USING (true);
