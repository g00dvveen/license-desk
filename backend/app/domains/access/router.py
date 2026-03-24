from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, PermissionChecker
from app.models.user import User
from app.models.user_permission import UserPermission
from app.domains.users import schemas, service

router = APIRouter()

MANAGER_ALLOWED_ROLES = {"manager", "viewer"}


@router.get("/users", response_model=list[schemas.UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    result = await db.execute(select(User).where(User.is_active.is_(True)))
    return list(result.scalars().all())


@router.get("/users/{user_id}/permissions", response_model=list[schemas.PermissionRead])
async def get_user_permissions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    return await service.get_user_permissions(db, user_id)


@router.post("/permissions", response_model=schemas.PermissionRead, status_code=201)
async def create_permission(
    data: schemas.PermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    if not current_user.is_superuser and data.role not in MANAGER_ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Менеджер может назначать только роли: {', '.join(MANAGER_ALLOWED_ROLES)}",
        )
    return await service.create_permission(db, data)


@router.delete("/permissions/{permission_id}", status_code=204)
async def delete_permission(
    permission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    # Managers cannot delete permissions with roles they can't assign
    if not current_user.is_superuser:
        result = await db.execute(
            select(UserPermission).where(UserPermission.id == permission_id)
        )
        perm = result.scalar_one_or_none()
        if perm and perm.role not in MANAGER_ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для удаления этой роли",
            )
    await service.delete_permission(db, permission_id)
