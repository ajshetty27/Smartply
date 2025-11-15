"""
One-time script to create a user in production database
Run this locally to add a user to the production PostgreSQL database
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models_user import User, Base
from auth import get_password_hash

# Production database URL
DATABASE_URL = "postgresql://smartply_db_user:K0OG823F1ajzHIzY1J6fn8blxM0m82w4@dpg-d4celsa4d50c73d5d330-a.ohio-postgres.render.com/smartply_db"

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create user
db = SessionLocal()

try:
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == 'demo').first()
    if existing_user:
        print(f"User 'demo' already exists with ID: {existing_user.id}")
    else:
        # Create new user
        user = User(
            username='demo',
            email='demo@smartply.app',
            hashed_password=get_password_hash('demo123')
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✓ User created successfully!")
        print(f"  ID: {user.id}")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Created at: {user.created_at}")
finally:
    db.close()
    print("\nYou can now login at your production site with:")
    print("  Username: demo")
    print("  Password: demo123")
