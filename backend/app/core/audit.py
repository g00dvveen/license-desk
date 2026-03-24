from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


def compute_changes(old: dict[str, Any], new: dict[str, Any]) -> tuple[dict, dict]:
    """Compare old and new values, return only changed fields."""
    old_changes = {}
    new_changes = {}
    for key in new:
        if key in old and old[key] != new[key]:
            old_changes[key] = old[key]
            new_changes[key] = new[key]
    return old_changes, new_changes


async def log_audit(
    db: AsyncSession,
    user: User,
    action: str,
    entity_type: str,
    entity_id: int,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """Write an audit log entry within the current transaction."""
    entry = AuditLog(
        user_id=user.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    )
    db.add(entry)
