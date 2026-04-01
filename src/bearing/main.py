"""FastAPI application entry point."""

from __future__ import annotations

import logging

import uvicorn
from fastapi import FastAPI

from bearing import __version__
from bearing.api.routes import router as api_router
from bearing.api.webhooks import router as webhook_router
from bearing.config import get_settings

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    application = FastAPI(
        title="Avennorth Bearing",
        description="CMDB health assessment platform for ServiceNow",
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    application.include_router(api_router, prefix="/api/v1")
    application.include_router(webhook_router, prefix="/api/webhooks")

    @application.get("/api/v1/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "version": __version__}

    return application


app = create_app()


def cli() -> None:
    """CLI entry point."""
    settings = get_settings()
    uvicorn.run(
        "bearing.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
