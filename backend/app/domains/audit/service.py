from datetime import date, timedelta

from sqlalchemy import select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def get_audit_logs(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 20,
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[AuditLog]:
    query = select(AuditLog).order_by(AuditLog.created_at.desc())

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if date_from:
        query = query.where(cast(AuditLog.created_at, Date) >= date_from)
    if date_to:
        query = query.where(cast(AuditLog.created_at, Date) <= date_to)

    result = await db.execute(query.offset(offset).limit(limit))
    return list(result.scalars().all())
