from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import hash_password
from app.models.user import User
from app.models.user_permission import UserPermission
from app.domains.users import schemas


# --- Users ---


async def get_users(db: AsyncSession, offset: int = 0, limit: int = 20) -> list[User]:
    result = await db.execute(select(User).offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_user(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("User", user_id)
    return obj


async def create_user(db: AsyncSession, data: schemas.UserCreate) -> User:
    obj = User(
        email=data.email,
        last_name=data.last_name,
        first_name=data.first_name,
        middle_name=data.middle_name,
        hashed_password=hash_password(data.password),
        is_superuser=data.is_superuser,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_user(db: AsyncSession, user_id: int, data: schemas.UserUpdate) -> User:
    obj = await get_user(db, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


# --- Permissions ---


async def get_user_permissions(db: AsyncSession, user_id: int) -> list[UserPermission]:
    await get_user(db, user_id)
    result = await db.execute(select(UserPermission).where(UserPermission.user_id == user_id))
    return list(result.scalars().all())


async def create_permission(db: AsyncSession, data: schemas.PermissionCreate) -> UserPermission:
    await get_user(db, data.user_id)
    obj = UserPermission(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_permission(db: AsyncSession, permission_id: int) -> None:
    result = await db.execute(select(UserPermission).where(UserPermission.id == permission_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("UserPermission", permission_id)
    await db.delete(obj)
    await db.commit()
