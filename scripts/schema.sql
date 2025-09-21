-- MoA Account Manager AI Database Schema

-- Clients dimension
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    harvest_id VARCHAR(100),
    sft_id VARCHAR(100),
    hubspot_id VARCHAR(100),
    has_subscription_coverage BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects dimension
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    harvest_id VARCHAR(100),
    budget DECIMAL(12, 2),
    budget_hours DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks dimension with taxonomy
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    harvest_id VARCHAR(100),
    default_billable BOOLEAN DEFAULT true,
    category VARCHAR(50) CHECK (category IN ('billable', 'exclusion', 'non-billable')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- People dimension
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    role VARCHAR(100),
    harvest_id VARCHAR(100),
    default_cost_rate DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate policies
CREATE TABLE IF NOT EXISTS rate_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id),
    client_id UUID REFERENCES clients(id),
    rate DECIMAL(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time entries fact table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    harvest_entry_id VARCHAR(100) UNIQUE,
    date DATE NOT NULL,
    client_id UUID REFERENCES clients(id),
    project_id UUID REFERENCES projects(id),
    task_id UUID REFERENCES tasks(id),
    person_id UUID REFERENCES people(id),
    notes TEXT,
    hours DECIMAL(8, 2) NOT NULL,
    billable_flag BOOLEAN DEFAULT true,
    invoiced_flag BOOLEAN DEFAULT false,
    billable_rate DECIMAL(10, 2),
    billable_amount DECIMAL(12, 2),
    cost_rate DECIMAL(10, 2),
    cost_amount DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'GBP',
    external_ref VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SFT Revenue fact table
CREATE TABLE IF NOT EXISTS sft_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    project_id UUID REFERENCES projects(id),
    month DATE NOT NULL,
    recognised_revenue DECIMAL(12, 2) NOT NULL,
    source VARCHAR(50) DEFAULT 'SFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profitability metrics (derived)
CREATE TABLE IF NOT EXISTS profitability_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL,
    client_id UUID REFERENCES clients(id),
    project_id UUID REFERENCES projects(id),
    billable_cost DECIMAL(12, 2),
    exclusion_cost DECIMAL(12, 2),
    recognised_revenue DECIMAL(12, 2),
    margin DECIMAL(12, 2),
    margin_percentage DECIMAL(5, 2),
    exceptions_count INTEGER DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exceptions table
CREATE TABLE IF NOT EXISTS exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID REFERENCES time_entries(id),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) CHECK (severity IN ('high', 'medium', 'low')),
    description TEXT,
    suggested_action TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    helpdesk_ticket_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget tracking
CREATE TABLE IF NOT EXISTS budget_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    month DATE NOT NULL,
    budgeted_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    budgeted_cost DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    burn_rate DECIMAL(5, 2),
    forecast_to_completion DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) CHECK (role IN ('admin', 'finance', 'account_manager', 'ops', 'leadership')),
    assigned_clients UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    helpdesk_ticket_id VARCHAR(100)
);

-- Invoice exports tracking
CREATE TABLE IF NOT EXISTS invoice_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    project_id UUID REFERENCES projects(id),
    period_start DATE,
    period_end DATE,
    export_data JSONB,
    total_billable DECIMAL(12, 2),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID REFERENCES users(id)
);

-- HubSpot imported deals storage for durable uploads
CREATE TABLE IF NOT EXISTS hubspot_deal_imports (
    deal_id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hubspot_deal_imports_sort_order
    ON hubspot_deal_imports (sort_order);

-- Create indexes for performance
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_client_project ON time_entries(client_id, project_id);
CREATE INDEX idx_exceptions_status ON exceptions(status);
CREATE INDEX idx_profitability_month_client ON profitability_metrics(month, client_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exceptions_updated_at BEFORE UPDATE ON exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hubspot_deal_imports_updated_at BEFORE UPDATE ON hubspot_deal_imports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
