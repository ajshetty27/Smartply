"""
Migration script to add stage column to local SQLite database
"""
import sqlite3

def add_stage_column():
    """Add stage column to jobs table in local database"""
    try:
        # Connect to local SQLite database
        conn = sqlite3.connect('smartply.db')
        cur = conn.cursor()
        
        print("Connected to local database")
        
        # Add stage column to jobs
        print("\nAdding stage column to jobs...")
        try:
            cur.execute("""
                ALTER TABLE jobs 
                ADD COLUMN stage VARCHAR DEFAULT 'found';
            """)
            conn.commit()
            print("✓ Successfully added stage column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ Stage column already exists")
            else:
                raise
        
        # Update existing jobs with cover letters to 'documents' stage
        print("\nUpdating existing jobs with cover letters to 'documents' stage...")
        cur.execute("""
            UPDATE jobs 
            SET stage = 'documents'
            WHERE id IN (
                SELECT DISTINCT job_id FROM cover_letters
            );
        """)
        updated_count = cur.rowcount
        conn.commit()
        print(f"✓ Updated {updated_count} jobs to 'documents' stage")
        
        cur.close()
        conn.close()
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Adding stage column to local jobs table")
    print("=" * 60)
    add_stage_column()
