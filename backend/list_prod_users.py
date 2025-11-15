"""
Script to list all users in production database
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models_user import User

# Production database URL
DATABASE_URL = "postgresql://smartply_db_user:K0OG823F1ajzHIzY1J6fn8blxM0m82w4@dpg-d4celsa4d50c73d5d330-a.ohio-postgres.render.com/smartply_db"

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# List users
db = SessionLocal()

try:
    users = db.query(User).all()
    print("=" * 50)
    print("Production Database Users")
    print("=" * 50)
    for user in users:
        print(f"\nID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Created: {user.created_at}")
    print("\n" + "=" * 50)
    print(f"Total users: {len(users)}")
finally:
    db.close()
