-- Submittal Architect: Primary Database Schema

-- Projects Table: Root of all submittal work
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Sourcing preferences, default vendors, etc.
);

-- Spec Sections Table: Stores the results of the "Deep Shredder"
CREATE TABLE spec_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    section_number TEXT NOT NULL, -- e.g. "26 27 26"
    section_title TEXT, -- e.g. "Wiring Devices"
    part_1_general TEXT,
    part_2_products TEXT,
    part_3_execution TEXT,
    page_start INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table: Extracted requirements from Part 2
CREATE TABLE extracted_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES spec_sections(id) ON DELETE CASCADE,
    description TEXT NOT NULL, -- e.g. "Switches: 120/277 Volt"
    technical_specs JSONB, -- Extracted traits: {voltage: "277V", type: "AC Quiet"}
    status TEXT DEFAULT 'pending_sourcing', -- 'pending_sourcing', 'sourced', 'flagged'
    vendor_url TEXT, -- Link to Platt.com/NorthCoast if found
    cutsheet_url TEXT, -- Link to final PDF
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

