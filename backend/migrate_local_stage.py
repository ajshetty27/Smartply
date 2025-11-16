"""
Migration script to add stage column to jobs and additional_information to user_profiles
"""
import sqlite3

def migrate_local_db():
    """Add missing columns to local database"""
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
        
        # Add additional_information column to user_profiles
        print("\nAdding additional_information column to user_profiles...")
        try:
            cur.execute("""
                ALTER TABLE user_profiles 
                ADD COLUMN additional_information TEXT;
            """)
            conn.commit()
            print("✓ Successfully added additional_information column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ additional_information column already exists")
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
    print("Migrating local database")
    print("=" * 60)
    migrate_local_db()
