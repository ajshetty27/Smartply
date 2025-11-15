#!/usr/bin/env python3
"""
Smartply User Creation Script
Run this script to manually create user accounts for your application.

Usage:
    python create_user.py
"""

import sys
from getpass import getpass
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models_user import User
from auth import get_password_hash

def create_user():
    """Interactive script to create a new user"""
    print("\n" + "="*50)
    print("Smartply - Create New User Account")
    print("="*50 + "\n")
    
    # Get user input
    username = input("Enter username: ").strip()
    if not username:
        print("❌ Username cannot be empty")
        return
    
    email = input("Enter email: ").strip()
    if not email:
        print("❌ Email cannot be empty")
        return
    
    password = getpass("Enter password (min 6 characters): ")
    if len(password) < 6:
        print("❌ Password must be at least 6 characters")
        return
    
    password_confirm = getpass("Confirm password: ")
    if password != password_confirm:
        print("❌ Passwords do not match")
        return
    
    # Create database session
    db: Session = SessionLocal()
    
    try:
        # Check if username already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"❌ Username '{username}' already exists")
            return
        
        # Check if email already exists
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            print(f"❌ Email '{email}' already exists")
            return
        
        # Create new user
        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print("\n✅ User created successfully!")
        print(f"   ID: {new_user.id}")
        print(f"   Username: {new_user.username}")
        print(f"   Email: {new_user.email}")
        print(f"   Created: {new_user.created_at}")
        
    except Exception as e:
        print(f"\n❌ Error creating user: {str(e)}")
        db.rollback()
    finally:
        db.close()

def list_users():
    """List all existing users"""
    print("\n" + "="*50)
    print("Existing Users")
    print("="*50 + "\n")
    
    db: Session = SessionLocal()
    
    try:
        users = db.query(User).all()
        
        if not users:
            print("No users found.")
        else:
            for user in users:
                print(f"ID: {user.id} | Username: {user.username} | Email: {user.email}")
    except Exception as e:
        print(f"❌ Error listing users: {str(e)}")
    finally:
        db.close()

def delete_user():
    """Delete a user by username"""
    print("\n" + "="*50)
    print("Delete User Account")
    print("="*50 + "\n")
    
    username = input("Enter username to delete: ").strip()
    if not username:
        print("❌ Username cannot be empty")
        return
    
    confirm = input(f"Are you sure you want to delete user '{username}'? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("❌ Deletion cancelled")
        return
    
    db: Session = SessionLocal()
    
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"❌ User '{username}' not found")
            return
        
        db.delete(user)
        db.commit()
        print(f"✅ User '{username}' deleted successfully")
    except Exception as e:
        print(f"❌ Error deleting user: {str(e)}")
        db.rollback()
    finally:
        db.close()

def main():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    while True:
        print("\n" + "="*50)
        print("Smartply User Management")
        print("="*50)
        print("\n1. Create new user")
        print("2. List all users")
        print("3. Delete user")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            create_user()
        elif choice == '2':
            list_users()
        elif choice == '3':
            delete_user()
        elif choice == '4':
            print("\n👋 Goodbye!")
            sys.exit(0)
        else:
            print("❌ Invalid choice. Please enter 1-4.")

if __name__ == "__main__":
    main()
