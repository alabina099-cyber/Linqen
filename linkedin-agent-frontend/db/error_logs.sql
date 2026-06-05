-- =============================================
-- Error Logs Table
-- Used by lib/logger.ts to persist warnings/errors for monitoring
-- =============================================

CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);

-- Automatic cleanup of logs older than 30 days (run via cron)
-- DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';
