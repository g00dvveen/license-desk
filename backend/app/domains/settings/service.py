from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.system_setting import SystemSetting
from app.domains.settings import schemas


async def get_settings(db: AsyncSession) -> list[SystemSetting]:
    result = await db.execute(select(SystemSetting))
    return list(result.scalars().all())


async def get_setting(db: AsyncSession, key: str) -> SystemSetting:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("SystemSetting", key)
    return obj


async def update_setting(db: AsyncSession, key: str, data: schemas.SettingUpdate) -> SystemSetting:
    obj = await get_setting(db, key)
    obj.value = data.value
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_setting_value(db: AsyncSession, key: str, default: Any = None) -> Any:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    obj = result.scalar_one_or_none()
    if obj is None:
        return default
    return obj.value
