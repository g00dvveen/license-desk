from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.domains.auth.schemas import UserCreate, LoginRequest


async def authenticate_user(db: AsyncSession, data: LoginRequest) -> str | None:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if (
        user is None
        or not user.hashed_password
        or not verify_password(data.password, user.hashed_password)
    ):
        return None
    return create_access_token({"sub": str(user.id)})


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        last_name=data.last_name,
        first_name=data.first_name,
        middle_name=data.middle_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
