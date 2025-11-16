#!/usr/bin/env python3
"""
Migration script to change salary columns from INTEGER to REAL/FLOAT
"""

import os
import sys
from sqlalchemy import create_engine, text

def update_salary_columns(database_url: str):
    """Change salary_min and salary_max to REAL/FLOAT"""
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        if 'postgresql' in database_url:
            print("Updating salary columns to DOUBLE PRECISION in PostgreSQL...")
            # PostgreSQL
            conn.execute(text("ALTER TABLE scouted_jobs ALTER COLUMN salary_min TYPE DOUBLE PRECISION"))
            conn.execute(text("ALTER TABLE scouted_jobs ALTER COLUMN salary_max TYPE DOUBLE PRECISION"))
        else:
            print("SQLite doesn't support ALTER COLUMN TYPE directly.")
            print("Recreating table with REAL columns...")
            # SQLite - need to recreate table
            conn.execute(text("""
                CREATE TABLE scouted_jobs_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    external_id VARCHAR,
                    title VARCHAR NOT NULL,
                    company VARCHAR NOT NULL,
                    location VARCHAR,
                    description TEXT,
                    salary_min REAL,
                    salary_max REAL,
                    contract_type VARCHAR,
                    redirect_url VARCHAR NOT NULL,
                    relevance_score REAL DEFAULT 0,
                    scouted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR DEFAULT 'new',
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
            
            # Copy data
            conn.execute(text("""
                INSERT INTO scouted_jobs_new 
                SELECT * FROM scouted_jobs
            """))
            
            # Drop old table
            conn.execute(text("DROP TABLE scouted_jobs"))
            
            # Rename new table
            conn.execute(text("ALTER TABLE scouted_jobs_new RENAME TO scouted_jobs"))
            
            # Recreate indexes
            conn.execute(text("CREATE INDEX ix_scouted_jobs_id ON scouted_jobs(id)"))
            conn.execute(text("CREATE INDEX ix_scouted_jobs_external_id ON scouted_jobs(external_id)"))
        
        conn.commit()
        print("✓ Successfully updated salary columns to FLOAT/REAL")

if __name__ == "__main__":
    # Check if we're running for production or local
    if len(sys.argv) > 1 and sys.argv[1] == "--production":
        database_url = "postgresql://smartply_db_user:K0OG823F1ajzHIzY1J6fn8blxM0m82w4@dpg-d4celsa4d50c73d5d330-a.ohio-postgres.render.com/smartply_db"
        print("Running migration on PRODUCTION database...")
    else:
        database_url = "sqlite:///./smartply.db"
        print("Running migration on LOCAL database...")
    
    try:
        update_salary_columns(database_url)
        print("\n✓ Migration completed successfully!")
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        sys.exit(1)
