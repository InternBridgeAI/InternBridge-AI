from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from api.routers import auth, internships, applications, ai, tasks, analytics, admin, tpo, tracking, certificates  # type: ignore

app = FastAPI(
    title="InternBridge AI Backend",
    description="Python FastAPI backend powering InternBridge AI matching and applications",
    version="1.0.0",
)

import os

# Set up CORS so the Next.js frontend can communicate with the FastAPI backend
# In development, it defaults to localhost:3000. In production, set ALLOWED_ORIGINS in environment variables.
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(internships.router, prefix="/api/internships", tags=["Internships"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(tpo.router, prefix="/api/tpo", tags=["TPO"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking"])
app.include_router(certificates.router, prefix="/api/certificates", tags=["Certificates"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FastAPI is running"}
