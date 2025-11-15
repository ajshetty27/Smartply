"""
Migration script to add additional_information column to user_profiles table
"""
import psycopg2
import os

# Production database URL
DATABASE_URL = "postgresql://smartply_db_user:K0OG823F1ajzHIzY1J6fn8blxM0m82w4@dpg-d4celsa4d50c73d5d330-a.ohio-postgres.render.com/smartply_db"

def add_additional_info_column():
    """Add additional_information column to user_profiles table"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("Connected to production database")
        
        # Add additional_information column to user_profiles
        print("\nAdding additional_information column to user_profiles...")
        cur.execute("""
            ALTER TABLE user_profiles 
            ADD COLUMN IF NOT EXISTS additional_information TEXT;
        """)
        
        conn.commit()
        print("✓ Successfully added additional_information column")
        
        # Verify the column was added
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'additional_information';
        """)
        result = cur.fetchone()
        if result:
            print(f"✓ Verified: {result[0]} column exists with type {result[1]}")
        
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
    print("Adding additional_information column to user_profiles")
    print("=" * 60)
    add_additional_info_column()
