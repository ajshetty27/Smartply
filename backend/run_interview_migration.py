"""
Migration script to add interview_sessions table to the database.
Run this script to update the database schema.
"""
import os
import sys

# Add parent directory to path to import database module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
import sqlalchemy as sa

def run_migration():
    """Run the interview sessions migration"""
    migration_sql = """
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
    """
    
    print("Running interview_sessions migration...")
    
    with engine.connect() as connection:
        # Execute each statement separately
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        for statement in statements:
            try:
                connection.execute(sa.text(statement))
                print(f"✓ Executed: {statement[:50]}...")
            except Exception as e:
                print(f"✗ Error executing statement: {e}")
                print(f"  Statement: {statement[:100]}...")
        
        connection.commit()
    
    print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
