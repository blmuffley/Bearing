"""Application configuration via environment variables."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Bearing application settings loaded from environment variables."""

    model_config = {"env_prefix": "BEARING_"}

    # ServiceNow connection
    sn_instance: str = Field(description="ServiceNow instance URL")
    sn_client_id: str = Field(default="", description="ServiceNow OAuth2 client ID")
    sn_client_secret: str = Field(default="", description="ServiceNow OAuth2 client secret")
    sn_username: str = Field(default="", description="ServiceNow service account username")
    sn_password: str = Field(default="", description="ServiceNow service account password")

    # AI
    anthropic_api_key: str = Field(
        default="",
        alias="ANTHROPIC_API_KEY",
        description="Claude API key for AI analysis",
    )

    # Security
    api_key: str = Field(default="", description="API key for Bearing endpoints")

    # Optional
    db_url: str = Field(default="", description="PostgreSQL URL for local trend storage")
    port: int = Field(default=8080, description="Server port")
    log_level: str = Field(default="INFO", description="Logging level")
    schedule_cron: str = Field(default="", description="Cron expression for scheduled assessments")

    @property
    def has_ai(self) -> bool:
        """Whether AI analysis is available."""
        return bool(self.anthropic_api_key)

    @property
    def auth_method(self) -> str:
        """Determine ServiceNow auth method from available credentials."""
        if self.sn_client_id and self.sn_client_secret:
            return "oauth"
        if self.sn_username and self.sn_password:
            return "basic"
        return "none"


def get_settings() -> Settings:
    """Get application settings singleton."""
    return Settings()
