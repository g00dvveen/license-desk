from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from sqlalchemy import func

from app.core.exceptions import NotFoundError, ConflictError
from app.models.asset import Asset
from app.models.organization import Organization
from app.models.project import Project
from app.models.currency import Currency
from app.models.renewal_period import RenewalPeriod
from app.models.asset_type import AssetType
from app.models.asset_type_field import AssetTypeField
from app.domains.references import schemas


# --- Organization ---


async def get_organizations(
    db: AsyncSession, offset: int = 0, limit: int = 20
) -> list[Organization]:
    result = await db.execute(select(Organization).offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_organization(db: AsyncSession, org_id: int) -> Organization:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("Organization", org_id)
    return obj


async def create_organization(db: AsyncSession, data: schemas.OrganizationCreate) -> Organization:
    obj = Organization(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_organization(
    db: AsyncSession, org_id: int, data: schemas.OrganizationUpdate
) -> Organization:
    obj = await get_organization(db, org_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_organization(db: AsyncSession, org_id: int) -> None:
    obj = await get_organization(db, org_id)
    await db.delete(obj)
    await db.commit()


# --- Project ---


async def get_projects(db: AsyncSession, offset: int = 0, limit: int = 20) -> list[Project]:
    result = await db.execute(select(Project).offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: int) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("Project", project_id)
    return obj


async def create_project(db: AsyncSession, data: schemas.ProjectCreate) -> Project:
    obj = Project(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_project(db: AsyncSession, project_id: int, data: schemas.ProjectUpdate) -> Project:
    obj = await get_project(db, project_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_project(db: AsyncSession, project_id: int) -> None:
    obj = await get_project(db, project_id)
    await db.delete(obj)
    await db.commit()


# --- Currency ---


async def get_currencies(db: AsyncSession, offset: int = 0, limit: int = 20) -> list[Currency]:
    result = await db.execute(select(Currency).offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_currency(db: AsyncSession, currency_id: int) -> Currency:
    result = await db.execute(select(Currency).where(Currency.id == currency_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("Currency", currency_id)
    return obj


async def create_currency(db: AsyncSession, data: schemas.CurrencyCreate) -> Currency:
    obj = Currency(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_currency(
    db: AsyncSession, currency_id: int, data: schemas.CurrencyUpdate
) -> Currency:
    obj = await get_currency(db, currency_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_currency(db: AsyncSession, currency_id: int) -> None:
    result = await db.execute(
        select(func.count()).select_from(Asset).where(Asset.currency_id == currency_id)
    )
    if result.scalar() > 0:
        raise ConflictError("Невозможно удалить валюту — она используется в активах")
    obj = await get_currency(db, currency_id)
    await db.delete(obj)
    await db.commit()


# --- RenewalPeriod ---


async def get_renewal_periods(
    db: AsyncSession, offset: int = 0, limit: int = 20
) -> list[RenewalPeriod]:
    result = await db.execute(select(RenewalPeriod).offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_renewal_period(db: AsyncSession, period_id: int) -> RenewalPeriod:
    result = await db.execute(select(RenewalPeriod).where(RenewalPeriod.id == period_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("RenewalPeriod", period_id)
    return obj


async def create_renewal_period(
    db: AsyncSession, data: schemas.RenewalPeriodCreate
) -> RenewalPeriod:
    obj = RenewalPeriod(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_renewal_period(
    db: AsyncSession, period_id: int, data: schemas.RenewalPeriodUpdate
) -> RenewalPeriod:
    obj = await get_renewal_period(db, period_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_renewal_period(db: AsyncSession, period_id: int) -> None:
    result = await db.execute(
        select(func.count()).select_from(Asset).where(Asset.renewal_period_id == period_id)
    )
    if result.scalar() > 0:
        raise ConflictError("Невозможно удалить период продления — он используется в активах")
    obj = await get_renewal_period(db, period_id)
    await db.delete(obj)
    await db.commit()


# --- AssetType ---


async def get_asset_types(db: AsyncSession, offset: int = 0, limit: int = 20) -> list[AssetType]:
    result = await db.execute(
        select(AssetType).options(selectinload(AssetType.fields)).offset(offset).limit(limit)
    )
    return list(result.scalars().all())


async def get_asset_type(db: AsyncSession, type_id: int) -> AssetType:
    result = await db.execute(
        select(AssetType).options(selectinload(AssetType.fields)).where(AssetType.id == type_id)
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("AssetType", type_id)
    return obj


async def create_asset_type(db: AsyncSession, data: schemas.AssetTypeCreate) -> AssetType:
    fields_data = data.fields
    obj = AssetType(name=data.name, description=data.description)
    db.add(obj)
    await db.flush()
    for f in fields_data:
        field_obj = AssetTypeField(type_id=obj.id, **f.model_dump())
        db.add(field_obj)
    await db.commit()
    return await get_asset_type(db, obj.id)


async def update_asset_type(
    db: AsyncSession, type_id: int, data: schemas.AssetTypeUpdate
) -> AssetType:
    obj = await get_asset_type(db, type_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    return await get_asset_type(db, type_id)


async def delete_asset_type(db: AsyncSession, type_id: int) -> None:
    result = await db.execute(
        select(func.count()).select_from(Asset).where(Asset.type_id == type_id)
    )
    if result.scalar() > 0:
        raise ConflictError("Невозможно удалить тип актива — он используется в активах")
    obj = await get_asset_type(db, type_id)
    await db.delete(obj)
    await db.commit()


# --- AssetTypeField ---


async def create_asset_type_field(
    db: AsyncSession, type_id: int, data: schemas.AssetTypeFieldCreate
) -> AssetTypeField:
    await get_asset_type(db, type_id)  # ensure type exists
    obj = AssetTypeField(type_id=type_id, **data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_asset_type_field(
    db: AsyncSession, field_id: int, data: schemas.AssetTypeFieldUpdate
) -> AssetTypeField:
    result = await db.execute(select(AssetTypeField).where(AssetTypeField.id == field_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("AssetTypeField", field_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_asset_type_field(db: AsyncSession, field_id: int) -> None:
    result = await db.execute(select(AssetTypeField).where(AssetTypeField.id == field_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError("AssetTypeField", field_id)
    await db.delete(obj)
    await db.commit()
