"""ServiceNow REST API client with pagination and rate limiting."""

from __future__ import annotations

import logging
import time

import requests

from bearing.config import Settings
from bearing.servicenow.auth import ServiceNowAuth

logger = logging.getLogger(__name__)

# Default pagination limit per ServiceNow best practices
DEFAULT_LIMIT = 100
MAX_LIMIT = 10000
RATE_LIMIT_DELAY = 0.1  # seconds between requests


class ServiceNowClient:
    """Typed wrapper around the ServiceNow Table API.

    Supports OAuth2 and basic auth, handles pagination and rate limiting.
    Bearing only READS from CMDB tables and WRITES to x_avnth_bearing_* tables.
    """

    def __init__(self, settings: Settings) -> None:
        self.instance_url = settings.sn_instance.rstrip("/")
        self.auth = ServiceNowAuth(
            instance_url=self.instance_url,
            auth_method=settings.auth_method,
            client_id=settings.sn_client_id,
            client_secret=settings.sn_client_secret,
            username=settings.sn_username,
            password=settings.sn_password,
        )
        self._session = requests.Session()

    def get_records(
        self,
        table: str,
        query: str = "",
        fields: list[str] | None = None,
        limit: int = DEFAULT_LIMIT,
        offset: int = 0,
    ) -> list[dict[str, object]]:
        """Fetch records from a ServiceNow table with pagination.

        Args:
            table: ServiceNow table name (e.g., 'cmdb_ci', 'cmdb_rel_ci').
            query: Encoded query string for filtering.
            fields: List of field names to return.
            limit: Maximum records per page.
            offset: Starting record offset.

        Returns:
            List of record dictionaries.
        """
        url = f"{self.instance_url}/api/now/table/{table}"
        params: dict[str, str | int] = {
            "sysparm_limit": min(limit, MAX_LIMIT),
            "sysparm_offset": offset,
            "sysparm_display_value": "false",
        }
        if query:
            params["sysparm_query"] = query
        if fields:
            params["sysparm_fields"] = ",".join(fields)

        headers = self.auth.get_headers()
        resp = self._session.get(url, headers=headers, params=params, timeout=60)
        resp.raise_for_status()

        return resp.json().get("result", [])

    def get_all_records(
        self,
        table: str,
        query: str = "",
        fields: list[str] | None = None,
        batch_size: int = DEFAULT_LIMIT,
    ) -> list[dict[str, object]]:
        """Fetch ALL records from a table, handling pagination automatically.

        Args:
            table: ServiceNow table name.
            query: Encoded query string for filtering.
            fields: List of field names to return.
            batch_size: Records per page.

        Returns:
            Complete list of all matching records.
        """
        all_records: list[dict[str, object]] = []
        offset = 0

        while True:
            batch = self.get_records(
                table=table,
                query=query,
                fields=fields,
                limit=batch_size,
                offset=offset,
            )

            if not batch:
                break

            all_records.extend(batch)
            offset += len(batch)

            if len(batch) < batch_size:
                break

            time.sleep(RATE_LIMIT_DELAY)

        logger.info("Fetched %d records from %s", len(all_records), table)
        return all_records

    def get_record_count(self, table: str, query: str = "") -> int:
        """Get the count of records matching a query.

        Args:
            table: ServiceNow table name.
            query: Encoded query string for filtering.

        Returns:
            Number of matching records.
        """
        url = f"{self.instance_url}/api/now/stats/{table}"
        params: dict[str, str] = {
            "sysparm_count": "true",
        }
        if query:
            params["sysparm_query"] = query

        headers = self.auth.get_headers()
        resp = self._session.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()

        result = resp.json().get("result", {})
        return int(result.get("stats", {}).get("count", 0))

    def write_record(self, table: str, data: dict[str, object]) -> dict[str, object]:
        """Write a record to a Bearing-owned ServiceNow table.

        Only writes to x_avnth_bearing_* tables.

        Args:
            table: Table name (must start with x_avnth_bearing_).
            data: Record data to write.

        Returns:
            Created record with sys_id.
        """
        if not table.startswith("x_avnth_bearing_"):
            raise ValueError(f"Bearing can only write to x_avnth_bearing_* tables, got: {table}")

        url = f"{self.instance_url}/api/now/table/{table}"
        headers = self.auth.get_headers()
        resp = self._session.post(url, headers=headers, json=data, timeout=30)
        resp.raise_for_status()

        return resp.json().get("result", {})

    def update_record(
        self, table: str, sys_id: str, data: dict[str, object]
    ) -> dict[str, object]:
        """Update a record in a Bearing-owned ServiceNow table.

        Args:
            table: Table name (must start with x_avnth_bearing_).
            sys_id: Record sys_id to update.
            data: Fields to update.

        Returns:
            Updated record.
        """
        if not table.startswith("x_avnth_bearing_"):
            raise ValueError(f"Bearing can only write to x_avnth_bearing_* tables, got: {table}")

        url = f"{self.instance_url}/api/now/table/{table}/{sys_id}"
        headers = self.auth.get_headers()
        resp = self._session.patch(url, headers=headers, json=data, timeout=30)
        resp.raise_for_status()

        return resp.json().get("result", {})
