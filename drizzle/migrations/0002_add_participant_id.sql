-- Add participant_id to users table
ALTER TABLE users ADD COLUMN participant_id text UNIQUE;
