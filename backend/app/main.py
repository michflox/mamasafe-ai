"""
MamaSafe AI — FastAPI Application
Serves both API and frontend static files
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# API routes FIRST (so they take precedence over catch-all)
app.include_router(router)

# Calculate frontend dist path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
dist_path = os.path.join(project_root, "frontend", "dist")

# Log at startup for debugging
print(f"[STARTUP] Project root: {project_root}")
print(f"[STARTUP] Looking for frontend at: {dist_path}")
print(f"[STARTUP] dist exists: {os.path.exists(dist_path)}")
if os.path.exists(dist_path):
    print(f"[STARTUP] dist contents: {os.listdir(dist_path)}")

# Mount static assets (CSS, JS files)
assets_path = os.path.join(dist_path, "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# Serve index.html at root
@app.get("/")
async def serve_index():
    index_file = os.path.join(dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"error": "Frontend not built", "dist_path": dist_path, "exists": os.path.exists(dist_path)}

# Catch-all for SPA routing (serves index.html for any non-API path)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Don't intercept API routes
    if full_path.startswith("api/"):
        return {"detail": "Not Found"}
    index_file = os.path.join(dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"error": "Frontend not built", "path_checked": index_file}
