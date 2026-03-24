from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_superuser, PermissionChecker
from app.core.pagination import PaginationParams
from app.models.user import User
from app.domains.users import schemas, service

router = APIRouter()

MANAGER_ALLOWED_ROLES = {"manager", "viewer"}


# --- Users (accessible to managers+) ---


@router.get("/", response_model=list[schemas.UserRead])
async def list_users(
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    return await service.get_users(db, pagination.offset, pagination.size)


@router.get("/{user_id}", response_model=schemas.UserRead)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    return await service.get_user(db, user_id)


# --- Admin-only: create, update ---


@router.post("/", response_model=schemas.UserRead, status_code=201)
async def create_user(
    data: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    return await service.create_user(db, data)


@router.patch("/{user_id}", response_model=schemas.UserRead)
async def update_user(
    user_id: int,
    data: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    # Managers cannot change is_superuser, is_active
    if not current_user.is_superuser:
        if data.is_superuser is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для изменения уровня пользователя",
            )
        if data.is_active is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для блокировки пользователя",
            )
    return await service.update_user(db, user_id, data)


# --- Permissions (accessible to managers+) ---


@router.get("/{user_id}/permissions", response_model=list[schemas.PermissionRead])
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
    # Managers can only assign manager/viewer roles
    if not current_user.is_superuser and data.role not in MANAGER_ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Можно назначать только роли: {', '.join(MANAGER_ALLOWED_ROLES)}",
        )
    return await service.create_permission(db, data)


@router.delete("/permissions/{permission_id}", status_code=204)
async def delete_permission(
    permission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("manager")),
):
    await service.delete_permission(db, permission_id)
