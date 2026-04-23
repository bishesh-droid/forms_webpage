from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from app.core.config import settings
from app.core.security import hash_password
from app.api.v1 import auth, forms, questions, public, responses


async def _ensure_demo_user():
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.user import User
    async with AsyncSessionLocal() as db:
        exists = await db.scalar(select(User).where(User.email == "demo@example.com"))
        if not exists:
            db.add(User(email="demo@example.com", hashed_password=hash_password("DemoPassword123!"), name="Demo User"))
            await db.commit()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.session import engine
    from app.db.base import Base
    import app.models  # noqa: F401
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _ensure_demo_user()
    yield


app = FastAPI(
    title="Google Forms Clone",
    description="A full-featured Google Forms clone API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=settings.UPLOAD_DIR), name="files")

app.include_router(auth.router, prefix="/api/auth")
app.include_router(forms.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(responses.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
