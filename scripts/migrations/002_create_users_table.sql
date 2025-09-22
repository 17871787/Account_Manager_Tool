-- Real user authentication table - not theater
-- This replaces fake API key authentication with real user accounts

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'user', 'viewer'))
);

-- Index for fast lookups
CREATE INDEX idx_users_email ON users(email) WHERE is_active = true;
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;

-- User sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,

  -- Index for fast token lookups
  UNIQUE(token_hash),
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires (expires_at) WHERE revoked_at IS NULL
);

-- Audit log for security tracking
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  resource_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  response_status INT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes for querying
  INDEX idx_audit_user_id (user_id),
  INDEX idx_audit_occurred_at (occurred_at),
  INDEX idx_audit_action (action)
);

-- Create initial admin user (password: ChangeMeImmediately!)
-- This should be changed immediately after first login
INSERT INTO users (email, password_hash, role)
VALUES (
  'admin@mapof.ag',
  '$2b$10$YKrH1jPVmB3JQzK5cvtTqebsXpL5XmIptgNMlJxswAW4S.t8uVGlO',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT, INSERT ON user_sessions TO app_user;
GRANT INSERT ON audit_log TO app_user;

COMMENT ON TABLE users IS 'User accounts with secure password storage';
COMMENT ON TABLE user_sessions IS 'Active user sessions for JWT validation';
COMMENT ON TABLE audit_log IS 'Security audit trail for all API access';