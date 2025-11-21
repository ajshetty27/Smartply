-- Add interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    voice VARCHAR(20) NOT NULL DEFAULT 'alloy',
    call_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    duration_seconds INTEGER,
    transcript TEXT,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON interview_sessions(created_at DESC);
