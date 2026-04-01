"""ServiceNow OAuth2 and basic auth token management."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

import requests

logger = logging.getLogger(__name__)


@dataclass
class TokenInfo:
    """OAuth2 token storage."""

    access_token: str = ""
    refresh_token: str = ""
    expires_at: float = 0.0

    @property
    def is_expired(self) -> bool:
        return time.time() >= self.expires_at - 60  # 60s buffer


@dataclass
class ServiceNowAuth:
    """Manages ServiceNow authentication (OAuth2 or basic)."""

    instance_url: str
    auth_method: str = "basic"
    # OAuth2
    client_id: str = ""
    client_secret: str = ""
    # Basic
    username: str = ""
    password: str = ""
    # State
    _token: TokenInfo = field(default_factory=TokenInfo)

    def get_headers(self) -> dict[str, str]:
        """Get authorization headers for ServiceNow API requests."""
        if self.auth_method == "oauth":
            if self._token.is_expired:
                self._refresh_or_acquire_token()
            return {
                "Authorization": f"Bearer {self._token.access_token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        else:
            import base64

            credentials = base64.b64encode(
                f"{self.username}:{self.password}".encode()
            ).decode()
            return {
                "Authorization": f"Basic {credentials}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }

    def _refresh_or_acquire_token(self) -> None:
        """Refresh the OAuth2 token or acquire a new one."""
        if self._token.refresh_token:
            self._refresh_token()
        else:
            self._acquire_token()

    def _acquire_token(self) -> None:
        """Acquire a new OAuth2 token using password grant."""
        url = f"{self.instance_url}/oauth_token.do"
        data = {
            "grant_type": "password",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "username": self.username,
            "password": self.password,
        }
        resp = requests.post(url, data=data, timeout=30)
        resp.raise_for_status()
        token_data = resp.json()

        self._token = TokenInfo(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token", ""),
            expires_at=time.time() + int(token_data.get("expires_in", 1800)),
        )
        logger.info("Acquired new OAuth2 token for %s", self.instance_url)

    def _refresh_token(self) -> None:
        """Refresh an existing OAuth2 token."""
        url = f"{self.instance_url}/oauth_token.do"
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self._token.refresh_token,
        }
        try:
            resp = requests.post(url, data=data, timeout=30)
            resp.raise_for_status()
            token_data = resp.json()

            self._token = TokenInfo(
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token", self._token.refresh_token),
                expires_at=time.time() + int(token_data.get("expires_in", 1800)),
            )
            logger.info("Refreshed OAuth2 token for %s", self.instance_url)
        except requests.RequestException:
            logger.warning("Token refresh failed, acquiring new token")
            self._acquire_token()
