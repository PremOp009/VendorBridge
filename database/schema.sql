-- VendorBridge ERP Database Schema
-- PostgreSQL

-- Drop existing tables (in dependency order)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS rfq_vendors CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'vendor' CHECK (role IN ('admin', 'procurement_manager', 'finance_officer', 'vendor')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- VENDORS TABLE
-- ============================================================
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    gst_number VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted', 'pending')),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE INDEX idx_vendors_email ON vendors(email);

-- ============================================================
-- RFQs TABLE
-- ============================================================
CREATE TABLE rfqs (
    id SERIAL PRIMARY KEY,
    rfq_number VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    budget_amount DECIMAL(15,2),
    deadline DATE NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled', 'awarded')),
    attachment_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_created_by ON rfqs(created_by);
CREATE INDEX idx_rfqs_deadline ON rfqs(deadline);

-- ============================================================
-- RFQ_VENDORS (Junction Table)
-- ============================================================
CREATE TABLE rfq_vendors (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rfq_id, vendor_id)
);

CREATE INDEX idx_rfq_vendors_rfq ON rfq_vendors(rfq_id);
CREATE INDEX idx_rfq_vendors_vendor ON rfq_vendors(vendor_id);

-- ============================================================
-- QUOTATIONS TABLE
-- ============================================================
CREATE TABLE quotations (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    price DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 18.00,
    delivery_days INTEGER NOT NULL,
    validity_days INTEGER DEFAULT 30,
    notes TEXT,
    terms_conditions TEXT,
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'shortlisted', 'rejected', 'accepted')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rfq_id, vendor_id)
);

CREATE INDEX idx_quotations_rfq ON quotations(rfq_id);
CREATE INDEX idx_quotations_vendor ON quotations(vendor_id);
CREATE INDEX idx_quotations_status ON quotations(status);

-- ============================================================
-- APPROVALS TABLE
-- ============================================================
CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approvals_quotation ON approvals(quotation_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_approved_by ON approvals(approved_by);

-- ============================================================
-- PURCHASE ORDERS TABLE
-- ============================================================
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(30) UNIQUE NOT NULL,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    rfq_id INTEGER REFERENCES rfqs(id) ON DELETE SET NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    delivery_address TEXT,
    expected_delivery DATE,
    status VARCHAR(30) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'acknowledged', 'in_progress', 'delivered', 'cancelled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_created_at ON purchase_orders(created_at);

-- ============================================================
-- INVOICES TABLE
-- ============================================================
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    pdf_path VARCHAR(500),
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('draft', 'generated', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_po ON invoices(po_id);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_module ON activity_logs(module);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: Admin@1234)
INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES
('Admin', 'User', 'admin@vendorbridge.com', 'pbkdf2:sha256:260000$seed$admin_hash_placeholder', 'admin'),
('Raj', 'Sharma', 'procurement@vendorbridge.com', 'pbkdf2:sha256:260000$seed$pm_hash_placeholder', 'procurement_manager'),
('Priya', 'Patel', 'finance@vendorbridge.com', 'pbkdf2:sha256:260000$seed$finance_hash_placeholder', 'finance_officer');

-- Sample Vendors
INSERT INTO vendors (company_name, category, gst_number, email, phone, address, city, state, rating, status) VALUES
('TechSupply India Pvt Ltd', 'IT Equipment', '27AABCT1234A1ZX', 'contact@techsupply.in', '+91-9876543210', '12, Tech Park, Andheri East', 'Mumbai', 'Maharashtra', 4.5, 'active'),
('Stationery World', 'Office Supplies', '29AABCS5678B2ZY', 'info@stationeryworld.com', '+91-9876543211', '45, MG Road', 'Bangalore', 'Karnataka', 4.2, 'active'),
('BuildRight Contractors', 'Construction', '07AABCB9012C3ZZ', 'projects@buildright.in', '+91-9876543212', '78, Connaught Place', 'Delhi', 'Delhi', 3.8, 'active'),
('FurniturePlus India', 'Furniture', '33AABCF3456D4ZW', 'sales@furnitureplus.in', '+91-9876543213', '23, Anna Salai', 'Chennai', 'Tamil Nadu', 4.7, 'active'),
('CleanServ Solutions', 'Facilities Management', '06AABCC7890E5ZV', 'service@cleanserv.in', '+91-9876543214', '56, Banjara Hills', 'Hyderabad', 'Telangana', 4.0, 'active');

-- View for procurement stats
CREATE OR REPLACE VIEW procurement_stats AS
SELECT
    (SELECT COUNT(*) FROM vendors WHERE status = 'active') AS active_vendors,
    (SELECT COUNT(*) FROM rfqs WHERE status IN ('published', 'draft')) AS active_rfqs,
    (SELECT COUNT(*) FROM approvals WHERE status = 'pending') AS pending_approvals,
    (SELECT COUNT(*) FROM purchase_orders) AS total_pos,
    (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE status != 'cancelled') AS total_spend,
    (SELECT COUNT(*) FROM invoices WHERE status = 'generated' OR status = 'sent') AS pending_invoices;
