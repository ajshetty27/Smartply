# Deployment Guide

This guide will help you deploy Smartply to production using free hosting platforms.

## 🎯 Deployment Stack

- **Backend**: Render (with PostgreSQL)
- **Frontend**: Vercel
- **Database**: Render PostgreSQL or Supabase
- **Git**: Automatic deployments from GitHub

---

## 📦 Pre-Deployment Checklist

### 1. Update Backend for PostgreSQL

SQLite doesn't work on Render. We need to switch to PostgreSQL.

**Install PostgreSQL adapter:**
```bash
cd backend
pip install psycopg2-binary
pip freeze > requirements.txt
```

**Update `database.py`:**
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use PostgreSQL in production, SQLite in development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smartply.db")

# Render provides DATABASE_URL starting with postgres://
# SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Commit changes:**
```bash
git add .
git commit -m "feat: add PostgreSQL support for production"
git push
```

---

## 🔧 Backend Deployment (Render)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 2: Create PostgreSQL Database

1. Click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `smartply-db`
   - **Database**: `smartply`
   - **User**: `smartply_user` (auto-generated)
   - **Region**: Choose closest to you
   - **Plan**: **Free** (expires after 90 days)
3. Click **"Create Database"**
4. Wait for provisioning (~2 minutes)
5. **Copy the "Internal Database URL"** (starts with `postgresql://`)

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your **ajshetty27/Smartply** repository
3. Configure:
   - **Name**: `smartply-api`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: **Free**

4. **Add Environment Variables**:
   - Click **"Advanced"** → **"Add Environment Variable"**
   - Add these variables:
   
   ```
   DATABASE_URL = [paste Internal Database URL from Step 2]
   OPENAI_API_KEY = [your OpenAI API key]
   PORT = 10000
   ```

5. Click **"Create Web Service"**
6. Wait for deployment (~5 minutes)
7. **Copy your backend URL**: `https://smartply-api.onrender.com`

### Step 4: Test Backend

Visit: `https://smartply-api.onrender.com/docs`

You should see the FastAPI documentation page!

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Import **ajshetty27/Smartply**
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**:
   - Click **"Environment Variables"**
   - Add:
   ```
   VITE_API_URL = https://smartply-api.onrender.com
   ```
   (Replace with your actual Render backend URL)

5. Click **"Deploy"**
6. Wait for deployment (~2 minutes)
7. **Your app is live!** 🎉

Your frontend URL will be: `https://smartply-xxx.vercel.app`

### Step 3: Add Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## 🔄 Automatic Deployments

Both Render and Vercel are now watching your GitHub repository:

- **Push to `main` branch** → Auto-deploys backend + frontend
- **Create `dev` branch** → Deploy preview environments
- **Pull Requests** → Automatic preview deployments

---

## 🔒 CORS Configuration

Update backend to allow your frontend domain.

**In `backend/main.py`:**
```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Smartply API")

# Update with your actual Vercel domain
origins = [
    "http://localhost:5173",  # Local development
    "https://smartply-xxx.vercel.app",  # Production frontend
    "https://smartply.yourdomain.com",  # Custom domain (if any)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push:
```bash
git add backend/main.py
git commit -m "fix: update CORS for production"
git push
```

---

## 📊 Database Migrations

After first deployment, initialize the database:

1. Go to Render Dashboard → Your Web Service
2. Click **"Shell"** tab
3. Run:
```bash
python -c "from database import engine, Base; from models import *; from models_extended import *; from models_profile import *; Base.metadata.create_all(bind=engine)"
```

Or create a script `backend/init_db.py`:
```python
from database import engine, Base
from models import Job
from models_extended import Resume, CoverLetter
from models_profile import UserProfile

def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db()
```

Then run: `python init_db.py` in Render shell

---

## 🐛 Troubleshooting

### Backend Issues

**500 Error:**
- Check Render logs: Dashboard → Logs
- Verify DATABASE_URL format starts with `postgresql://`
- Check OPENAI_API_KEY is set correctly

**App Sleeping:**
- Free tier sleeps after 15 min inactivity
- First request after sleep takes ~30 seconds
- Consider upgrading to paid tier ($7/month) or use a ping service

**Database Connection Error:**
- Verify Internal Database URL is copied correctly
- Check database is running in Render dashboard

### Frontend Issues

**API Errors:**
- Check VITE_API_URL is correct (no trailing slash)
- Verify CORS is configured correctly
- Check Vercel deployment logs

**Build Failed:**
- Check Node version in Vercel settings (should be 18+)
- Verify all dependencies are in package.json

---

## 💰 Cost Breakdown

### Free Forever Option:
- **Render Backend**: Free (with sleep after 15 min)
- **Supabase Database**: 500MB free
- **Vercel Frontend**: Free (100GB bandwidth)
- **Total**: $0/month

### Recommended Paid Option:
- **Render Backend**: Free (or $7/month for no sleep)
- **Render Database**: $7/month (after 90-day trial)
- **Vercel Frontend**: Free
- **Total**: $0/month (90 days), then $7-14/month

---

## 🚀 Alternative Platforms

### Railway
**Pros**: $5 free credits/month, simpler setup
**Cons**: Credits may run out mid-month
**URL**: https://railway.app

**Deploy:**
1. Sign up with GitHub
2. New Project → Deploy from GitHub
3. Add PostgreSQL plugin
4. Configure environment variables
5. Deploy!

### Fly.io
**Pros**: 3 free VMs, PostgreSQL included
**Cons**: More complex setup, credit card required
**URL**: https://fly.io

### Heroku
**Pros**: Well-documented, reliable
**Cons**: No longer has free tier
**Cost**: ~$7/month minimum

---

## 📝 Post-Deployment

### Monitor Your App
- **Render**: Dashboard → Logs & Metrics
- **Vercel**: Analytics & Real-time logs

### Set Up Alerts
- Render: Enable email notifications for failures
- Vercel: Configure deployment notifications

### Backup Database
- Export PostgreSQL data regularly
- Use Render's built-in backup feature (paid plans)

---

## ✅ Deployment Checklist

- [ ] PostgreSQL support added to backend
- [ ] Backend deployed to Render
- [ ] Database created and connected
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Frontend deployed to Vercel
- [ ] API URL configured in frontend
- [ ] CORS configured for frontend domain
- [ ] Test all features in production
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/alerts

---

**Your app is now live! 🎉**

Share your app: `https://smartply-xxx.vercel.app`
