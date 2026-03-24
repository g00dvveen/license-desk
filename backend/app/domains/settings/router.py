from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_superuser
from app.domains.settings import schemas, service

router = APIRouter(dependencies=[Depends(require_superuser)])


@router.get("/", response_model=list[schemas.SettingRead])
async def list_settings(db: AsyncSession = Depends(get_db)):
    return await service.get_settings(db)


@router.patch("/{key}", response_model=schemas.SettingRead)
async def update_setting(key: str, data: schemas.SettingUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_setting(db, key, data)
