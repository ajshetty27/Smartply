#!/usr/bin/env python3
"""
Run database migration to add job_id column to qna_items table
Usage: python run_migration.py [DATABASE_URL]
If DATABASE_URL is not provided as argument, it will be read from environment variable
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get DATABASE_URL from argument or environment
DATABASE_URL = sys.argv[1] if len(sys.argv) > 1 else os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found.")
    print("Usage: python run_migration.py [DATABASE_URL]")
    print("Or set DATABASE_URL environment variable")
    exit(1)

print(f"Connecting to database...")

try:
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    print("Running migration: Add job_id column to qna_items table")
    
    # Read migration SQL
    with open('migrations/add_job_id_to_qna.sql', 'r') as f:
        migration_sql = f.read()
    
    # Execute migration
    cur.execute(migration_sql)
    conn.commit()
    
    print("✅ Migration completed successfully!")
    
    # Verify the column was added
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'qna_items' 
        ORDER BY ordinal_position;
    """)
    
    columns = cur.fetchall()
    print("\nCurrent qna_items table structure:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error running migration: {e}")
    exit(1)
