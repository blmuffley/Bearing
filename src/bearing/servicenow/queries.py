"""CMDB query builders for each assessment dimension."""

from __future__ import annotations

# ServiceNow table names used by Bearing (read-only)
CMDB_TABLES = {
    "ci": "cmdb_ci",
    "ci_server": "cmdb_ci_server",
    "ci_app_server": "cmdb_ci_app_server",
    "ci_service": "cmdb_ci_service",
    "ci_service_auto": "cmdb_ci_service_auto",
    "ci_business_app": "cmdb_ci_business_app",
    "ci_service_technical": "cmdb_ci_service_technical",
    "rel_ci": "cmdb_rel_ci",
    "rel_type": "cmdb_rel_type",
    "location": "cmn_location",
    "discovery_status": "discovery_status",
    "svc_ci_assoc": "svc_ci_assoc",
}

# Fields commonly needed for each dimension
COMPLETENESS_FIELDS = [
    "sys_id", "name", "sys_class_name", "ip_address", "owned_by",
    "support_group", "environment", "operational_status",
    "sys_updated_on", "discovery_source",
]

ACCURACY_FIELDS = [
    "sys_id", "name", "sys_class_name", "ip_address",
    "discovery_source", "last_discovered",
]

CURRENCY_FIELDS = [
    "sys_id", "name", "sys_class_name", "sys_updated_on",
    "last_discovered", "operational_status",
]

RELATIONSHIP_FIELDS = [
    "sys_id", "parent", "child", "type",
]

CLASSIFICATION_FIELDS = [
    "sys_id", "name", "sys_class_name", "category",
    "subcategory", "operational_status",
]


def build_active_ci_query() -> str:
    """Query for active CIs (operational or installed)."""
    return "operational_status=1^ORoperational_status=6"


def build_stale_ci_query(days: int = 90) -> str:
    """Query for CIs not updated in the specified number of days."""
    return f"sys_updated_on<javascript:gs.daysAgo({days})"


def build_server_query() -> str:
    """Query for server CIs."""
    return "sys_class_nameINcmdb_ci_server,cmdb_ci_linux_server,cmdb_ci_win_server,cmdb_ci_unix_server"


def build_orphan_query() -> str:
    """Query for CIs with no relationships — requires post-processing.

    We fetch all CI sys_ids and compare against cmdb_rel_ci to find orphans.
    """
    return build_active_ci_query()


def build_csdm_business_service_query() -> str:
    """Query for business services (CSDM layer 1)."""
    return "operational_status=1"


def build_csdm_business_app_query() -> str:
    """Query for business applications (CSDM layer 2)."""
    return "operational_status=1"
