import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.middleware import setup_middleware
from app.core.exceptions import setup_exception_handlers
from app.domains.auth.router import router as auth_router
from app.domains.users.router import router as users_router
from app.domains.assets.router import router as assets_router
from app.domains.references.router import router as references_router
from app.domains.notifications.router import router as notifications_router
from app.domains.export.router import router as export_router
from app.domains.audit.router import router as audit_router
from app.domains.settings.router import router as settings_router
from app.domains.access.router import router as access_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="LicenseDesk",
        description="Intangible asset management service",
        version="0.2.0",
        lifespan=lifespan,
    )

    setup_middleware(app)
    setup_exception_handlers(app)

    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/users", tags=["users"])
    app.include_router(assets_router, prefix="/api/assets", tags=["assets"])
    app.include_router(references_router, prefix="/api/references", tags=["references"])
    app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
    app.include_router(export_router, prefix="/api/export", tags=["export"])
    app.include_router(audit_router, prefix="/api/audit", tags=["audit"])
    app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
    app.include_router(access_router, prefix="/api/access", tags=["access"])

    # Serve uploaded files
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(os.path.join(uploads_dir, "avatars"), exist_ok=True)
    app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    return app


app = create_app()
