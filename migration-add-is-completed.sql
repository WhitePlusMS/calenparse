-- Migration: Add is_completed field to events table
-- Requirement 23.1: Add completion status field to database
-- Requirement 23.2: Save completion status immediately to database

-- Add is_completed column with default value false
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Create index for better query performance when filtering by completion status
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON events(is_completed);

-- Update existing events to have is_completed = false (if not already set)
UPDATE events 
SET is_completed = false 
WHERE is_completed IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN events.is_completed IS 'Indicates whether the event/task has been completed';
