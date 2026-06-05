-- =============================================
-- Migration: Remove 'new' status from prospects
-- Run this once on the existing database to align with the new logic
-- =============================================

-- 1. Delete prospects with 'new' status that have no associated action
--    (they were scraped but never resulted in any action)
DELETE FROM messages
  WHERE prospect_id IN (
    SELECT id FROM prospects
    WHERE status = 'new'
      AND id NOT IN (
        SELECT DISTINCT prospect_id FROM linkedin_actions_queue
        WHERE prospect_id IS NOT NULL
      )
  );

DELETE FROM prospects
  WHERE status = 'new'
    AND id NOT IN (
      SELECT DISTINCT prospect_id FROM linkedin_actions_queue
      WHERE prospect_id IS NOT NULL
    );

-- 2. Promote remaining 'new' prospects (those with associated actions) to 'identified'
UPDATE prospects SET status = 'identified', updated_at = NOW()
  WHERE status = 'new';

-- 3. Also delete obsolete 'lost' status if present
UPDATE prospects SET status = 'identified' WHERE status = 'lost';

-- 4. Drop and recreate the constraint to enforce only the new valid statuses
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_status_check;

ALTER TABLE prospects ALTER COLUMN status SET DEFAULT 'identified';

ALTER TABLE prospects
  ADD CONSTRAINT prospects_status_check
  CHECK (status IN ('identified', 'connected', 'contacted', 'responded', 'interested', 'converted'));
