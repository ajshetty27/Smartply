-- Migration: Create qna_items table and add job_id column
-- Date: 2025-11-16
-- Description: Creates qna_items table with job_id foreign key for job context

-- Create qna_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS qna_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_ai_generated INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add job_id column if table exists but column doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'qna_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qna_items' AND column_name = 'job_id'
    ) THEN
        ALTER TABLE qna_items ADD COLUMN job_id INTEGER;
        ALTER TABLE qna_items ADD CONSTRAINT fk_qna_items_job 
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
    END IF;
END $$;
