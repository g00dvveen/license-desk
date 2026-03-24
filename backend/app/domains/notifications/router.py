from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.core.pagination import PaginationParams
from app.models.user import User
from app.domains.notifications import schemas, service

router = APIRouter()


@router.get("/", response_model=list[schemas.NotificationRead])
async def list_notifications(
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.get_notifications(db, user, pagination.offset, pagination.size)


@router.get("/unread-count", response_model=schemas.UnreadCountRead)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = await service.get_unread_count(db, user)
    return schemas.UnreadCountRead(count=count)


@router.patch("/{notification_id}/read", response_model=schemas.NotificationRead)
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.mark_as_read(db, notification_id, user)


@router.post("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await service.mark_all_as_read(db, user)
