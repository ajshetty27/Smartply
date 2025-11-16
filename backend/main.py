from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from routes import jobs, cover_letters, linkedin, profile, auth, scout
import models_extended  # Import extended models
import models_linkedin  # Import LinkedIn models
import models_profile  # Import profile models
import models_user  # Import user models
import models_scout  # Import scout models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: cleanup if needed

app = FastAPI(title="Smartply API", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://smartply.vercel.app",
        "https://smartply-ajshetty27s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(cover_letters.router, prefix="/api", tags=["cover-letters"])
app.include_router(linkedin.router, prefix="/api", tags=["linkedin"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(scout.router, prefix="/api", tags=["scout"])

@app.get("/")
async def root():
    return {"message": "Smartply API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
