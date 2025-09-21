-- Add concurrent indexes to support lookups by Harvest identifiers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_harvest_id ON clients (harvest_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_harvest_id ON projects (harvest_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_harvest_id ON tasks (harvest_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_harvest_id ON people (harvest_id);
