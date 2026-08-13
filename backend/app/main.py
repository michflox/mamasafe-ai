"""
MamaSafe AI — FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from .api.routes import router

app = FastAPI(
    title="MamaSafe AI",
    version="0.1.0-alpha",
    description="Offline-first clinical decision support for maternal emergencies in Africa",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
async def root():
    return {
        "name": "MamaSafe AI",
        "version": "0.1.0-alpha",
        "status": "operational",
        "mode": "online",
        "disclaimer": "Clinical decision support only. Requires human confirmation for all actions."
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0-alpha", "timestamp": datetime.utcnow().isoformat(), "mode": "online"}
