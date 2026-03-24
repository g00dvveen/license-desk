from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token
from app.dependencies import get_current_user, get_db
from fastapi import UploadFile, File
from app.domains.auth.schemas import (
    LoginRequest, TokenResponse, UserCreate, UserRead,
    ChangePasswordRequest, ProfileUpdate,
)
from app.domains.auth.service import authenticate_user, create_user
from app.core.security import verify_password, hash_password
from app.models.user import User
from app.models.user_permission import UserPermission
from app.domains.users.schemas import PermissionRead

router = APIRouter()


@router.get("/config")
async def auth_config():
    return {"keycloak_enabled": settings.keycloak_enabled}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await authenticate_user(db, data)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = None
    if not current_user.is_superuser:
        result = await db.execute(
            select(UserPermission).where(UserPermission.user_id == current_user.id)
        )
        permissions = list(result.scalars().all())
        if any(p.role == "manager" for p in permissions):
            role = "manager"
        elif any(p.role == "viewer" for p in permissions):
            role = "viewer"
    else:
        role = "admin"
    return UserRead(
        id=current_user.id,
        email=current_user.email,
        last_name=current_user.last_name,
        first_name=current_user.first_name,
        middle_name=current_user.middle_name,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        role=role,
        is_local=current_user.hashed_password is not None,
    )


@router.patch("/me", response_model=UserRead)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    # Re-fetch with role
    return await me(current_user, db)


@router.get("/me/permissions", response_model=list[PermissionRead])
async def my_permissions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPermission).where(UserPermission.user_id == current_user.id)
    )
    return list(result.scalars().all())


@router.post("/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Смена пароля недоступна для SSO-пользователей",
        )
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Пароль успешно изменён"}


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import os
    from app.core.storage import get_storage

    ext = os.path.splitext(file.filename or "avatar.png")[1] or ".png"
    storage_path = f"avatars/user_{current_user.id}{ext}"
    content = await file.read()
    content_type = file.content_type or "image/png"

    storage = get_storage()
    url = await storage.upload(storage_path, content, content_type)

    # Delete old avatar if path changed
    if current_user.avatar_url and current_user.avatar_url != url:
        old_path = f"avatars/{os.path.basename(current_user.avatar_url)}"
        try:
            await storage.delete(old_path)
        except Exception:
            pass

    current_user.avatar_url = url
    await db.commit()
    await db.refresh(current_user)
    return await me(current_user, db)


@router.delete("/me/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import os
    from app.core.storage import get_storage

    if current_user.avatar_url:
        storage = get_storage()
        old_path = f"avatars/{os.path.basename(current_user.avatar_url)}"
        try:
            await storage.delete(old_path)
        except Exception:
            pass
    current_user.avatar_url = None
    await db.commit()
    return {"detail": "Аватар удалён"}


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await create_user(db, data)


# --- OIDC (Keycloak) endpoints ---


@router.get("/oidc/login")
async def oidc_login():
    if not settings.keycloak_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OIDC is not enabled")

    params = urlencode(
        {
            "client_id": settings.keycloak_client_id,
            "redirect_uri": settings.keycloak_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
        }
    )
    return RedirectResponse(url=f"{settings.keycloak_auth_url}?{params}")


@router.get("/oidc/callback")
async def oidc_callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not settings.keycloak_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OIDC is not enabled")

    # Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            settings.keycloak_token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.keycloak_redirect_uri,
                "client_id": settings.keycloak_client_id,
                "client_secret": settings.keycloak_client_secret,
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to exchange authorization code",
        )

    tokens = token_response.json()
    id_token = tokens.get("id_token")
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No id_token in response",
        )

    # Decode and validate id_token
    from app.core.oidc import decode_keycloak_token

    try:
        payload = decode_keycloak_token(id_token)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to decode id_token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid id_token: {e}",
        )

    keycloak_sub = payload["sub"]
    email = payload.get("email", "")
    kc_name = payload.get("name", payload.get("preferred_username", ""))

    # Find or create user
    result = await db.execute(select(User).where(User.keycloak_sub == keycloak_sub))
    user = result.scalar_one_or_none()

    if user is None:
        # Try matching by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is not None:
            user.keycloak_sub = keycloak_sub
        else:
            name_parts = kc_name.split(" ", 2)
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

    # Issue local JWT
    access_token = create_access_token({"sub": str(user.id)})

    # Redirect to frontend with token
    redirect_url = f"{settings.keycloak_frontend_url}/auth/callback?token={access_token}"
    return RedirectResponse(url=redirect_url)
