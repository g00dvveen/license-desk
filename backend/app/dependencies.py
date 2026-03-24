from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.core.security import get_current_user_from_token
from app.models.user import User
from app.models.user_permission import UserPermission


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session_maker() as session:
        yield session


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user_from_token),
) -> User:
    provider = token_data.get("provider", "local")

    if provider == "keycloak":
        keycloak_sub = token_data.get("sub")
        result = await db.execute(select(User).where(User.keycloak_sub == keycloak_sub))
        user = result.scalar_one_or_none()
        if user is None:
            # Auto-provision from Keycloak token claims
            email = token_data.get("email", "")
            name = token_data.get("name", token_data.get("preferred_username", ""))
            name_parts = name.split(" ", 2)
            user = User(
                email=email,
                last_name=name_parts[0] if name_parts else "",
                first_name=name_parts[1] if len(name_parts) > 1 else "",
                middle_name=name_parts[2] if len(name_parts) > 2 else None,
                keycloak_sub=keycloak_sub,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
    else:
        user_id = token_data.get("sub")
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def require_superuser(user: User = Depends(get_current_user)) -> User:
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def _load_permissions(db: AsyncSession, user: User) -> list[UserPermission]:
    """Load and cache permissions on user object."""
    if hasattr(user, "_permissions"):
        return user._permissions  # type: ignore[attr-defined]
    result = await db.execute(select(UserPermission).where(UserPermission.user_id == user.id))
    permissions = list(result.scalars().all())
    user._permissions = permissions  # type: ignore[attr-defined]
    return permissions


def get_allowed_org_ids(user: User) -> list[int] | None:
    """Return list of org IDs user has access to, or None if access to all."""
    if user.is_superuser:
        return None  # all orgs
    permissions: list[UserPermission] = getattr(user, "_permissions", [])
    if any(p.organization_id is None for p in permissions):
        return None  # has global permission
    return [p.organization_id for p in permissions if p.organization_id is not None]


class PermissionChecker:
    """Check that user has required role for given org/project scope."""

    def __init__(self, required_role: str):
        self.required_role = required_role

    async def __call__(
        self,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if user.is_superuser:
            return user

        permissions = await _load_permissions(db, user)

        role_priority = {"manager": 2, "viewer": 1}
        required_level = role_priority.get(self.required_role, 0)

        has_access = any(role_priority.get(p.role, 0) >= required_level for p in permissions)

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return user
