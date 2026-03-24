from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, PermissionChecker
from app.core.pagination import PaginationParams
from app.models.user import User
from app.domains.audit import schemas, service

router = APIRouter()


@router.get("/", response_model=list[schemas.AuditLogRead])
async def list_audit_logs(
    pagination: PaginationParams = Depends(),
    entity_type: str | None = Query(None),
    entity_id: int | None = Query(None),
    user_id: int | None = Query(None),
    action: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    return await service.get_audit_logs(
        db,
        pagination.offset,
        pagination.size,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        date_from=date_from,
        date_to=date_to,
    )
