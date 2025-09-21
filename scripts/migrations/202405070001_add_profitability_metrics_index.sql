CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_profitability_month_client_project
  ON profitability_metrics (month, client_id, project_id);
