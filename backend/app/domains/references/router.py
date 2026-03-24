from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.pagination import PaginationParams
from app.domains.references import schemas, service

router = APIRouter()


# --- Organizations ---


@router.get("/organizations", response_model=list[schemas.OrganizationRead])
async def list_organizations(
    pagination: PaginationParams = Depends(), db: AsyncSession = Depends(get_db)
):
    return await service.get_organizations(db, pagination.offset, pagination.size)


@router.get("/organizations/{org_id}", response_model=schemas.OrganizationRead)
async def get_organization(org_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_organization(db, org_id)


@router.post("/organizations", response_model=schemas.OrganizationRead, status_code=201)
async def create_organization(data: schemas.OrganizationCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_organization(db, data)


@router.patch("/organizations/{org_id}", response_model=schemas.OrganizationRead)
async def update_organization(
    org_id: int, data: schemas.OrganizationUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_organization(db, org_id, data)


@router.delete("/organizations/{org_id}", status_code=204)
async def delete_organization(org_id: int, db: AsyncSession = Depends(get_db)):
    await service.delete_organization(db, org_id)


# --- Projects ---


@router.get("/projects", response_model=list[schemas.ProjectRead])
async def list_projects(
    pagination: PaginationParams = Depends(), db: AsyncSession = Depends(get_db)
):
    return await service.get_projects(db, pagination.offset, pagination.size)


@router.get("/projects/{project_id}", response_model=schemas.ProjectRead)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_project(db, project_id)


@router.post("/projects", response_model=schemas.ProjectRead, status_code=201)
async def create_project(data: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_project(db, data)


@router.patch("/projects/{project_id}", response_model=schemas.ProjectRead)
async def update_project(
    project_id: int, data: schemas.ProjectUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_project(db, project_id, data)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    await service.delete_project(db, project_id)


# --- Currencies ---


@router.get("/currencies", response_model=list[schemas.CurrencyRead])
async def list_currencies(
    pagination: PaginationParams = Depends(), db: AsyncSession = Depends(get_db)
):
    return await service.get_currencies(db, pagination.offset, pagination.size)


@router.get("/currencies/{currency_id}", response_model=schemas.CurrencyRead)
async def get_currency(currency_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_currency(db, currency_id)


@router.post("/currencies", response_model=schemas.CurrencyRead, status_code=201)
async def create_currency(data: schemas.CurrencyCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_currency(db, data)


@router.patch("/currencies/{currency_id}", response_model=schemas.CurrencyRead)
async def update_currency(
    currency_id: int, data: schemas.CurrencyUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_currency(db, currency_id, data)


@router.delete("/currencies/{currency_id}", status_code=204)
async def delete_currency(currency_id: int, db: AsyncSession = Depends(get_db)):
    await service.delete_currency(db, currency_id)


# --- Renewal Periods ---


@router.get("/renewal-periods", response_model=list[schemas.RenewalPeriodRead])
async def list_renewal_periods(
    pagination: PaginationParams = Depends(), db: AsyncSession = Depends(get_db)
):
    return await service.get_renewal_periods(db, pagination.offset, pagination.size)


@router.get("/renewal-periods/{period_id}", response_model=schemas.RenewalPeriodRead)
async def get_renewal_period(period_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_renewal_period(db, period_id)


@router.post("/renewal-periods", response_model=schemas.RenewalPeriodRead, status_code=201)
async def create_renewal_period(
    data: schemas.RenewalPeriodCreate, db: AsyncSession = Depends(get_db)
):
    return await service.create_renewal_period(db, data)


@router.patch("/renewal-periods/{period_id}", response_model=schemas.RenewalPeriodRead)
async def update_renewal_period(
    period_id: int, data: schemas.RenewalPeriodUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_renewal_period(db, period_id, data)


@router.delete("/renewal-periods/{period_id}", status_code=204)
async def delete_renewal_period(period_id: int, db: AsyncSession = Depends(get_db)):
    await service.delete_renewal_period(db, period_id)


# --- Asset Types ---


@router.get("/asset-types", response_model=list[schemas.AssetTypeRead])
async def list_asset_types(
    pagination: PaginationParams = Depends(), db: AsyncSession = Depends(get_db)
):
    return await service.get_asset_types(db, pagination.offset, pagination.size)


@router.get("/asset-types/{type_id}", response_model=schemas.AssetTypeRead)
async def get_asset_type(type_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_asset_type(db, type_id)


@router.post("/asset-types", response_model=schemas.AssetTypeRead, status_code=201)
async def create_asset_type(data: schemas.AssetTypeCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_asset_type(db, data)


@router.patch("/asset-types/{type_id}", response_model=schemas.AssetTypeRead)
async def update_asset_type(
    type_id: int, data: schemas.AssetTypeUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_asset_type(db, type_id, data)


@router.delete("/asset-types/{type_id}", status_code=204)
async def delete_asset_type(type_id: int, db: AsyncSession = Depends(get_db)):
    await service.delete_asset_type(db, type_id)


# --- Asset Type Fields ---


@router.post(
    "/asset-types/{type_id}/fields", response_model=schemas.AssetTypeFieldRead, status_code=201
)
async def create_asset_type_field(
    type_id: int, data: schemas.AssetTypeFieldCreate, db: AsyncSession = Depends(get_db)
):
    return await service.create_asset_type_field(db, type_id, data)


@router.patch("/asset-type-fields/{field_id}", response_model=schemas.AssetTypeFieldRead)
async def update_asset_type_field(
    field_id: int, data: schemas.AssetTypeFieldUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_asset_type_field(db, field_id, data)


@router.delete("/asset-type-fields/{field_id}", status_code=204)
async def delete_asset_type_field(field_id: int, db: AsyncSession = Depends(get_db)):
    await service.delete_asset_type_field(db, field_id)
