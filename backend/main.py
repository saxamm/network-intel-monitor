from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import router as api_router
from api.websockets import router as ws_router
from db.database import engine
from db import models
import uvicorn

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Network Intelligence Monitor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(ws_router)

@app.get("/")
def root():
    return {"status": "online", "message": "Network Intelligence Monitor API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
