"""
MamaSafe AI — FastAPI Application
Serves both API and frontend static files
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

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

# Serve frontend static files
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
dist_path = os.path.join(project_root, "frontend", "dist")

if os.path.exists(dist_path) and os.path.exists(os.path.join(dist_path, "index.html")):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
