"""Create a default admin user."""

import asyncio

from sqlalchemy import select

from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models.user import User

DEFAULT_EMAIL = "admin@licensedesk.com"
DEFAULT_PASSWORD = "admin"
DEFAULT_LAST_NAME = "Админ"
DEFAULT_FIRST_NAME = "Админ"


async def main() -> None:
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == DEFAULT_EMAIL))
        if result.scalar_one_or_none():
            print(f"User {DEFAULT_EMAIL} already exists, skipping.")
            return

        user = User(
            email=DEFAULT_EMAIL,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            last_name=DEFAULT_LAST_NAME,
            first_name=DEFAULT_FIRST_NAME,
            is_active=True,
            is_superuser=True,
        )
        session.add(user)
        await session.commit()
        print(f"Created default user: {DEFAULT_EMAIL} / {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
